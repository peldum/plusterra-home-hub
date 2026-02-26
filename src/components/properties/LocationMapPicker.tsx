import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Search, Loader2 } from 'lucide-react';

// Fix default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface LocationMapPickerProps {
  lat: string;
  lng: string;
  onLocationChange: (lat: string, lng: string) => void;
}

export const LocationMapPicker = ({ lat, lng, onLocationChange }: LocationMapPickerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  const defaultCenter: [number, number] = [-27.3307, -55.8667];

  const getCenter = (): [number, number] => {
    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);
    if (!isNaN(parsedLat) && !isNaN(parsedLng)) return [parsedLat, parsedLng];
    return defaultCenter;
  };

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const center = getCenter();
    const map = L.map(containerRef.current).setView(center, lat && lng ? 16 : 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
    }).addTo(map);

    // Add marker if coordinates exist
    if (lat && lng) {
      const marker = L.marker(center, { draggable: true }).addTo(map);
      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        onLocationChange(pos.lat.toFixed(6), pos.lng.toFixed(6));
      });
      markerRef.current = marker;
    }

    // Click to place/move marker
    map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat: clickLat, lng: clickLng } = e.latlng;
      onLocationChange(clickLat.toFixed(6), clickLng.toFixed(6));

      if (markerRef.current) {
        markerRef.current.setLatLng(e.latlng);
      } else {
        const marker = L.marker(e.latlng, { draggable: true }).addTo(map);
        marker.on('dragend', () => {
          const pos = marker.getLatLng();
          onLocationChange(pos.lat.toFixed(6), pos.lng.toFixed(6));
        });
        markerRef.current = marker;
      }
    });

    mapRef.current = map;
    setMapReady(true);

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
      setMapReady(false);
    };
  }, []); // Only init once

  // Update marker when lat/lng change externally
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;
    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);
    if (isNaN(parsedLat) || isNaN(parsedLng)) return;

    const pos: [number, number] = [parsedLat, parsedLng];
    if (markerRef.current) {
      markerRef.current.setLatLng(pos);
    } else {
      const marker = L.marker(pos, { draggable: true }).addTo(mapRef.current);
      marker.on('dragend', () => {
        const p = marker.getLatLng();
        onLocationChange(p.lat.toFixed(6), p.lng.toFixed(6));
      });
      markerRef.current = marker;
    }
  }, [lat, lng, mapReady]);

  const handleSearch = async () => {
    if (!searchQuery.trim() || !mapRef.current) return;
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1&countrycodes=py`
      );
      const data = await res.json();
      if (data.length > 0) {
        const { lat: foundLat, lon: foundLng } = data[0];
        const newLat = parseFloat(foundLat).toFixed(6);
        const newLng = parseFloat(foundLng).toFixed(6);
        onLocationChange(newLat, newLng);
        mapRef.current.setView([parseFloat(newLat), parseFloat(newLng)], 16);
      }
    } catch (err) {
      console.error('Geocoding error:', err);
    } finally {
      setSearching(false);
    }
  };

  const handleClear = () => {
    onLocationChange('', '');
    if (markerRef.current && mapRef.current) {
      mapRef.current.removeLayer(markerRef.current);
      markerRef.current = null;
    }
    mapRef.current?.setView(defaultCenter, 12);
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-foreground mb-1">
        📍 Ubicación en mapa
      </label>
      {/* Search bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleSearch())}
            placeholder="Buscar dirección..."
            className="input-field pl-8 text-sm"
          />
        </div>
        <button
          type="button"
          onClick={handleSearch}
          disabled={searching}
          className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Buscar'}
        </button>
      </div>

      {/* Map */}
      <div ref={containerRef} className="w-full h-48 rounded-lg border border-border overflow-hidden" />

      {/* Coordinates display */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <MapPin className="w-3 h-3" />
          {lat && lng ? (
            <span>{lat}, {lng}</span>
          ) : (
            <span>Hacé clic en el mapa para marcar la ubicación</span>
          )}
        </div>
        {lat && lng && (
          <button
            type="button"
            onClick={handleClear}
            className="text-xs text-destructive hover:underline"
          >
            Quitar ubicación
          </button>
        )}
      </div>
    </div>
  );
};
