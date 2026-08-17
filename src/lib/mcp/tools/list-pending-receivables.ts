import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_pending_receivables",
  title: "Deudas pendientes (morosos)",
  description:
    "Lista cuotas/deudas pendientes o vencidas (alquiler, expensas, energía, pagarés) con importe, vencimiento y deudor.",
  inputSchema: {
    debtor: z.string().trim().min(1).optional().describe("Texto a buscar en el nombre del deudor."),
    concept: z.string().trim().optional().describe("Concepto exacto, ej: alquiler, expensas, energia."),
    overdue_only: z.boolean().default(false).describe("Solo las ya vencidas a la fecha de hoy."),
    limit: z.number().int().min(1).max(100).default(30).describe("Máximo de resultados (1-100)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ debtor, concept, overdue_only, limit }, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("No autenticado.");
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("receivables")
      .select(
        "id, debtor_name, debtor_role, concept, description, amount, currency, due_date, status, unit_code, building_id, property_id, total_cobrado, paid_amount, notes"
      )
      .neq("status", "paid")
      .order("due_date", { ascending: true })
      .limit(limit ?? 30);

    if (debtor) q = q.ilike("debtor_name", `%${debtor}%`);
    if (concept) q = q.eq("concept", concept);
    if (overdue_only) q = q.lt("due_date", new Date().toISOString().slice(0, 10));

    const { data, error } = await q;
    if (error) throw new ToolError(error.message);
    const total = (data ?? []).reduce((sum, r) => sum + Number(r.amount ?? 0), 0);
    return {
      content: [{ type: "text", text: JSON.stringify({ total_pendiente: total, items: data ?? [] }, null, 2) }],
      structuredContent: { count: data?.length ?? 0, total_pendiente: total, receivables: data ?? [] },
    };
  },
});
