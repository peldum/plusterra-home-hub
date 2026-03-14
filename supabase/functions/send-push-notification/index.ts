import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ONESIGNAL_APP_ID = "f92acc0b-91dd-4dde-b710-fdd755857779";
    const ONESIGNAL_REST_API_KEY = Deno.env.get("ONESIGNAL_REST_API_KEY");
    
    console.log("Key existe:", !!ONESIGNAL_REST_API_KEY);
    
    if (!ONESIGNAL_REST_API_KEY) {
      console.error("ONESIGNAL_REST_API_KEY no encontrada en secrets");
      return new Response(JSON.stringify({ error: "Missing OneSignal REST API key" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auth check - allow both user JWT and service-level calls (from DB triggers via anon key)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.error("No Authorization header");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine caller: anon key (trigger) or user JWT
    const token = authHeader.replace("Bearer ", "");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    let callerId: string | null = null;

    if (token === anonKey) {
      callerId = "system-trigger";
      console.log("Caller: system-trigger (anon key)");
    } else {
      // Validate JWT via getUser
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) {
        console.error("Auth error:", userError?.message || "No user");
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      callerId = userData.user.id;
      console.log("Caller:", callerId);
    }

    const body = await req.json();
    const { titulo, mensaje, user_ids, url, priority } = body;
    
    console.log("Enviando push:", titulo);
    console.log("Body recibido:", JSON.stringify(body));

    if (!titulo || !mensaje) {
      console.error("Faltan titulo o mensaje");
      return new Response(JSON.stringify({ error: "titulo and mensaje required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build OneSignal payload
    const payload: any = {
      app_id: ONESIGNAL_APP_ID,
      headings: { en: titulo, es: titulo },
      contents: { en: mensaje, es: mensaje },
      url: url || "https://pluspy.app/comunicaciones",
    };

    // High priority for urgent notices
    if (priority && priority >= 10) {
      payload.priority = 10;
    }

    if (!user_ids || user_ids === "todos") {
      payload.included_segments = ["All"];
    } else if (Array.isArray(user_ids) && user_ids.length > 0) {
      payload.include_aliases = { external_id: user_ids };
      payload.target_channel = "push";
    } else {
      console.error("Invalid user_ids:", user_ids);
      return new Response(JSON.stringify({ error: "Invalid user_ids" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("OneSignal payload:", JSON.stringify(payload));

    const osResponse = await fetch("https://api.onesignal.com/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Key ${ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const osResult = await osResponse.json();
    
    console.log("OneSignal response status:", osResponse.status);
    console.log("OneSignal response body:", JSON.stringify(osResult));

    // Log result
    try {
      const serviceClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      await serviceClient.from("audit_logs").insert({
        user_id: callerId === "system-trigger" ? null : callerId,
        action: "push_notification_sent",
        target_table: "onesignal",
        new_data: {
          titulo,
          mensaje,
          user_ids: user_ids || "todos",
          onesignal_response: osResult,
          success: osResponse.ok,
        },
      });
    } catch (auditErr) {
      console.warn("Audit log failed:", auditErr);
    }

    if (!osResponse.ok) {
      console.error("OneSignal API error:", { status: osResponse.status, body: osResult });
      return new Response(
        JSON.stringify({ error: "OneSignal error", details: osResult }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ success: true, data: osResult }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Unhandled error:", err.message, err.stack);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
