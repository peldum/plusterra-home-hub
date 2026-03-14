import { Link } from 'react-router-dom';
import { MapPin, Bed, Bath, Ruler, Car, Share2, ArrowLeftRight, Video, Globe, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { PortalWatermark } from './PortalWatermark';
import type { PublicListing } from '@/hooks/usePublicListings';
import { useCompareList } from './compareStore';

const formatPrice = (amount: number, currency?: string | null) =>
  currency === 'USD'
    ? 'USD ' + Math.round(amount).toLocaleString('en-US')
    : 'Gs. ' + Math.round(amount).toLocaleString('es-PY');

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('es-PY', { day: 'numeric', month: 'short', year: 'numeric' });
};

const getBusinessBadge = (p: PublicListing) => {
  if (p.status === 'rented') {
    if (p.disponible_desde) {
      return { label: `Disponible desde ${formatDate(p.disponible_desde)}`, color: 'bg-[#FC5100]' };
    }
    return { label: 'Alquilado', color: 'bg-gray-500' };
  }
  const hasRent = Number(p.rental_price) > 0;
  const hasSale = Number(p.sale_price) > 0;
  if (hasRent && p.rental_period === 'daily') return { label: 'Temporal', color: 'bg-purple-500' };
  if (hasRent) return { label: 'Alquiler', color: 'bg-emerald-500' };
  if (hasSale) return { label: 'Venta', color: 'bg-[#FC5100]' };
  return { label: 'Disponible', color: 'bg-gray-500' };
};

const getDisplayPrice = (p: PublicListing) => {
  if (Number(p.sale_price) > 0) return formatPrice(Number(p.sale_price), p.currency);
  if (Number(p.rental_price) > 0) {
    const suffix = p.rental_period === 'daily' ? '/día' : '/mes';
    return formatPrice(Number(p.rental_price), p.currency) + suffix;
  }
  return 'Consultar';
};

const handleShare = (e: React.MouseEvent, property: PublicListing) => {
  e.preventDefault();
  e.stopPropagation();
  const url = `${window.location.origin}/portal/propiedades/${property.id}`;
  if (navigator.share) {
    navigator.share({ title: property.title, url }).catch(() => {});
  } else {
    navigator.clipboard.writeText(url);
    toast.success('Enlace copiado al portapapeles');
  }
};

/** Premium featured badge */
const FeaturedBadge = ({ className = '' }: { className?: string }) => (
  <span className={`inline-flex items-center gap-1 bg-gradient-to-r from-yellow-400 to-amber-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-md shadow-amber-500/30 ${className}`}>
    ⭐ DESTACADA
  </span>
);

/** Multimedia indicators */
const MediaIndicators = ({ hasVideo, hasTour }: { hasVideo: boolean; hasTour: boolean }) => {
  if (!hasVideo && !hasTour) return null;
  return (
    <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10" style={{ top: 'auto', bottom: 12, left: 12 }}>
      {hasVideo && (
        <span className="inline-flex items-center gap-1 bg-black/70 backdrop-blur-sm text-white text-[10px] font-medium px-2 py-1 rounded-full">
          <Video className="w-3 h-3" /> Video
        </span>
      )}
      {hasTour && (
        <span className="inline-flex items-center gap-1 bg-black/70 backdrop-blur-sm text-white text-[10px] font-medium px-2 py-1 rounded-full">
          <Globe className="w-3 h-3" /> 360°
        </span>
      )}
    </div>
  );
};

interface Props {
  property: PublicListing;
  viewMode?: 'grid' | 'list';
}

