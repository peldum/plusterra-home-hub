import { Home, DollarSign, Video, Globe } from 'lucide-react';
import type { PublicListing } from '@/hooks/usePublicListings';
import { useCountUp } from './useCountUp';

interface Props {
  listings: PublicListing[];
}

const StatItem = ({ icon: Icon, value, label, color }: { icon: any; value: number; label: string; color: string }) => {
  const { value: animated, ref } = useCountUp(value);
  return (
    <div ref={ref} className="flex flex-col items-center gap-1 p-4">
      <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mb-1`}>
        <Icon className="w-5 h-5" />
      </div>
      <span className="text-2xl font-bold text-foreground font-display">{animated}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
};

export const AgentStatsBar = ({ listings }: Props) => {
  const rentCount = listings.filter(p => Number(p.rental_price) > 0).length;
  const saleCount = listings.filter(p => Number(p.sale_price) > 0).length;
  const videoCount = listings.filter(p => p.video_url).length;
  const tourCount = listings.filter(p => p.tour_360_url).length;

  const stats = [
    { icon: Home, value: listings.length, label: 'Propiedades', color: 'bg-primary/10 text-primary' },
    { icon: DollarSign, value: saleCount, label: 'En venta', color: 'bg-secondary/10 text-secondary' },
    ...(rentCount > 0 ? [{ icon: Home, value: rentCount, label: 'En alquiler', color: 'bg-accent/10 text-accent' }] : []),
    ...(videoCount > 0 ? [{ icon: Video, value: videoCount, label: 'Con video', color: 'bg-purple-100 text-purple-600' }] : []),
    ...(tourCount > 0 ? [{ icon: Globe, value: tourCount, label: 'Tour 360°', color: 'bg-cyan-100 text-cyan-600' }] : []),
  ].filter(s => s.value > 0);

  if (stats.length < 2) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 bg-card border border-border rounded-xl shadow-sm overflow-hidden divide-x divide-border">
      {stats.map((s, i) => (
        <StatItem key={i} {...s} />
      ))}
    </div>
  );
};
