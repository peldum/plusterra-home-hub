import { useEffect, useRef, useState, memo } from 'react';
import { PublicListing } from '@/hooks/usePublicListings';
import { Skeleton } from '@/components/ui/skeleton';

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
  const mapRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [leafletReady, setLeafletReady] = useState(false);
  const LRef = useRef<typeof import('leaflet') | null>(null);

  // IntersectionObserver — only load map when section scrolls near viewport
  useEffect(() => {
    if (!sectionRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setIsVisible(true); observer.disconnect(); } },
      { rootMargin: '200px' }
    );
    observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  // Dynamically import Leaflet only when visible
  useEffect(() => {
    if (!isVisible) return;
    let cancelled = false;
    Promise.all([
      import('leaflet'),
      import('leaflet/dist/leaflet.css'),
    ]).then(([L]) => {
      if (cancelled) return;
      // Fix default marker icon
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });
      LRef.current = L;
      setLeafletReady(true);
    });
    return () => { cancelled = true; };
  }, [isVisible]);

  // Init map
  useEffect(() => {
    if (!leafletReady || !containerRef.current) return;
    const L = LRef.current!;

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    try {
      const map = L.map(containerRef.current, { scrollWheelZoom: false }).setView(center, zoom);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);
      mapRef.current = map;

      const t1 = window.setTimeout(() => map.invalidateSize(), 100);
      const t2 = window.setTimeout(() => map.invalidateSize(), 500);

      return () => {
        window.clearTimeout(t1);
        window.clearTimeout(t2);
        map.remove();
        mapRef.current = null;
      };
    } catch (err) {
      console.error('Error initializing map:', err);
    }
  }, [leafletReady, center[0], center[1], zoom]);

  // Add markers
  useEffect(() => {
    const map = mapRef.current;
    const L = LRef.current;
    if (!map || !L) return;

    try {
      map.eachLayer((layer: any) => {
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
    } catch (error) {
      console.error('[PortalMapSection] Marker rendering error:', error);
    }
  }, [listings, leafletReady]);

  if (listings.length === 0) return null;

  return (
    <section ref={sectionRef} className="max-w-7xl mx-auto px-4 py-8">
      <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm">
        <div className="bg-[#00447C] text-white px-4 py-2 text-sm font-semibold flex items-center gap-2">
          📍 Mapa
        </div>
        {!leafletReady ? (
          <Skeleton className="w-full h-[400px] md:h-[450px]" />
        ) : (
          <div ref={containerRef} className="w-full h-[400px] md:h-[450px] z-0" />
        )}
      </div>
    </section>
  );
});

PortalMapSection.displayName = 'PortalMapSection';

export default PortalMapSection;
