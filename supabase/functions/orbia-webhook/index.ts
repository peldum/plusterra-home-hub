import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método no permitido' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json();
    const { nombre, telefono, consulta, fuente } = body;

    if (!nombre || !telefono) {
      return new Response(JSON.stringify({ error: 'nombre y telefono son requeridos' }), {
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
      visitor_name: nombre,
      visitor_phone: telefono,
      visitor_message: consulta || null,
      channel: fuente || 'orbia-voz',
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
