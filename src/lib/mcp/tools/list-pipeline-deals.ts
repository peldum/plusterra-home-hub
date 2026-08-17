import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_pipeline_deals",
  title: "Oportunidades del pipeline",
  description: "Lista oportunidades del CRM (pipeline) visibles para el usuario, con etapa, cliente y próxima acción.",
  inputSchema: {
    stage: z.string().trim().optional().describe("Etapa del pipeline a filtrar."),
    only_mine: z.boolean().default(true).describe("Solo las oportunidades asignadas al usuario autenticado."),
    limit: z.number().int().min(1).max(50).default(20).describe("Máximo de resultados (1-50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ stage, only_mine, limit }, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("No autenticado.");
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("pipeline_deals")
      .select(
        "id, pipeline_type, stage, client_name, client_phone, property_title_snap, next_action_date, next_step, follow_up_date, estimated_commission, agent_id, notes, updated_at"
      )
      .order("updated_at", { ascending: false })
      .limit(limit ?? 20);

    if (stage) q = q.eq("stage", stage);
    if (only_mine !== false) {
      const userId = ctx.getUserId();
      if (!userId) throw new ToolError("No se pudo determinar el usuario autenticado.");
      q = q.eq("agent_id", userId);
    }

    const { data, error } = await q;
    if (error) throw new ToolError(error.message);
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { count: data?.length ?? 0, deals: data ?? [] },
    };
  },
});
