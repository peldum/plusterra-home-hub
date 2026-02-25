import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useAvailableProperties = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['available-properties'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('properties')
        .select('id, title, property_type, status, address, city, neighborhood, bedrooms, bathrooms, area_m2, has_garage, garage_details, rental_price, sale_price, currency, rental_period, captor_agent_id, description, public_website_url, reserved_by, reserved_at, reservation_amount, reservation_client_name')
        .in('status', ['available', 'reserved', 'rented', 'sold'])
        .order('created_at', { ascending: false });
      if (error) throw error;

      // Fetch captor agent names
      const agentIds = [...new Set((data || []).map(p => p.captor_agent_id).filter(Boolean))];
      // Also include reserved_by agents
      const reservedByIds = [...new Set((data || []).map(p => p.reserved_by).filter(Boolean))];
      const allAgentIds = [...new Set([...agentIds, ...reservedByIds])];
      let agentMap: Record<string, { name: string; phone: string | null }> = {};
      if (allAgentIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, phone')
          .in('id', allAgentIds);
        if (profiles) {
          agentMap = Object.fromEntries(profiles.map(p => [p.id, { name: p.full_name, phone: p.phone }]));
        }
      }

      return (data || []).map(p => ({
        ...p,
        captor_name: agentMap[p.captor_agent_id]?.name || 'Sin asignar',
        captor_phone: agentMap[p.captor_agent_id]?.phone || null,
        reserved_by_name: p.reserved_by ? agentMap[p.reserved_by]?.name || null : null,
      }));
    },
    enabled: !!user,
  });
};
