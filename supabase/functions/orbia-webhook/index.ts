import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Simple in-memory rate limiter (per isolate lifetime)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 30; // 30 requests per minute per IP

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

// Basic sanitization: strip HTML tags and trim
function sanitize(input: string, maxLen: number): string {
  return input
    .replace(/<[^>]*>/g, '') // strip HTML tags
    .replace(/[<>"'&]/g, '') // strip dangerous chars
    .trim()
    .slice(0, maxLen);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método no permitido' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Rate limiting by IP
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('cf-connecting-ip')
    || 'unknown';

  if (isRateLimited(clientIp)) {
    return new Response(JSON.stringify({ error: 'Demasiadas solicitudes. Intentá de nuevo más tarde.' }), {
      status: 429,
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '60' },
    });
  }

  try {
    const body = await req.json();
    const { nombre, telefono, consulta, fuente } = body;

    // Validate required fields
    if (!nombre || typeof nombre !== 'string' || nombre.trim().length < 2) {
      return new Response(JSON.stringify({ error: 'nombre es requerido (mínimo 2 caracteres)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!telefono || typeof telefono !== 'string' || telefono.trim().length < 6) {
      return new Response(JSON.stringify({ error: 'telefono es requerido (mínimo 6 caracteres)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate phone format: only digits, +, spaces, dashes
    const phoneClean = telefono.trim();
    if (!/^[\d\s+\-()]{6,20}$/.test(phoneClean)) {
      return new Response(JSON.stringify({ error: 'Formato de teléfono inválido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Sanitize inputs
    const safeName = sanitize(nombre, 100);
    const safePhone = phoneClean.slice(0, 20);
    const safeConsulta = consulta ? sanitize(String(consulta), 500) : null;
    const safeFuente = fuente ? sanitize(String(fuente), 50) : 'orbia-voz';

    if (safeName.length < 2) {
      return new Response(JSON.stringify({ error: 'nombre inválido después de sanitización' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get default lead assignee
    const { data: settings } = await supabase
      .from('portal_settings')
      .select('default_lead_assignee_agent_id')
      .limit(1)
      .single();

    let assigneeId = settings?.default_lead_assignee_agent_id;

    // Fallback to first superadmin
    if (!assigneeId) {
      const { data: admin } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'superadmin')
        .limit(1)
        .single();
      assigneeId = admin?.user_id;
    }

    if (!assigneeId) {
      return new Response(JSON.stringify({ error: 'No se encontró agente asignado' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { error } = await supabase.from('portal_leads').insert({
      visitor_name: safeName,
      visitor_phone: safePhone,
      visitor_message: safeConsulta,
      channel: safeFuente,
      status: 'nuevo',
      captor_agent_id: assigneeId,
      attended_by: assigneeId,
    });

    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('orbia-webhook error:', err);
    return new Response(JSON.stringify({ error: 'Error interno del servidor' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
