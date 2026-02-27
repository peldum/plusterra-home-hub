import { useState, useMemo, lazy, Suspense } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { usePublicListings, PublicListing } from '@/hooks/usePublicListings';
import { usePortalSettings, PortalBlockConfig } from '@/hooks/usePortalSettings';
import { PortalPropertyCard } from '@/components/portal/PortalPropertyCard';
import { PortalAgentsSection } from '@/components/portal/PortalAgentsSection';
import { PortalBannerSlider } from '@/components/portal/PortalBannerSlider';
import { Building2, ArrowRight, Loader2, Search, MessageCircle, Sparkles } from 'lucide-react';

// Lazy-load map to avoid Leaflet SSR issues
const PortalMapSection = lazy(() => import('@/components/portal/PortalMapSection'));

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
  const { settings } = usePortalSettings();
  const blocks: PortalBlockConfig[] = (settings?.blocks_config as PortalBlockConfig[]) || [];
  // Inject quiz_cta between featured and listings if not already configured
  const sortedBlocks = (() => {
    const base = [...blocks].filter(b => b.enabled).sort((a, b) => a.order - b.order);
    if (!base.find(b => b.id === 'quiz_cta')) {
      const listingsIdx = base.findIndex(b => b.id === 'listings');
      const quizBlock: PortalBlockConfig = { id: 'quiz_cta', enabled: true, order: 0, config: {} };
      if (listingsIdx > 0) {
        base.splice(listingsIdx, 0, quizBlock);
      } else {
        base.push(quizBlock);
      }
    }
    return base;
  })();

  // Filters state
  const [city, setCity] = useState('all');
  const [businessType, setBusinessType] = useState('all');
  const [propertyType, setPropertyType] = useState('all');
  const [bedrooms, setBedrooms] = useState('all');
  const [bathrooms, setBathrooms] = useState('all');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');

  const { data: allListings, isLoading } = usePublicListings();

  const cities = useMemo(() => {
    const set = new Set((allListings || []).map(p => p.city).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [allListings]);

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

  const center: [number, number] = [
    settings?.default_lat ?? -25.2867,
    settings?.default_lng ?? -57.647,
  ];
  const zoom = settings?.default_zoom ?? 13;

  const handleReset = () => {
    setCity('all'); setBusinessType('all'); setPropertyType('all');
    setBedrooms('all'); setBathrooms('all'); setPriceMin(''); setPriceMax('');
  };

  const selectClass = "w-full rounded-md border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#FC5100]/40 focus:border-[#FC5100]";

  // ─── Block renderers ───
  const renderBlock = (block: PortalBlockConfig) => {
    switch (block.id) {
      case 'hero':
        return (
          <section key="hero" className="relative bg-[#00447C] text-white py-16 md:py-24">
            {block.config.bg_image_url && (
              <img src={block.config.bg_image_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />
            )}
            <div className="relative max-w-4xl mx-auto px-4 text-center">
              <h1 className="text-3xl md:text-5xl font-bold mb-4">{block.config.title || 'Encontrá tu próximo hogar'}</h1>
              {block.config.subtitle && <p className="text-lg md:text-xl text-white/80 mb-8">{block.config.subtitle}</p>}
              {block.config.show_search !== false && (
                <button
                  onClick={() => navigate('/portal/propiedades')}
                  className="inline-flex items-center gap-2 px-8 py-3 bg-[#FC5100] hover:bg-[#e54900] text-white font-semibold rounded-lg transition-colors text-lg"
                >
                  <Search className="w-5 h-5" />
                  {block.config.cta_text || 'Buscar propiedades'}
                </button>
              )}
            </div>
          </section>
        );

      case 'banners':
        return <PortalBannerSlider key="banners" />;

      case 'search':
        return (
          <section key="search" className="bg-white border-y border-gray-200 shadow-sm">
            <div className="max-w-7xl mx-auto px-4 py-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
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
                    <option value="1">1+</option><option value="2">2+</option><option value="3">3+</option><option value="4">4+</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Baños:</label>
                  <select value={bathrooms} onChange={e => setBathrooms(e.target.value)} className={selectClass}>
                    <option value="all">Todos</option>
                    <option value="1">1+</option><option value="2">2+</option><option value="3">3+</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mt-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Precio desde:</label>
                  <input type="number" value={priceMin} onChange={e => setPriceMin(e.target.value)} placeholder="Desde" className={selectClass} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Precio hasta:</label>
                  <input type="number" value={priceMax} onChange={e => setPriceMax(e.target.value)} placeholder="Hasta" className={selectClass} />
                </div>
                <div className="col-span-2 sm:col-span-1 md:col-span-3 flex items-end gap-2 justify-end">
                  <button onClick={handleReset} className="px-4 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors">
                    Limpiar
                  </button>
                  <button onClick={() => navigate('/portal/propiedades')} className="flex items-center gap-2 px-6 py-2.5 bg-[#FC5100] hover:bg-[#e54900] text-white text-sm font-semibold rounded-lg transition-colors">
                    <Search className="w-4 h-4" /> BUSCAR
                  </button>
                </div>
              </div>
            </div>
          </section>
        );

      case 'featured':
        const featuredListings = filtered.filter(p => p.is_featured);
        if (featuredListings.length === 0) return null;
        return (
          <section key="featured" className="max-w-7xl mx-auto px-4 py-12">
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                PROPIEDADES <span className="text-[#FC5100]">DESTACADAS</span>
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {featuredListings.slice(0, 8).map(p => <PortalPropertyCard key={p.id} property={p} />)}
            </div>
          </section>
        );

      case 'quiz_cta':
        return (
          <section key="quiz_cta" className="relative overflow-hidden bg-gradient-to-r from-[#00447C] to-[#002a4d] py-14">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-4 left-10 w-32 h-32 rounded-full bg-[#FC5100] blur-3xl" />
              <div className="absolute bottom-4 right-16 w-40 h-40 rounded-full bg-white blur-3xl" />
            </div>
            <div className="relative max-w-3xl mx-auto px-4 text-center">
              <span className="inline-block text-4xl mb-3">🏡</span>
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
                ¿No sabés qué buscar?
              </h2>
              <p className="text-white/70 text-base md:text-lg mb-6">
                Respondé 4 preguntas rápidas y te recomendamos la propiedad ideal para vos.
              </p>
              <button
                onClick={() => navigate('/portal/quiz')}
                className="inline-flex items-center gap-2 px-8 py-3 bg-[#FC5100] hover:bg-[#e54900] text-white font-semibold rounded-lg transition-colors text-lg shadow-lg shadow-[#FC5100]/30"
              >
                <Sparkles className="w-5 h-5" />
                Hacer el Quiz
              </button>
            </div>
          </section>
        );

      case 'listings':
        return (
          <section key="listings" className="max-w-7xl mx-auto px-4 py-12">
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
                <button onClick={() => navigate('/portal/propiedades')} className="inline-flex items-center gap-2 px-6 py-3 bg-[#00447C] hover:bg-[#003366] text-white font-medium rounded-lg transition-colors">
                  Ver catálogo completo <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </section>
        );

      case 'map':
        return (
          <Suspense key="map" fallback={<div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-[#00447C]" /></div>}>
            <PortalMapSection
              listings={geoListings}
              center={center}
              zoom={zoom}
              showClusters={block.config.show_clusters !== false}
            />
          </Suspense>
        );

      case 'agents':
        return <PortalAgentsSection key="agents" />;

      case 'whatsapp_cta':
        if (!block.config.phone) return null;
        return (
          <section key="whatsapp_cta" className="bg-[#25D366] py-12">
            <div className="max-w-3xl mx-auto px-4 text-center">
              <MessageCircle className="w-12 h-12 mx-auto text-white mb-4" />
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
                {block.config.text || '¿Necesitás ayuda? Escribinos por WhatsApp'}
              </h2>
              <a
                href={`https://wa.me/${block.config.phone.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-8 py-3 bg-white text-[#25D366] font-bold rounded-lg hover:bg-gray-100 transition-colors text-lg"
              >
                <MessageCircle className="w-5 h-5" /> Contactar ahora
              </a>
            </div>
          </section>
        );

      default:
        return null;
    }
  };

  return <div>{sortedBlocks.map(renderBlock)}</div>;
};

export default PortalHome;
