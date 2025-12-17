import { Building2, Home, Key, TrendingUp } from 'lucide-react';

const propertyStats = [
  { label: 'En Alquiler', count: 45, icon: Key, color: 'bg-info/10 text-info' },
  { label: 'En Venta', count: 32, icon: TrendingUp, color: 'bg-success/10 text-success' },
  { label: 'Administradas', count: 78, icon: Building2, color: 'bg-secondary/10 text-secondary' },
  { label: 'Disponibles', count: 23, icon: Home, color: 'bg-primary/10 text-primary' },
];

const recentProperties = [
  {
    id: 1,
    title: 'Departamento 3 Amb.',
    location: 'Palermo, Buenos Aires',
    price: '$1,200/mes',
    status: 'alquiler',
    image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=300&h=200&fit=crop',
  },
  {
    id: 2,
    title: 'Casa con Jardín',
    location: 'Nordelta, Tigre',
    price: '$450,000',
    status: 'venta',
    image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=300&h=200&fit=crop',
  },
  {
    id: 3,
    title: 'Oficina Premium',
    location: 'Puerto Madero, CABA',
    price: '$3,500/mes',
    status: 'alquiler',
    image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=300&h=200&fit=crop',
  },
];

export const PropertyOverview = () => {
  const statusColors = {
    alquiler: 'bg-info/10 text-info border-info/20',
    venta: 'bg-success/10 text-success border-success/20',
  };

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

      {/* Recent properties */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-muted-foreground">Agregadas recientemente</p>
        {recentProperties.map((property) => (
          <div
            key={property.id}
            className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
          >
            <img
              src={property.image}
              alt={property.title}
              className="w-16 h-12 rounded-lg object-cover"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {property.title}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {property.location}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-foreground">{property.price}</p>
              <span className={`badge-status text-xs border ${statusColors[property.status as keyof typeof statusColors]}`}>
                {property.status === 'alquiler' ? 'Alquiler' : 'Venta'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
