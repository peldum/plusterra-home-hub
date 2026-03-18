import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface VisitRow {
  visited_at: string;
  page_path: string;
  referrer: string | null;
  country: string | null;
  city: string | null;
  device_type: string | null;
  session_id: string | null;
}

export interface AnalyticsSummary {
  totalVisits: number;
  uniqueSessions: number;
  byDevice: Record<string, number>;
  byPage: { page: string; count: number }[];
  byCountry: { country: string; count: number }[];
  byCity: { city: string; count: number }[];
  dailyVisits: { date: string; count: number }[];
}

export function usePortalAnalytics(days: number = 30) {
  return useQuery({
    queryKey: ['portal-analytics', days],
    queryFn: async (): Promise<AnalyticsSummary> => {
      const since = new Date();
      since.setDate(since.getDate() - days);

      const { data, error } = await supabase
        .from('portal_visits')
        .select('visited_at, page_path, referrer, country, city, device_type, session_id')
        .gte('visited_at', since.toISOString())
        .order('visited_at', { ascending: false })
        .limit(5000);

      if (error) throw error;
      const rows = (data || []) as VisitRow[];

      // Aggregate
      const sessions = new Set<string>();
      const byDevice: Record<string, number> = {};
      const pageMap: Record<string, number> = {};
      const countryMap: Record<string, number> = {};
      const cityMap: Record<string, number> = {};
      const dailyMap: Record<string, number> = {};

      for (const r of rows) {
        if (r.session_id) sessions.add(r.session_id);

        const dev = r.device_type || 'unknown';
        byDevice[dev] = (byDevice[dev] || 0) + 1;

        pageMap[r.page_path] = (pageMap[r.page_path] || 0) + 1;

        const c = r.country || 'Desconocido';
        countryMap[c] = (countryMap[c] || 0) + 1;

        const city = r.city || 'Desconocido';
        cityMap[city] = (cityMap[city] || 0) + 1;

        const day = r.visited_at.slice(0, 10);
        dailyMap[day] = (dailyMap[day] || 0) + 1;
      }

      const toSorted = (map: Record<string, number>, key: string) =>
        Object.entries(map)
          .map(([k, v]) => ({ [key]: k, count: v }) as any)
          .sort((a: any, b: any) => b.count - a.count);

      return {
        totalVisits: rows.length,
        uniqueSessions: sessions.size,
        byDevice,
        byPage: toSorted(pageMap, 'page').slice(0, 20),
        byCountry: toSorted(countryMap, 'country').slice(0, 15),
        byCity: toSorted(cityMap, 'city').slice(0, 15),
        dailyVisits: Object.entries(dailyMap)
          .map(([date, count]) => ({ date, count }))
          .sort((a, b) => a.date.localeCompare(b.date)),
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}
