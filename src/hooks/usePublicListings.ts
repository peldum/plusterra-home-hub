import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PublicListing {
  id: string;
  title: string;
  public_description: string | null;
  description: string | null;
  address: string | null;
  city: string | null;
  neighborhood: string | null;
  property_type: string;
  property_code: string;
  rental_price: number | null;
  sale_price: number | null;
  rental_period: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  area_m2: number | null;
  has_garage: boolean | null;
  garage_details: string | null;
  amenities: string[] | null;
  is_featured: boolean;
  published_at: string | null;
  public_lat: number | null;
  public_lng: number | null;
  exact_location_enabled: boolean;
  captor_agent_id: string;
  video_url: string | null;
  tour_360_url: string | null;
  currency: string | null;
  cocina_integrada: boolean;
  acepta_mascotas: boolean;
  disponible_desde: string | null;
  status: string;
  visible_en_portal: boolean;
  // joined
  captor_name?: string;
  captor_phone?: string;
  photos?: { id: string; photo_url: string; thumbnail_url: string | null }[];
}

export const usePublicListings = (filters?: {
  search?: string;
  businessType?: string;
  propertyType?: string;
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  featuredOnly?: boolean;
  sortBy?: string;
  limit?: number;
}) => {
  return useQuery({
    queryKey: ['public-listings', filters],
    queryFn: async () => {
      // Fetch published properties (anon access via RLS)
      let query = supabase
        .from('properties')
        .select('id, title, public_description, description, address, city, neighborhood, property_type, property_code, rental_price, sale_price, currency, rental_period, bedrooms, bathrooms, area_m2, has_garage, garage_details, amenities, is_featured, published_at, public_lat, public_lng, exact_location_enabled, captor_agent_id, video_url, tour_360_url, cocina_integrada, acepta_mascotas, disponible_desde, status, visible_en_portal')
        .eq('is_published', true)
        .eq('visible_en_portal', true)
        .in('status', ['available', 'rented']);

      if (filters?.featuredOnly) query = query.eq('is_featured', true);
      if (filters?.propertyType && filters.propertyType !== 'all') query = query.eq('property_type', filters.propertyType as any);
      if (filters?.city && filters.city !== 'all') query = query.eq('city', filters.city);
      if (filters?.bedrooms) query = query.gte('bedrooms', filters.bedrooms);

      // Sort: featured first, then by selected criteria
      query = query.order('is_featured', { ascending: false });
      if (filters?.sortBy === 'price_asc') query = query.order('rental_price', { ascending: true, nullsFirst: false });
      else if (filters?.sortBy === 'price_desc') query = query.order('rental_price', { ascending: false, nullsFirst: false });
      else query = query.order('published_at', { ascending: false, nullsFirst: false });

      if (filters?.limit) query = query.limit(filters.limit);

      const { data, error } = await query;
      if (error) throw error;

      if (!data || data.length === 0) return [] as PublicListing[];

      // Fetch agent info from portal_agent_profiles (public, no auth needed)
      const agentIds = [...new Set(data.map(p => p.captor_agent_id))];
      const { data: agents } = await supabase
        .from('portal_agent_profiles')
        .select('agent_id, public_name')
        .in('agent_id', agentIds)
        .eq('show_in_portal', true);

      // Fetch public WhatsApp from portal_agent_profiles
      const { data: agentProfiles } = await supabase
        .from('portal_agent_profiles')
        .select('agent_id, public_phone_whatsapp')
        .in('agent_id', agentIds)
        .eq('show_in_portal', true);

      const agentMap = new Map(agents?.map(a => [a.id, a]) || []);
      const phoneMap = new Map(agentProfiles?.map(a => [a.agent_id, a.public_phone_whatsapp]) || []);

      // Fetch photos
      const propertyIds = data.map(p => p.id);
      const { data: photos } = await supabase
        .from('property_photos')
        .select('id, property_id, photo_url, thumbnail_url, order_index')
        .in('property_id', propertyIds)
        .order('order_index', { ascending: true })
        .order('created_at', { ascending: true });

      const photoMap = new Map<string, typeof photos>();
      photos?.forEach(ph => {
        if (!photoMap.has(ph.property_id)) photoMap.set(ph.property_id, []);
        photoMap.get(ph.property_id)!.push(ph);
      });

      // Apply client-side filters
      let results: PublicListing[] = data.map(p => ({
        ...p,
        amenities: p.amenities as string[] | null,
        captor_name: agentMap.get(p.captor_agent_id)?.full_name,
        captor_phone: phoneMap.get(p.captor_agent_id) || undefined,
        photos: photoMap.get(p.id) || [],
      }));

      // Business type filter (client-side)
      if (filters?.businessType && filters.businessType !== 'all') {
        results = results.filter(p => {
          const hasRent = Number(p.rental_price) > 0;
          const hasSale = Number(p.sale_price) > 0;
          if (filters.businessType === 'rent') return hasRent && p.rental_period !== 'daily';
          if (filters.businessType === 'sale') return hasSale;
          if (filters.businessType === 'temporary') return hasRent && p.rental_period === 'daily';
          return true;
        });
      }

      // Price filter (client-side)
      if (filters?.minPrice || filters?.maxPrice) {
        results = results.filter(p => {
          const price = Number(p.sale_price) > 0 ? Number(p.sale_price) : Number(p.rental_price);
          if (filters.minPrice && price < filters.minPrice) return false;
          if (filters.maxPrice && price > filters.maxPrice) return false;
          return true;
        });
      }

      // Search filter
      if (filters?.search) {
        const s = filters.search.toLowerCase();
        results = results.filter(p =>
          p.title.toLowerCase().includes(s) ||
          (p.city || '').toLowerCase().includes(s) ||
          (p.neighborhood || '').toLowerCase().includes(s) ||
          (p.address || '').toLowerCase().includes(s)
        );
      }

      return results;
    },
    staleTime: 60_000,
  });
};

export const useSubmitPortalLead = () => {
  const submit = async (lead: {
    property_id: string;
    captor_agent_id: string;
    visitor_name: string;
    visitor_phone: string;
    visitor_message?: string;
    preferred_schedule?: string;
    email?: string;
    channel?: string;
  }) => {
    const { error } = await supabase
      .from('portal_leads' as any)
      .insert(lead as any);
    if (error) throw error;
  };
  return { submit };
};
