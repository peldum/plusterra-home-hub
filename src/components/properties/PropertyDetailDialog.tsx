import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { usePropertyPhotos } from '@/hooks/usePropertyPhotos';
import { useWhatsAppTemplate, fillWhatsAppTemplate, buildWhatsAppDeepLink } from '@/hooks/useWhatsAppTemplate';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/contexts/AuthContext';
import { KeyControlPanel } from '@/components/keys/KeyControlPanel';
import {
  MapPin, Bed, Bath, Square, Car, MessageCircle, Navigation, ChevronLeft, ChevronRight, Camera, X, Building2, Globe,
} from 'lucide-react';
import logoPlaceholder from '@/assets/logo-plusterra-vertical.png';

interface PropertyDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  property: any;
}

const typeLabels: Record<string, string> = {
  apartment: 'Departamento', house: 'Casa', land: 'Terreno',
  office: 'Oficina', commercial: 'Local', other: 'Otro',
};

const formatPrice = (amount: number | null, currency: string | null) => {
  if (!amount) return '-';
  if (currency === 'USD') return `USD ${amount.toLocaleString('es-PY')}`;
  return `₲ ${amount.toLocaleString('es-PY')}`;
};

const getOperationType = (p: any) => {
  const hasRent = Number(p.rental_price) > 0;
  const hasSale = Number(p.sale_price) > 0;
  if (hasRent && p.rental_period === 'daily') return 'temporary';
  if (hasRent) return 'rent';
  if (hasSale) return 'sale';
  return 'unknown';
};

const operationLabels: Record<string, string> = {
  rent: 'Alquiler', sale: 'Venta', temporary: 'Temporal', unknown: 'Sin definir',
};

const buildMapsLink = (property: any) => {
  const address = [property.address, property.neighborhood, property.city].filter(Boolean).join(', ');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
};

