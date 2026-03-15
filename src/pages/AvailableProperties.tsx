import { useState, useMemo, useCallback } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAvailableProperties } from '@/hooks/useAvailableProperties';
import { useWhatsAppTemplate, fillWhatsAppTemplate, buildWhatsAppDeepLink } from '@/hooks/useWhatsAppTemplate';
import { usePropertyFavorites } from '@/hooks/usePropertyFavorites';
import { PropertyCard } from '@/components/properties/PropertyCard';
import { PropertyDetailDialog } from '@/components/properties/PropertyDetailDialog';
import { PropertyFilterDrawer, PropertyFilters, defaultFilters, getActiveFilterCount, getActiveFilterChips } from '@/components/properties/PropertyFilterDrawer';
import { BulkExportDialog } from '@/components/properties/BulkExportDialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, SlidersHorizontal, Grid3X3, List, Loader2, Home, X, Star, FileDown } from 'lucide-react';
import { SoftLockBanner } from '@/components/softlock/SoftLockBanner';
import { useAuth } from '@/contexts/AuthContext';

const getOperationType = (p: any) => {
  const hasRent = Number(p.rental_price) > 0;
  const hasSale = Number(p.sale_price) > 0;
  if (hasRent && p.rental_period === 'daily') return 'temporary';
  if (hasRent) return 'rent';
  if (hasSale) return 'sale';
  return 'unknown';
};

const operationLabels: Record<string, string> = {
  rent: 'Alquiler', sale: 'Venta', temporary: 'Temporal', unknown: 'Sin definir',
};

const buildMapsLink = (property: any) => {
  const address = [property.address, property.neighborhood, property.city].filter(Boolean).join(', ');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
};

