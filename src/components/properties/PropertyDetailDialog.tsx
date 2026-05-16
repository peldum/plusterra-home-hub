import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { usePropertyPhotos } from "@/hooks/usePropertyPhotos";
import { useWhatsAppTemplate, fillWhatsAppTemplate, buildWhatsAppDeepLink } from "@/hooks/useWhatsAppTemplate";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";
import { KeyControlPanel } from "@/components/keys/KeyControlPanel";
import { ReservationDialog } from "./ReservationDialog";
import { ReservationTimeline } from "./ReservationTimeline";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { WatermarkedImage } from "@/components/portal/WatermarkedImage";
import { toast } from "@/hooks/use-toast";
import {
  MapPin,
  Bed,
  Bath,
  Square,
  Car,
  MessageCircle,
  Navigation,
  ChevronLeft,
  ChevronRight,
  Camera,
  X,
  Building2,
  Globe,
  Lock,
  Unlock,
  CheckCircle2,
  Clock,
  ArrowRightLeft,
  Send,
  XCircle,
  AlertTriangle,
  Copy,
  Key,
  Home,
} from "lucide-react";
import logoPlaceholder from "@/assets/logo-plusterra-vertical.png";

interface PropertyDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  property: any;
}

/* ── Share Property Section ── */
const SharePropertySection = ({
  property,
  op,
  formatPriceFn,
}: {
  property: any;
  op: string;
  formatPriceFn: typeof formatPrice;
}) => {
  const portalUrl = `https://plusterra.com.py/propiedades/${property.property_code || property.id}`;
  const locationText = [property.address, property.neighborhood, property.city].filter(Boolean).join(", ");
  const priceText =
    op === "sale"
      ? `💰 ${formatPriceFn(Number(property.sale_price), property.currency)}`
      : Number(property.rental_price) > 0
        ? `💰 ${formatPriceFn(Number(property.rental_price), property.currency)}/mes`
        : "";
  const features = [
    (property.bedrooms ?? 0) > 0 ? `${property.bedrooms} dorm` : "",
    (property.bathrooms ?? 0) > 0 ? `${property.bathrooms} baños` : "",
    Number(property.area_m2) > 0 ? `${property.area_m2} m²` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  const isPublished = !!property.is_published;

  const buildMessage = () => {
    let msg = `Hola, te comparto esta propiedad que puede interesarte:\n\n📍 ${property.title}`;
    if (priceText) msg += `\n${priceText}`;
    if (features) msg += `\n🏠 ${features}`;
    if (locationText) msg += `\n📍 ${locationText}`;
    if (isPublished) msg += `\n\n🔗 Ver propiedad completa: ${portalUrl}`;
    msg += "\n\n¡Consultanos para más información o agendar una visita!";
    return msg;
  };

  const handleWhatsApp = () => {
    const msg = buildMessage();
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const handleCopy = () => {
    const msg = buildMessage();
    navigator.clipboard.writeText(msg).then(
      () => toast({ title: "¡Copiado!", description: "Mensaje copiado al portapapeles", duration: 2000 }),
      () => toast({ title: "Error", description: "No se pudo copiar", variant: "destructive" }),
    );
  };

  return (
    <div className="space-y-2">
      {isPublished && (
        <a
          href={portalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-border bg-background text-foreground font-medium text-sm hover:bg-muted transition-colors"
        >
          <Globe className="w-4 h-4 text-muted-foreground flex-shrink-0" /> Ver en la web
        </a>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <button
          onClick={handleWhatsApp}
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[hsl(142,70%,45%)] text-white font-medium text-sm hover:bg-[hsl(142,70%,40%)] transition-colors whitespace-nowrap"
        >
          <WhatsAppIcon className="w-4 h-4 flex-shrink-0" /> Enviar por WhatsApp
        </button>
        <button
          onClick={handleCopy}
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-border bg-background text-foreground font-medium text-sm hover:bg-muted transition-colors whitespace-nowrap"
        >
          <Copy className="w-4 h-4 text-muted-foreground flex-shrink-0" /> Copiar mensaje
        </button>
      </div>
    </div>
  );
};

const typeLabels: Record<string, string> = {
  apartment: "Departamento",
  house: "Casa",
  land: "Terreno",
  office: "Oficina",
  commercial: "Local",
  other: "Otro",
};

const formatPrice = (amount: number | null, currency: string | null) => {
  if (!amount) return "-";
  if (currency === "USD") return `USD ${amount.toLocaleString("es-PY")}`;
  return `₲ ${amount.toLocaleString("es-PY")}`;
};

const getOperationType = (p: any) => {
  const hasRent = Number(p.rental_price) > 0;
  const hasSale = Number(p.sale_price) > 0;
  if (hasRent && p.rental_period === "daily") return "temporary";
  if (hasRent) return "rent";
  if (hasSale) return "sale";
  return "unknown";
};

const operationLabels: Record<string, string> = {
  rent: "Alquiler",
  sale: "Venta",
  temporary: "Temporal",
  unknown: "Sin definir",
};

const buildMapsLink = (property: any) => {
  const address = [property.address, property.neighborhood, property.city].filter(Boolean).join(", ");
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
        <WatermarkedImage
          src={photos[currentIndex].photo_url}
          alt={`Foto ${currentIndex + 1}`}
          className="w-full h-full object-cover cursor-pointer"
          onClick={() => setFullscreen(true)}
          loading="eager"
        />
        {photos.length > 1 && (
          <>
            <button
              onClick={() => setCurrentIndex((i) => (i - 1 + photos.length) % photos.length)}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-background/80 backdrop-blur-sm text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentIndex((i) => (i + 1) % photos.length)}
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
                i === currentIndex ? "border-primary" : "border-transparent"
              }`}
            >
              <img src={p.thumbnail_url || p.photo_url} alt="" className="w-full h-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      )}

      {/* Fullscreen */}
      {fullscreen && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
          onClick={() => setFullscreen(false)}
        >
          <button className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white z-10">
            <X className="w-6 h-6" />
          </button>
          <div className="relative max-w-full max-h-full" onClick={(e) => e.stopPropagation()}>
            <WatermarkedImage
              src={photos[currentIndex].photo_url}
              alt=""
              className="max-w-[95vw] max-h-[90vh] object-contain"
            />
          </div>
          {photos.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex((i) => (i - 1 + photos.length) % photos.length);
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 text-white"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex((i) => (i + 1) % photos.length);
                }}
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
  const { user, role, isAdmin } = useAuth();
  const isMobile = useIsMobile();
  const [reservationMode, setReservationMode] = useState<
    "reserve" | "cancel" | "confirm" | "transfer" | "request" | "approve" | "reject" | "cancel_request" | null
  >(null);

  if (!property) return null;

  const isSecretaria = role === "secretaria";
  const isGerente = role === "accounting";
  const canManageReservations = isAdmin || isSecretaria || isGerente;
  const isReserved = property.status === "reserved";

  const op = getOperationType(property);
  const price =
    op === "sale"
      ? formatPrice(Number(property.sale_price), property.currency)
      : formatPrice(Number(property.rental_price), property.currency) + "/mes";

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
            {property.address && (
              <>
                {property.address}
                <br />
              </>
            )}
            {property.neighborhood}
            {property.city ? `, ${property.city}` : ""}
          </span>
        </div>
      )}

      {/* Features */}
      <div className="flex flex-wrap gap-3">
        {(property.bedrooms ?? 0) > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-muted text-sm">
            <Bed className="w-4 h-4 text-muted-foreground" />
            <span>{property.bedrooms} Dorm.</span>
          </div>
        )}
        {(property.bathrooms ?? 0) > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-muted text-sm">
            <Bath className="w-4 h-4 text-muted-foreground" />
            <span>{property.bathrooms} Baños</span>
          </div>
        )}
        {Number(property.area_m2) > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-muted text-sm">
            <Square className="w-4 h-4 text-muted-foreground" />
            <span>{property.area_m2} m²</span>
          </div>
        )}
        {property.has_garage && (
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-muted text-sm">
            <Car className="w-4 h-4 text-muted-foreground" />
            <span>Cochera{property.garage_number ? ` — ${property.garage_number}` : ""}</span>
          </div>
        )}
      </div>

      {/* Description */}
      {property.description && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold text-foreground">Descripción</h3>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(property.description).then(
                  () => toast({ title: "¡Copiado!", description: "Descripción copiada con saltos de línea", duration: 2000 }),
                  () => toast({ title: "Error", description: "No se pudo copiar", variant: "destructive" }),
                );
              }}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-primary hover:bg-primary/10 transition-colors"
              title="Copiar descripción manteniendo formato"
            >
              <Copy className="w-3.5 h-3.5" /> Copiar
            </button>
          </div>
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
          Agente captor: <span className="font-medium text-foreground">{property.captor_name || "Sin asignar"}</span>
        </span>
      </div>

      {/* Reservation request info */}
      {property.status === "reservation_request" && (
        <div className="p-3 rounded-xl bg-primary/10 border border-primary/30 space-y-1">
          <div className="flex items-center gap-2 text-primary font-semibold text-sm">
            <Send className="w-4 h-4" />
            SOLICITUD DE RESERVA
          </div>
          <p className="text-xs text-foreground">
            Solicitado por: <span className="font-medium">{property.requested_by_name || "Agente"}</span>
          </p>
          {property.reservation_requested_at && (
            <p className="text-xs text-muted-foreground">
              Fecha: {new Date(property.reservation_requested_at).toLocaleDateString("es-PY")} –{" "}
              {new Date(property.reservation_requested_at).toLocaleTimeString("es-PY", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          )}
          {property.reservation_request_client_name && (
            <p className="text-xs text-muted-foreground">
              Cliente: <span className="font-medium text-foreground">{property.reservation_request_client_name}</span>
            </p>
          )}
          {Number(property.reservation_request_amount) > 0 && (
            <p className="text-xs text-muted-foreground">
              Seña:{" "}
              <span className="font-medium text-foreground">
                ₲ {Number(property.reservation_request_amount).toLocaleString("es-PY")}
              </span>
            </p>
          )}
        </div>
      )}

      {/* Reservation info */}
      {property.status === "reserved" && (
        <div className="p-3 rounded-xl bg-warning/10 border border-warning/30 space-y-1">
          <div className="flex items-center gap-2 text-warning font-semibold text-sm">
            <Clock className="w-4 h-4" />
            RESERVADA
          </div>
          <p className="text-xs text-foreground">
            Reservado por: <span className="font-medium">{property.reserved_by_name || "Agente"}</span>
          </p>
          {property.reserved_at && (
            <p className="text-xs text-muted-foreground">
              Fecha: {new Date(property.reserved_at).toLocaleDateString("es-PY")} –{" "}
              {new Date(property.reserved_at).toLocaleTimeString("es-PY", { hour: "2-digit", minute: "2-digit" })}
            </p>
          )}
          {property.reservation_client_name && (
            <p className="text-xs text-muted-foreground">
              Cliente: <span className="font-medium text-foreground">{property.reservation_client_name}</span>
            </p>
          )}
          {Number(property.reservation_amount) > 0 && (
            <p className="text-xs text-muted-foreground">
              Seña:{" "}
              <span className="font-medium text-foreground">
                ₲ {Number(property.reservation_amount).toLocaleString("es-PY")}
              </span>
            </p>
          )}
          {/* Expiration countdown */}
          {(() => {
            const expiresAt = isReserved && property.reservation_expires_at ? new Date(property.reservation_expires_at) : null;
            if (!expiresAt) return null;
            const daysLeft = Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
            return (
              <div
                className={`mt-1 px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1 ${
                  daysLeft <= 1
                    ? "bg-destructive/10 text-destructive"
                    : daysLeft <= 3
                      ? "bg-warning/20 text-warning"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                <AlertTriangle className="w-3 h-3" />
                {daysLeft === 0
                  ? "Reserva vence hoy"
                  : `Vence en ${daysLeft} día${daysLeft > 1 ? "s" : ""} (${expiresAt.toLocaleDateString("es-PY")})`}
              </div>
            );
          })()}
        </div>
      )}

      {/* === RESERVATION ACTIONS === */}

      {/* Agent: Request reservation (only when available) */}
      {property.status === "available" && role === "agent" && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setReservationMode("request");
          }}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors"
        >
          <Send className="w-4 h-4" /> Solicitar Reserva
        </button>
      )}

      {/* Admin/Secretaria: Direct reserve (when available) */}
      {property.status === "available" && canManageReservations && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setReservationMode("reserve");
          }}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-warning text-warning-foreground font-medium text-sm hover:bg-warning/90 transition-colors"
        >
          <Lock className="w-4 h-4" /> Reservar Directamente
        </button>
      )}

      {/* Agent: Cancel own request */}
      {property.status === "reservation_request" &&
        role === "agent" &&
        property.reservation_requested_by === user?.id && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setReservationMode("cancel_request");
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-destructive/10 text-destructive font-medium text-sm hover:bg-destructive/20 transition-colors"
          >
            <XCircle className="w-4 h-4" /> Cancelar mi Solicitud
          </button>
        )}

      {/* Agent viewing someone else's request */}
      {property.status === "reservation_request" &&
        role === "agent" &&
        property.reservation_requested_by !== user?.id && (
          <div className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-muted text-muted-foreground font-medium text-sm cursor-not-allowed opacity-70">
            <Send className="w-4 h-4" /> Solicitud pendiente de {property.requested_by_name || "otro agente"}
          </div>
        )}

      {/* Admin/Secretaria: Approve/Reject request */}
      {property.status === "reservation_request" && canManageReservations && (
        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setReservationMode("reject");
            }}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-destructive/10 text-destructive font-medium text-sm hover:bg-destructive/20 transition-colors"
          >
            <XCircle className="w-4 h-4" /> Rechazar
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setReservationMode("approve");
            }}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-success text-success-foreground font-medium text-sm hover:bg-success/90 transition-colors"
          >
            <CheckCircle2 className="w-4 h-4" /> Aprobar Reserva
          </button>
        </div>
      )}

      {/* Agent: Disabled button for reserved property by other agent */}
      {isReserved && role === "agent" && property.reserved_by !== user?.id && (
        <div
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-muted text-muted-foreground font-medium text-sm cursor-not-allowed opacity-70"
          title={`Ya reservado por ${property.reserved_by_name || "otro agente"}`}
        >
          <Lock className="w-4 h-4" /> Reservado por {property.reserved_by_name || "otro agente"}
        </div>
      )}

      {/* Admin or reserving agent: Cancel/Confirm/Transfer reserved property */}
      {isReserved && (canManageReservations || property.reserved_by === user?.id) && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setReservationMode("cancel");
              }}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-destructive/10 text-destructive font-medium text-sm hover:bg-destructive/20 transition-colors"
            >
              <Unlock className="w-4 h-4" /> Cancelar Reserva
            </button>
            {canManageReservations && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setReservationMode("confirm");
                }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-success text-success-foreground font-medium text-sm hover:bg-success/90 transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" /> Confirmar
              </button>
            )}
          </div>
          {isAdmin && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setReservationMode("transfer");
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-background text-foreground font-medium text-sm hover:bg-muted transition-colors"
            >
              <ArrowRightLeft className="w-4 h-4" /> Transferir Reserva
            </button>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2">
        <a
          href={buildMapsLink(property)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors whitespace-nowrap"
        >
          <Navigation className="w-4 h-4 flex-shrink-0" /> Ver ubicación
        </a>
        {property.captor_phone && whatsappTemplate && (
          <a
            href={buildWhatsAppDeepLink(
              property.captor_phone,
              fillWhatsAppTemplate(whatsappTemplate, {
                captorName: property.captor_name || "",
                title: property.title,
                operation: operationLabels[op],
                price:
                  op === "sale"
                    ? Number(property.sale_price).toLocaleString("es-PY")
                    : Number(property.rental_price).toLocaleString("es-PY"),
                currency: property.currency || "PYG",
                location: property.neighborhood || property.address || property.city || "",
              }),
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[hsl(142,70%,45%)] text-white font-medium text-sm hover:bg-[hsl(142,70%,40%)] transition-colors whitespace-nowrap"
          >
            <MessageCircle className="w-4 h-4 flex-shrink-0" /> Contactar captador
          </a>
        )}
      </div>

      {/* Portal link + Send to client */}
      <SharePropertySection property={property} op={op} formatPriceFn={formatPrice} />

      {/* Reservation History Timeline */}
      <ReservationTimeline propertyId={property.id} />

      {/* Key Control Panel — hidden for sold, simplified for rented */}
      {property.status !== "sold" &&
        (property.status === "rented" ? (
          <div className="border-t border-border pt-4 mt-4 space-y-3">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Control de Llaves</h3>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-xl border border-info/20 bg-info/5">
              <Home className="w-4 h-4 text-info mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-info">🔑 Llave entregada al inquilino</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Esta propiedad está alquilada. La llave fue entregada al inquilino.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <KeyControlPanel
            property={{
              id: property.id,
              title: property.title,
              property_code: property.property_code,
              key_location: property.key_location,
              captor_phone: property.captor_phone,
              captor_name: property.captor_name,
            }}
          />
        ))}

      {reservationMode && (
        <ReservationDialog
          open={!!reservationMode}
          onOpenChange={(v) => !v && setReservationMode(null)}
          property={property}
          mode={reservationMode}
        />
      )}
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="max-h-[95vh] overflow-y-auto rounded-t-2xl px-4 pt-0">
          <SheetHeader className="sr-only">
            <SheetTitle>{property.title}</SheetTitle>
          </SheetHeader>
          {/* Sticky mobile header with close/back */}
          <div className="sticky top-0 z-10 bg-card pt-3 pb-2 flex items-center justify-between">
            <button
              onClick={() => onOpenChange(false)}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
              <span>Volver</span>
            </button>
            <button onClick={() => onOpenChange(false)} className="p-1.5 rounded-full hover:bg-muted transition-colors">
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
          {content}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[750px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="sr-only">
          <DialogTitle>{property.title}</DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
};
