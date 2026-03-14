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
    if (!ONESIGNAL_REST_API_KEY) {
      return new Response(JSON.stringify({ error: "Missing OneSignal REST API key" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(
      authHeader.replace("Bearer ", "")
    );
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { titulo, mensaje, user_ids, url } = await req.json();

    if (!titulo || !mensaje) {
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

    if (!user_ids || user_ids === "todos") {
      payload.included_segments = ["All"];
    } else if (Array.isArray(user_ids) && user_ids.length > 0) {
      payload.include_aliases = { external_id: user_ids };
      payload.target_channel = "push";
    } else {
      return new Response(JSON.stringify({ error: "Invalid user_ids" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const osResponse = await fetch("https://api.onesignal.com/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Key ${ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const osResult = await osResponse.json();

    // Log result
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    await serviceClient.from("audit_logs").insert({
      user_id: claimsData.claims.sub,
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

    if (!osResponse.ok) {
      return new Response(
        JSON.stringify({ error: "OneSignal error", details: osResult }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ success: true, data: osResult }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