export const PortalPropertyCard = ({ property, viewMode = 'grid' }: Props) => {
  const badge = getBusinessBadge(property);
  const thumbUrl = property.photos?.[0]?.thumbnail_url || property.photos?.[0]?.photo_url;
  const { add, has } = useCompareList();
  const inCompare = has(property.id);
  const isFeatured = property.is_featured;
  const hasVideo = !!property.video_url;
  const hasTour = !!property.tour_360_url;
  const isRented = property.status === 'rented';

  const handleCompare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (inCompare) return;
    const ok = add(property);
    if (!ok) toast.info('Máximo 3 propiedades para comparar');
    else toast.success('Agregado al comparador');
  };

  if (viewMode === 'list') {
    return (
      <Link
        to={`/portal/propiedades/${property.id}`}
        className={`flex gap-4 bg-white rounded-xl overflow-hidden hover:shadow-md transition-shadow group ${
          isFeatured ? 'border-2 border-amber-400/60 ring-1 ring-amber-400/20' : 'border border-gray-200'
        }`}
      >
        <div className={`relative w-48 min-h-[120px] flex-shrink-0 ${isRented ? 'saturate-[0.6]' : ''}`}>
          {thumbUrl ? (
            <>
              <img src={thumbUrl} alt={property.title} className="w-full h-full object-cover" loading="lazy" />
              <PortalWatermark />
            </>
          ) : (
            <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400 text-xs">Sin foto</div>
          )}
          <span className={`absolute top-2 left-2 ${badge.color} text-white text-[10px] font-bold px-2 py-0.5 rounded-full`}>
            {badge.label}
          </span>
          {isFeatured && <FeaturedBadge className="absolute top-2 right-2" />}
          <MediaIndicators hasVideo={hasVideo} hasTour={hasTour} />
        </div>
        <div className="flex-1 py-3 pr-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-gray-900 group-hover:text-[#00447C] transition-colors line-clamp-1">{property.title}</h3>
              {isFeatured && (
                <p className="text-[10px] text-amber-600 font-medium mt-0.5">Propiedad destacada · Mayor visibilidad</p>
              )}
              {isRented && property.disponible_desde && (
                <p className="text-[10px] text-[#FC5100] font-medium mt-0.5 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Disponible desde {formatDate(property.disponible_desde)}
                </p>
              )}
            </div>
            <button
              onClick={(e) => handleShare(e, property)}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
              title="Compartir"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
            <MapPin className="w-3 h-3" />
            {[property.neighborhood, property.city].filter(Boolean).join(', ') || 'Ubicación no especificada'}
          </div>
          <p className="text-lg font-bold text-[#00447C] mt-2">{getDisplayPrice(property)}</p>
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
            {property.bedrooms != null && <span className="flex items-center gap-1"><Bed className="w-3.5 h-3.5" />{property.bedrooms}</span>}
            {property.bathrooms != null && <span className="flex items-center gap-1"><Bath className="w-3.5 h-3.5" />{property.bathrooms}</span>}
            {property.area_m2 != null && <span className="flex items-center gap-1"><Ruler className="w-3.5 h-3.5" />{property.area_m2}m²</span>}
            {property.has_garage && <span className="flex items-center gap-1"><Car className="w-3.5 h-3.5" />Cochera</span>}
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      to={`/portal/propiedades/${property.id}`}
      className={`bg-white rounded-xl overflow-hidden hover:shadow-lg transition-shadow group flex flex-col ${
        isFeatured ? 'border-2 border-amber-400/60 ring-1 ring-amber-400/20 shadow-md shadow-amber-100' : 'border border-gray-200'
      }`}
    >
      <div className={`relative aspect-[4/3] overflow-hidden ${isRented ? 'saturate-[0.6]' : ''}`}>
        {thumbUrl ? (
          <>
            <img src={thumbUrl} alt={property.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
            <PortalWatermark />
          </>
        ) : (
          <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400">Sin foto</div>
        )}
        <span className={`absolute top-3 left-3 ${badge.color} text-white text-xs font-bold px-2.5 py-1 rounded-full shadow`}>
          {badge.label}
        </span>
        {isFeatured && <FeaturedBadge className="absolute top-3 right-3" />}
        <MediaIndicators hasVideo={hasVideo} hasTour={hasTour} />
        <div className="absolute bottom-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
          <button
            onClick={handleCompare}
            className={`w-9 h-9 rounded-full flex items-center justify-center shadow-md backdrop-blur-sm transition-all duration-200 hover:scale-110 active:scale-95 ${
              inCompare
                ? 'bg-[#FC5100] text-white ring-2 ring-white/50'
                : 'bg-white/90 hover:bg-white text-gray-600 hover:text-[#00447C]'
            }`}
            title={inCompare ? 'En comparador' : 'Comparar'}
          >
            <ArrowLeftRight className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => handleShare(e, property)}
            className="w-9 h-9 rounded-full bg-white/90 hover:bg-white text-gray-600 hover:text-[#FC5100] flex items-center justify-center shadow-md backdrop-blur-sm transition-all duration-200 hover:scale-110 active:scale-95"
            title="Compartir"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-semibold text-gray-900 group-hover:text-[#00447C] transition-colors line-clamp-2 text-sm">
          {property.title}
        </h3>
        {isFeatured && (
          <p className="text-[10px] text-amber-600 font-medium mt-0.5">Propiedad destacada · Mayor visibilidad</p>
        )}
        {isRented && property.disponible_desde && (
          <p className="text-[10px] text-[#FC5100] font-medium mt-0.5 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Disponible desde {formatDate(property.disponible_desde)}
          </p>
        )}
        <div className="flex items-center gap-1 text-xs text-gray-500 mt-1.5">
          <MapPin className="w-3 h-3 flex-shrink-0" />
          <span className="line-clamp-1">{[property.neighborhood, property.city].filter(Boolean).join(', ') || 'Ubicación no especificada'}</span>
        </div>
        <p className="text-xl font-bold text-[#00447C] mt-3">{getDisplayPrice(property)}</p>
        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
          {property.bedrooms != null && <span className="flex items-center gap-1"><Bed className="w-3.5 h-3.5" />{property.bedrooms}</span>}
          {property.bathrooms != null && <span className="flex items-center gap-1"><Bath className="w-3.5 h-3.5" />{property.bathrooms}</span>}
          {property.area_m2 != null && <span className="flex items-center gap-1"><Ruler className="w-3.5 h-3.5" />{property.area_m2}m²</span>}
          {property.has_garage && <span className="flex items-center gap-1"><Car className="w-3.5 h-3.5" /></span>}
        </div>
      </div>
    </Link>
  );
};
