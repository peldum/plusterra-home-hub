import { usePropertyPhotos } from '@/hooks/usePropertyPhotos';
import { MapPin, Bed, Bath, Square, Car, MessageCircle, Navigation, Camera, ExternalLink, Star, Clock, Send, AlertTriangle, User, ImageDown, KeyRound } from 'lucide-react';
import logoPlaceholder from '@/assets/logo-plusterra-vertical.png';
import { SoftLockGuard } from '@/components/softlock/SoftLockGuard';
import { usePropertyFavorites, useToggleFavorite } from '@/hooks/usePropertyFavorites';
import { useAuth } from '@/contexts/AuthContext';
import { WatermarkedImage } from '@/components/portal/WatermarkedImage';
import { normalizeParaguayPhone } from '@/lib/pipelineWhatsApp';

const typeLabels: Record<string, string> = {
  apartment: 'Departamento', house: 'Casa', land: 'Terreno',
  office: 'Oficina', commercial: 'Local', other: 'Otro',
};

const formatPrice = (amount: number | null, currency: string | null) => {
  if (!amount) return '-';
  if (currency === 'USD') return `USD ${amount.toLocaleString('es-PY')}`;
  return `₲ ${amount.toLocaleString('es-PY')}`;
};

const operationLabels: Record<string, string> = {
  rent: 'Alquiler', sale: 'Venta', temporary: 'Temporal', unknown: 'Sin definir',
};

const statusConfig: Record<string, { label: string; class: string }> = {
  available: { label: 'Disponible', class: 'bg-success/10 text-success' },
  reservation_request: { label: 'Solicitud de Reserva', class: 'bg-primary/10 text-primary' },
  rented: { label: 'Alquilada', class: 'bg-info/10 text-info' },
  sold: { label: 'Vendida', class: 'bg-secondary/10 text-secondary' },
  draft: { label: 'Borrador', class: 'bg-muted text-muted-foreground' },
  reserved: { label: 'Reservada', class: 'bg-warning/10 text-warning' },
  archived: { label: 'Archivada', class: 'bg-muted text-muted-foreground' },
};

const getRentedLabel = (property: any) => {
  if (property.status !== 'rented') return null;
  if (property.disponible_desde) {
    const d = new Date(property.disponible_desde + 'T00:00:00');
    return `Alquilada · Disponible desde ${d.toLocaleDateString('es-PY')}`;
  }
  return null;
};

/* ── Semáforo visual ── */
type TrafficLight = 'green' | 'yellow' | 'red';

const getTrafficLight = (property: any): { color: TrafficLight; label: string; tooltip: string } => {
  const status = property.status;
  const keyLoc = property.key_location || 'office';

  if (['reserved', 'rented', 'sold', 'archived', 'draft', 'reservation_request'].includes(status)) {
    return { color: 'red', label: 'No disponible', tooltip: 'Esta propiedad no puede mostrarse actualmente' };
  }
  if (status === 'available' && keyLoc === 'office') {
    return { color: 'green', label: 'Llave en oficina', tooltip: 'Podés coordinar visita y retirar llave en oficina' };
  }
  if (status === 'available') {
    return { color: 'yellow', label: 'Coordinar llave', tooltip: 'Requiere coordinación previa con el captador' };
  }
  return { color: 'red', label: 'No disponible', tooltip: 'Esta propiedad no puede mostrarse actualmente' };
};

const trafficColors: Record<TrafficLight, string> = {
  green: 'bg-success',
  yellow: 'bg-warning',
  red: 'bg-destructive',
};

