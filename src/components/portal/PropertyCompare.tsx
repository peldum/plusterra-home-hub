import { X, ArrowLeftRight, Bed, Bath, Ruler, Car, MapPin, Trophy, Share2, Check, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { useCompareList } from './compareStore';
import { Link, useSearchParams } from 'react-router-dom';
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { PublicListing } from '@/hooks/usePublicListings';
import { PORTAL_DOMAIN } from '@/lib/portalDomain';

const formatPrice = (amount: number, currency?: string | null) =>
  currency === 'USD'
    ? 'USD ' + Math.round(amount).toLocaleString('en-US')
    : 'Gs. ' + Math.round(amount).toLocaleString('es-PY');

/* ────────────────── Floating Compare Bar ────────────────── */
export const CompareBar = () => {
  const { items, remove, clear, count } = useCompareList();

  if (count === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t-2 border-[#00447C] shadow-[0_-8px_30px_rgba(0,68,124,0.15)]"
      style={{ animation: 'compareBarIn .3s cubic-bezier(.22,1,.36,1)' }}
    >
      <style>{`
        @keyframes compareBarIn {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
            <ArrowLeftRight className="w-4 h-4 text-[#FC5100]" />
            Comparar ({count}/3)
          </div>
          <div className="flex items-center gap-2">
            {count >= 2 && (
              <Link
                to="/portal/comparar"
                className="px-4 py-2 bg-gradient-to-r from-[#FC5100] to-[#e54900] hover:from-[#e54900] hover:to-[#d04000] text-white text-sm font-semibold rounded-lg transition-all shadow-md shadow-[#FC5100]/20 hover:shadow-lg hover:shadow-[#FC5100]/30 active:scale-95"
              >
                Comparar ahora
              </Link>
            )}
            <button onClick={clear} className="text-xs text-gray-500 hover:text-gray-700 transition-colors">
              Limpiar
            </button>
          </div>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-1 -mb-1 scrollbar-hide">
          {items.map(p => (
            <div key={p.id} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 min-w-[200px] border border-gray-100">
              <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                {p.photos?.[0]?.thumbnail_url ? (
                  <img src={p.photos[0].thumbnail_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gray-200" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-800 truncate">{p.title}</p>
                <p className="text-xs text-gray-500">{p.city}</p>
              </div>
              <button onClick={() => remove(p.id)} className="p-1 hover:bg-gray-200 rounded-full transition-colors">
                <X className="w-3.5 h-3.5 text-gray-400" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ────────────────── Winner logic ────────────────── */
type CompareField = {
  label: string;
  icon?: React.ReactNode;
  getValue: (p: PublicListing) => string | number | null;
  compare?: 'lower' | 'higher';
};

function getWinner(items: PublicListing[], field: CompareField): string | null {
  if (!field.compare || items.length < 2) return null;
  let bestId: string | null = null;
  let bestVal: number | null = null;
  for (const p of items) {
    const raw = field.getValue(p);
    const val = typeof raw === 'number' ? raw : null;
    if (val == null || val === 0) continue;
    if (bestVal == null ||
      (field.compare === 'lower' && val < bestVal) ||
      (field.compare === 'higher' && val > bestVal)
    ) {
      bestVal = val;
      bestId = p.id;
    }
  }
  // Only highlight if there's a clear winner (not a tie)
  const allVals = items.map(p => field.getValue(p)).filter(v => v != null && v !== 0);
  const unique = new Set(allVals);
  return unique.size > 1 ? bestId : null;
}

/* ────────────────── Compare Page ────────────────── */
export const ComparePage = () => {
  const { items: storeItems, remove } = useCompareList();
  const [searchParams] = useSearchParams();
  const [showAmenities, setShowAmenities] = useState(false);

  // Extract IDs from URL for shared links
  const urlIds = searchParams.get('ids')?.split(',').filter(Boolean) || [];
  const needsFetch = storeItems.length < 2 && urlIds.length >= 2;

  // Fetch properties by IDs when opened via shared link
  const { data: fetchedItems, isLoading } = useQuery({
    queryKey: ['compare-shared', urlIds],
    queryFn: async () => {
      const { data: props, error } = await supabase
        .from('properties')
        .select('id, title, public_description, description, address, city, neighborhood, property_type, property_code, rental_price, sale_price, currency, rental_period, bedrooms, bathrooms, area_m2, has_garage, garage_details, amenities, is_featured, published_at, public_lat, public_lng, exact_location_enabled, captor_agent_id, video_url, tour_360_url, cocina_integrada, acepta_mascotas, disponible_desde, status, visible_en_portal')
        .in('id', urlIds)
        .eq('is_published', true)
        .eq('visible_en_portal', true);
      if (error) throw error;
      if (!props || props.length === 0) return [] as PublicListing[];

      const propertyIds = props.map(p => p.id);
      const { data: photos } = await supabase
        .from('property_photos')
        .select('id, property_id, photo_url, thumbnail_url, order_index')
        .in('property_id', propertyIds)
        .order('order_index', { ascending: true });

      const photoMap = new Map<string, typeof photos>();
      photos?.forEach(ph => {
        if (!photoMap.has(ph.property_id)) photoMap.set(ph.property_id, []);
        photoMap.get(ph.property_id)!.push(ph);
      });

      return props.map(p => ({
        ...p,
        amenities: p.amenities as string[] | null,
        photos: photoMap.get(p.id) || [],
      })) as PublicListing[];
    },
    enabled: needsFetch,
    staleTime: 5 * 60 * 1000,
  });

  // Use store items if available, otherwise use fetched items
  const items = storeItems.length >= 2 ? storeItems : (fetchedItems || []);

  if (isLoading && needsFetch) {
    return (
      <div className="flex justify-center items-center min-h-[40vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[#00447C]" />
      </div>
    );
  }

  if (items.length < 2) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center" style={{ animation: 'fadeInUp .4s ease-out' }}>
        <style>{`@keyframes fadeInUp { from { opacity:0; transform:translateY(20px) } to { opacity:1; transform:translateY(0) } }`}</style>
        <div className="w-20 h-20 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-4">
          <ArrowLeftRight className="w-8 h-8 text-gray-300" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Comparador de Propiedades</h2>
        <p className="text-gray-500 mb-6 max-w-md mx-auto">
          Seleccioná al menos 2 propiedades desde el catálogo para ver una comparativa detallada lado a lado.
        </p>
        <Link to="/portal/propiedades" className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#00447C] text-white rounded-lg font-medium hover:bg-[#003362] transition-colors">
          ← Ir al catálogo
        </Link>
      </div>
    );
  }

  const fields: CompareField[] = [
    {
      label: 'Precio',
      getValue: (p) => {
        const sale = Number(p.sale_price);
        const rent = Number(p.rental_price);
        if (sale > 0) return sale;
        if (rent > 0) return rent;
        return null;
      },
      compare: 'lower',
    },
    {
      label: 'Ubicación',
      icon: <MapPin className="w-4 h-4" />,
      getValue: (p) => [p.neighborhood, p.city].filter(Boolean).join(', ') || '—',
    },
    {
      label: 'Tipo',
      getValue: (p) => {
        const types: Record<string, string> = { apartment: 'Departamento', house: 'Casa', land: 'Terreno', office: 'Oficina', commercial: 'Local comercial', other: 'Otro' };
        return types[p.property_type] || p.property_type;
      },
    },
    {
      label: 'Superficie',
      icon: <Ruler className="w-4 h-4" />,
      getValue: (p) => p.area_m2 ?? null,
      compare: 'higher',
    },
    {
      label: 'Dormitorios',
      icon: <Bed className="w-4 h-4" />,
      getValue: (p) => p.bedrooms ?? null,
      compare: 'higher',
    },
    {
      label: 'Baños',
      icon: <Bath className="w-4 h-4" />,
      getValue: (p) => p.bathrooms ?? null,
      compare: 'higher',
    },
    {
      label: 'Cochera',
      icon: <Car className="w-4 h-4" />,
      getValue: (p) => p.has_garage ? 'Sí ✓' : 'No',
    },
  ];

  const getDisplayPriceForCompare = (p: PublicListing) => {
    const sale = Number(p.sale_price);
    const rent = Number(p.rental_price);
    if (sale > 0) return formatPrice(sale, p.currency);
    if (rent > 0) return formatPrice(rent, p.currency) + (p.rental_period === 'daily' ? '/día' : '/mes');
    return 'Consultar';
  };

  const getShareUrl = () => {
    const ids = items.map(p => p.id).join(',');
    return `https://${PORTAL_DOMAIN}/comparar?ids=${ids}`;
  };

  const handleShareWhatsApp = () => {
    const url = getShareUrl();
    const titles = items.map(p => `• ${p.title}`).join('\n');
    const msg = `🏠 Te comparto esta comparativa de propiedades de Plusterra:\n\n${titles}\n\n👉 ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
    toast.success('Abriendo WhatsApp…');
  };

  const handleShareLink = () => {
    navigator.clipboard.writeText(getShareUrl());
    toast.success('Enlace de comparativa copiado');
  };

  // Collect all amenities across items
  const allAmenities = [...new Set(items.flatMap(p => p.amenities || []))].sort();

  return (
    <div className="max-w-7xl mx-auto px-4 py-8" style={{ animation: 'fadeInUp .4s ease-out' }}>
      <style>{`@keyframes fadeInUp { from { opacity:0; transform:translateY(20px) } to { opacity:1; transform:translateY(0) } }`}</style>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <Link to="/portal/propiedades" className="text-sm text-gray-500 hover:text-[#00447C] transition-colors">← Volver al catálogo</Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">
            Comparar <span className="text-[#FC5100]">Propiedades</span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">Comparando {items.length} propiedades lado a lado</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleShareWhatsApp}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#25D366] hover:bg-[#1db954] text-white rounded-lg text-sm font-medium transition-all shadow-sm hover:shadow-md active:scale-95"
          >
            <WhatsAppIcon className="w-4 h-4" />
            Compartir
          </button>
          <button
            onClick={handleShareLink}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-all active:scale-95"
          >
            <Share2 className="w-4 h-4" />
            Copiar enlace
          </button>
        </div>
      </div>

      {/* Property Cards Header */}
      <div className="overflow-x-auto -mx-4 px-4 pb-2 md:overflow-visible">
        <div className="grid grid-cols-2 gap-3 md:flex md:gap-4" style={{ minWidth: undefined }}>
          {/* Spacer for label column on desktop */}
          <div className="hidden md:block w-44 flex-shrink-0" />
          {items.map(p => {
            const thumb = p.photos?.[0]?.thumbnail_url || p.photos?.[0]?.photo_url;
            return (
              <div key={p.id} className="md:flex-1 md:min-w-[240px] md:max-w-[360px]">
                <div className="relative bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  <button
                    onClick={() => remove(p.id)}
                    className="absolute top-2 right-2 z-10 w-6 h-6 md:w-7 md:h-7 rounded-full bg-white/90 hover:bg-red-50 text-gray-400 hover:text-red-500 flex items-center justify-center shadow-sm transition-all"
                  >
                    <X className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  </button>
                  <Link to={`/portal/propiedades/${p.id}`}>
                    <div className="aspect-[16/10] overflow-hidden">
                      {thumb ? (
                        <img src={thumb} alt={p.title} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400 text-sm">Sin foto</div>
                      )}
                    </div>
                    <div className="p-3 md:p-4">
                      <p className="font-semibold text-gray-900 hover:text-[#00447C] transition-colors line-clamp-2 text-xs md:text-sm capitalize">{p.title}</p>
                      <p className="text-[10px] md:text-xs text-gray-500 mt-0.5">{p.property_code}</p>
                      <p className="text-sm md:text-lg font-bold text-[#00447C] mt-1 md:mt-2">{getDisplayPriceForCompare(p)}</p>
                    </div>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Comparison Table */}
      <div className="mt-6 overflow-x-auto -mx-4 px-4">
        <div style={{ minWidth: items.length * 280 }}>
          {fields.map((field, i) => {
            const winnerId = getWinner(items, field);
            return (
              <div key={field.label} className={`flex items-stretch ${i % 2 === 0 ? 'bg-gray-50/80' : 'bg-white'} rounded-lg`}>
                <div className="hidden md:flex w-44 flex-shrink-0 items-center px-4 py-3.5">
                  <span className="flex items-center gap-2 text-sm font-medium text-gray-600">
                    {field.icon}
                    {field.label}
                  </span>
                </div>
                {items.map(p => {
                  const val = field.getValue(p);
                  const isWinner = winnerId === p.id;
                  let display: string;
                  if (field.label === 'Precio') {
                    display = getDisplayPriceForCompare(p);
                  } else if (field.label === 'Superficie' && typeof val === 'number') {
                    display = `${val} m²`;
                  } else {
                    display = val != null ? String(val) : '—';
                  }

                  return (
                    <div key={p.id} className={`flex-1 min-w-[240px] max-w-[360px] px-4 py-3.5 flex flex-col md:flex-row md:items-center gap-1 ${isWinner ? 'relative' : ''}`}>
                      {isWinner && (
                        <div className="absolute inset-0 bg-emerald-50/60 rounded-lg border border-emerald-200/50 pointer-events-none" />
                      )}
                      <span className="md:hidden text-[10px] uppercase tracking-wider text-gray-400 font-semibold flex items-center gap-1">
                        {field.icon}{field.label}
                      </span>
                      <span className={`relative z-10 text-sm ${isWinner ? 'font-bold text-emerald-700' : 'text-gray-700'}`}>
                        {isWinner && <Trophy className="w-3.5 h-3.5 inline mr-1 text-emerald-500" />}
                        {display}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })}

          {/* Amenities collapsible */}
          {allAmenities.length > 0 && (
            <>
              <button
                onClick={() => setShowAmenities(!showAmenities)}
                className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium text-[#00447C] hover:text-[#003362] transition-colors mt-2"
              >
                {showAmenities ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                Amenities y características ({allAmenities.length})
              </button>
              {showAmenities && allAmenities.map((amenity, i) => (
                <div key={amenity} className={`flex items-stretch ${i % 2 === 0 ? 'bg-gray-50/80' : 'bg-white'} rounded-lg`}>
                  <div className="hidden md:flex w-44 flex-shrink-0 items-center px-4 py-2.5">
                    <span className="text-xs text-gray-500 capitalize">{amenity}</span>
                  </div>
                  {items.map(p => {
                    const has = p.amenities?.includes(amenity);
                    return (
                      <div key={p.id} className="flex-1 min-w-[240px] max-w-[360px] px-4 py-2.5 flex items-center gap-1">
                        <span className="md:hidden text-[10px] text-gray-400 capitalize mr-2">{amenity}</span>
                        {has ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 text-sm font-medium">
                            <Check className="w-4 h-4" /> Sí
                          </span>
                        ) : (
                          <span className="text-gray-300 text-sm">—</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Verdict / Score summary */}
      <div className="mt-8 bg-gradient-to-r from-[#00447C] to-[#003362] rounded-2xl p-6 text-white">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-400" />
          Resumen comparativo
        </h3>
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}>
          {items.map(p => {
            const wins = fields.filter(f => getWinner(items, f) === p.id).length;
            return (
              <div key={p.id} className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
                <p className="font-semibold text-sm line-clamp-1 capitalize">{p.title}</p>
                <p className="text-3xl font-bold mt-2 text-amber-400">{wins}</p>
                <p className="text-xs text-white/70 mt-1">{wins === 1 ? 'categoría ganada' : 'categorías ganadas'}</p>
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-center gap-3 mt-5">
          <button
            onClick={handleShareWhatsApp}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#25D366] hover:bg-[#1db954] text-white rounded-lg text-sm font-semibold transition-all shadow-md active:scale-95"
          >
            <WhatsAppIcon className="w-4 h-4" />
            Enviar por WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
};
