import { Building2, Home, Key, TrendingUp } from 'lucide-react';

const propertyStats = [
  { label: 'En Alquiler', count: 45, icon: Key, color: 'bg-info/10 text-info' },
  { label: 'En Venta', count: 32, icon: TrendingUp, color: 'bg-success/10 text-success' },
  { label: 'Administradas', count: 78, icon: Building2, color: 'bg-secondary/10 text-secondary' },
  { label: 'Disponibles', count: 23, icon: Home, color: 'bg-primary/10 text-primary' },
];

export const PropertyOverview = () => {
  return (
    <div className="bg-card border border-border rounded-xl p-6 animate-slide-up opacity-0" style={{ animationDelay: '300ms', animationFillMode: 'forwards' }}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-display text-lg font-semibold text-foreground">
          Resumen de Propiedades
        </h3>
        <button className="text-sm text-primary hover:text-primary/80 font-medium transition-colors">
          Ver todas
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {propertyStats.map((stat) => (
          <div key={stat.label} className="text-center p-3 rounded-lg bg-muted/30">
            <div className={`w-10 h-10 mx-auto rounded-lg ${stat.color} flex items-center justify-center mb-2`}>
              <stat.icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-foreground">{stat.count}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

    </div>
  );
};
