import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { usePublicListings, PublicListing } from '@/hooks/usePublicListings';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Bed, Bath, Loader2, Building2 } from 'lucide-react';

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

const PortalMap = () => {
  const { data: listings, isLoading } = usePublicListings();
  const [selected, setSelected] = useState<PublicListing | null>(null);

  const geoListings = useMemo(() =>
    (listings || []).filter(p => p.public_lat && p.public_lng),
    [listings]
  );

  // Asunción center
  const center: [number, number] = [-25.2867, -57.647];

  if (isLoading) return (
    <div className="flex justify-center items-center min-h-[60vh]">
      <Loader2 className="w-8 h-8 animate-spin text-[#00447C]" />
    </div>
  );

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-64px)]">
      {/* Map */}
      <div className="flex-1 min-h-[400px]">
        <MapContainer center={center} zoom={12} className="w-full h-full" scrollWheelZoom>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {geoListings.map(p => (
            <Marker
              key={p.id}
              position={[p.public_lat!, p.public_lng!]}
              eventHandlers={{ click: () => setSelected(p) }}
            >
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
        </MapContainer>
      </div>

      {/* Sidebar list */}
      <div className="w-full lg:w-80 bg-white border-l border-gray-200 overflow-y-auto">
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">
            {geoListings.length} propiedades en el mapa
          </h2>
          {geoListings.length === 0 && listings && listings.length > 0 && (
            <p className="text-xs text-gray-500 mt-1">Las propiedades publicadas no tienen coordenadas aún.</p>
          )}
        </div>
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
                onMouseEnter={() => setSelected(p)}
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
    </div>
  );
};

export default PortalMap;
