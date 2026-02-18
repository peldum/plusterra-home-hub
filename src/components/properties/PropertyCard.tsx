import { usePropertyPhotos } from '@/hooks/usePropertyPhotos';
import { MapPin, Bed, Bath, Square, Car, MessageCircle, Navigation, Camera, ExternalLink } from 'lucide-react';
import logoPlaceholder from '@/assets/logo-plusterra-vertical.png';
import { SoftLockGuard } from '@/components/softlock/SoftLockGuard';

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
  rented: { label: 'Alquilada', class: 'bg-info/10 text-info' },
  sold: { label: 'Vendida', class: 'bg-secondary/10 text-secondary' },
  draft: { label: 'Borrador', class: 'bg-muted text-muted-foreground' },
  reserved: { label: 'Reservada', class: 'bg-warning/10 text-warning' },
  archived: { label: 'Archivada', class: 'bg-muted text-muted-foreground' },
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
      <img src={mainPhoto.thumbnail_url ?? mainPhoto.photo_url} alt="" className="w-full h-full object-cover" loading="lazy" />
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
  viewMode: 'grid' | 'list';
}

export const PropertyCard = ({ property, operationType, onOpenDetail, onWhatsApp, onMaps, onWebsite, viewMode }: PropertyCardProps) => {
  const op = operationType;
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
            <span className={`badge-status text-[10px] ${sc.class}`}>{sc.label}</span>
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {property.neighborhood || property.address}{property.city ? `, ${property.city}` : ''}
          </p>
          <p className="text-sm font-bold text-primary mt-0.5">{price}</p>
        </div>
        <div className="flex flex-col gap-1.5 flex-shrink-0">
          {onMaps && (
            <button onClick={e => { e.stopPropagation(); onMaps(); }} className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
              <Navigation className="w-3.5 h-3.5" />
            </button>
          )}
          {onWhatsApp && (
            <SoftLockGuard>
              <button onClick={e => { e.stopPropagation(); onWhatsApp(); }} className="p-2 rounded-lg bg-[hsl(142,70%,45%)]/10 text-[hsl(142,70%,35%)] hover:bg-[hsl(142,70%,45%)]/20 transition-colors">
                <MessageCircle className="w-3.5 h-3.5" />
              </button>
            </SoftLockGuard>
          )}
          {onWebsite && (
            <button onClick={e => { e.stopPropagation(); onWebsite(); }} className="p-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 active:scale-95 transition-all">
              <ExternalLink className="w-3.5 h-3.5" />
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
      <Thumbnail propertyId={property.id} />
      <div className="p-4">
        <div className="flex items-center gap-2 mb-1">
          <span className={`badge-status text-[10px] ${sc.class}`}>{sc.label}</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary">
            {operationLabels[op]}
          </span>
          <span className="text-[10px] text-muted-foreground ml-auto">{typeLabels[property.property_type]}</span>
        </div>
        <h3 className="font-semibold text-foreground text-sm truncate">{property.title}</h3>
        {(property.address || property.neighborhood) && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{property.neighborhood || property.address}{property.city ? `, ${property.city}` : ''}</span>
          </div>
        )}
        <p className="text-lg font-bold text-primary mt-2">{price}</p>

        {/* Features row */}
        <div className="flex items-center gap-3 mt-2 pt-2 border-t border-border text-xs text-muted-foreground">
          {(property.bedrooms ?? 0) > 0 && <span className="flex items-center gap-1"><Bed className="w-3.5 h-3.5" />{property.bedrooms}</span>}
          {(property.bathrooms ?? 0) > 0 && <span className="flex items-center gap-1"><Bath className="w-3.5 h-3.5" />{property.bathrooms}</span>}
          {Number(property.area_m2) > 0 && <span className="flex items-center gap-1"><Square className="w-3.5 h-3.5" />{property.area_m2}m²</span>}
          {property.has_garage && <span className="flex items-center gap-1"><Car className="w-3.5 h-3.5" /></span>}
        </div>

        {/* Quick actions */}
        <div className="flex gap-2 mt-3">
          {onMaps && (
            <button onClick={e => { e.stopPropagation(); onMaps(); }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors">
              <Navigation className="w-3.5 h-3.5" /> Mapa
            </button>
          )}
          {onWhatsApp && (
            <SoftLockGuard lockedClassName="flex-1">
              <button onClick={e => { e.stopPropagation(); onWhatsApp(); }}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[hsl(142,70%,45%)]/10 text-[hsl(142,70%,35%)] text-xs font-medium hover:bg-[hsl(142,70%,45%)]/20 transition-colors">
                <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
              </button>
            </SoftLockGuard>
          )}
          {onWebsite && (
            <button onClick={e => { e.stopPropagation(); onWebsite(); }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-secondary text-secondary-foreground text-xs font-medium hover:bg-secondary/80 active:scale-95 transition-all">
              <ExternalLink className="w-3.5 h-3.5" /> Ver en web
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
