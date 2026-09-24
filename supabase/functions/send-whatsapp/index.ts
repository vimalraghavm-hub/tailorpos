import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
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
    const { shopId, customerId, orderId, type, recipient, message, templateName } = await req.json();

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
          success: true,
          mode: "demo",
          message: "WhatsApp Cloud API secrets unconfigured. Manual wa.me fallback active."
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // 5. Send Official Meta WhatsApp Cloud API Request
    const whatsappUrl = `https://graph.facebook.com/v18.0/${whatsappPhoneNumberId}/messages`;
    
    let payload: Record<string, unknown> = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: cleanRecipient,
    };

    if (templateName) {
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
