import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

type ProfileNameRow = {
  id: string;
  full_name: string | null;
};

const toAgentMap = (rows: ProfileNameRow[] | null | undefined) => {
  if (!rows?.length) return {} as Record<string, { name: string; phone: string | null }>;

  return Object.fromEntries(
    rows.map((profile) => [
      profile.id,
      {
        name: profile.full_name || 'Sin nombre',
        phone: null,
      },
    ])
  );
};

const resolveAgentMap = async (agentIds: string[]) => {
  const normalizedIds = [...new Set(agentIds.filter(Boolean))];
  if (normalizedIds.length === 0) return {} as Record<string, { name: string; phone: string | null }>;

  const { data: rpcProfiles, error: rpcError } = await supabase
    .rpc('get_profiles_public_by_ids', { _ids: normalizedIds });

  if (!rpcError && rpcProfiles) {
    return toAgentMap(rpcProfiles as ProfileNameRow[]);
  }

  console.warn('[useAvailableProperties] RPC get_profiles_public_by_ids failed, using fallback view:', rpcError?.message);

  const { data: fallbackProfiles, error: fallbackError } = await supabase
    .from('profiles_public')
    .select('id, full_name')
    .in('id', normalizedIds);

  if (fallbackError) {
    console.warn('[useAvailableProperties] Fallback profiles_public failed:', fallbackError.message);
    return {} as Record<string, { name: string; phone: string | null }>;
  }

  return toAgentMap((fallbackProfiles || []) as ProfileNameRow[]);
};

export const useAvailableProperties = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['available-properties', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('properties')
        .select('id, title, internal_title, property_type, status, address, city, neighborhood, bedrooms, bathrooms, area_m2, has_garage, garage_details, garage_number, rental_price, sale_price, currency, rental_period, captor_agent_id, description, public_description, is_published, reserved_by, reserved_at, reservation_amount, reservation_client_name, reservation_requested_by, reservation_requested_at, reservation_request_client_name, reservation_request_amount, reservation_expires_at, key_location, key_holder_name, key_holder_phone, property_code, owner_id')
        .in('status', ['available', 'reservation_request', 'reserved', 'rented', 'sold'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      const allAgentIds = [...new Set(
        (data || [])
          .flatMap((property) => [property.captor_agent_id, property.reserved_by, property.reservation_requested_by])
          .filter(Boolean)
      )] as string[];

      const agentMap = await resolveAgentMap(allAgentIds);

      return (data || []).map((property) => ({
        ...property,
        captor_name: agentMap[property.captor_agent_id]?.name || 'Sin asignar',
        captor_phone: agentMap[property.captor_agent_id]?.phone || null,
        reserved_by_name: property.reserved_by ? agentMap[property.reserved_by]?.name || null : null,
        requested_by_name: property.reservation_requested_by ? agentMap[property.reservation_requested_by]?.name || null : null,
      }));
    },
    enabled: !!user,
    retry: 1,
  });
};
