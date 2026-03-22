import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePublicListings, PublicListing } from '@/hooks/usePublicListings';
import { Heart, X, ArrowRight, Sparkles, Loader2 } from 'lucide-react';
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion';

const SWIPE_THRESHOLD = 100;
const MATCH_LIMIT = 5;

const formatPrice = (p: PublicListing) => {
  const price = Number(p.sale_price) > 0 ? Number(p.sale_price) : Number(p.rental_price);
  return p.currency === 'USD'
    ? 'USD ' + Math.round(price).toLocaleString('en-US')
    : 'Gs. ' + Math.round(price).toLocaleString('es-PY');
};

const PropertyMatchSwipe = () => {
  const navigate = useNavigate();
  const { data: allListings, isLoading } = usePublicListings();
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [liked, setLiked] = useState<string[]>([]);
  const [swipeCount, setSwipeCount] = useState(0);
  const [showResults, setShowResults] = useState(false);

  // Shuffle listings once
  const [shuffled, setShuffled] = useState<PublicListing[]>([]);
  useEffect(() => {
    if (allListings?.length) {
      const withPhotos = allListings.filter(p => p.photos?.length);
      const copy = [...withPhotos];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      setShuffled(copy);
    }
  }, [allListings]);

  const current = shuffled[currentIndex];
  const motionX = useMotionValue(0);
  const rotate = useTransform(motionX, [-200, 200], [-15, 15]);
  const likeOpacity = useTransform(motionX, [0, 100], [0, 1]);
  const nopeOpacity = useTransform(motionX, [-100, 0], [1, 0]);

  const handleSwipe = useCallback((direction: 'left' | 'right') => {
    if (!current) return;
    if (direction === 'right') {
      setLiked(prev => [...prev, current.id]);
    }
    const newCount = swipeCount + 1;
    setSwipeCount(newCount);

    if (newCount >= MATCH_LIMIT || currentIndex >= shuffled.length - 1) {
      setShowResults(true);
    } else {
      setCurrentIndex(prev => prev + 1);
    }
    motionX.set(0);
  }, [current, currentIndex, shuffled.length, swipeCount, motionX]);

  const onDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.x > SWIPE_THRESHOLD) handleSwipe('right');
    else if (info.offset.x < -SWIPE_THRESHOLD) handleSwipe('left');
  };

  const handleStart = () => {
    setIsOpen(true);
    setCurrentIndex(0);
    setLiked([]);
    setSwipeCount(0);
    setShowResults(false);
  };

  const handleViewMatches = () => {
    if (liked.length > 0) {
      const codes = shuffled
        .filter(p => liked.includes(p.id))
        .map(p => p.property_code)
        .filter(Boolean);
      if (codes.length > 0) {
        navigate(`/portal/comparar?props=${codes.join(',')}`);
      } else {
        navigate('/portal/propiedades');
      }
    } else {
      navigate('/portal/propiedades');
    }
    setIsOpen(false);
  };

  // ── CTA Section (visible on portal home) ──
  if (!isOpen) {
    return (
      <section className="relative overflow-hidden py-14" style={{ background: 'linear-gradient(135deg, #00447C 0%, #002d54 100%)' }}>
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-8 left-20 w-40 h-40 rounded-full bg-[#FC5100] blur-3xl" />
          <div className="absolute bottom-8 right-20 w-48 h-48 rounded-full bg-white blur-3xl" />
        </div>
        <div className="relative max-w-3xl mx-auto px-4 text-center">
          <span className="inline-block text-5xl mb-4">💘</span>
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
            Encontrá tu propiedad ideal
          </h2>
          <p className="text-white/70 text-base md:text-lg mb-6">
            Deslizá y encontrá la que más te gusta — sin filtros, pura intuición.
          </p>
          <button
            onClick={handleStart}
            disabled={isLoading || !shuffled.length}
            className="inline-flex items-center gap-2 px-8 py-3 bg-[#FC5100] hover:bg-[#e54900] text-white font-semibold rounded-lg transition-colors text-lg shadow-lg shadow-[#FC5100]/30 disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            Empezar ahora <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </section>
    );
  }

  // ── Swipe experience (fullscreen overlay) ──
  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center">
      {/* Close button */}
      <button
        onClick={() => setIsOpen(false)}
        className="absolute top-4 right-4 text-white/70 hover:text-white text-sm font-medium z-50"
      >
        ✕ Cerrar
      </button>

      {/* Counter */}
      <div className="absolute top-4 left-4 text-white/60 text-sm z-50">
        {swipeCount}/{MATCH_LIMIT} · {liked.length} ❤️
      </div>

      {showResults ? (
        /* ── Results screen ── */
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center px-6"
        >
          <span className="text-6xl block mb-4">{liked.length > 0 ? '🎉' : '😅'}</span>
          <h3 className="text-2xl font-bold text-white mb-2">
            {liked.length > 0
              ? `¡Tenés ${liked.length} match${liked.length > 1 ? 'es' : ''}!`
              : 'No hubo match esta vez'}
          </h3>
          <p className="text-white/60 mb-6">
            {liked.length > 0
              ? 'Mirá las propiedades que te gustaron'
              : 'Probá de nuevo o explorá el catálogo completo'}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={handleViewMatches}
              className="px-6 py-3 bg-[#FC5100] hover:bg-[#e54900] text-white font-semibold rounded-lg transition-colors"
            >
              {liked.length > 0 ? '❤️ Ver mis matches' : 'Ver catálogo'}
            </button>
            {liked.length > 0 && shuffled.length > MATCH_LIMIT && (
              <button
                onClick={handleStart}
                className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-lg transition-colors"
              >
                Jugar de nuevo
              </button>
            )}
          </div>
        </motion.div>
      ) : current ? (
        /* ── Card to swipe ── */
        <div className="relative w-[340px] sm:w-[380px] h-[500px] sm:h-[540px]">
          <AnimatePresence>
            <motion.div
              key={current.id}
              className="absolute inset-0 rounded-2xl overflow-hidden shadow-2xl cursor-grab active:cursor-grabbing"
              style={{ x: motionX, rotate }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.7}
              onDragEnd={onDragEnd}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {/* Photo */}
              <img
                src={current.photos?.[0]?.photo_url || '/placeholder.svg'}
                alt={current.title}
                className="w-full h-full object-cover"
                draggable={false}
              />

              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

              {/* Like / Nope indicators */}
              <motion.div
                className="absolute top-8 right-8 px-4 py-2 border-4 border-green-400 rounded-lg text-green-400 font-bold text-2xl rotate-[-20deg]"
                style={{ opacity: likeOpacity }}
              >
                LIKE
              </motion.div>
              <motion.div
                className="absolute top-8 left-8 px-4 py-2 border-4 border-red-400 rounded-lg text-red-400 font-bold text-2xl rotate-[20deg]"
                style={{ opacity: nopeOpacity }}
              >
                NOPE
              </motion.div>

              {/* Info */}
              <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                <h3 className="font-bold text-lg leading-tight mb-1 line-clamp-2">{current.title}</h3>
                <p className="text-[#FC5100] font-bold text-xl mb-1">{formatPrice(current)}</p>
                <p className="text-white/70 text-sm">
                  📍 {current.neighborhood || current.city || 'Sin ubicación'}
                  {current.bedrooms ? ` · ${current.bedrooms} dorm` : ''}
                  {current.bathrooms ? ` · ${current.bathrooms} baños` : ''}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Action buttons */}
          <div className="absolute -bottom-20 left-0 right-0 flex justify-center gap-6">
            <button
              onClick={() => handleSwipe('left')}
              className="w-16 h-16 rounded-full bg-white/10 hover:bg-red-500/30 border-2 border-red-400 flex items-center justify-center transition-colors"
            >
              <X className="w-8 h-8 text-red-400" />
            </button>
            <button
              onClick={() => handleSwipe('right')}
              className="w-16 h-16 rounded-full bg-white/10 hover:bg-green-500/30 border-2 border-green-400 flex items-center justify-center transition-colors"
            >
              <Heart className="w-8 h-8 text-green-400" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default PropertyMatchSwipe;
