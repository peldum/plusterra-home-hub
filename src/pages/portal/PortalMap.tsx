import { useState, useMemo, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { usePublicListings, PublicListing } from '@/hooks/usePublicListings';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Bed, Bath, Loader2, Building2, Map, List, LayoutGrid } from 'lucide-react';

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

type ViewMode = 'map' | 'list' | 'both';

const PortalMap = () => {
  const { data: listings, isLoading } = usePublicListings();
  const [selected, setSelected] = useState<PublicListing | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('both');
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const geoListings = useMemo(() =>
    (listings || []).filter(p => p.public_lat && p.public_lng),
    [listings]
  );

  const center: [number, number] = [-27.3307, -55.8667];
  const showMap = viewMode === 'map' || viewMode === 'both';
  const showList = viewMode === 'list' || viewMode === 'both';

  // Initialize map
  useEffect(() => {
    if (isLoading || !showMap || !containerRef.current || mapRef.current) return;

    try {
      const map = L.map(containerRef.current).setView(center, 12);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);
      mapRef.current = map;

      return () => {
        try {
          map.remove();
          mapRef.current = null;
        } catch (error) {
          console.error('[PortalMap] Cleanup error:', error);
        }
      };
    } catch (error) {
      console.error('[PortalMap] Init map error:', error);
    }
  }, [showMap, isLoading]);

  // Update markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    try {
      map.eachLayer(layer => {
        if (layer instanceof L.Marker || layer instanceof L.Circle) map.removeLayer(layer);
      });

      geoListings.forEach(p => {
        const location = [p.neighborhood, p.city].filter(Boolean).join(', ');
        const popupContent = `
          <div style="min-width:200px">
            <h3 style="font-weight:600;font-size:14px;margin:0">${p.title}</h3>
            <p style="font-size:12px;color:#6b7280;margin:4px 0 0">${location}</p>
            <p style="font-weight:700;color:#00447C;margin:8px 0 4px;font-size:14px">${formatPrice(p)}</p>
            <a href="/portal/propiedades/${p.id}" style="font-size:12px;color:#FC5100;font-weight:500;text-decoration:none">Ver detalle →</a>
          </div>
        `;

        if (p.exact_location_enabled) {
          const marker = L.marker([p.public_lat!, p.public_lng!]).addTo(map);
          marker.bindPopup(popupContent);
          marker.on('click', () => setSelected(prev => (prev?.id === p.id ? prev : p)));
        } else {
          // Privacy radius circle
          const circle = L.circle([p.public_lat!, p.public_lng!], {
            radius: 350,
            color: '#FC5100',
            fillColor: '#FC5100',
            fillOpacity: 0.15,
            weight: 1.5,
            opacity: 0.4,
          }).addTo(map);
          circle.bindPopup(popupContent);
          circle.on('click', () => setSelected(prev => (prev?.id === p.id ? prev : p)));
        }
      });
    } catch (error) {
      console.error('[PortalMap] Marker update error:', error);
    }
  }, [geoListings]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !showMap) return;

    try {
      const timer = window.setTimeout(() => {
        map.invalidateSize();
      }, 120);

      return () => window.clearTimeout(timer);
    } catch (error) {
      console.error('[PortalMap] Resize invalidate error:', error);
    }
  }, [showMap, viewMode]);


  if (isLoading) return (
    <div className="flex justify-center items-center min-h-[60vh]">
      <Loader2 className="w-8 h-8 animate-spin text-[#00447C]" />
    </div>
  );

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Toggle bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">
          {geoListings.length} propiedades con ubicación
        </span>
        <div className="flex items-center bg-gray-100 rounded-lg p-0.5 gap-0.5">
          <button
            onClick={() => setViewMode('map')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${viewMode === 'map' ? 'bg-white shadow-sm text-[#00447C]' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Map className="w-3.5 h-3.5" /> Mapa
          </button>
          <button
            onClick={() => setViewMode('both')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${viewMode === 'both' ? 'bg-white shadow-sm text-[#00447C]' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <LayoutGrid className="w-3.5 h-3.5" /> Ambos
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm text-[#00447C]' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <List className="w-3.5 h-3.5" /> Lista
          </button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0 flex-col lg:flex-row">
        {showMap && (
          <div
            className={`${showList ? 'w-full lg:flex-1 h-[42vh] lg:h-auto' : 'w-full min-h-[400px]'} min-h-[280px]`}
          >
            <div ref={containerRef} className="w-full h-full" />
          </div>
        )}

        {showList && (
          <div
            className={`${showMap ? 'w-full lg:w-80 lg:flex-none max-h-[58vh] lg:max-h-none border-t lg:border-t-0 lg:border-l' : 'w-full'} bg-white border-gray-200 overflow-y-auto`}
          >
            {geoListings.length === 0 ? (
              <div className="p-8 text-center">
                <Building2 className="w-10 h-10 mx-auto text-gray-300 mb-3" />
                <p className="text-sm text-gray-500">No hay propiedades geolocalizadas.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {geoListings.map(p => (
                  <Link
                    key={p.id}
                    to={`/portal/propiedades/${p.id}`}
                    className={`block p-4 hover:bg-gray-50 transition-colors ${
                      selected?.id === p.id ? 'bg-blue-50' : ''
                    }`}
                    onMouseEnter={() => setSelected(prev => (prev?.id === p.id ? prev : p))}
                  >
                    <h3 className="font-medium text-sm text-gray-900 line-clamp-1">{p.title}</h3>
                    <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                      <MapPin className="w-3 h-3" />
                      {p.neighborhood || p.city}
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="font-bold text-[#00447C] text-sm">{formatPrice(p)}</span>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        {p.bedrooms != null && <span className="flex items-center gap-0.5"><Bed className="w-3 h-3" />{p.bedrooms}</span>}
                        {p.bathrooms != null && <span className="flex items-center gap-0.5"><Bath className="w-3 h-3" />{p.bathrooms}</span>}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PortalMap;
