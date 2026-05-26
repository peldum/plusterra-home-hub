import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Validate cron secret — deny if secret is not configured
  const cronSecret = req.headers.get('x-cron-secret');
  const expectedSecret = Deno.env.get('X_CRON_SECRET');
  if (!expectedSecret || cronSecret !== expectedSecret) {
    return new Response('Unauthorized', { status: 401, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const now = new Date();
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
  const twentyFourHoursLater = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  try {
    // Get events within 24h window that need reminders
    const { data: events, error } = await supabase
      .from('eventos_internos')
      .select('*')
      .gte('fecha_inicio', now.toISOString())
      .lte('fecha_inicio', twentyFourHoursLater.toISOString());

    if (error) throw error;

    let notificationsCreated = 0;

    for (const event of (events || [])) {
      const eventStart = new Date(event.fecha_inicio);
      const hoursUntil = (eventStart.getTime() - now.getTime()) / (1000 * 60 * 60);

      // Determine which reminder to send
      let shouldNotify = false;
      let tipo = 'recordatorio';
      let mensaje = '';

      if (event.recordatorio_1h && hoursUntil <= 1 && hoursUntil > 0) {
        shouldNotify = true;
        mensaje = `El evento "${event.titulo}" comienza en menos de 1 hora`;
        tipo = 'recordatorio_urgente';
      } else if (event.recordatorio_24h && hoursUntil <= 24 && hoursUntil > 23) {
        shouldNotify = true;
        mensaje = `El evento "${event.titulo}" es mañana`;
        tipo = 'recordatorio';
      }

      if (!shouldNotify) continue;

      // Get target users
      let targetUserIds: string[] = [];
      const destinatarios = event.destinatarios || ['todos'];

      if (destinatarios.includes('todos')) {
        const { data: allProfiles } = await supabase
          .from('profiles')
          .select('id')
          .eq('status', 'active');
        targetUserIds = (allProfiles || []).map((p: any) => p.id);
      } else {
        targetUserIds = destinatarios;
      }

      // Create notifications (skip if already exists)
      for (const userId of targetUserIds) {
        const { data: existing } = await supabase
          .from('notificaciones_internas')
          .select('id')
          .eq('user_id', userId)
          .eq('referencia_id', event.id)
          .eq('tipo', tipo)
          .limit(1);

        if (existing && existing.length > 0) continue;

        await supabase.from('notificaciones_internas').insert({
          user_id: userId,
          tipo,
          referencia_id: event.id,
          titulo: event.titulo,
          mensaje,
        });
        notificationsCreated++;
      }
    }

    return new Response(JSON.stringify({ ok: true, notificationsCreated }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
