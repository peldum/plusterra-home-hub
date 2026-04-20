/**
 * useKeyMovementsRealtime — Suscripción en tiempo real a movimientos de llaves.
 * Muestra notificaciones toast a Secretaría, Admin y SuperAdmin cuando un
 * agente retira o devuelve una llave, sin necesidad de refrescar la página.
 *
 * Se integra en MainLayout para estar activo en toda la aplicación.
 */
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Key, KeyRound } from 'lucide-react';

const NOTIFIED_ROLES = ['superadmin', 'admin', 'secretaria'] as const;

export const useKeyMovementsRealtime = (opts?: { enabled?: boolean }) => {
  const { role, user } = useAuth();
  const qc = useQueryClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const enabled = opts?.enabled ?? true;
  const shouldListen = enabled && !!user && NOTIFIED_ROLES.includes(role as any);

  useEffect(() => {
    if (!shouldListen) return;

    // Avoid duplicate subscriptions
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase
      .channel('key-movements-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'key_movements',
        },
        async (payload) => {
          const movement = payload.new as {
            id: string;
            property_id: string;
            direction: string;
            movement_type: string;
            agent_id: string | null;
            external_name: string | null;
            created_at: string;
          };

          // Fetch property title and agent name for the notification
          const [propertyRes, agentRes] = await Promise.all([
            supabase
              .from('properties')
              .select('title, property_code')
              .eq('id', movement.property_id)
              .single(),
            movement.agent_id
              ? supabase
                  .from('profiles')
                  .select('full_name')
                  .eq('id', movement.agent_id)
                  .single()
              : Promise.resolve({ data: null }),
          ]);

          const propertyTitle = propertyRes.data?.title ?? 'Propiedad';
          const propertyCode = propertyRes.data?.property_code ?? '';
          const agentName =
            (agentRes as any)?.data?.full_name ??
            movement.external_name ??
            'Tercero';

          const isRetiro = movement.direction === 'RETIRO';
          const isDevolucion = movement.direction === 'DEVOLUCION';

          if (isRetiro) {
            const typeLabel =
              movement.movement_type === 'AGENTE_INTERNO'
                ? `Agente: ${agentName}`
                : movement.movement_type === 'AGENTE_EXTERNO'
                ? `Externo: ${agentName}`
                : `Mantenimiento: ${agentName}`;

            toast(`🔑 Llave retirada`, {
              description: `${propertyTitle} (${propertyCode}) · ${typeLabel}`,
              duration: 3000,
              icon: '🔑',
            });
          } else if (isDevolucion) {
            toast(`✅ Llave devuelta`, {
              description: `${propertyTitle} (${propertyCode}) · Devuelta por ${agentName}`,
              duration: 3000,
              icon: '✅',
            });
          }

          // Debounced invalidation to prevent cascading
          setTimeout(() => {
            qc.invalidateQueries({ queryKey: ['key-status', movement.property_id] });
            qc.invalidateQueries({ queryKey: ['key-movements', movement.property_id] });
            qc.invalidateQueries({ queryKey: ['active-key-movements'] });
          }, 300);
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [shouldListen, user?.id, qc]);
};
