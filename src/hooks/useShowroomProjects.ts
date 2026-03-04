import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ShowroomProject {
  id: string;
  name: string;
  address: string;
  city: string | null;
  floors: number | null;
  total_units: number | null;
  showroom_cover_url: string | null;
  showroom_description: string | null;
  showroom_developer: string | null;
  showroom_delivery_date: string | null;
  showroom_price_from: number | null;
  showroom_currency: string | null;
  showroom_brochure_url: string | null;
  showroom_video_url: string | null;
  showroom_amenities: string[];
  showroom_contact_whatsapp: string | null;
  gallery: ShowroomImage[];
}

export interface ShowroomImage {
  id: string;
  image_url: string;
  image_type: string;
  caption: string | null;
  order_index: number;
}

export const useShowroomProjects = () => {
  return useQuery({
    queryKey: ['showroom-projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('buildings')
        .select('*')
        .eq('is_showroom', true)
        .eq('showroom_enabled', true)
        .order('created_at', { ascending: false });
      if (error) throw error;

      const buildingIds = (data || []).map((b: any) => b.id);
      let gallery: any[] = [];
      if (buildingIds.length > 0) {
        const { data: gData } = await supabase
          .from('showroom_gallery')
          .select('*')
          .in('building_id', buildingIds)
          .order('order_index');
        gallery = gData || [];
      }

      return (data || []).map((b: any) => ({
        id: b.id,
        name: b.name,
        address: b.address,
        city: b.city,
        floors: b.floors,
        total_units: b.total_units,
        showroom_cover_url: b.showroom_cover_url,
        showroom_description: b.showroom_description,
        showroom_developer: b.showroom_developer,
        showroom_delivery_date: b.showroom_delivery_date,
        showroom_price_from: b.showroom_price_from,
        showroom_currency: b.showroom_currency,
        showroom_brochure_url: b.showroom_brochure_url,
        showroom_video_url: b.showroom_video_url,
        showroom_amenities: Array.isArray(b.showroom_amenities) ? b.showroom_amenities : [],
        showroom_contact_whatsapp: b.showroom_contact_whatsapp,
        gallery: gallery
          .filter((g: any) => g.building_id === b.id)
          .map((g: any) => ({
            id: g.id,
            image_url: g.image_url,
            image_type: g.image_type,
            caption: g.caption,
            order_index: g.order_index,
          })),
      })) as ShowroomProject[];
    },
    staleTime: 2 * 60_000,
  });
};
