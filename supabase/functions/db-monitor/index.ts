import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TABLE_LABELS: Record<string, string> = {
  properties: "Propiedades",
  contracts: "Contratos",
  clients: "Clientes",
  deals: "Operaciones",
  payments: "Pagos",
  commissions: "Comisiones",
  owners: "Propietarios",
  profiles: "Perfiles",
  agents_fee_payments: "Pagos de Canon",
  canon_payments: "Pagos de Canon",
  alerts: "Alertas",
  audit_logs: "Logs de Auditoría",
  buildings: "Edificios",
  units: "Unidades",
  unit_owners: "Propietarios de Unidades",
  inventory_items: "Inventario",
  key_movements: "Movimientos de Llaves",
  maintenance_tickets: "Tickets de Mantenimiento",
  providers: "Proveedores",
  property_photos: "Fotos de Propiedades",
  property_favorites: "Favoritos",
  company_settings: "Configuración",
  canon_settings: "Config. Canon",
  user_roles: "Roles de Usuario",
  agent_fee_payments: "Pagos de Honorarios",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify the user is superadmin
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

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!roleData || roleData.role !== "superadmin") {
      return new Response(JSON.stringify({ error: "Solo SuperAdmin" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get row counts for all public tables
    const tables = [
      "properties", "contracts", "clients", "deals", "payments",
      "commissions", "owners", "profiles", "canon_payments", "alerts",
      "audit_logs", "buildings", "units", "unit_owners", "inventory_items",
      "key_movements", "maintenance_tickets", "providers", "property_photos",
      "property_favorites", "company_settings", "canon_settings",
      "user_roles", "agent_fee_payments",
    ];

    const results = [];
    let totalRows = 0;

    for (const table of tables) {
      const { count, error } = await adminClient
        .from(table)
        .select("*", { count: "exact", head: true });

      if (!error && count !== null) {
        const rowCount = count;
        // Rough estimate: ~0.5 KB per row average
        const estimatedKB = rowCount * 0.5;
        totalRows += rowCount;
        results.push({
          table,
          label: TABLE_LABELS[table] || table,
          rows: rowCount,
          estimated_kb: Math.round(estimatedKB * 100) / 100,
        });
      }
    }

    // Sort by row count descending
    results.sort((a, b) => b.rows - a.rows);

    const totalEstimatedMB = Math.round((totalRows * 0.5) / 1024 * 100) / 100;
    const maxMB = 500; // Lovable Cloud limit

    return new Response(
      JSON.stringify({
        tables: results,
        total_rows: totalRows,
        estimated_mb: totalEstimatedMB,
        max_mb: maxMB,
        usage_pct: Math.round((totalEstimatedMB / maxMB) * 10000) / 100,
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
