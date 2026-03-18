import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { page_path, referrer, device_type, user_agent, session_id } = await req.json();

    // Get IP from request headers
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
               req.headers.get("x-real-ip") || "unknown";

    // Simple hash of IP for privacy (no raw IP stored)
    const encoder = new TextEncoder();
    const data = encoder.encode(ip + "plusterra-salt-2024");
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const ip_hash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 16);

    // Try geo-lookup using free ip-api (no key needed, 45 req/min)
    let country = null;
    let city = null;
    try {
      if (ip !== "unknown" && ip !== "127.0.0.1") {
        const geoRes = await fetch(`http://ip-api.com/json/${ip}?fields=country,city`, {
          signal: AbortSignal.timeout(3000),
        });
        if (geoRes.ok) {
          const geo = await geoRes.json();
          country = geo.country || null;
          city = geo.city || null;
        }
      }
    } catch {
      // Geo lookup failed — continue without it
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    await supabase.from("portal_visits").insert({
      page_path: page_path || "/",
      referrer: referrer || null,
      device_type: device_type || "desktop",
      user_agent: (user_agent || "").slice(0, 512),
      session_id: session_id || null,
      ip_hash,
      country,
      city,
    });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
