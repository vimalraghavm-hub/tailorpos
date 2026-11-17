import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const getCorsHeaders = (req: Request) => {
  const origin = req.headers.get("origin") || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-requested-with",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE",
    "Access-Control-Allow-Credentials": "true"
  };
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-requested-with",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const whatsappAccessToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
    const whatsappPhoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");

    // Initialize Supabase Client with User Auth Header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing Authorization header." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // 1. Verify User Authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized user session." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    // 2. Verify User Role (OWNER or WORKER with SEND_WHATSAPP permission)
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("shop_id, role, permissions")
      .eq("auth_user_id", user.id)
      .single();

    const hasWhatsAppPerm = profile?.role === "OWNER" || (profile?.role === "WORKER" && profile?.permissions?.SEND_WHATSAPP === true);

    if (profileError || !profile || !hasWhatsAppPerm) {
      return new Response(
        JSON.stringify({ success: false, error: "Access Denied. Account lacks WhatsApp messaging permissions." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
      );
    }

    // 3. Parse Request Payload
    const { shopId, customerId, orderId, type, recipient, message, templateName, documentUrl, documentBase64, filename } = await req.json();

    if (!recipient || !message) {
      return new Response(
        JSON.stringify({ success: false, error: "Recipient phone number and message body are required." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Normalize phone number (strip +, spaces, dashes, e.g. 919876543210)
    const cleanRecipient = recipient.replace(/\D/g, "");

    // 4. Check if Meta WhatsApp Cloud API credentials exist
    if (!whatsappAccessToken || !whatsappPhoneNumberId) {
      // Unconfigured secrets -> Log as DEMO_MODE
      await supabase.from("notifications").insert([{
        shop_id: shopId || profile.shop_id,
        customer_id: customerId || null,
        order_id: orderId || null,
        type: type || "CUSTOM",
        channel: "WHATSAPP",
        recipient: cleanRecipient,
        message: message,
        status: "DEMO_MODE",
        sent_at: new Date().toISOString(),
        template_name: templateName || null
      }]);

      return new Response(
        JSON.stringify({
          success: false,
          mode: "unconfigured",
          requiresManualFallback: true,
          error: "WhatsApp Cloud API credentials (WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID) are not configured in Supabase secrets."


        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // 5. Upload Document Media to Meta WhatsApp Media Endpoint if base64 provided
    let mediaId: string | null = null;

    if (documentBase64) {
      try {
        const binaryString = atob(documentBase64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const pdfBlob = new Blob([bytes], { type: "application/pdf" });

        const mediaFormData = new FormData();
        mediaFormData.append("file", pdfBlob, filename || "MohitTailoring_Invoice.pdf");
        mediaFormData.append("type", "application/pdf");
        mediaFormData.append("messaging_product", "whatsapp");

        const mediaUploadRes = await fetch(
          `https://graph.facebook.com/v18.0/${whatsappPhoneNumberId}/media`,
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${whatsappAccessToken}`,
            },
            body: mediaFormData,
          }
        );

        const mediaUploadData = await mediaUploadRes.json();
        if (!mediaUploadRes.ok || !mediaUploadData.id) {
          const uploadErrMsg = mediaUploadData.error?.message || "Failed to upload invoice PDF to WhatsApp Media API.";
          console.error("WhatsApp Media Upload Error:", mediaUploadData);

          await supabase.from("notifications").insert([{
            shop_id: shopId || profile.shop_id,
            customer_id: customerId || null,
            order_id: orderId || null,
            type: type || "CUSTOM",
            channel: "WHATSAPP",
            recipient: cleanRecipient,
            message: message,
            status: "FAILED",
            sent_at: new Date().toISOString(),
            error_message: `Media Upload Failed: ${uploadErrMsg}`,
            template_name: templateName || null
          }]);

          return new Response(
            JSON.stringify({ success: false, error: `Media Upload Failed: ${uploadErrMsg}` }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
          );
        }

        mediaId = mediaUploadData.id;
      } catch (uploadErr) {
        console.error("Media processing exception:", uploadErr);
        return new Response(
          JSON.stringify({ success: false, error: `PDF Media Processing Error: ${(uploadErr as Error).message}` }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }
    }

    // 6. Send Official Meta WhatsApp Cloud API Request
    const whatsappUrl = `https://graph.facebook.com/v18.0/${whatsappPhoneNumberId}/messages`;
    
    let payload: Record<string, unknown> = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: cleanRecipient,
    };

    if (mediaId) {
      payload.type = "document";
      payload.document = {
        id: mediaId,
        caption: message,
        filename: filename || "MohitTailoring_Invoice.pdf"
      };
    } else if (documentUrl) {
      payload.type = "document";
      payload.document = {
        link: documentUrl,
        caption: message,
        filename: filename || "MohitTailoring_Invoice.pdf"
      };
    } else if (templateName) {
      payload.type = "template";
      payload.template = {
        name: templateName,
        language: { code: "en_US" }
      };
    } else {
      payload.type = "text";
      payload.text = { preview_url: false, body: message };
    }

    const waResponse = await fetch(whatsappUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${whatsappAccessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const waResult = await waResponse.json();

    if (!waResponse.ok) {
      const errMsg = waResult.error?.message || "WhatsApp Cloud API request failed.";
      
      // Log Failure in notifications table
      await supabase.from("notifications").insert([{
        shop_id: shopId || profile.shop_id,
        customer_id: customerId || null,
        order_id: orderId || null,
        type: type || "CUSTOM",
        channel: "WHATSAPP",
        recipient: cleanRecipient,
        message: message,
        status: "FAILED",
        sent_at: new Date().toISOString(),
        error_message: errMsg,
        template_name: templateName || null
      }]);

      return new Response(
        JSON.stringify({ success: false, error: errMsg }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Success -> Log Sent Notification
    const providerMsgId = waResult.messages?.[0]?.id || null;

    await supabase.from("notifications").insert([{
      shop_id: shopId || profile.shop_id,
      customer_id: customerId || null,
      order_id: orderId || null,
      type: type || "CUSTOM",
      channel: "WHATSAPP",
      recipient: cleanRecipient,
      message: message,
      status: "SENT",
      sent_at: new Date().toISOString(),
      provider_message_id: providerMsgId,
      template_name: templateName || null
    }]);

    return new Response(
      JSON.stringify({
        success: true,
        mode: "production",
        provider_message_id: providerMsgId,
        message: "Message dispatched via WhatsApp Cloud API."
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (err: unknown) {
    const error = err as Error;
    console.error("Edge Function Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Internal server error." }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
