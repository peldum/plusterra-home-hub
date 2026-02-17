import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAvailableProperties } from '@/hooks/useAvailableProperties';
import {
  Building2, MapPin, Bed, Bath, Square, Search, Car, Loader2,
  Home, SlidersHorizontal, X,
} from 'lucide-react';

const typeLabels: Record<string, string> = {
  apartment: 'Departamento', house: 'Casa', land: 'Terreno',
  office: 'Oficina', commercial: 'Local', other: 'Otro',
};

const typeOptions = Object.entries(typeLabels);

const formatPrice = (amount: number | null, currency: string | null) => {
  if (!amount) return '-';
  if (currency === 'USD') return `USD ${amount.toLocaleString('es-PY')}`;
  return `₲ ${amount.toLocaleString('es-PY')}`;
};

const getOperationType = (p: { rental_price: number | null; sale_price: number | null; rental_period: string | null }) => {
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

const AvailableProperties = () => {
  const { data: properties, isLoading } = useAvailableProperties();
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Filters
  const [filterType, setFilterType] = useState('all');
  const [filterCurrency, setFilterCurrency] = useState('all');
  const [filterGarage, setFilterGarage] = useState('all');
  const [filterOperation, setFilterOperation] = useState('all');
  const [filterNeighborhood, setFilterNeighborhood] = useState('all');
  const [filterPriceMin, setFilterPriceMin] = useState('');
  const [filterPriceMax, setFilterPriceMax] = useState('');

  const neighborhoods = useMemo(() => {
    const set = new Set((properties || []).map(p => p.neighborhood).filter(Boolean) as string[]);
    return [...set].sort();
  }, [properties]);

  const filtered = useMemo(() => {
    return (properties || []).filter(p => {
      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        const match = p.title.toLowerCase().includes(s) ||
          (p.address || '').toLowerCase().includes(s) ||
          (p.neighborhood || '').toLowerCase().includes(s) ||
          (p.city || '').toLowerCase().includes(s);
        if (!match) return false;
      }
      if (filterType !== 'all' && p.property_type !== filterType) return false;
      if (filterCurrency !== 'all' && p.currency !== filterCurrency) return false;
      if (filterGarage === 'yes' && !p.has_garage) return false;
      if (filterGarage === 'no' && p.has_garage) return false;
      if (filterNeighborhood !== 'all' && p.neighborhood !== filterNeighborhood) return false;

      const op = getOperationType(p);
      if (filterOperation !== 'all' && op !== filterOperation) return false;

      const price = op === 'sale' ? Number(p.sale_price) : Number(p.rental_price);
      if (filterPriceMin && price < Number(filterPriceMin)) return false;
      if (filterPriceMax && price > Number(filterPriceMax)) return false;

      return true;
    });
  }, [properties, searchTerm, filterType, filterCurrency, filterGarage, filterOperation, filterNeighborhood, filterPriceMin, filterPriceMax]);

  const activeFilterCount = [filterType, filterCurrency, filterGarage, filterOperation, filterNeighborhood].filter(f => f !== 'all').length
    + (filterPriceMin ? 1 : 0) + (filterPriceMax ? 1 : 0);

  const clearFilters = () => {
    setFilterType('all');
    setFilterCurrency('all');
    setFilterGarage('all');
    setFilterOperation('all');
    setFilterNeighborhood('all');
    setFilterPriceMin('');
    setFilterPriceMax('');
  };

  return (
    <MainLayout
      title="Propiedades Disponibles"
      subtitle={`${filtered.length} propiedades disponibles para operación`}
    >
      {/* Search & Filter Toggle */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por título, dirección, zona..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors border ${
            showFilters || activeFilterCount > 0
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-background text-foreground border-input hover:bg-muted'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filtros
          {activeFilterCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-background/20">{activeFilterCount}</span>
          )}
        </button>
        {activeFilterCount > 0 && (
          <button onClick={clearFilters} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-3.5 h-3.5" /> Limpiar filtros
          </button>
        )}
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-card border border-border rounded-xl p-5 mb-6 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Tipo</label>
            <select value={filterType} onChange={e => setFilterType(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
              <option value="all">Todos</option>
              {typeOptions.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Operación</label>
            <select value={filterOperation} onChange={e => setFilterOperation(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
              <option value="all">Todas</option>
              <option value="rent">Alquiler</option>
              <option value="sale">Venta</option>
              <option value="temporary">Temporal</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Moneda</label>
            <select value={filterCurrency} onChange={e => setFilterCurrency(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
              <option value="all">Todas</option>
              <option value="PYG">Guaraníes</option>
              <option value="USD">Dólares</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Cochera</label>
            <select value={filterGarage} onChange={e => setFilterGarage(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
              <option value="all">Todas</option>
              <option value="yes">Con cochera</option>
              <option value="no">Sin cochera</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Zona</label>
            <select value={filterNeighborhood} onChange={e => setFilterNeighborhood(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
              <option value="all">Todas</option>
              {neighborhoods.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Precio mín.</label>
            <input type="number" value={filterPriceMin} onChange={e => setFilterPriceMin(e.target.value)}
              placeholder="0" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Precio máx.</label>
            <input type="number" value={filterPriceMax} onChange={e => setFilterPriceMax(e.target.value)}
              placeholder="∞" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
          </div>
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
          <p className="text-muted-foreground">No se encontraron propiedades disponibles con los filtros seleccionados.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((property, index) => {
            const op = getOperationType(property);
            const price = op === 'sale'
              ? formatPrice(Number(property.sale_price), property.currency)
              : formatPrice(Number(property.rental_price), property.currency) + '/mes';

            return (
              <div
                key={property.id}
                className="bg-card border border-border rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 animate-scale-in opacity-0"
                style={{ animationDelay: `${index * 40}ms`, animationFillMode: 'forwards' }}
              >
                <div className="p-5">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground truncate">{property.title}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{typeLabels[property.property_type] || property.property_type}</p>
                    </div>
                    <span className="ml-2 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary whitespace-nowrap">
                      {operationLabels[op]}
                    </span>
                  </div>

                  {/* Location */}
                  {(property.address || property.neighborhood) && (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-3">
                      <MapPin className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">
                        {property.neighborhood || property.address}
                        {property.city ? `, ${property.city}` : ''}
                      </span>
                    </div>
                  )}

                  {/* Price */}
                  <p className="text-xl font-bold text-primary mb-3">{price}</p>

                  {/* Features */}
                  <div className="flex items-center gap-4 py-3 border-t border-b border-border">
                    {(property.bedrooms ?? 0) > 0 && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground" title="Dormitorios">
                        <Bed className="w-4 h-4" /><span>{property.bedrooms}</span>
                      </div>
                    )}
                    {(property.bathrooms ?? 0) > 0 && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground" title="Baños">
                        <Bath className="w-4 h-4" /><span>{property.bathrooms}</span>
                      </div>
                    )}
                    {Number(property.area_m2) > 0 && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground" title="Superficie">
                        <Square className="w-4 h-4" /><span>{property.area_m2}m²</span>
                      </div>
                    )}
                    {property.has_garage && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground" title="Cochera">
                        <Car className="w-4 h-4" /><span>Sí</span>
                      </div>
                    )}
                  </div>

                  {/* Captor Agent */}
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      Agente captor: <span className="font-medium text-foreground">{property.captor_name}</span>
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </MainLayout>
  );
};

export default AvailableProperties;
