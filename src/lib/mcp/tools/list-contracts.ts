import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_contracts",
  title: "Listar contratos",
  description: "Lista contratos de alquiler/venta, con filtro por estado o por nombre de inquilino/propietario.",
  inputSchema: {
    status: z.string().trim().optional().describe("Estado del contrato, ej: active, terminated, draft."),
    party: z.string().trim().min(1).optional().describe("Texto a buscar en inquilino o propietario."),
    limit: z.number().int().min(1).max(50).default(20).describe("Máximo de resultados (1-50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, party, limit }, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("No autenticado.");
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("contracts")
      .select(
        "id, contract_type, status, tenant_name, landlord_name, property_address, monthly_rent, currency, start_date, end_date, periodicity, payment_day_from, payment_day_to, responsible_agent_id"
      )
      .order("created_at", { ascending: false })
      .limit(limit ?? 20);

    if (status) q = q.eq("status", status);
    if (party) {
      const like = `%${party}%`;
      q = q.or(`tenant_name.ilike.${like},landlord_name.ilike.${like},property_address.ilike.${like}`);
    }

    const { data, error } = await q;
    if (error) throw new ToolError(error.message);
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { count: data?.length ?? 0, contracts: data ?? [] },
    };
  },
});
