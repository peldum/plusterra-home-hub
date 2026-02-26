import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { PublicListing } from '@/hooks/usePublicListings';

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

interface PortalMapSectionProps {
  listings: PublicListing[];
  center: [number, number];
  zoom: number;
  showClusters?: boolean;
}

const PortalMapSection = ({ listings, center, zoom, showClusters = true }: PortalMapSectionProps) => {
  if (listings.length === 0) return null;

  const markers = listings.map(p => (
    <Marker key={p.id} position={[p.public_lat!, p.public_lng!]}>
      <Popup>
        <div className="min-w-[200px]">
          <h3 className="font-semibold text-sm">{p.title}</h3>
          <p className="text-xs text-gray-500 mt-0.5">{[p.neighborhood, p.city].filter(Boolean).join(', ')}</p>
          <p className="font-bold text-[#00447C] mt-1 text-sm">{formatPrice(p)}</p>
          <Link to={`/portal/propiedades/${p.id}`} className="inline-block mt-2 text-xs text-[#FC5100] font-medium hover:underline">
            Ver detalle →
          </Link>
        </div>
      </Popup>
    </Marker>
  ));

  return (
    <section className="w-full h-[50vh] md:h-[55vh]">
      <MapContainer center={center} zoom={zoom} className="w-full h-full z-0" scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {showClusters ? (
          <MarkerClusterGroup chunkedLoading>{markers}</MarkerClusterGroup>
        ) : (
          <>{markers}</>
        )}
      </MapContainer>
    </section>
  );
};

export default PortalMapSection;