const TrafficIndicator = ({ property }: { property: any }) => {
  const tl = getTrafficLight(property);
  return (
    <div className="flex items-center gap-1.5" title={tl.tooltip}>
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${trafficColors[tl.color]}`} />
      <span className="text-[10px] text-muted-foreground font-medium truncate">{tl.label}</span>
    </div>
  );
};

const Thumbnail = ({ propertyId }: { propertyId: string }) => {
  const { data: photos } = usePropertyPhotos(propertyId);
  const mainPhoto = photos?.[0];

  if (!mainPhoto) {
    return (
      <div className="w-full aspect-[4/3] bg-muted flex items-center justify-center">
        <img src={logoPlaceholder} alt="Sin foto" className="h-10 opacity-15" />
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-[4/3] bg-muted">
      <WatermarkedImage src={mainPhoto.thumbnail_url ?? mainPhoto.photo_url} alt="" className="w-full h-full object-cover" loading="lazy" />
      {photos && photos.length > 1 && (
        <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/60 text-white text-[10px] flex items-center gap-0.5">
          <Camera className="w-3 h-3" /> {photos.length}
        </div>
      )}
    </div>
  );
};

interface PropertyCardProps {
  property: any;
  operationType: string;
  onOpenDetail: () => void;
  onWhatsApp?: () => void;
  onMaps?: () => void;
  onWebsite?: () => void;
  onFlyer?: () => void;
  viewMode: 'grid' | 'list';
}

export const PropertyCard = ({ property, operationType, onOpenDetail, onWhatsApp, onMaps, onWebsite, onFlyer, viewMode }: PropertyCardProps) => {
  const { role } = useAuth();
  const isAgent = role === 'agent';
  const isPrivilegedRole = role === 'admin' || role === 'superadmin' || role === 'secretaria' || role === 'accounting' || (role as any) === 'gerente';
  const { data: favorites } = usePropertyFavorites();
  const toggleFavorite = useToggleFavorite();
  const isFav = favorites?.has(property.id) ?? false;
  const op = operationType;

  // Expiration countdown
  const isReserved = property.status === 'reserved';
  const expiresAt = isReserved && property?.reservation_expires_at ? new Date(property.reservation_expires_at) : null;
  const now = new Date();
  const daysLeft = expiresAt ? Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : null;

  const handleFavClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite.mutate({ propertyId: property.id, isFav });
  };

  // Quick WhatsApp to key holder (encargado) — only for privileged roles when key is with the holder
  const keyHolderWaUrl = (() => {
    if (!isPrivilegedRole) return null;
    if ((property.key_location || 'office') !== 'owner') return null;
    if (!property.key_holder_phone) return null;
    const normalized = normalizeParaguayPhone(property.key_holder_phone);
    if (!normalized) return null;
    const phone = normalized.replace('+', '');
    const text = encodeURIComponent(
      `Hola ${property.key_holder_name || ''}, te escribimos de Plusterra Inmobiliaria para coordinar el retiro de llave para mostrar la propiedad "${property.title}".`
    );
    return `https://wa.me/${phone}?text=${text}`;
  })();
  const openKeyHolderWA = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (keyHolderWaUrl) window.open(keyHolderWaUrl, '_blank');
  };

  const price = op === 'sale'
    ? formatPrice(Number(property.sale_price), property.currency)
    : formatPrice(Number(property.rental_price), property.currency) + '/mes';
  const sc = statusConfig[property.status] || statusConfig.draft;

  if (viewMode === 'list') {
    return (
      <div
        onClick={onOpenDetail}
        className="flex items-center gap-4 p-3 bg-card border border-border rounded-xl hover:shadow-md transition-all cursor-pointer active:scale-[0.99]"
      >
        {/* Tiny thumbnail */}
        <div className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
          <Thumbnail propertyId={property.id} />
        </div>
         <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground truncate">{property.title}</h3>
            {property.property_code && <span className="text-[10px] text-muted-foreground font-mono">{property.property_code}</span>}
            <span className={`badge-status text-[10px] ${sc.class}`}>{sc.label}</span>
          </div>
          {getRentedLabel(property) && (
            <p className="text-[10px] text-info font-medium mt-0.5">{getRentedLabel(property)}</p>
          )}
      {property.status === 'reservation_request' && property.requested_by_name && (
            <div className="w-full mt-1 px-2.5 py-1.5 rounded-lg bg-primary/15 border border-primary/30">
              <p className="text-[11px] text-primary font-semibold flex items-center gap-1">
                <Send className="w-3.5 h-3.5 flex-shrink-0" />
                Solicitud por: {property.requested_by_name}
              </p>
              {property.reservation_requested_at && (
                <p className="text-[10px] text-primary/70 ml-[18px]">
                  {new Date(property.reservation_requested_at).toLocaleDateString('es-PY')} – {new Date(property.reservation_requested_at).toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>
          )}
          {isReserved && property.reserved_by_name && (
            <div className="w-full mt-1 px-2.5 py-1.5 rounded-lg bg-warning/15 border border-warning/30">
              <p className="text-[11px] text-warning font-semibold flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                Reservado por: {property.reserved_by_name}
              </p>
              {daysLeft !== null && (
                <p className={`text-[10px] font-medium ml-[18px] flex items-center gap-0.5 ${daysLeft <= 1 ? 'text-destructive' : daysLeft <= 3 ? 'text-warning' : 'text-muted-foreground'}`}>
                  <AlertTriangle className="w-3 h-3" />
                  {daysLeft === 0 ? 'Vence hoy' : `Vence en ${daysLeft} día${daysLeft > 1 ? 's' : ''}`}
                </p>
              )}
              {daysLeft === null && property.reserved_at && (
                <p className="text-[10px] text-warning/70 ml-[18px]">
                  {new Date(property.reserved_at).toLocaleDateString('es-PY')} – {new Date(property.reserved_at).toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>
          )}
          <p className="text-xs text-muted-foreground truncate">
            {property.neighborhood || property.address}{property.city ? `, ${property.city}` : ''}
          </p>
          <div className="flex items-center gap-3 mt-0.5">
            <p className="text-sm font-bold text-primary">{price}</p>
            <TrafficIndicator property={property} />
          </div>
          <div className="flex items-center gap-1 mt-0.5 text-[12px] text-muted-foreground">
            <User className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">
              {property.captor_name && property.captor_name !== 'Sin asignar'
                ? `Captador: ${property.captor_name}`
                : <span className="text-muted-foreground/60">Sin captador asignado</span>}
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-1.5 flex-shrink-0">
          {isAgent && (
            <button
              onClick={handleFavClick}
              className={`p-2.5 rounded-lg transition-colors active:scale-95 ${isFav ? 'text-yellow-500 bg-yellow-50' : 'text-muted-foreground hover:bg-muted'}`}
              title={isFav ? 'Quitar favorito' : 'Agregar a favoritos'}
            >
              <Star className={`w-4 h-4 ${isFav ? 'fill-yellow-500' : ''}`} />
            </button>
          )}
          {onMaps && (
            <button onClick={e => { e.stopPropagation(); onMaps(); }} className="p-2.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 active:scale-95 transition-all">
              <Navigation className="w-4 h-4" />
            </button>
          )}
          {onWhatsApp && (
            <SoftLockGuard>
              <button onClick={e => { e.stopPropagation(); onWhatsApp(); }} className="p-2.5 rounded-lg bg-[hsl(142,70%,45%)]/10 text-[hsl(142,70%,35%)] hover:bg-[hsl(142,70%,45%)]/20 active:scale-95 transition-all">
                <MessageCircle className="w-4 h-4" />
              </button>
            </SoftLockGuard>
          )}
          {keyHolderWaUrl && (
            <button
              onClick={openKeyHolderWA}
              title={`WhatsApp al encargado de la llave${property.key_holder_name ? ` (${property.key_holder_name})` : ''}`}
              className="p-2.5 rounded-lg bg-[hsl(142,70%,45%)] text-white hover:bg-[hsl(142,70%,40%)] active:scale-95 transition-all relative"
            >
              <MessageCircle className="w-4 h-4" />
              <KeyRound className="w-2.5 h-2.5 absolute -bottom-0.5 -right-0.5 bg-background text-[hsl(142,70%,35%)] rounded-full p-px" />
            </button>
          )}
          {onWebsite && (
            <button onClick={e => { e.stopPropagation(); onWebsite(); }} className="p-2.5 rounded-lg active:scale-95 transition-all text-white" style={{ backgroundColor: '#FC5100' }}>
              <ExternalLink className="w-4 h-4" />
            </button>
          )}
          {onFlyer && (
            <button onClick={e => { e.stopPropagation(); onFlyer(); }} className="p-2.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 active:scale-95 transition-all" title="Generar Flyer">
              <ImageDown className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // Grid card
  return (
    <div
      onClick={onOpenDetail}
      className="bg-card border border-border rounded-xl overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer active:scale-[0.98]"
    >
      {/* Thumbnail with favorite overlay */}
      <div className="relative">
        <Thumbnail propertyId={property.id} />
        {isAgent && (
          <button
            onClick={handleFavClick}
            className={`absolute top-2 right-2 p-2.5 rounded-full backdrop-blur-sm transition-all active:scale-90 ${
              isFav ? 'bg-yellow-400/90 text-white' : 'bg-black/30 text-white hover:bg-black/50'
            }`}
            title={isFav ? 'Quitar favorito' : 'Agregar a favoritos'}
          >
            <Star className={`w-4 h-4 ${isFav ? 'fill-white' : ''}`} />
          </button>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-center gap-2 mb-1">
          <span className={`badge-status text-[10px] ${sc.class}`}>{sc.label}</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary">
            {operationLabels[op]}
          </span>
          <span className="text-[10px] text-muted-foreground ml-auto">{typeLabels[property.property_type]}</span>
        </div>
        <h3 className="font-semibold text-foreground text-sm truncate">{property.title}</h3>
        {property.property_code && (
          <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{property.property_code}</p>
        )}
        {getRentedLabel(property) && (
          <p className="text-[10px] text-info font-medium mt-0.5">{getRentedLabel(property)}</p>
        )}
        {property.status === 'reservation_request' && property.requested_by_name && (
          <div className="mt-1.5 px-2.5 py-1.5 rounded-lg bg-primary/15 border border-primary/30">
            <p className="text-[11px] text-primary font-semibold flex items-center gap-1">
              <Send className="w-3.5 h-3.5 flex-shrink-0" />
              Solicitud por: {property.requested_by_name}
            </p>
            {property.reservation_requested_at && (
              <p className="text-[10px] text-primary/70 ml-[18px]">
                {new Date(property.reservation_requested_at).toLocaleDateString('es-PY')} – {new Date(property.reservation_requested_at).toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </div>
        )}
        {isReserved && property.reserved_by_name && (
          <div className="mt-1.5 px-2.5 py-1.5 rounded-lg bg-warning/15 border border-warning/30">
            <p className="text-[11px] text-warning font-semibold flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 flex-shrink-0" />
              Reservado por: {property.reserved_by_name}
            </p>
            {daysLeft !== null && (
              <p className={`text-[10px] font-medium ml-[18px] flex items-center gap-0.5 ${daysLeft <= 1 ? 'text-destructive' : daysLeft <= 3 ? 'text-warning' : 'text-muted-foreground'}`}>
                <AlertTriangle className="w-3 h-3" />
                {daysLeft === 0 ? 'Vence hoy' : `Vence en ${daysLeft} día${daysLeft > 1 ? 's' : ''}`}
              </p>
            )}
            {daysLeft === null && property.reserved_at && (
              <p className="text-[10px] text-warning/70 ml-[18px]">
                {new Date(property.reserved_at).toLocaleDateString('es-PY')} – {new Date(property.reserved_at).toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </div>
        )}
        {(property.address || property.neighborhood) && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{property.neighborhood || property.address}{property.city ? `, ${property.city}` : ''}</span>
          </div>
        )}
        <div className="flex items-center justify-between mt-2">
          <p className="text-lg font-bold text-primary">{price}</p>
          <TrafficIndicator property={property} />
        </div>

        {/* Features row */}
        <div className="flex items-center gap-3 mt-2 pt-2 border-t border-border text-xs text-muted-foreground">
          {(property.bedrooms ?? 0) > 0 && <span className="flex items-center gap-1"><Bed className="w-3.5 h-3.5" />{property.bedrooms}</span>}
          {(property.bathrooms ?? 0) > 0 && <span className="flex items-center gap-1"><Bath className="w-3.5 h-3.5" />{property.bathrooms}</span>}
          {Number(property.area_m2) > 0 && <span className="flex items-center gap-1"><Square className="w-3.5 h-3.5" />{property.area_m2}m²</span>}
          {property.has_garage && <span className="flex items-center gap-1"><Car className="w-3.5 h-3.5" /></span>}
        </div>

        {/* Captor agent */}
        <div className="flex items-center gap-1 mt-1.5 text-[12px] text-muted-foreground">
          <User className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">
            {property.captor_name && property.captor_name !== 'Sin asignar'
              ? `Captador: ${property.captor_name}`
              : <span className="text-muted-foreground/60">Sin captador asignado</span>}
          </span>
        </div>

        {/* Quick action: WhatsApp encargado (privileged roles only, when key is with holder) */}
        {keyHolderWaUrl && (
          <button
            onClick={openKeyHolderWA}
            className="mt-3 w-full flex items-center justify-center gap-1.5 py-2.5 min-h-[44px] rounded-lg bg-[hsl(142,70%,45%)] text-white text-xs font-medium hover:bg-[hsl(142,70%,40%)] active:scale-95 transition-all"
            title={`WhatsApp al encargado de la llave${property.key_holder_name ? ` (${property.key_holder_name})` : ''}`}
          >
            <KeyRound className="w-4 h-4 flex-shrink-0" />
            <MessageCircle className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">WA Encargado{property.key_holder_name ? ` · ${property.key_holder_name}` : ''}</span>
          </button>
        )}

        {/* Quick actions */}
        <div className="grid mt-3 gap-2" style={{ gridTemplateColumns: `repeat(${[onMaps, onWhatsApp, onWebsite, onFlyer].filter(Boolean).length}, 1fr)` }}>
          {onMaps && (
            <button onClick={e => { e.stopPropagation(); onMaps(); }}
              className="flex items-center justify-center gap-1 py-2.5 min-h-[44px] rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 active:scale-95 transition-all whitespace-nowrap">
              <Navigation className="w-4 h-4 flex-shrink-0" /> Mapa
            </button>
          )}
          {onWhatsApp && (
            <SoftLockGuard lockedClassName="contents">
              <button onClick={e => { e.stopPropagation(); onWhatsApp(); }}
                className="flex items-center justify-center gap-1 py-2.5 min-h-[44px] rounded-lg bg-[hsl(142,70%,45%)]/10 text-[hsl(142,70%,35%)] text-xs font-medium hover:bg-[hsl(142,70%,45%)]/20 active:scale-95 transition-all whitespace-nowrap">
                <MessageCircle className="w-4 h-4 flex-shrink-0" /> WhatsApp
              </button>
            </SoftLockGuard>
          )}
          {onWebsite && (
            <button onClick={e => { e.stopPropagation(); onWebsite(); }}
              className="flex items-center justify-center gap-1 py-2.5 min-h-[44px] rounded-lg text-xs font-medium active:scale-95 transition-all text-white whitespace-nowrap"
              style={{ backgroundColor: '#FC5100' }}>
              <ExternalLink className="w-4 h-4 flex-shrink-0" /> Ver en web
            </button>
          )}
          {onFlyer && (
            <button onClick={e => { e.stopPropagation(); onFlyer(); }}
              className="flex items-center justify-center gap-1 py-2.5 min-h-[44px] rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 active:scale-95 transition-all whitespace-nowrap">
              <ImageDown className="w-4 h-4 flex-shrink-0" /> Flyer
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
