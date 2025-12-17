import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import {
  Building2,
  MapPin,
  Bed,
  Bath,
  Square,
  MoreVertical,
  Filter,
  Grid3X3,
  List,
} from 'lucide-react';

const properties = [
  {
    id: 1,
    title: 'Departamento Premium Palermo',
    address: 'Av. Santa Fe 3200, Palermo',
    type: 'Departamento',
    status: 'alquiler',
    price: '$1,500/mes',
    bedrooms: 3,
    bathrooms: 2,
    area: 120,
    image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400&h=300&fit=crop',
    agent: 'Carlos Méndez',
  },
  {
    id: 2,
    title: 'Casa Familiar Nordelta',
    address: 'Barrio Los Castores, Nordelta',
    type: 'Casa',
    status: 'venta',
    price: '$580,000',
    bedrooms: 4,
    bathrooms: 3,
    area: 280,
    image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400&h=300&fit=crop',
    agent: 'Laura Fernández',
  },
  {
    id: 3,
    title: 'Oficina Corporativa',
    address: 'Av. Madero 900, Puerto Madero',
    type: 'Oficina',
    status: 'alquiler',
    price: '$4,200/mes',
    bedrooms: 0,
    bathrooms: 2,
    area: 200,
    image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=300&fit=crop',
    agent: 'Miguel Torres',
  },
  {
    id: 4,
    title: 'Loft Moderno Belgrano',
    address: 'Cabildo 2100, Belgrano',
    type: 'Loft',
    status: 'alquiler',
    price: '$950/mes',
    bedrooms: 1,
    bathrooms: 1,
    area: 65,
    image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=300&fit=crop',
    agent: 'Ana Rodríguez',
  },
  {
    id: 5,
    title: 'PH Luminoso Recoleta',
    address: 'Av. Alvear 1800, Recoleta',
    type: 'PH',
    status: 'venta',
    price: '$420,000',
    bedrooms: 2,
    bathrooms: 2,
    area: 150,
    image: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=400&h=300&fit=crop',
    agent: 'Carlos Méndez',
  },
  {
    id: 6,
    title: 'Local Comercial Centro',
    address: 'Florida 500, Microcentro',
    type: 'Local',
    status: 'alquiler',
    price: '$3,800/mes',
    bedrooms: 0,
    bathrooms: 1,
    area: 85,
    image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=300&fit=crop',
    agent: 'Laura Fernández',
  },
];

const statusConfig = {
  alquiler: { label: 'Alquiler', class: 'bg-info/10 text-info border-info/20' },
  venta: { label: 'Venta', class: 'bg-success/10 text-success border-success/20' },
  administracion: { label: 'Administración', class: 'bg-secondary/10 text-secondary border-secondary/20' },
};

const Properties = () => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const filteredProperties = filterStatus === 'all' 
    ? properties 
    : properties.filter(p => p.status === filterStatus);

  return (
    <MainLayout
      title="Propiedades"
      subtitle={`${filteredProperties.length} propiedades encontradas`}
      action={{
        label: 'Nueva Propiedad',
        onClick: () => console.log('Nueva propiedad'),
      }}
    >
      {/* Filters and view toggle */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterStatus === 'all'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            Todas
          </button>
          <button
            onClick={() => setFilterStatus('alquiler')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterStatus === 'alquiler'
                ? 'bg-info text-info-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            Alquiler
          </button>
          <button
            onClick={() => setFilterStatus('venta')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterStatus === 'venta'
                ? 'bg-success text-success-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            Venta
          </button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 text-sm font-medium transition-colors">
            <Filter className="w-4 h-4" />
            Más filtros
          </button>
        </div>

        <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-md transition-colors ${
              viewMode === 'grid' ? 'bg-background shadow-sm' : ''
            }`}
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-md transition-colors ${
              viewMode === 'list' ? 'bg-background shadow-sm' : ''
            }`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Properties Grid */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProperties.map((property, index) => (
            <div
              key={property.id}
              className="bg-card border border-border rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1 animate-scale-in opacity-0"
              style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'forwards' }}
            >
              <div className="relative">
                <img
                  src={property.image}
                  alt={property.title}
                  className="w-full h-48 object-cover"
                />
                <div className="absolute top-3 left-3">
                  <span className={`badge-status border ${statusConfig[property.status as keyof typeof statusConfig].class}`}>
                    {statusConfig[property.status as keyof typeof statusConfig].label}
                  </span>
                </div>
                <button className="absolute top-3 right-3 p-2 bg-background/80 backdrop-blur-sm rounded-lg hover:bg-background transition-colors">
                  <MoreVertical className="w-4 h-4 text-foreground" />
                </button>
              </div>
              
              <div className="p-5">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">
                      {property.type}
                    </p>
                    <h3 className="font-semibold text-foreground mt-1">
                      {property.title}
                    </h3>
                  </div>
                  <p className="text-lg font-bold text-primary">{property.price}</p>
                </div>
                
                <div className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
                  <MapPin className="w-4 h-4" />
                  <span className="truncate">{property.address}</span>
                </div>
                
                <div className="flex items-center gap-4 pt-4 border-t border-border">
                  {property.bedrooms > 0 && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Bed className="w-4 h-4" />
                      <span>{property.bedrooms}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Bath className="w-4 h-4" />
                    <span>{property.bathrooms}</span>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Square className="w-4 h-4" />
                    <span>{property.area}m²</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-[10px] font-semibold text-primary">
                      {property.agent.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">{property.agent}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4">
                  Propiedad
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4">
                  Tipo
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4">
                  Estado
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4">
                  Precio
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4">
                  Agente
                </th>
                <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredProperties.map((property) => (
                <tr key={property.id} className="table-row-hover">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={property.image}
                        alt={property.title}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                      <div>
                        <p className="font-medium text-foreground">{property.title}</p>
                        <p className="text-sm text-muted-foreground">{property.address}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {property.type}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`badge-status border ${statusConfig[property.status as keyof typeof statusConfig].class}`}>
                      {statusConfig[property.status as keyof typeof statusConfig].label}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-semibold text-foreground">
                    {property.price}
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {property.agent}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 hover:bg-muted rounded-lg transition-colors">
                      <MoreVertical className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </MainLayout>
  );
};

export default Properties;
