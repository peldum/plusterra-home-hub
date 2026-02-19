import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PropertyFormDialog } from '@/components/properties/PropertyFormDialog';
import { PropertyDetailDialog } from '@/components/properties/PropertyDetailDialog';
import { useProperties, useDeleteProperty, Property } from '@/hooks/useProperties';
import { useAuth } from '@/contexts/AuthContext';
import {
  Building2, MapPin, Bed, Bath, Square, MoreVertical,
  Grid3X3, List, Loader2, Pencil, Trash2, Search, ExternalLink,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const typeLabels: Record<string, string> = {
  apartment: 'Departamento', house: 'Casa', land: 'Terreno',
  office: 'Oficina', commercial: 'Local', other: 'Otro',
};

const statusConfig: Record<string, { label: string; class: string }> = {
  draft: { label: 'Borrador', class: 'bg-muted text-muted-foreground' },
  available: { label: 'Disponible', class: 'bg-success/10 text-success border-success/20' },
  reserved: { label: 'Reservada', class: 'bg-warning/10 text-warning border-warning/20' },
  rented: { label: 'Alquilada', class: 'bg-info/10 text-info border-info/20' },
  sold: { label: 'Vendida', class: 'bg-secondary/10 text-secondary border-secondary/20' },
  archived: { label: 'Archivada', class: 'bg-muted text-muted-foreground' },
};

const formatPrice = (amount: number | null, currency: string | null) => {
  if (!amount) return '-';
  if (currency === 'USD') return `USD ${amount.toLocaleString('es-PY')}`;
  return `₲ ${amount.toLocaleString('es-PY')}`;
};

const Properties = () => {
  const { data: properties, isLoading } = useProperties();
  const { role, user, isAdmin } = useAuth();
  const isAgent = role === 'agent';
  const deleteMutation = useDeleteProperty();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [detailProperty, setDetailProperty] = useState<Property | null>(null);

  const filtered = (properties || []).filter(p => {
    const matchesStatus = filterStatus === 'all' || p.status === filterStatus;
    const matchesSearch = !searchTerm || 
      p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.property_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.address || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleEdit = (property: Property) => {
    setEditingProperty(property);
    setFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Está seguro de eliminar esta propiedad?')) {
      await deleteMutation.mutateAsync(id);
    }
  };

  const canCreateProperty = !isAgent || true; // agents can create their own
  const isOwnProperty = (p: Property) => !isAgent || p.captor_agent_id === user?.id;

  return (
    <MainLayout
      title="Propiedades"
      subtitle={`${filtered.length} propiedades encontradas`}
      action={canCreateProperty ? {
        label: 'Nueva Propiedad',
        onClick: () => { setEditingProperty(null); setFormOpen(true); },
      } : undefined}
    >
      {/* Search & Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative max-w-xs flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input type="text" placeholder="Buscar por título, código..."
              value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div className="flex items-center gap-2">
            {[
              { key: 'all', label: 'Todas' },
              { key: 'available', label: 'Disponibles' },
              { key: 'rented', label: 'Alquiladas' },
              { key: 'sold', label: 'Vendidas' },
            ].map(f => (
              <button key={f.key} onClick={() => setFilterStatus(f.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterStatus === f.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}>{f.label}</button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
          <button onClick={() => setViewMode('grid')}
            className={`p-2 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-background shadow-sm' : ''}`}>
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button onClick={() => setViewMode('list')}
            className={`p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-background shadow-sm' : ''}`}>
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No hay propiedades</h3>
          <p className="text-muted-foreground mb-4">Cree su primera propiedad para comenzar</p>
          <button onClick={() => { setEditingProperty(null); setFormOpen(true); }}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
            + Nueva Propiedad
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((property, index) => {
            const sc = statusConfig[property.status] || statusConfig.draft;
            const price = Number(property.rental_price) ? formatPrice(Number(property.rental_price), property.currency) + '/mes'
              : formatPrice(Number(property.sale_price), property.currency);
            return (
              <div key={property.id}
                onClick={() => setDetailProperty(property)}
                className="bg-card border border-border rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1 animate-scale-in opacity-0 cursor-pointer"
                style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'forwards' }}>
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground font-mono">{property.property_code}</p>
                      <h3 className="font-semibold text-foreground mt-1 truncate">{property.title}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{typeLabels[property.property_type]}</p>
                    </div>
                    {isOwnProperty(property) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button onClick={e => e.stopPropagation()} className="p-2 hover:bg-muted rounded-lg transition-colors">
                          <MoreVertical className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={e => { e.stopPropagation(); handleEdit(property); }}>
                          <Pencil className="w-4 h-4 mr-2" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={e => { e.stopPropagation(); handleDelete(property.id); }} className="text-destructive">
                          <Trash2 className="w-4 h-4 mr-2" /> Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    )}
                  </div>

                  <span className={`badge-status border text-xs ${sc.class}`}>{sc.label}</span>

                  {property.address && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mt-3">
                      <MapPin className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{property.address}{property.city ? `, ${property.city}` : ''}</span>
                    </div>
                  )}

                  <p className="text-lg font-bold text-primary mt-3">{price}</p>

                  <div className="flex items-center gap-4 pt-3 mt-3 border-t border-border">
                    {(property.bedrooms ?? 0) > 0 && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Bed className="w-4 h-4" /><span>{property.bedrooms}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Bath className="w-4 h-4" /><span>{property.bathrooms}</span>
                    </div>
                    {Number(property.area_m2) > 0 && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Square className="w-4 h-4" /><span>{property.area_m2}m²</span>
                      </div>
                    )}
                  </div>

                  {(property as any).owners?.full_name && (
                    <div className="mt-3 pt-3 border-t border-border text-xs text-muted-foreground">
                      Propietario: {(property as any).owners.full_name}
                    </div>
                  )}

                  {property.public_website_url && (
                    <a
                      href={property.public_website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
                      onClick={e => e.stopPropagation()}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Ver en web
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4">Código</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4">Propiedad</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4">Tipo</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4">Estado</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4">Precio</th>
                <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(property => {
                const sc = statusConfig[property.status] || statusConfig.draft;
                const price = Number(property.rental_price) ? formatPrice(Number(property.rental_price), property.currency) + '/mes'
                  : formatPrice(Number(property.sale_price), property.currency);
                return (
                  <tr key={property.id} className="table-row-hover cursor-pointer" onClick={() => setDetailProperty(property)}>
                    <td className="px-6 py-4 font-mono text-sm text-muted-foreground">{property.property_code}</td>
                     <td className="px-6 py-4">
                       <p className="font-medium text-foreground">{property.title}</p>
                       <p className="text-sm text-muted-foreground">{property.address}</p>
                       {property.public_website_url && (
                         <a href={property.public_website_url} target="_blank" rel="noopener noreferrer"
                           className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-0.5"
                           onClick={e => e.stopPropagation()}>
                           <ExternalLink className="w-3 h-3" /> Ver en web
                         </a>
                       )}
                     </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{typeLabels[property.property_type]}</td>
                    <td className="px-6 py-4"><span className={`badge-status border text-xs ${sc.class}`}>{sc.label}</span></td>
                    <td className="px-6 py-4 font-semibold text-foreground">{price}</td>
                    <td className="px-6 py-4 text-right">
                      {isOwnProperty(property) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-2 hover:bg-muted rounded-lg transition-colors">
                            <MoreVertical className="w-4 h-4 text-muted-foreground" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(property)}>
                            <Pencil className="w-4 h-4 mr-2" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(property.id)} className="text-destructive">
                            <Trash2 className="w-4 h-4 mr-2" /> Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <PropertyFormDialog open={formOpen} onOpenChange={setFormOpen} property={editingProperty} />
      <PropertyDetailDialog
        open={!!detailProperty}
        onOpenChange={open => !open && setDetailProperty(null)}
        property={detailProperty}
      />
    </MainLayout>
  );
};

export default Properties;
