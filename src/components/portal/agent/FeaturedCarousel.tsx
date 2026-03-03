import { Link } from 'react-router-dom';
import { MapPin, ArrowRight, Video, Globe } from 'lucide-react';
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from '@/components/ui/carousel';
import type { PublicListing } from '@/hooks/usePublicListings';

const formatPrice = (amount: number, currency?: string | null) =>
  currency === 'USD'
    ? 'USD ' + Math.round(amount).toLocaleString('en-US')
    : 'Gs. ' + Math.round(amount).toLocaleString('es-PY');

interface Props {
  listings: PublicListing[];
}

export const FeaturedCarousel = ({ listings }: Props) => {
  const featured = listings.filter(p => p.is_featured).slice(0, 5);
  if (featured.length === 0) return null;

  return (
    <div>
      <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
        <span className="w-1 h-6 bg-secondary rounded-full" />
        Propiedades Destacadas
      </h2>
      <Carousel opts={{ loop: true, align: 'start' }} className="w-full">
        <CarouselContent className="-ml-3">
          {featured.map(p => {
            const thumbUrl = p.photos?.[0]?.photo_url || p.photos?.[0]?.thumbnail_url;
            const price = Number(p.sale_price) > 0
              ? formatPrice(Number(p.sale_price), p.currency)
              : Number(p.rental_price) > 0
                ? formatPrice(Number(p.rental_price), p.currency) + (p.rental_period === 'daily' ? '/día' : '/mes')
                : 'Consultar';

            return (
              <CarouselItem key={p.id} className="pl-3 md:basis-1/2 lg:basis-1/2">
                <Link
                  to={`/portal/propiedades/${p.id}`}
                  className="group block relative rounded-xl overflow-hidden aspect-[16/9] bg-muted"
                >
                  {thumbUrl ? (
                    <img src={thumbUrl} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground">Sin foto</div>
                  )}
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                  {/* Media badges */}
                  <div className="absolute top-3 right-3 flex gap-1.5">
                    {p.video_url && (
                      <span className="bg-black/60 backdrop-blur-sm text-white text-[10px] px-2 py-1 rounded-full flex items-center gap-1">
                        <Video className="w-3 h-3" /> Video
                      </span>
                    )}
                    {p.tour_360_url && (
                      <span className="bg-black/60 backdrop-blur-sm text-white text-[10px] px-2 py-1 rounded-full flex items-center gap-1">
                        <Globe className="w-3 h-3" /> 360°
                      </span>
                    )}
                  </div>

                  {/* Featured badge */}
                  <span className="absolute top-3 left-3 bg-gradient-to-r from-amber-400 to-yellow-300 text-amber-900 text-[10px] font-bold px-2.5 py-1 rounded-full shadow">
                    ⭐ DESTACADA
                  </span>

                  {/* Content */}
                  <div className="absolute bottom-0 left-0 right-0 p-5">
                    <h3 className="text-white font-bold text-lg line-clamp-1 group-hover:text-secondary transition-colors">{p.title}</h3>
                    <div className="flex items-center gap-1 text-white/70 text-xs mt-1">
                      <MapPin className="w-3 h-3" />
                      {[p.neighborhood, p.city].filter(Boolean).join(', ')}
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-white font-bold text-xl">{price}</span>
                      <span className="bg-white/20 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1 group-hover:bg-secondary transition-colors">
                        Ver más <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </Link>
              </CarouselItem>
            );
          })}
        </CarouselContent>
        {featured.length > 2 && (
          <>
            <CarouselPrevious className="-left-4 bg-white shadow-lg border-0 hover:bg-primary hover:text-white" />
            <CarouselNext className="-right-4 bg-white shadow-lg border-0 hover:bg-primary hover:text-white" />
          </>
        )}
      </Carousel>
    </div>
  );
};
