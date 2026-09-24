import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestPayload {
  action: 'LIST_WORKERS' | 'CREATE_WORKER' | 'UPDATE_PERMISSIONS' | 'TOGGLE_STATUS' | 'RESET_PASSWORD';
  shopId: string;
  workerId?: string;
  email?: string;
  password?: string;
  fullName?: string;
  permissions?: Record<string, boolean>;
  isActive?: boolean;
}

const DEFAULT_WORKER_PERMISSIONS = {
  VIEW_REGISTERS: true,
  VIEW_ASSIGNED_ORDERS: true,
  UPDATE_PRODUCTION_STATUS: true,
  MARK_WORK_COMPLETE: true,
  VIEW_CUSTOMER_PROFILE: false,
  VIEW_CUSTOMER_CONTACT: false,
  VIEW_PAYMENTS: false,
  SEND_WHATSAPP: false,
  MANAGE_WORKFLOW: false,
  VIEW_ALL_ORDERS: false
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized access" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Role Guard: Require OWNER role
    const { data: requestingProfile } = await supabaseClient
      .from("profiles")
      .select("role, shop_id")
      .eq("auth_user_id", user.id)
      .single();

    if (!requestingProfile || requestingProfile.role !== "OWNER") {
      return new Response(JSON.stringify({ error: "Forbidden: Only SHOP OWNER can manage worker accounts" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload: RequestPayload = await req.json();
    const shopId = payload.shopId || requestingProfile.shop_id || "a1000000-0000-0000-0000-000000000001";

    if (payload.action === "LIST_WORKERS") {
      const { data: workers, error } = await supabaseClient
        .from("profiles")
        .select("*, order_assignments(id, order_id, status)")
        .eq("shop_id", shopId)
        .eq("role", "WORKER")
        .order("created_at", { ascending: false });

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ workers }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (payload.action === "CREATE_WORKER") {
      if (!payload.email || !payload.password || !payload.fullName) {
        return new Response(JSON.stringify({ error: "Email, password and full name are required." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 1. Create auth user securely
      const { data: newAuthUser, error: createAuthErr } = await supabaseClient.auth.admin.createUser({
        email: payload.email.toLowerCase().trim(),
        password: payload.password,
        email_confirm: true,
        user_metadata: { full_name: payload.fullName, role: "WORKER" }
      });

      if (createAuthErr) {
        return new Response(JSON.stringify({ error: createAuthErr.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 2. Insert profile record
      const workerPermissions = payload.permissions || DEFAULT_WORKER_PERMISSIONS;
      const { data: workerProfile, error: profileErr } = await supabaseClient
        .from("profiles")
        .insert([{
          auth_user_id: newAuthUser.user.id,
          shop_id: shopId,
          full_name: payload.fullName.trim(),
          email: payload.email.toLowerCase().trim(),
          role: "WORKER",
          permissions: workerPermissions,
          is_active: true
        }])
        .select()
        .single();

      if (profileErr) {
        return new Response(JSON.stringify({ error: profileErr.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, worker: workerProfile }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (payload.action === "UPDATE_PERMISSIONS") {
      if (!payload.workerId || !payload.permissions) {
        return new Response(JSON.stringify({ error: "Worker ID and permissions are required." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: updated, error } = await supabaseClient
        .from("profiles")
        .update({
          permissions: payload.permissions,
          updated_at: new Date().toISOString()
        })
        .eq("id", payload.workerId)
        .eq("shop_id", shopId)
        .select()
        .single();

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, worker: updated }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (payload.action === "TOGGLE_STATUS") {
      if (!payload.workerId) {
        return new Response(JSON.stringify({ error: "Worker ID is required." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: updated, error } = await supabaseClient
        .from("profiles")
        .update({
          is_active: payload.isActive !== false,
          updated_at: new Date().toISOString()
        })
        .eq("id", payload.workerId)
        .eq("shop_id", shopId)
        .select()
        .single();

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, worker: updated }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Internal Server Error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