const PhotoGallery = ({ propertyId }: { propertyId: string }) => {
  const { data: photos, isLoading } = usePropertyPhotos(propertyId);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);

  if (isLoading) return <div className="w-full aspect-video bg-muted animate-pulse rounded-xl" />;
  if (!photos?.length) {
    return (
      <div className="w-full aspect-video bg-muted rounded-xl flex flex-col items-center justify-center gap-2">
        <img src={logoPlaceholder} alt="Sin foto" className="h-16 opacity-20" />
        <span className="text-xs text-muted-foreground">Sin fotos disponibles</span>
      </div>
    );
  }

  return (
    <>
      <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-muted group">
        <img
          src={photos[currentIndex].photo_url}
          alt={`Foto ${currentIndex + 1}`}
          className="w-full h-full object-cover cursor-pointer"
          onClick={() => setFullscreen(true)}
          loading="lazy"
        />
        {photos.length > 1 && (
          <>
            <button
              onClick={() => setCurrentIndex(i => (i - 1 + photos.length) % photos.length)}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-background/80 backdrop-blur-sm text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentIndex(i => (i + 1) % photos.length)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-background/80 backdrop-blur-sm text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}
        <div className="absolute bottom-2 right-2 px-2 py-1 rounded-lg bg-background/80 backdrop-blur-sm text-xs text-foreground flex items-center gap-1">
          <Camera className="w-3 h-3" /> {currentIndex + 1}/{photos.length}
        </div>
      </div>

      {/* Thumbnails */}
      {photos.length > 1 && (
        <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
          {photos.map((p, i) => (
            <button
              key={p.id}
              onClick={() => setCurrentIndex(i)}
              className={`flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-colors ${
                i === currentIndex ? 'border-primary' : 'border-transparent'
              }`}
            >
              <img src={p.photo_url} alt="" className="w-full h-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      )}

      {/* Fullscreen */}
      {fullscreen && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center" onClick={() => setFullscreen(false)}>
          <button className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white z-10">
            <X className="w-6 h-6" />
          </button>
          <img
            src={photos[currentIndex].photo_url}
            alt=""
            className="max-w-full max-h-full object-contain"
            onClick={e => e.stopPropagation()}
          />
          {photos.length > 1 && (
            <>
              <button
                onClick={e => { e.stopPropagation(); setCurrentIndex(i => (i - 1 + photos.length) % photos.length); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 text-white"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={e => { e.stopPropagation(); setCurrentIndex(i => (i + 1) % photos.length); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 text-white"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
};

export const PropertyDetailDialog = ({ open, onOpenChange, property }: PropertyDetailDialogProps) => {
  const { data: whatsappTemplate } = useWhatsAppTemplate();
  const { role } = useAuth();
  const isMobile = useIsMobile();

  if (!property) return null;

  const op = getOperationType(property);
  const price = op === 'sale'
    ? formatPrice(Number(property.sale_price), property.currency)
    : formatPrice(Number(property.rental_price), property.currency) + '/mes';

  const content = (
    <div className="space-y-4 pb-safe">
      <PhotoGallery propertyId={property.id} />

      {/* Title & type */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
            {operationLabels[op]}
          </span>
          <span className="text-xs text-muted-foreground">{typeLabels[property.property_type]}</span>
        </div>
        <h2 className="text-xl font-bold text-foreground font-display">{property.title}</h2>
        <p className="text-2xl font-bold text-primary mt-1">{price}</p>
      </div>

      {/* Location */}
      {(property.address || property.neighborhood) && (
        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>
            {property.address && <>{property.address}<br /></>}
            {property.neighborhood}{property.city ? `, ${property.city}` : ''}
          </span>
        </div>
      )}

      {/* Features */}
      <div className="flex flex-wrap gap-3">
        {(property.bedrooms ?? 0) > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-muted text-sm">
            <Bed className="w-4 h-4 text-muted-foreground" /><span>{property.bedrooms} Dorm.</span>
          </div>
        )}
        {(property.bathrooms ?? 0) > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-muted text-sm">
            <Bath className="w-4 h-4 text-muted-foreground" /><span>{property.bathrooms} Baños</span>
          </div>
        )}
        {Number(property.area_m2) > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-muted text-sm">
            <Square className="w-4 h-4 text-muted-foreground" /><span>{property.area_m2} m²</span>
          </div>
        )}
        {property.has_garage && (
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-muted text-sm">
            <Car className="w-4 h-4 text-muted-foreground" /><span>Cochera</span>
          </div>
        )}
      </div>

      {/* Description */}
      {property.description && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-1">Descripción</h3>
          <p className="text-sm text-muted-foreground whitespace-pre-line">{property.description}</p>
        </div>
      )}

      {/* Garage details */}
      {property.has_garage && property.garage_details && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-1">Detalle Cochera</h3>
          <p className="text-sm text-muted-foreground">{property.garage_details}</p>
        </div>
      )}

      {/* Captor */}
      <div className="pt-3 border-t border-border">
        <span className="text-xs text-muted-foreground">
          Agente captor: <span className="font-medium text-foreground">{property.captor_name || 'Sin asignar'}</span>
        </span>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-2 pt-2">
        <a
          href={buildMapsLink(property)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors"
        >
          <Navigation className="w-4 h-4" /> Ver ubicación
        </a>
        {property.captor_phone && whatsappTemplate && (
          <a
            href={buildWhatsAppDeepLink(
              property.captor_phone,
              fillWhatsAppTemplate(whatsappTemplate, {
                captorName: property.captor_name || '',
                title: property.title,
                operation: operationLabels[op],
                price: op === 'sale'
                  ? Number(property.sale_price).toLocaleString('es-PY')
                  : Number(property.rental_price).toLocaleString('es-PY'),
                currency: property.currency || 'PYG',
                location: property.neighborhood || property.address || property.city || '',
              })
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[hsl(142,70%,45%)] text-white font-medium text-sm hover:bg-[hsl(142,70%,40%)] transition-colors"
          >
            <MessageCircle className="w-4 h-4" /> Contactar captador
          </a>
        )}
      </div>

      {/* External website link */}
      {property.public_website_url && (
        <a
          href={property.public_website_url}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-border bg-background text-foreground font-medium text-sm hover:bg-muted transition-colors"
        >
          <Globe className="w-4 h-4 text-muted-foreground" /> Ver en la web
        </a>
      )}

      {/* Key Control Panel */}
      <KeyControlPanel property={{ id: property.id, title: property.title, property_code: property.property_code }} />
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="max-h-[95vh] overflow-y-auto rounded-t-2xl px-4 pt-4">
          <SheetHeader className="sr-only">
            <SheetTitle>{property.title}</SheetTitle>
          </SheetHeader>
          {content}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader className="sr-only">
          <DialogTitle>{property.title}</DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
};
