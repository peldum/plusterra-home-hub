import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { usePublicListings } from '@/hooks/usePublicListings';
import { PortalPropertyCard } from '@/components/portal/PortalPropertyCard';
import { Search, SlidersHorizontal, Grid3X3, List, Loader2, Building2, X } from 'lucide-react';

const BUSINESS_TYPES = [
  { value: 'all', label: 'Todos' },
  { value: 'rent', label: 'Alquiler' },
  { value: 'sale', label: 'Venta' },
  { value: 'temporary', label: 'Temporal' },
];

const PROPERTY_TYPES = [
  { value: 'all', label: 'Todos' },
  { value: 'apartment', label: 'Departamento' },
  { value: 'house', label: 'Casa' },
  { value: 'land', label: 'Terreno' },
  { value: 'office', label: 'Oficina' },
  { value: 'commercial', label: 'Local' },
  { value: 'other', label: 'Otro' },
];

const SORT_OPTIONS = [
  { value: 'recent', label: 'Más recientes' },
  { value: 'price_asc', label: 'Precio ↑' },
  { value: 'price_desc', label: 'Precio ↓' },
];

const PortalListings = () => {
  const [params] = useSearchParams();
  const initialSearch = params.get('q') || '';
  const initialTipo = params.get('tipo') || 'all';
  const initialFeatured = params.get('destacados') === 'true';

  const [search, setSearch] = useState(initialSearch);
  const [businessType, setBusinessType] = useState(initialTipo === 'alquiler' ? 'rent' : initialTipo === 'venta' ? 'sale' : initialTipo === 'temporal' ? 'temporary' : 'all');
  const [sortBy, setSortBy] = useState('recent');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [featuredOnly, setFeaturedOnly] = useState(initialFeatured);
  const [showFilters, setShowFilters] = useState(false);
  const [propertyType, setPropertyType] = useState('all');
  const [bedrooms, setBedrooms] = useState<string>('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  const { data: listings, isLoading } = usePublicListings({
    search,
    businessType,
    sortBy,
    featuredOnly,
    bedrooms: bedrooms ? Number(bedrooms) : undefined,
    minPrice: minPrice ? Number(minPrice) : undefined,
    maxPrice: maxPrice ? Number(maxPrice) : undefined,
  });

  const cities = useMemo(() => {
    const set = new Set((listings || []).map(p => p.city).filter(Boolean) as string[]);
    return [...set].sort();
  }, [listings]);

  const clearFilters = () => {
    setSearch('');
    setBusinessType('all');
    setFeaturedOnly(false);
    setBedrooms('');
    setMinPrice('');
    setMaxPrice('');
  };

  const hasActiveFilters = businessType !== 'all' || featuredOnly || bedrooms || minPrice || maxPrice;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 overflow-hidden">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Propiedades Disponibles</h1>
        <p className="text-gray-500 text-sm mt-1">{listings?.length || 0} resultados</p>
      </div>

      {/* Search + Controls */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por zona, ciudad..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#00447C]"
          />
        </div>
        <button
          onClick={() => setShowFilters(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
            hasActiveFilters ? 'bg-[#00447C] text-white border-[#00447C]' : 'bg-white border-gray-200 hover:bg-gray-50'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span className="hidden sm:inline">Filtros</span>
        </button>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          className="px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none"
        >
          {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <div className="flex items-center bg-gray-100 rounded-xl p-1">
          <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-white shadow-sm' : ''}`}>
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm' : ''}`}>
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Tipo negocio</label>
            <select value={businessType} onChange={e => setBusinessType(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm">
              {BUSINESS_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Dormitorios mín.</label>
            <select value={bedrooms} onChange={e => setBedrooms(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm">
              <option value="">Todos</option>
              {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}+</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Precio mín. (Gs.)</label>
            <input type="number" value={minPrice} onChange={e => setMinPrice(e.target.value)}
              placeholder="0" className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Precio máx. (Gs.)</label>
            <input type="number" value={maxPrice} onChange={e => setMaxPrice(e.target.value)}
              placeholder="Sin límite" className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" />
          </div>
          <div className="col-span-2 md:col-span-4 flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={featuredOnly} onChange={e => setFeaturedOnly(e.target.checked)}
                className="rounded border-gray-300" />
              Solo destacados ⭐
            </label>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="text-xs text-[#FC5100] hover:underline flex items-center gap-1">
                <X className="w-3 h-3" /> Limpiar filtros
              </button>
            )}
          </div>
        </div>
      )}

      {/* Results */}
      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[#00447C]" /></div>
      ) : !listings || listings.length === 0 ? (
        <div className="text-center py-16">
          <Building2 className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Sin resultados</h3>
          <p className="text-gray-500 text-sm">No se encontraron propiedades con estos filtros.</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {listings.map(p => <PortalPropertyCard key={p.id} property={p} />)}
        </div>
      ) : (
        <div className="space-y-3">
          {listings.map(p => <PortalPropertyCard key={p.id} property={p} viewMode="list" />)}
        </div>
      )}
    </div>
  );
};

export default PortalListings;
