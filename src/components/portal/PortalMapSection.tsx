import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
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

const PortalMapSection = ({ listings, center, zoom }: PortalMapSectionProps) => {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // If map already exists, update view
    if (mapRef.current) {
      mapRef.current.setView(center, zoom);
      return;
    }

    const map = L.map(containerRef.current).setView(center, zoom);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    mapRef.current = map;

    // Invalidate size after render to fix lazy-loaded containers
    const timer = window.setTimeout(() => map.invalidateSize(), 200);

    return () => {
      window.clearTimeout(timer);
      map.remove();
      mapRef.current = null;
    };
  }, [center[0], center[1], zoom]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear existing markers
    map.eachLayer(layer => {
      if (layer instanceof L.Marker) map.removeLayer(layer);
    });

    listings.forEach(p => {
      if (!p.public_lat || !p.public_lng) return;
      const marker = L.marker([p.public_lat, p.public_lng]).addTo(map);
      const location = [p.neighborhood, p.city].filter(Boolean).join(', ');
      marker.bindPopup(`
        <div style="min-width:200px">
          <h3 style="font-weight:600;font-size:14px;margin:0">${p.title}</h3>
          <p style="font-size:12px;color:#6b7280;margin:4px 0 0">${location}</p>
          <p style="font-weight:700;color:#00447C;margin:8px 0 4px;font-size:14px">${formatPrice(p)}</p>
          <a href="/portal/propiedades/${p.id}" style="font-size:12px;color:#FC5100;font-weight:500;text-decoration:none">Ver detalle →</a>
        </div>
      `);
    });
  }, [listings]);

  if (listings.length === 0) return null;

  return (
    <section className="w-full h-[50vh] md:h-[55vh]">
      <div ref={containerRef} className="w-full h-full z-0" />
    </section>
  );
};

export default PortalMapSection;
