import { useEffect, useRef, useState, memo, useCallback } from 'react';
import { PublicListing } from '@/hooks/usePublicListings';
import { Skeleton } from '@/components/ui/skeleton';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icon once at module level
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const formatPrice = (p: PublicListing) => {
  const price = Number(p.sale_price) > 0 ? Number(p.sale_price) : Number(p.rental_price);
  return p.currency === 'USD'
    ? 'USD ' + Math.round(price).toLocaleString('en-US')
    : 'Gs. ' + Math.round(price).toLocaleString('es-PY');
};

interface PortalMapSectionProps {
  listings: PublicListing[];
  center: [number, number];
  zoom: number;
  showClusters?: boolean;
}

const PortalMapSection = memo(({ listings, center, zoom }: PortalMapSectionProps) => {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  // IntersectionObserver — init map when section is near viewport
  useEffect(() => {
    if (!sectionRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setIsVisible(true); observer.disconnect(); } },
      { rootMargin: '400px' }
    );
    observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  // Init map when visible and container ready
  useEffect(() => {
    if (!isVisible || !containerRef.current || mapRef.current) return;

    try {
      const map = L.map(containerRef.current, {
        scrollWheelZoom: false,
        zoomControl: true,
        attributionControl: true,
      }).setView(center, zoom);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      mapRef.current = map;

      // Multiple invalidateSize calls to ensure tiles render
      const timers = [100, 300, 600, 1200].map(ms =>
        window.setTimeout(() => {
          try { map.invalidateSize(); } catch (_) {}
        }, ms)
      );

      setMapReady(true);

      return () => {
        timers.forEach(t => window.clearTimeout(t));
        try { map.remove(); } catch (_) {}
        mapRef.current = null;
        setMapReady(false);
      };
    } catch (err) {
      console.error('[PortalMapSection] Init error:', err);
    }
  }, [isVisible]);

  // Update center/zoom without recreating
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setView(center, zoom);
  }, [center[0], center[1], zoom]);

  // Add markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    // Remove old markers/circles
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.Circle) map.removeLayer(layer);
    });

    listings.forEach(p => {
      if (!p.public_lat || !p.public_lng) return;
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
        L.marker([p.public_lat, p.public_lng]).addTo(map).bindPopup(popupContent);
      } else {
        L.circle([p.public_lat, p.public_lng], {
          radius: 350,
          color: '#FC5100',
          fillColor: '#FC5100',
          fillOpacity: 0.15,
          weight: 1.5,
          opacity: 0.4,
        }).addTo(map).bindPopup(popupContent);
      }
    });
  }, [listings, mapReady]);

  if (listings.length === 0) return null;

  return (
    <section ref={sectionRef} className="max-w-7xl mx-auto px-4 py-8">
      <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm">
        <div className="bg-[#00447C] text-white px-4 py-2 text-sm font-semibold flex items-center gap-2">
          📍 Mapa
        </div>
        <div className="relative w-full h-[350px] md:h-[450px]">
          {!mapReady && <Skeleton className="absolute inset-0 z-10" />}
          <div
            ref={containerRef}
            className="w-full h-full z-0"
          />
        </div>
      </div>
    </section>
  );
});

PortalMapSection.displayName = 'PortalMapSection';

export default PortalMapSection;
