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
    // SECURITY: Require authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is admin/superadmin
    const userClient = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!roleData || !["superadmin", "admin"].includes(roleData.role)) {
      return new Response(JSON.stringify({ error: "Solo administradores" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find reserved properties past expiration
    const now = new Date().toISOString();
    const { data: expired, error: fetchError } = await supabase
      .from("properties")
      .select("id, title, reserved_by, reserved_at, reservation_expires_at, reservation_client_name")
      .eq("status", "reserved")
      .not("reservation_expires_at", "is", null)
      .lte("reservation_expires_at", now);

    if (fetchError) throw fetchError;

    let count = 0;
    for (const prop of expired || []) {
      const { error: updateError } = await supabase
        .from("properties")
        .update({
          status: "available",
          reserved_by: null,
          reserved_at: null,
          reservation_amount: null,
          reservation_client_name: null,
          reservation_expires_at: null,
          reservation_confirmed_by: null,
          reservation_confirmed_at: null,
        })
        .eq("id", prop.id)
        .eq("status", "reserved");

      if (updateError) {
        console.error(`Error releasing ${prop.id}:`, updateError);
        continue;
      }

      await supabase.from("audit_logs").insert({
        user_id: null,
        action: "reservation_expired",
        target_table: "properties",
        target_id: prop.id,
        old_data: { status: "reserved", reserved_by: prop.reserved_by, expires_at: prop.reservation_expires_at },
        new_data: { status: "available", expired_at: now },
      });

      await supabase.from("reservation_history").insert({
        property_id: prop.id,
        event_type: "RESERVA_VENCIDA",
        agent_origin_id: prop.reserved_by,
        executed_by: "00000000-0000-0000-0000-000000000000",
        executed_by_name: "Sistema",
        executed_by_role: "system",
        snapshot_before: { status: "reserved", reserved_by: prop.reserved_by },
        snapshot_after: { status: "available", reason: "Plazo de 5 días vencido" },
      });

      if (prop.reserved_by) {
        await supabase.from("alerts").insert({
          user_id: prop.reserved_by,
          title: "Reserva Vencida ⏰",
          message: `La reserva de "${prop.title}" venció automáticamente tras 5 días sin contrato firmado.`,
          alert_type: "reservation_expired",
          related_entity_id: prop.id,
          related_entity_type: "property",
        });
      }

      const { data: admins } = await supabase
        .from("user_roles")
        .select("user_id")
        .in("role", ["admin", "superadmin"]);

      if (admins?.length) {
        await supabase.from("alerts").insert(
          admins.map((a: any) => ({
            user_id: a.user_id,
            title: "Reserva Vencida ⏰",
            message: `Reserva de "${prop.title}" venció automáticamente.`,
            alert_type: "reservation_expired",
            related_entity_id: prop.id,
            related_entity_type: "property",
          }))
        );
      }

      count++;
    }

    // --- 24-hour warning alerts ---
    const in24h = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const { data: soonExpiring } = await supabase
      .from("properties")
      .select("id, title, reserved_by, reservation_expires_at")
      .eq("status", "reserved")
      .not("reservation_expires_at", "is", null)
      .gt("reservation_expires_at", now)
      .lte("reservation_expires_at", in24h);

    let warned = 0;
    for (const prop of soonExpiring || []) {
      if (!prop.reserved_by) continue;

      const { data: existing } = await supabase
        .from("alerts")
        .select("id")
        .eq("user_id", prop.reserved_by)
        .eq("alert_type", "reservation_expiring_soon")
        .eq("related_entity_id", prop.id)
        .limit(1);

      if (existing && existing.length > 0) continue;

      await supabase.from("alerts").insert({
        user_id: prop.reserved_by,
        title: "⚠️ Reserva por vencer",
        message: `Tu reserva de "${prop.title}" vence en menos de 24 horas. Firmá el contrato para no perderla.`,
        alert_type: "reservation_expiring_soon",
        related_entity_id: prop.id,
        related_entity_type: "property",
      });
      warned++;
    }

    return new Response(JSON.stringify({ expired: count, warned }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: "Error interno del servidor" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
