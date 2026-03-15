import { useState, useCallback, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X, Video, Globe, Camera } from 'lucide-react';
import { PortalWatermark } from './PortalWatermark';
import { useIsMobile } from '@/hooks/use-mobile';

interface Photo {
  id: string;
  photo_url: string;
  thumbnail_url?: string | null;
}

interface VideoEmbed {
  type: 'embed' | 'direct';
  src: string;
}

interface PortalGalleryProps {
  photos: Photo[];
  videoEmbed: VideoEmbed | null;
  tourUrl: string | null;
  title: string;
  defaultMedia?: 'photos' | 'video' | 'tour';
}

export const PortalGallery = ({ photos, videoEmbed, tourUrl, title, defaultMedia = 'photos' }: PortalGalleryProps) => {
  const isMobile = useIsMobile();
  const hasPhotos = photos.length > 0;
  const hasVideo = Boolean(videoEmbed);
  const hasTour = Boolean(tourUrl);

  const resolvedDefault = hasVideo && defaultMedia === 'video'
    ? 'video'
    : hasPhotos ? 'photos' : hasTour ? 'tour' : 'photos';

  const [activeMedia, setActiveMedia] = useState<'photos' | 'video' | 'tour'>(resolvedDefault);
  const [photoIdx, setPhotoIdx] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Touch/swipe state
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const mainRef = useRef<HTMLDivElement>(null);

  const selectedMedia =
    (activeMedia === 'video' && !hasVideo) ||
    (activeMedia === 'photos' && !hasPhotos) ||
    (activeMedia === 'tour' && !hasTour)
      ? resolvedDefault
      : activeMedia;

  const goPrev = useCallback(() => {
    setPhotoIdx(i => (i - 1 + photos.length) % photos.length);
  }, [photos.length]);

  const goNext = useCallback(() => {
    setPhotoIdx(i => (i + 1) % photos.length);
  }, [photos.length]);

  // Swipe handlers for main gallery
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
      if (dx < 0) goNext();
      else goPrev();
    }
  }, [goNext, goPrev]);

  // Keyboard nav for lightbox
  useEffect(() => {
    if (!lightboxOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxOpen(false);
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [lightboxOpen, goPrev, goNext]);

  // Lightbox swipe
  const lbTouchStartX = useRef(0);
  const handleLbTouchStart = useCallback((e: React.TouchEvent) => {
    lbTouchStartX.current = e.touches[0].clientX;
  }, []);
  const handleLbTouchEnd = useCallback((e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - lbTouchStartX.current;
    if (Math.abs(dx) > 60) {
      if (dx < 0) goNext();
      else goPrev();
    }
  }, [goNext, goPrev]);

  const arrowSize = isMobile ? 'w-9 h-9' : 'w-11 h-11';
  const arrowIconSize = isMobile ? 'w-4 h-4' : 'w-5 h-5';

  const mediaButtons = (
    <div className="absolute top-3 left-3 z-10 flex gap-1.5">
      {hasPhotos && (
        <button
          onClick={(e) => { e.stopPropagation(); setActiveMedia('photos'); }}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-md transition-all duration-200 ${
            selectedMedia === 'photos'
              ? 'bg-white/95 text-gray-900 shadow-sm'
              : 'bg-black/50 text-white/90 hover:bg-black/70'
          }`}
        >
          <Camera className="w-3.5 h-3.5" /> Fotos
        </button>
      )}
      {hasVideo && (
        <button
          onClick={(e) => { e.stopPropagation(); setActiveMedia('video'); }}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-md transition-all duration-200 ${
            selectedMedia === 'video'
              ? 'bg-white/95 text-gray-900 shadow-sm'
              : 'bg-black/50 text-white/90 hover:bg-black/70'
          }`}
        >
          <Video className="w-3.5 h-3.5" /> Video
        </button>
      )}
      {hasTour && (
        <button
          onClick={(e) => { e.stopPropagation(); setActiveMedia('tour'); }}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-md transition-all duration-200 ${
            selectedMedia === 'tour'
              ? 'bg-white/95 text-gray-900 shadow-sm'
              : 'bg-black/50 text-white/90 hover:bg-black/70'
          }`}
        >
          <Globe className="w-3.5 h-3.5" /> 360°
        </button>
      )}
    </div>
  );

  return (
    <>
      {/* Main media container */}
      <div
        ref={mainRef}
        className={`relative overflow-hidden bg-gray-900 ${
          isMobile ? 'w-screen -mx-4 rounded-none' : 'rounded-xl'
        }`}
        style={{ height: isMobile ? 280 : 520 }}
      >
        {/* Media toggle pills */}
        {(hasPhotos || hasVideo || hasTour) && mediaButtons}

        {/* Photos */}
        {selectedMedia === 'photos' && hasPhotos && (
          <div
            className="w-full h-full relative cursor-pointer"
            onClick={() => setLightboxOpen(true)}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <img
              src={photos[photoIdx]?.photo_url}
              alt={title}
              className="w-full h-full object-cover transition-opacity duration-300"
              loading={photoIdx === 0 ? 'eager' : 'lazy'}
              draggable={false}
            />
            <PortalWatermark />

            {/* Arrows */}
            {photos.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); goPrev(); }}
                  className={`absolute left-3 top-1/2 -translate-y-1/2 ${arrowSize} rounded-full bg-white/90 hover:bg-white text-gray-800 flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-105`}
                >
                  <ChevronLeft className={arrowIconSize} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); goNext(); }}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 ${arrowSize} rounded-full bg-white/90 hover:bg-white text-gray-800 flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-105`}
                >
                  <ChevronRight className={arrowIconSize} />
                </button>
              </>
            )}

            {/* Counter */}
            {photos.length > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm text-white text-xs font-medium px-3 py-1 rounded-full">
                {photoIdx + 1} / {photos.length}
              </div>
            )}
          </div>
        )}

        {/* Video */}
        {selectedMedia === 'video' && videoEmbed && (
          <div className="w-full h-full flex items-center justify-center bg-black">
            {videoEmbed.type === 'embed' ? (
              <div className={`w-full ${isMobile ? '' : 'px-0'}`} style={{ aspectRatio: '16/9', maxHeight: '100%' }}>
                <iframe
                  src={videoEmbed.src}
                  className={`w-full h-full ${isMobile ? '' : 'rounded-xl'}`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title="Video de la propiedad"
                  style={{ aspectRatio: '16/9' }}
                />
              </div>
            ) : (
              <video
                src={videoEmbed.src}
                className="w-full h-full object-contain"
                controls
                playsInline
                preload="metadata"
              />
            )}
          </div>
        )}

        {/* Tour 360 */}
        {selectedMedia === 'tour' && tourUrl && (
          <iframe
            src={tourUrl}
            className="w-full h-full"
            allow="xr-spatial-tracking; gyroscope; accelerometer; fullscreen"
            allowFullScreen
            title="Tour virtual 360°"
          />
        )}

        {/* Empty state */}
        {!hasPhotos && !hasVideo && !hasTour && (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
            Sin contenido multimedia
          </div>
        )}
      </div>

      {/* Thumbnails */}
      {selectedMedia === 'photos' && photos.length > 1 && (
        <div
          className={`flex gap-2 mt-3 ${
            isMobile ? 'overflow-x-auto pb-2 -mx-4 px-4 scrollbar-none' : 'flex-wrap'
          }`}
          style={isMobile ? { scrollbarWidth: 'none' } : undefined}
        >
          {photos.map((ph, i) => (
            <button
              key={ph.id}
              onClick={() => setPhotoIdx(i)}
              className={`flex-shrink-0 overflow-hidden transition-all duration-200 ${
                isMobile ? 'w-20 h-[60px] rounded-md' : 'w-[100px] h-[75px] rounded-lg'
              } ${
                i === photoIdx
                  ? 'ring-[3px] ring-[#FC5100] ring-offset-1 opacity-100'
                  : 'opacity-60 hover:opacity-100'
              }`}
            >
              <img
                src={ph.thumbnail_url || ph.photo_url}
                alt=""
                className="w-full h-full object-cover"
                loading="lazy"
                decoding="async"
                draggable={false}
              />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightboxOpen && hasPhotos && (
        <div
          className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center"
          onClick={() => setLightboxOpen(false)}
          onTouchStart={handleLbTouchStart}
          onTouchEnd={handleLbTouchEnd}
        >
          {/* Close button */}
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Counter */}
          <div className="absolute top-4 left-4 text-white/80 text-sm font-medium">
            {photoIdx + 1} / {photos.length}
          </div>

          {/* Image */}
          <img
            src={photos[photoIdx]?.photo_url}
            alt={title}
            className="max-w-[90vw] max-h-[85vh] object-contain select-none"
            onClick={(e) => e.stopPropagation()}
            draggable={false}
          />

          {/* Arrows */}
          {photos.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); goPrev(); }}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center transition-colors"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); goNext(); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center transition-colors"
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
