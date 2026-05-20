import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

const ALLOWED_ROLES = new Set(["superadmin", "admin", "accounting", "secretaria"]);

// Approx cost per 1M tokens for gemini-3-flash-preview (very rough)
const COST_IN_PER_1M = 0.075;
const COST_OUT_PER_1M = 0.30;

const SYSTEM_PROMPT_BASE = `Sos el Asistente Interno del sistema Plusterra (inmobiliaria). Tu único objetivo es enseñar a los usuarios cómo usar el sistema, dando paso a paso claro y breve.

REGLAS ESTRICTAS:
- Solo respondés sobre PROCEDIMIENTOS de uso del sistema (cómo registrar, dónde encontrar, qué botón apretar).
- NUNCA reveles contraseñas, claves API, datos personales de usuarios, datos financieros reales, ni información del código interno.
- Podés **combinar y sintetizar** información de varias secciones del manual para responder preguntas de flujo, "¿quién hace qué?", "¿qué conviene?" o troubleshooting, siempre que los pasos estén respaldados por el manual.
- NUNCA inventes botones, rutas o campos que no aparezcan en el manual. Si una pregunta requiere un dato puntual que no está, decí: "Eso específico no está en el manual todavía. Avisale al SuperAdmin para que lo agregue." y, si podés, ofrecé lo más cercano que sí esté documentado.
- Respondé SIEMPRE en español rioplatense (vos/tenés).
- Sé conciso: usá listas numeradas para los pasos.
- Si te preguntan cualquier cosa que no sea sobre el uso del sistema (chistes, opiniones, código, datos reales), declinás amablemente y volvés al tema.

MANUAL DEL SISTEMA:
`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonErr(401, "No autenticado");

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return jsonErr(401, "No autenticado");

    const { data: roleRow } = await admin
      .from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
    const role = roleRow?.role as string | undefined;
    if (!role || !ALLOWED_ROLES.has(role)) {
      return jsonErr(403, "No tenés permiso para usar el asistente.");
    }

    const body = await req.json().catch(() => ({}));
    const question = String(body?.question ?? "").trim();
    const history = Array.isArray(body?.history) ? body.history.slice(-6) : [];
    if (!question || question.length > 2000) {
      return jsonErr(400, "Pregunta vacía o demasiado larga.");
    }

    // Quota check
    const { data: quotaData, error: quotaErr } = await admin
      .rpc("get_user_chat_quota", { _uid: user.id });
    if (quotaErr) {
      console.error("quota err", quotaErr);
      return jsonErr(500, "Error verificando cuota.");
    }
    const quota = Array.isArray(quotaData) ? quotaData[0] : quotaData;
    if (quota?.kill_switch) {
      return jsonErr(423, "El asistente está temporalmente desactivado por el SuperAdmin.");
    }
    if (!quota?.is_enabled) {
      return jsonErr(423, "Tu acceso al asistente está bloqueado. Consultá con el SuperAdmin.");
    }
    if ((quota?.remaining ?? 0) <= 0) {
      return jsonErr(429, `Alcanzaste tu límite diario de ${quota?.daily_limit ?? 0} consultas. Volvé mañana o pedile al SuperAdmin que te dé consultas extra.`);
    }

    // Load settings + manual
    const [{ data: settings }, { data: manual }] = await Promise.all([
      admin.from("ai_chat_settings").select("model, system_prompt_extra").eq("id", 1).maybeSingle(),
      admin.from("ai_manual_sections")
        .select("title, category, content")
        .eq("is_active", true)
        .order("display_order", { ascending: true }),
    ]);

    const model = settings?.model || "google/gemini-3-flash-preview";
    const manualText = (manual ?? [])
      .map((m: any) => `## ${m.title}\n_Categoría: ${m.category}_\n\n${m.content}`)
      .join("\n\n---\n\n");

    const systemPrompt = SYSTEM_PROMPT_BASE + "\n" + manualText
      + (settings?.system_prompt_extra ? `\n\n${settings.system_prompt_extra}` : "");

    const messages = [
      { role: "system", content: systemPrompt },
      ...history.map((m: any) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: String(m.content ?? "").slice(0, 2000),
      })),
      { role: "user", content: question },
    ];

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, messages, temperature: 0.3 }),
    });

    if (aiRes.status === 429) {
      await logErr(admin, user.id, role, question, "rate_limit");
      return jsonErr(429, "El servicio de IA está saturado. Probá en unos segundos.");
    }
    if (aiRes.status === 402) {
      await logErr(admin, user.id, role, question, "credits_exhausted");
      return jsonErr(402, "Se agotaron los créditos de IA. Avisale al SuperAdmin.");
    }
    if (!aiRes.ok) {
      const txt = await aiRes.text();
      console.error("AI gateway error", aiRes.status, txt);
      await logErr(admin, user.id, role, question, `gateway_${aiRes.status}`);
      return jsonErr(500, "Error del asistente. Probá de nuevo.");
    }

    const aiJson = await aiRes.json();
    const answer = aiJson?.choices?.[0]?.message?.content?.toString() ?? "(sin respuesta)";
    const usage = aiJson?.usage ?? {};
    const tokensIn = Number(usage.prompt_tokens ?? 0);
    const tokensOut = Number(usage.completion_tokens ?? 0);
    const cost = (tokensIn / 1_000_000) * COST_IN_PER_1M + (tokensOut / 1_000_000) * COST_OUT_PER_1M;

    await admin.from("ai_chat_logs").insert({
      user_id: user.id,
      role,
      question,
      answer,
      tokens_in: tokensIn,
      tokens_out: tokensOut,
      cost_usd: cost,
    });

    return new Response(
      JSON.stringify({
        answer,
        remaining: Math.max(0, (quota?.remaining ?? 1) - 1),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("ai-internal-chat error", e);
    return jsonErr(500, "Error interno del asistente.");
  }
});

function jsonErr(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function logErr(admin: any, userId: string, role: string, question: string, err: string) {
  try {
    await admin.from("ai_chat_logs").insert({
      user_id: userId, role, question, error: err,
    });
  } catch (_) { /* ignore */ }
}