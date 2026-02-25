import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

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
      // Release the property
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

      // Audit log
      await supabase.from("audit_logs").insert({
        user_id: null,
        action: "reservation_expired",
        target_table: "properties",
        target_id: prop.id,
        old_data: { status: "reserved", reserved_by: prop.reserved_by, expires_at: prop.reservation_expires_at },
        new_data: { status: "available", expired_at: now },
      });

      // Reservation history
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

      // Alert the agent
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

      // Alert admins
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

    return new Response(JSON.stringify({ expired: count }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
