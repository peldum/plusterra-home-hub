import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_property",
  title: "Ficha de propiedad",
  description: "Devuelve la ficha completa de una propiedad por código PLT o por id.",
  inputSchema: {
    property_code: z.string().trim().min(1).optional().describe("Código PLT, ej: PLT-2026-0368."),
    property_id: z.string().uuid().optional().describe("UUID de la propiedad."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ property_code, property_id }, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("No autenticado.");
    if (!property_code && !property_id) throw new ToolError("Indicá property_code o property_id.");
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("properties")
      .select(
        "id, property_code, title, internal_title, description, property_type, status, address, city, neighborhood, unit_id, bedrooms, bathrooms, area_m2, has_garage, garage_number, rental_price, rental_period, sale_price, currency, management_fee_pct, captor_agent_id, owner_id, is_published, visible_en_portal, is_featured, disponible_desde, key_location, key_holder_name, amenities, created_at, updated_at"
      )
      .limit(1);
    q = property_id ? q.eq("id", property_id) : q.eq("property_code", property_code!);

    const { data, error } = await q.maybeSingle();
    if (error) throw new ToolError(error.message);
    if (!data) throw new ToolError("Propiedad no encontrada (o sin permiso para verla).");
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { property: data },
    };
  },
});
