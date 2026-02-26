import { Link } from 'react-router-dom';
import { MapPin, Bed, Bath, Ruler, Car } from 'lucide-react';
import type { PublicListing } from '@/hooks/usePublicListings';

const formatPrice = (amount: number) =>
  'Gs. ' + Math.round(amount).toLocaleString('es-PY');

const getBusinessBadge = (p: PublicListing) => {
  const hasRent = Number(p.rental_price) > 0;
  const hasSale = Number(p.sale_price) > 0;
  if (hasRent && p.rental_period === 'daily') return { label: 'Temporal', color: 'bg-purple-500' };
  if (hasRent) return { label: 'Alquiler', color: 'bg-emerald-500' };
  if (hasSale) return { label: 'Venta', color: 'bg-[#FC5100]' };
  return { label: 'Disponible', color: 'bg-gray-500' };
};

const getDisplayPrice = (p: PublicListing) => {
  if (Number(p.sale_price) > 0) return formatPrice(Number(p.sale_price));
  if (Number(p.rental_price) > 0) {
    const suffix = p.rental_period === 'daily' ? '/día' : '/mes';
    return formatPrice(Number(p.rental_price)) + suffix;
  }
  return 'Consultar';
};

interface Props {
  property: PublicListing;
  viewMode?: 'grid' | 'list';
}

export const PortalPropertyCard = ({ property, viewMode = 'grid' }: Props) => {
  const badge = getBusinessBadge(property);
  const thumbUrl = property.photos?.[0]?.thumbnail_url || property.photos?.[0]?.photo_url;

  if (viewMode === 'list') {
    return (
      <Link
        to={`/portal/propiedades/${property.id}`}
        className="flex gap-4 bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow group"
      >
        <div className="relative w-48 min-h-[120px] flex-shrink-0">
          {thumbUrl ? (
            <img src={thumbUrl} alt={property.title} className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400 text-xs">Sin foto</div>
          )}
          <span className={`absolute top-2 left-2 ${badge.color} text-white text-[10px] font-bold px-2 py-0.5 rounded-full`}>
            {badge.label}
          </span>
        </div>
        <div className="flex-1 py-3 pr-4">
          <h3 className="font-semibold text-gray-900 group-hover:text-[#00447C] transition-colors line-clamp-1">{property.title}</h3>
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
      className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow group flex flex-col"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        {thumbUrl ? (
          <img src={thumbUrl} alt={property.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
        ) : (
          <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400">Sin foto</div>
        )}
        <span className={`absolute top-3 left-3 ${badge.color} text-white text-xs font-bold px-2.5 py-1 rounded-full shadow`}>
          {badge.label}
        </span>
        {property.is_featured && (
          <span className="absolute top-3 right-3 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-2 py-0.5 rounded-full">
            ⭐ Destacado
          </span>
        )}
      </div>
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-semibold text-gray-900 group-hover:text-[#00447C] transition-colors line-clamp-2 text-sm">
          {property.title}
        </h3>
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
