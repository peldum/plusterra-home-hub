import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Search, Loader2 } from 'lucide-react';

interface NominatimSuggestion {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type?: string;
  class?: string;
}

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
  const [suggestions, setSuggestions] = useState<NominatimSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const debounceRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

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

  // Encarnación bounding box (viewbox: left,top,right,bottom in lon,lat)
  const ENCARNACION_VIEWBOX = '-56.20,-27.10,-55.55,-27.55';

  const fetchSuggestions = async (q: string) => {
    if (!q.trim() || q.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setSearching(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=6&countrycodes=py&addressdetails=1&viewbox=${ENCARNACION_VIEWBOX}&bounded=0`;
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { 'Accept-Language': 'es' },
      });
      const data: NominatimSuggestion[] = await res.json();
      // Sort: results inside Encarnación bbox first
      const inBox = (s: NominatimSuggestion) => {
        const la = parseFloat(s.lat), lo = parseFloat(s.lon);
        return la <= -27.10 && la >= -27.55 && lo >= -56.20 && lo <= -55.55;
      };
      data.sort((a, b) => Number(inBox(b)) - Number(inBox(a)));
      setSuggestions(data);
      setShowSuggestions(true);
      setHighlightIdx(-1);
    } catch (err: any) {
      if (err?.name !== 'AbortError') console.error('Geocoding error:', err);
    } finally {
      setSearching(false);
    }
  };

  // Debounce input → fetch suggestions
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      fetchSuggestions(searchQuery);
    }, 350);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [searchQuery]);

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectSuggestion = (s: NominatimSuggestion) => {
    const newLat = parseFloat(s.lat).toFixed(6);
    const newLng = parseFloat(s.lon).toFixed(6);
    onLocationChange(newLat, newLng);
    mapRef.current?.setView([parseFloat(newLat), parseFloat(newLng)], 17);
    setSearchQuery(s.display_name.split(',').slice(0, 2).join(','));
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === 'Enter') {
        e.preventDefault();
        fetchSuggestions(searchQuery);
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIdx(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIdx(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const idx = highlightIdx >= 0 ? highlightIdx : 0;
      selectSuggestion(suggestions[idx]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
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
      {/* Search bar with autocomplete */}
      <div ref={wrapperRef} className="relative">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar calle, barrio, lugar... (Encarnación)"
            className="input-field pl-8 pr-9 text-sm w-full"
            autoComplete="off"
          />
          {searching && (
            <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
          )}
        </div>
        {showSuggestions && suggestions.length > 0 && (
          <ul className="absolute z-[1000] mt-1 w-full bg-popover border border-border rounded-lg shadow-lg max-h-64 overflow-y-auto">
            {suggestions.map((s, idx) => (
              <li
                key={s.place_id}
                onMouseDown={(e) => { e.preventDefault(); selectSuggestion(s); }}
                onMouseEnter={() => setHighlightIdx(idx)}
                className={`px-3 py-2 text-sm cursor-pointer flex items-start gap-2 ${
                  idx === highlightIdx ? 'bg-accent text-accent-foreground' : 'text-foreground hover:bg-muted'
                }`}
              >
                <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-primary" />
                <span className="line-clamp-2">{s.display_name}</span>
              </li>
            ))}
          </ul>
        )}
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
