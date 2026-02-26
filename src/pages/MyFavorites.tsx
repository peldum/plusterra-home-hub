import { useState, useCallback } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { usePropertyFavorites } from '@/hooks/usePropertyFavorites';
import { useAvailableProperties } from '@/hooks/useAvailableProperties';
import { useWhatsAppTemplate, fillWhatsAppTemplate, buildWhatsAppDeepLink } from '@/hooks/useWhatsAppTemplate';
import { PropertyCard } from '@/components/properties/PropertyCard';
import { PropertyDetailDialog } from '@/components/properties/PropertyDetailDialog';
import { SoftLockBanner } from '@/components/softlock/SoftLockBanner';
import { Star, Loader2, Home } from 'lucide-react';

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

const MyFavorites = () => {
  const { data: favorites, isLoading: loadingFavs } = usePropertyFavorites();
  const { data: allProperties, isLoading: loadingProps } = useAvailableProperties();
  const { data: whatsappTemplate } = useWhatsAppTemplate();
  const [detailProperty, setDetailProperty] = useState<any>(null);

  const isLoading = loadingFavs || loadingProps;

  const favoriteProperties = (allProperties || []).filter(p => favorites?.has(p.id));

  const buildWhatsAppUrl = useCallback((property: any) => {
    if (!property.captor_phone || !whatsappTemplate) return null;
    const op = getOperationType(property);
    return buildWhatsAppDeepLink(
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
    );
  }, [whatsappTemplate]);

  return (
    <MainLayout
      title="Mis Favoritos"
      subtitle={`${favoriteProperties.length} propiedad${favoriteProperties.length !== 1 ? 'es' : ''} guardada${favoriteProperties.length !== 1 ? 's' : ''}`}
    >
      <SoftLockBanner />

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : favoriteProperties.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center mx-auto mb-4">
            <Star className="w-8 h-8 text-warning fill-warning" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Sin favoritos aún</h3>
          <p className="text-muted-foreground text-sm max-w-xs mx-auto">
            Marcá propiedades con ⭐ desde el catálogo "Disponibles" o "Propiedades" para acceder rápido desde aquí.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {favoriteProperties.map(property => {
            const op = getOperationType(property);
            const waUrl = buildWhatsAppUrl(property);
            return (
              <PropertyCard
                key={property.id}
                property={property}
                operationType={op}
                viewMode="grid"
                onOpenDetail={() => setDetailProperty(property)}
                onMaps={() => window.open(buildMapsLink(property), '_blank')}
                onWhatsApp={waUrl ? () => window.open(waUrl, '_blank') : undefined}
                onWebsite={property.is_published ? () => window.open(`/portal/propiedades/${property.id}`, '_blank') : undefined}
              />
            );
          })}
        </div>
      )}

      <PropertyDetailDialog
        open={!!detailProperty}
        onOpenChange={open => !open && setDetailProperty(null)}
        property={detailProperty}
      />
    </MainLayout>
  );
};

export default MyFavorites;