const AvailableProperties = () => {
  const { data: properties, isLoading } = useAvailableProperties();
  const { data: whatsappTemplate } = useWhatsAppTemplate();
  const { data: favorites } = usePropertyFavorites();
  const { role } = useAuth();
  const isAgent = role === 'agent';
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filters, setFilters] = useState<PropertyFilters>(defaultFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [detailProperty, setDetailProperty] = useState<any>(null);
  const [showFavOnly, setShowFavOnly] = useState(false);

  const neighborhoods = useMemo(() => {
    const set = new Set((properties || []).map(p => p.neighborhood).filter(Boolean) as string[]);
    return [...set].sort();
  }, [properties]);

  const filtered = useMemo(() => {
    return (properties || []).filter(p => {
      // Favorites filter (agent only)
      if (showFavOnly && !(favorites?.has(p.id))) return false;

      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        const match = p.title.toLowerCase().includes(s) ||
          (p.address || '').toLowerCase().includes(s) ||
          (p.neighborhood || '').toLowerCase().includes(s) ||
          (p.city || '').toLowerCase().includes(s);
        if (!match) return false;
      }
      if (filters.status !== 'all' && p.status !== filters.status) return false;
      if (filters.type !== 'all' && p.property_type !== filters.type) return false;
      if (filters.currency !== 'all' && p.currency !== filters.currency) return false;
      if (filters.garage === 'yes' && !p.has_garage) return false;
      if (filters.garage === 'no' && p.has_garage) return false;
      if (filters.neighborhood !== 'all' && p.neighborhood !== filters.neighborhood) return false;
      if (filters.bedrooms !== 'all' && (p.bedrooms ?? 0) < Number(filters.bedrooms)) return false;

      const op = getOperationType(p);
      if (filters.operation !== 'all' && op !== filters.operation) return false;

      const price = op === 'sale' ? Number(p.sale_price) : Number(p.rental_price);
      if (filters.priceMin && price < Number(filters.priceMin)) return false;
      if (filters.priceMax && price > Number(filters.priceMax)) return false;

      return true;
    });
  }, [properties, searchTerm, filters, showFavOnly, favorites]);

  const activeCount = getActiveFilterCount(filters);
  const activeChips = getActiveFilterChips(filters);

  const buildWhatsAppUrl = useCallback((property: any) => {
    if (!property.captor_phone || !whatsappTemplate) return null;
    const op = getOperationType(property);
    return buildWhatsAppDeepLink(
      property.captor_phone,
      fillWhatsAppTemplate(whatsappTemplate, {
        captorName: property.captor_name || '',
        title: property.title,
        operation: operationLabels[op],
        price: op === 'sale'
          ? Number(property.sale_price).toLocaleString('es-PY')
          : Number(property.rental_price).toLocaleString('es-PY'),
        currency: property.currency || 'PYG',
        location: property.neighborhood || property.address || property.city || '',
      })
    );
  }, [whatsappTemplate]);

  const removeFilter = (key: string) => {
    if (key === 'priceMin') setFilters(f => ({ ...f, priceMin: '' }));
    else if (key === 'priceMax') setFilters(f => ({ ...f, priceMax: '' }));
    else setFilters(f => ({ ...f, [key]: 'all' }));
  };

  return (
    <MainLayout
      title="Catálogo Interno"
      subtitle={`${filtered.length} propiedades${showFavOnly ? ' ⭐ favoritas' : ''}`}
    >
      <SoftLockBanner />
      {/* Search + Filter toggle + View mode */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar propiedad..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        {isAgent && (
          <button
            onClick={() => setShowFavOnly(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors border ${
              showFavOnly
                ? 'bg-yellow-400 text-white border-yellow-400'
                : 'bg-background text-foreground border-input hover:bg-muted'
            }`}
            title="Mostrar solo favoritos"
          >
            <Star className={`w-4 h-4 ${showFavOnly ? 'fill-white' : ''}`} />
            <span className="hidden sm:inline">Favoritos</span>
            {favorites && favorites.size > 0 && !showFavOnly && (
              <span className="ml-0.5 px-1.5 py-0.5 text-[10px] rounded-full bg-yellow-100 text-yellow-700 font-bold">{favorites.size}</span>
            )}
          </button>
        )}
        <button
          onClick={() => setFiltersOpen(true)}
          className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors border ${
            activeCount > 0
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-background text-foreground border-input hover:bg-muted'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span className="hidden sm:inline">Filtros</span>
          {activeCount > 0 && (
            <span className="ml-0.5 px-1.5 py-0.5 text-[10px] rounded-full bg-background/20 font-bold">{activeCount}</span>
          )}
        </button>
        <div className="flex items-center bg-muted rounded-xl p-1">
          <button onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-background shadow-sm' : ''}`}>
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-background shadow-sm' : ''}`}>
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Active filter chips */}
      {activeChips.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {activeChips.map(chip => (
            <button
              key={chip.key}
              onClick={() => removeFilter(chip.key)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
            >
              {chip.label}
              <X className="w-3 h-3" />
            </button>
          ))}
          <button
            onClick={() => setFilters(defaultFilters)}
            className="px-2.5 py-1 rounded-full text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Limpiar todo
          </button>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Home className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Sin resultados</h3>
          <p className="text-muted-foreground text-sm">No se encontraron propiedades con los filtros seleccionados.</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(property => {
            const op = getOperationType(property);
            const waUrl = buildWhatsAppUrl(property);
            return (
              <PropertyCard
                key={property.id}
                property={property}
                operationType={op}
                viewMode="grid"
                onOpenDetail={() => setDetailProperty(property)}
                onMaps={() => window.open(buildMapsLink(property), '_blank')}
                onWhatsApp={waUrl ? () => window.open(waUrl, '_blank') : undefined}
                onWebsite={property.is_published ? () => window.open(`/portal/propiedades/${property.id}`, '_blank') : undefined}
              />
            );
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(property => {
            const op = getOperationType(property);
            const waUrl = buildWhatsAppUrl(property);
            return (
              <PropertyCard
                key={property.id}
                property={property}
                operationType={op}
                viewMode="list"
                onOpenDetail={() => setDetailProperty(property)}
                onMaps={() => window.open(buildMapsLink(property), '_blank')}
                onWhatsApp={waUrl ? () => window.open(waUrl, '_blank') : undefined}
                onWebsite={property.is_published ? () => window.open(`/portal/propiedades/${property.id}`, '_blank') : undefined}
              />
            );
          })}
        </div>
      )}

      <PropertyFilterDrawer
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        filters={filters}
        setFilters={setFilters}
        neighborhoods={neighborhoods}
      />

      <PropertyDetailDialog
        open={!!detailProperty}
        onOpenChange={open => !open && setDetailProperty(null)}
        property={detailProperty}
      />
    </MainLayout>
  );
};

export default AvailableProperties;
