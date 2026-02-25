import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ReservationEvent {
  id: string;
  property_id: string;
  event_type: string;
  agent_origin_id: string | null;
  agent_origin_name: string | null;
  agent_destination_id: string | null;
  agent_destination_name: string | null;
  executed_by: string;
  executed_by_name: string | null;
  executed_by_role: string | null;
  reason: string | null;
  snapshot_before: any;
  snapshot_after: any;
  created_at: string;
}

export const useReservationHistory = (propertyId: string | undefined) => {
  return useQuery({
    queryKey: ['reservation-history', propertyId],
    queryFn: async () => {
      if (!propertyId) return [];
      const { data, error } = await supabase
        .from('reservation_history' as any)
        .select('*')
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as unknown as ReservationEvent[];
    },
    enabled: !!propertyId,
  });
};

/** Helper to insert a reservation history event */
export const insertReservationEvent = async (event: {
  property_id: string;
  event_type: 'RESERVADA' | 'RESERVA_CANCELADA' | 'RESERVA_CONFIRMADA' | 'RESERVA_VENCIDA' | 'RESERVA_TRANSFERIDA';
  agent_origin_id?: string | null;
  agent_origin_name?: string | null;
  agent_destination_id?: string | null;
  agent_destination_name?: string | null;
  executed_by: string;
  executed_by_name?: string | null;
  executed_by_role?: string | null;
  reason?: string | null;
  snapshot_before?: any;
  snapshot_after?: any;
}) => {
  const { error } = await supabase
    .from('reservation_history' as any)
    .insert(event);
  if (error) console.error('Error inserting reservation history:', error);
};
