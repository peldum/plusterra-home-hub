import { Building2, Home, Key, TrendingUp, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const usePropertyStats = () => {
  return useQuery({
    queryKey: ['property-overview-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.from('properties').select('status, rental_price, sale_price');
      if (error) throw error;

      const rows = data || [];
      const rented = rows.filter(p => p.status === 'rented').length;
      const forSale = rows.filter(p => Number(p.sale_price) > 0 && p.status === 'available').length;
      const total = rows.length;
      const available = rows.filter(p => p.status === 'available').length;

      return { rented, forSale, total, available };
    },
  });
};

export const PropertyOverview = () => {
  const { data, isLoading } = usePropertyStats();

  const propertyStats = [
    { label: 'Alquiladas', count: data?.rented ?? 0, icon: Key, color: 'bg-info/10 text-info' },
    { label: 'En Venta', count: data?.forSale ?? 0, icon: TrendingUp, color: 'bg-success/10 text-success' },
    { label: 'Total', count: data?.total ?? 0, icon: Building2, color: 'bg-secondary/10 text-secondary' },
    { label: 'Disponibles', count: data?.available ?? 0, icon: Home, color: 'bg-primary/10 text-primary' },
  ];

  return (
    <div className="bg-card border border-border rounded-xl p-6 animate-slide-up opacity-0" style={{ animationDelay: '300ms', animationFillMode: 'forwards' }}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-display text-lg font-semibold text-foreground">
          Resumen de Propiedades
        </h3>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {propertyStats.map((stat) => (
          <div key={stat.label} className="text-center p-3 rounded-lg bg-muted/30">
            <div className={`w-10 h-10 mx-auto rounded-lg ${stat.color} flex items-center justify-center mb-2`}>
              <stat.icon className="w-5 h-5" />
            </div>
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" />
            ) : (
              <p className="text-2xl font-bold text-foreground">{stat.count}</p>
            )}
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
