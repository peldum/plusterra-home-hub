import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "search_properties",
  title: "Buscar propiedades",
  description:
    "Busca propiedades del catálogo interno por texto (título, código PLT, dirección), estado, tipo, ciudad o barrio.",
  inputSchema: {
    query: z.string().trim().min(1).optional().describe("Texto libre: título, código PLT, dirección o barrio."),
    status: z.string().trim().optional().describe("Estado comercial, ej: available, reserved, rented, sold."),
    property_type: z.string().trim().optional().describe("Tipo de propiedad, ej: departamento, casa, terreno."),
    city: z.string().trim().optional().describe("Ciudad."),
    limit: z.number().int().min(1).max(50).default(20).describe("Máximo de resultados (1-50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, status, property_type, city, limit }, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("No autenticado.");
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("properties")
      .select(
        "id, property_code, title, property_type, status, city, neighborhood, address, bedrooms, bathrooms, area_m2, rental_price, sale_price, currency, is_published"
      )
      .order("created_at", { ascending: false })
      .limit(limit ?? 20);

    if (status) q = q.eq("status", status);
    if (property_type) q = q.eq("property_type", property_type);
    if (city) q = q.ilike("city", `%${city}%`);
    if (query) {
      const like = `%${query}%`;
      q = q.or(
        `title.ilike.${like},property_code.ilike.${like},address.ilike.${like},neighborhood.ilike.${like}`
      );
    }

    const { data, error } = await q;
    if (error) throw new ToolError(error.message);
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { count: data?.length ?? 0, properties: data ?? [] },
    };
  },
});
