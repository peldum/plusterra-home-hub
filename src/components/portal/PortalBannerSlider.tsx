import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Banner {
  id: string;
  title: string;
  subtitle: string | null;
  image_url_webp: string;
  link_url: string | null;
}

export const PortalBannerSlider = () => {
  const { data: banners } = useQuery({
    queryKey: ['portal-banners-public'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('portal_banners')
        .select('id, title, subtitle, image_url_webp, link_url')
        .eq('is_active', true)
        .order('order_index', { ascending: true });
      if (error) throw error;
      return (data || []) as Banner[];
    },
    staleTime: 5 * 60_000,
  });

  const [current, setCurrent] = useState(0);
  const count = banners?.length || 0;

  const next = useCallback(() => {
    if (count > 1) setCurrent(i => (i + 1) % count);
  }, [count]);

  useEffect(() => {
    if (count <= 1) return;
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [count, next]);

  if (!banners || banners.length === 0) return null;

  const banner = banners[current];
  const Wrapper = banner.link_url ? 'a' : 'div';
  const wrapperProps = banner.link_url
    ? { href: banner.link_url, target: '_blank', rel: 'noopener noreferrer' }
    : {};

  return (
    <div className="relative w-full overflow-hidden bg-gray-900">
      <Wrapper {...(wrapperProps as any)} className="block relative aspect-[21/9] md:aspect-[3/1]">
        <img
          src={banner.image_url_webp}
          alt={banner.title}
          className="w-full h-full object-cover transition-opacity duration-500"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        <div className="absolute bottom-6 left-6 md:bottom-10 md:left-10 text-white max-w-lg">
          <h2 className="text-xl md:text-3xl font-bold drop-shadow-lg">{banner.title}</h2>
          {banner.subtitle && (
            <p className="mt-1 text-sm md:text-base text-white/80 drop-shadow">{banner.subtitle}</p>
          )}
        </div>
      </Wrapper>

      {count > 1 && (
        <>
          <button
            onClick={() => setCurrent(i => (i - 1 + count) % count)}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={next}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {banners.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`w-2 h-2 rounded-full transition-colors ${i === current ? 'bg-white' : 'bg-white/40'}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};
