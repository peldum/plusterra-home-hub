import { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { usePublicListings, PublicListing } from '@/hooks/usePublicListings';
import { PortalPropertyCard } from '@/components/portal/PortalPropertyCard';
import { PortalAgentsSection } from '@/components/portal/PortalAgentsSection';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Building2, ArrowRight, Loader2, Search } from 'lucide-react';

// Fix default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const formatPrice = (p: PublicListing) => {
  const price = Number(p.sale_price) > 0 ? Number(p.sale_price) : Number(p.rental_price);
  return 'Gs. ' + Math.round(price).toLocaleString('es-PY');
};

const typeOptions = [
  { value: 'all', label: 'Todos' },
  { value: 'apartment', label: 'Departamento' },
  { value: 'house', label: 'Casa' },
  { value: 'land', label: 'Terreno' },
  { value: 'office', label: 'Oficina' },
  { value: 'commercial', label: 'Local' },
  { value: 'other', label: 'Otro' },
];

const PortalHome = () => {
  const navigate = useNavigate();

  // Filters state
  const [city, setCity] = useState('all');
  const [businessType, setBusinessType] = useState('all');
  const [propertyType, setPropertyType] = useState('all');
  const [bedrooms, setBedrooms] = useState('all');
  const [bathrooms, setBathrooms] = useState('all');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');

  const { data: allListings, isLoading } = usePublicListings();

  // Derive unique cities
  const cities = useMemo(() => {
    const set = new Set((allListings || []).map(p => p.city).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [allListings]);

  // Apply filters
  const filtered = useMemo(() => {
    let results = allListings || [];
    if (city !== 'all') results = results.filter(p => p.city === city);
    if (propertyType !== 'all') results = results.filter(p => p.property_type === propertyType);
    if (bedrooms !== 'all') results = results.filter(p => (p.bedrooms || 0) >= Number(bedrooms));
    if (bathrooms !== 'all') results = results.filter(p => (p.bathrooms || 0) >= Number(bathrooms));
    if (businessType !== 'all') {
      results = results.filter(p => {
        const hasRent = Number(p.rental_price) > 0;
        const hasSale = Number(p.sale_price) > 0;
        if (businessType === 'rent') return hasRent && p.rental_period !== 'daily';
        if (businessType === 'sale') return hasSale;
        if (businessType === 'temporary') return hasRent && p.rental_period === 'daily';
        return true;
      });
    }
    if (priceMin) results = results.filter(p => {
      const price = Number(p.sale_price) > 0 ? Number(p.sale_price) : Number(p.rental_price);
      return price >= Number(priceMin);
    });
    if (priceMax) results = results.filter(p => {
      const price = Number(p.sale_price) > 0 ? Number(p.sale_price) : Number(p.rental_price);
      return price <= Number(priceMax);
    });
    return results;
  }, [allListings, city, businessType, propertyType, bedrooms, bathrooms, priceMin, priceMax]);

  const geoListings = useMemo(() => filtered.filter(p => p.public_lat && p.public_lng), [filtered]);

  const center: [number, number] = [-25.2867, -57.647];

  const handleReset = () => {
    setCity('all');
    setBusinessType('all');
    setPropertyType('all');
    setBedrooms('all');
    setBathrooms('all');
    setPriceMin('');
    setPriceMax('');
  };

  const selectClass = "w-full rounded-md border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#FC5100]/40 focus:border-[#FC5100]";

  return (
    <div>
      {/* Map section */}
      <section className="w-full h-[50vh] md:h-[55vh] relative">
        {isLoading ? (
          <div className="flex justify-center items-center h-full bg-gray-100">
            <Loader2 className="w-8 h-8 animate-spin text-[#00447C]" />
          </div>
        ) : (
          <MapContainer center={center} zoom={7} className="w-full h-full z-0" scrollWheelZoom>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MarkerClusterGroup chunkedLoading>
              {geoListings.map(p => (
                <Marker key={p.id} position={[p.public_lat!, p.public_lng!]}>
                  <Popup>
                    <div className="min-w-[200px]">
                      <h3 className="font-semibold text-sm">{p.title}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">{[p.neighborhood, p.city].filter(Boolean).join(', ')}</p>
                      <p className="font-bold text-[#00447C] mt-1 text-sm">{formatPrice(p)}</p>
                      <Link
                        to={`/portal/propiedades/${p.id}`}
                        className="inline-block mt-2 text-xs text-[#FC5100] font-medium hover:underline"
                      >
                        Ver detalle →
                      </Link>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MarkerClusterGroup>
          </MapContainer>
        )}
      </section>

      {/* Filters bar */}
      <section className="bg-white border-y border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {/* Row 1 */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Ciudad:</label>
              <select value={city} onChange={e => setCity(e.target.value)} className={selectClass}>
                <option value="all">Todos</option>
                {cities.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Tipo de inmueble:</label>
              <select value={propertyType} onChange={e => setPropertyType(e.target.value)} className={selectClass}>
                {typeOptions.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Tipo de negocio:</label>
              <select value={businessType} onChange={e => setBusinessType(e.target.value)} className={selectClass}>
                <option value="all">Todos</option>
                <option value="rent">Alquiler</option>
                <option value="sale">Venta</option>
                <option value="temporary">Temporal</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Habitaciones:</label>
              <select value={bedrooms} onChange={e => setBedrooms(e.target.value)} className={selectClass}>
                <option value="all">Todos</option>
                <option value="1">1+</option>
                <option value="2">2+</option>
                <option value="3">3+</option>
                <option value="4">4+</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Baños:</label>
              <select value={bathrooms} onChange={e => setBathrooms(e.target.value)} className={selectClass}>
                <option value="all">Todos</option>
                <option value="1">1+</option>
                <option value="2">2+</option>
                <option value="3">3+</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mt-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Precio desde:</label>
              <input
                type="number"
                value={priceMin}
                onChange={e => setPriceMin(e.target.value)}
                placeholder="Desde"
                className={selectClass}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Precio hasta:</label>
              <input
                type="number"
                value={priceMax}
                onChange={e => setPriceMax(e.target.value)}
                placeholder="Hasta"
                className={selectClass}
              />
            </div>
            <div className="col-span-2 sm:col-span-1 md:col-span-3 flex items-end gap-2 justify-end">
              <button
                onClick={handleReset}
                className="px-4 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
              >
                Limpiar
              </button>
              <button
                onClick={() => navigate('/portal/propiedades')}
                className="flex items-center gap-2 px-6 py-2.5 bg-[#FC5100] hover:bg-[#e54900] text-white text-sm font-semibold rounded-lg transition-colors"
              >
                <Search className="w-4 h-4" />
                BUSCAR
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Property listings */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
            ÚLTIMOS <span className="text-[#FC5100]">INMUEBLES</span>
          </h2>
          <p className="text-gray-500 text-sm mt-2">{filtered.length} propiedades encontradas</p>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-[#00447C]" /></div>
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {filtered.map(p => <PortalPropertyCard key={p.id} property={p} />)}
          </div>
        ) : (
          <div className="text-center py-16">
            <Building2 className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No hay propiedades que coincidan con los filtros.</p>
          </div>
        )}
        {filtered.length > 0 && (
          <div className="text-center mt-8">
            <button
              onClick={() => navigate('/portal/propiedades')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#00447C] hover:bg-[#003366] text-white font-medium rounded-lg transition-colors"
            >
              Ver catálogo completo <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </section>

      {/* Agents */}
      <PortalAgentsSection />
    </div>
  );
};

export default PortalHome;
