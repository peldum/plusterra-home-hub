import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { usePublicListings, useSubmitPortalLead } from '@/hooks/usePublicListings';
import { usePortalAgents } from '@/hooks/usePortalAgents';
import { ArrowLeft, MapPin, Bed, Bath, Ruler, Car, MessageCircle, Phone, Loader2, ChevronLeft, ChevronRight, Share2, FileDown, Facebook, User, Video, Globe } from 'lucide-react';
import { toast } from 'sonner';
import { PortalPropertyPDF } from '@/components/portal/PortalPropertyPDF';
import { PortalWatermark } from '@/components/portal/PortalWatermark';

const formatPrice = (amount: number, currency?: string | null) =>
  currency === 'USD'
    ? 'USD ' + Math.round(amount).toLocaleString('en-US')
    : 'Gs. ' + Math.round(amount).toLocaleString('es-PY');

const getVideoEmbedUrl = (url?: string | null): { type: 'embed' | 'direct'; src: string } | null => {
  if (!url) return null;
  const trimmed = url.trim();

  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.replace('www.', '');

    if (host === 'youtube.com' || host === 'youtu.be') {
      const fromQuery = parsed.searchParams.get('v');
      const fromShorts = parsed.pathname.match(/\/shorts\/([a-zA-Z0-9_-]{11})/i)?.[1];
      const fromEmbed = parsed.pathname.match(/\/embed\/([a-zA-Z0-9_-]{11})/i)?.[1];
      const fromYoutuBe = host === 'youtu.be'
        ? parsed.pathname.match(/^\/([a-zA-Z0-9_-]{11})/)?.[1]
        : null;
      const videoId = fromQuery || fromShorts || fromEmbed || fromYoutuBe;
      if (videoId) return { type: 'embed', src: `https://www.youtube.com/embed/${videoId}` };
      return null;
    }

    if (host === 'vimeo.com' || host === 'player.vimeo.com') {
      const vimeoId = parsed.pathname.match(/\/(?:video\/)?(\d+)/)?.[1];
      if (vimeoId) return { type: 'embed', src: `https://player.vimeo.com/video/${vimeoId}` };
      return null;
    }

    if (/\.(mp4|webm|ogg|mov|m3u8)(\?.*)?$/i.test(trimmed)) {
      return { type: 'direct', src: trimmed };
    }
  } catch {
    if (/\.(mp4|webm|ogg|mov|m3u8)(\?.*)?$/i.test(trimmed)) {
      return { type: 'direct', src: trimmed };
    }
  }

  return null;
};

const AgentCard = ({ agentId, fallbackName }: { agentId: string; fallbackName: string }) => {
  const { data: agents } = usePortalAgents();
  const agent = agents?.find(a => a.agent_id === agentId);

  return (
    <div className="flex items-center gap-3">
      <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
        {agent?.public_photo_url_webp ? (
          <img src={agent.public_photo_url_webp} alt={agent.public_name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <User className="w-6 h-6" />
          </div>
        )}
      </div>
      <div>
        <p className="font-semibold text-gray-900">{agent?.public_name || fallbackName}</p>
        {agent?.areas && <p className="text-xs text-gray-500 line-clamp-1">{agent.areas}</p>}
      </div>
    </div>
  );
};

const PortalDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { data: listings, isLoading } = usePublicListings();
  const property = listings?.find(p => p.id === id);
  const { submit } = useSubmitPortalLead();

  const [photoIdx, setPhotoIdx] = useState(0);
  const [activeMedia, setActiveMedia] = useState<'photos' | 'video' | 'tour'>('video');
  const [showContactForm, setShowContactForm] = useState(false);
  const [showDownloadForm, setShowDownloadForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', message: '', schedule: '' });
  const [downloadLeadData, setDownloadLeadData] = useState({ name: '', phone: '', email: '' });
  const [submitting, setSubmitting] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const handleShare = (platform?: string) => {
    const url = window.location.href;
    const text = `${property?.title || 'Propiedad'} - ${property?.property_code || ''}`;

    switch (platform) {
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`, '_blank');
        break;
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
        break;
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
        break;
      case 'linkedin':
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank');
        break;
      default:
        if (navigator.share) {
          navigator.share({ title: text, url }).catch(() => {});
        } else {
          navigator.clipboard.writeText(url);
          toast.success('Enlace copiado al portapapeles');
        }
    }
  };


  if (isLoading) return (
    <div className="flex justify-center items-center min-h-[60vh]">
      <Loader2 className="w-8 h-8 animate-spin text-[#00447C]" />
    </div>
  );

  if (!property) return (
    <div className="max-w-7xl mx-auto px-4 py-16 text-center">
      <h2 className="text-xl font-semibold text-gray-700 mb-4">Propiedad no encontrada</h2>
      <Link to="/portal/propiedades" className="text-[#00447C] hover:underline">← Volver al catálogo</Link>
    </div>
  );

  const photos = property.photos || [];
  const hasRent = Number(property.rental_price) > 0;
  const hasSale = Number(property.sale_price) > 0;
  const videoEmbedUrl = getVideoEmbedUrl(property.video_url);
  const tourEmbedUrl = property.tour_360_url?.trim() || null;
  const defaultMedia: 'photos' | 'video' | 'tour' = photos.length > 0
    ? 'photos'
    : videoEmbedUrl
      ? 'video'
      : 'tour';
  const selectedMedia = activeMedia === 'photos' && photos.length === 0 ? defaultMedia : activeMedia;

  const whatsappMsg = encodeURIComponent(
    `Hola ${property.captor_name || ''}, vi la propiedad "${property.title}" (${property.property_code}) en Plusterra. ¿Sigue disponible? Me interesa coordinar visita.`
  );
  const whatsappPhone = (property.captor_phone || '').replace(/\D/g, '');
  const whatsappUrl = whatsappPhone ? `https://wa.me/${whatsappPhone.startsWith('595') ? whatsappPhone : '595' + whatsappPhone}?text=${whatsappMsg}` : null;

  const handleSubmitContact = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = formData.name.trim();
    const phone = formData.phone.trim();
    const message = formData.message.trim();
    const email = formData.email.trim();

    // Validation
    if (!name || name.length < 2 || name.length > 100) {
      toast.error('Nombre inválido (2-100 caracteres)');
      return;
    }
    if (!phone || phone.length < 6 || phone.length > 20 || !/^[0-9+\-() ]+$/.test(phone)) {
      toast.error('Teléfono inválido');
      return;
    }
    if (email && (email.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
      toast.error('Email inválido');
      return;
    }
    if (message && message.length > 500) {
      toast.error('Mensaje muy largo (máx 500 caracteres)');
      return;
    }

    // Rate-limit: max 1 lead per 30 seconds (client-side)
    const lastSubmit = sessionStorage.getItem('_lead_ts');
    if (lastSubmit && Date.now() - Number(lastSubmit) < 30000) {
      toast.error('Por favor esperá unos segundos antes de enviar otra solicitud');
      return;
    }

    setSubmitting(true);
    try {
      await submit({
        property_id: property.id,
        captor_agent_id: property.captor_agent_id,
        visitor_name: name,
        visitor_phone: phone,
        visitor_message: message || undefined,
        preferred_schedule: formData.schedule.trim() || undefined,
        email: email || undefined,
        channel: 'web',
      });
      sessionStorage.setItem('_lead_ts', String(Date.now()));
      toast.success('¡Solicitud enviada! El agente te contactará pronto.');
      setShowContactForm(false);
      setFormData({ name: '', phone: '', email: '', message: '', schedule: '' });
    } catch {
      toast.error('Error al enviar. Intentá de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitDownloadLead = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = downloadLeadData.name.trim();
    const phone = downloadLeadData.phone.trim();
    const email = downloadLeadData.email.trim();

    if (!name || name.length < 2 || name.length > 100) {
      toast.error('Nombre inválido (2-100 caracteres)');
      return;
    }
    if (!phone || phone.length < 6 || phone.length > 20 || !/^[0-9+\-() ]+$/.test(phone)) {
      toast.error('Teléfono inválido');
      return;
    }
    if (email && (email.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
      toast.error('Email inválido');
      return;
    }

    setGeneratingPdf(true);
    try {
      await submit({
        property_id: property.id,
        captor_agent_id: property.captor_agent_id,
        visitor_name: name,
        visitor_phone: phone,
        email: email || undefined,
        visitor_message: 'Descargó ficha PDF',
        channel: 'pdf_download',
      });
      await PortalPropertyPDF(property);
      toast.success('Lead registrado y PDF descargado');
      setShowDownloadForm(false);
      setDownloadLeadData({ name: '', phone: '', email: '' });
    } catch {
      toast.error('No se pudo completar la descarga');
    } finally {
      setGeneratingPdf(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <Link to="/portal/propiedades" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[#00447C] transition-colors">
          <ArrowLeft className="w-4 h-4" /> Volver al catálogo
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Gallery + Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Gallery */}
          <div className="relative rounded-xl overflow-hidden bg-gray-900 aspect-[4/3] sm:aspect-[16/9]">
            {selectedMedia === 'photos' && photos.length > 0 ? (
              <>
                <img
                  src={photos[photoIdx]?.photo_url}
                  alt={property.title}
                  className="w-full h-full object-contain"
                />
                <PortalWatermark />
                {photos.length > 1 && (
                  <>
                    <button
                      onClick={() => setPhotoIdx(i => (i - 1 + photos.length) % photos.length)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[#00447C]/60 hover:bg-[#FC5100]/80 text-white flex items-center justify-center backdrop-blur-sm transition-all duration-300 hover:scale-110 shadow-lg"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setPhotoIdx(i => (i + 1) % photos.length)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[#00447C]/60 hover:bg-[#FC5100]/80 text-white flex items-center justify-center backdrop-blur-sm transition-all duration-300 hover:scale-110 shadow-lg"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs px-3 py-1 rounded-full">
                      {photoIdx + 1} / {photos.length}
                    </div>
                  </>
                )}
              </>
            ) : selectedMedia === 'video' && videoEmbedUrl ? (
              videoEmbedUrl.type === 'embed' ? (
                <iframe
                  src={videoEmbedUrl.src}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title="Video de la propiedad"
                />
              ) : (
                <video
                  src={videoEmbedUrl.src}
                  className="w-full h-full object-contain"
                  controls
                  playsInline
                  preload="metadata"
                />
              )
            ) : selectedMedia === 'tour' && tourEmbedUrl ? (
              <>
                <iframe
                  src={tourEmbedUrl}
                  className="w-full h-full"
                  allow="xr-spatial-tracking; gyroscope; accelerometer; fullscreen"
                  allowFullScreen
                  title="Tour virtual 360°"
                />
                <a
                  href={property.tour_360_url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute bottom-3 right-3 px-3 py-1.5 text-xs font-medium rounded-full bg-black/60 text-white hover:bg-black/75 transition-colors"
                >
                  Abrir tour
                </a>
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">Sin contenido multimedia</div>
            )}
          </div>

          {(photos.length > 0 || videoEmbedUrl || tourEmbedUrl) && (
            <div className="flex flex-wrap items-center gap-2">
              {photos.length > 0 && (
                <button
                  onClick={() => setActiveMedia('photos')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    selectedMedia === 'photos' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Fotos
                </button>
              )}
              {videoEmbedUrl && (
                <button
                  onClick={() => setActiveMedia('video')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    selectedMedia === 'video' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  <Video className="w-3.5 h-3.5" /> Video
                </button>
              )}
              {tourEmbedUrl && (
                <button
                  onClick={() => setActiveMedia('tour')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    selectedMedia === 'tour' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" /> Tour 360°
                </button>
              )}
            </div>
          )}

          {/* Thumbnails */}
          {selectedMedia === 'photos' && photos.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {photos.map((ph, i) => (
                <button
                  key={ph.id}
                  onClick={() => setPhotoIdx(i)}
                  className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors ${
                    i === photoIdx ? 'border-[#FC5100]' : 'border-transparent hover:border-gray-300'
                  }`}
                >
                  <img src={ph.thumbnail_url || ph.photo_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          )}

          {/* Details */}
          <div>
            {property.is_featured && (
              <div className="inline-flex items-center gap-2 mb-3 px-3 py-1.5 rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 text-white text-xs font-bold shadow-md shadow-amber-500/30">
                ⭐ PROPIEDAD DESTACADA
              </div>
            )}
            <h1 className="text-2xl font-bold text-gray-900">{property.title}</h1>
            {property.is_featured && (
              <p className="text-sm text-amber-600 font-medium mt-1">Propiedad destacada · Mayor visibilidad</p>
            )}
            <div className="flex items-center gap-1.5 text-gray-500 mt-2">
              <MapPin className="w-4 h-4" />
              <span>{[property.address, property.neighborhood, property.city].filter(Boolean).join(', ')}</span>
            </div>

            {/* Specs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
              {property.bedrooms != null && (
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
                  <Bed className="w-5 h-5 text-[#00447C]" />
                  <div><div className="text-sm font-semibold">{property.bedrooms}</div><div className="text-xs text-gray-500">Dormitorios</div></div>
                </div>
              )}
              {property.bathrooms != null && (
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
                  <Bath className="w-5 h-5 text-[#00447C]" />
                  <div><div className="text-sm font-semibold">{property.bathrooms}</div><div className="text-xs text-gray-500">Baños</div></div>
                </div>
              )}
              {property.area_m2 != null && (
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
                  <Ruler className="w-5 h-5 text-[#00447C]" />
                  <div><div className="text-sm font-semibold">{property.area_m2} m²</div><div className="text-xs text-gray-500">Superficie</div></div>
                </div>
              )}
              {property.has_garage && (
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
                  <Car className="w-5 h-5 text-[#00447C]" />
                  <div><div className="text-sm font-semibold">Sí</div><div className="text-xs text-gray-500">Cochera</div></div>
                </div>
              )}
            </div>

            {/* Google Maps + Street View - styled buttons, only when exact_location_enabled */}
            {property.public_lat && property.public_lng && property.exact_location_enabled && (
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <a
                  href={`https://www.google.com/maps?q=${property.public_lat},${property.public_lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-gray-200 shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 hover:shadow-md transition-all"
                >
                  <img src="https://maps.google.com/mapfiles/ms/icons/red-dot.png" alt="" className="w-5 h-5" />
                  Ver en Google Maps
                </a>
                <a
                  href={`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${property.public_lat},${property.public_lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-gray-200 shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 hover:shadow-md transition-all"
                >
                  <img src="https://maps.google.com/mapfiles/kml/shapes/man.png" alt="" className="w-5 h-5" />
                  Street View
                </a>
              </div>
            )}
            {property.public_lat && property.public_lng && !property.exact_location_enabled && (
              <p className="mt-4 text-sm text-gray-500 flex items-center gap-1.5">
                <MapPin className="w-4 h-4" />
                Ubicación aproximada · Contacte al agente para la dirección exacta
              </p>
            )}

            {/* Multimedia badges */}
            {(property.video_url || property.tour_360_url) && (
              <div className="flex items-center gap-3 mt-4">
                {property.video_url && (
                  <button
                    onClick={() => {
                      window.open(property.video_url!, '_blank', 'noopener,noreferrer');
                      setActiveMedia('video');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-50 border border-red-200 shadow-sm text-sm font-medium text-red-600 hover:bg-red-100 hover:shadow-md transition-all cursor-pointer"
                  >
                    <Video className="w-4 h-4" /> Ver Video
                  </button>
                )}
                {property.tour_360_url && (
                  <button
                    onClick={() => { setActiveMedia('tour'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-50 border border-blue-200 shadow-sm text-sm font-medium text-[#00447C] hover:bg-blue-100 hover:shadow-md transition-all cursor-pointer"
                  >
                    <Globe className="w-4 h-4" /> Tour 360°
                  </button>
                )}
              </div>
            )}


            {/* Description */}
            {(property.public_description || property.description) && (
              <div className="mt-6">
                <h3 className="font-semibold text-gray-900 mb-2">Descripción</h3>
                <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">
                  {property.public_description || property.description}
                </p>
              </div>
            )}

            {/* Amenities */}
            {property.amenities && property.amenities.length > 0 && (
              <div className="mt-6">
                <h3 className="font-semibold text-gray-900 mb-2">Amenities</h3>
                <div className="flex flex-wrap gap-2">
                  {property.amenities.map((a, i) => (
                    <span key={i} className="px-3 py-1.5 bg-blue-50 text-[#00447C] text-xs font-medium rounded-full">
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Price + CTA */}
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl p-5 sticky top-20">
            {/* Prices */}
            <div className="space-y-2">
              {hasRent && (
                <div>
                  <span className="text-xs text-gray-500 uppercase font-medium">
                    {property.rental_period === 'daily' ? 'Temporal' : 'Alquiler'}
                  </span>
                   <p className="text-2xl font-bold text-[#00447C]">
                    {formatPrice(Number(property.rental_price), property.currency)}
                    <span className="text-sm font-normal text-gray-500">
                      /{property.rental_period === 'daily' ? 'día' : 'mes'}
                    </span>
                  </p>
                </div>
              )}
              {hasSale && (
                <div>
                  <span className="text-xs text-gray-500 uppercase font-medium">Venta</span>
                  <p className="text-2xl font-bold text-[#00447C]">{formatPrice(Number(property.sale_price), property.currency)}</p>
                </div>
              )}
            </div>

            {/* Agent */}
            {property.captor_name && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-2">Agente responsable</p>
                <AgentCard agentId={property.captor_agent_id} fallbackName={property.captor_name} />
              </div>
            )}

            {/* CTAs */}
            <div className="mt-5 space-y-2.5">
              {whatsappUrl && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl transition-colors"
                >
                  <MessageCircle className="w-5 h-5" />
                  Contactar por WhatsApp
                </a>
              )}
              <button
                onClick={() => setShowContactForm(true)}
                className="flex items-center justify-center gap-2 w-full py-3 bg-[#FC5100] hover:bg-[#e54900] text-white font-semibold rounded-xl transition-colors"
              >
                <Phone className="w-5 h-5" />
                Solicitar Contacto
              </button>
            </div>

            {/* Export & Share */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2 mb-3">
                <button
                  onClick={() => setShowDownloadForm(v => !v)}
                  disabled={generatingPdf}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-[#00447C] hover:bg-[#003366] rounded-lg transition-colors disabled:opacity-50"
                >
                  <FileDown className="w-4 h-4" />
                  {generatingPdf ? 'Procesando...' : showDownloadForm ? 'Cerrar formulario' : 'Descargar PDF'}
                </button>
                <button
                  onClick={() => handleShare()}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                  Copiar enlace
                </button>
              </div>

              {showDownloadForm && (
                <form onSubmit={handleSubmitDownloadLead} className="mb-4 p-3 rounded-lg border border-gray-200 bg-gray-50 space-y-2.5">
                  <p className="text-xs font-medium text-gray-700">Completá tus datos para descargar la ficha</p>
                  <input
                    type="text"
                    placeholder="Nombre y apellido *"
                    value={downloadLeadData.name}
                    onChange={e => setDownloadLeadData(v => ({ ...v, name: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#00447C]"
                    required
                    maxLength={100}
                  />
                  <input
                    type="tel"
                    placeholder="Teléfono *"
                    value={downloadLeadData.phone}
                    onChange={e => setDownloadLeadData(v => ({ ...v, phone: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#00447C]"
                    required
                    maxLength={20}
                  />
                  <input
                    type="email"
                    placeholder="Email (opcional)"
                    value={downloadLeadData.email}
                    onChange={e => setDownloadLeadData(v => ({ ...v, email: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#00447C]"
                    maxLength={255}
                  />
                  <button
                    type="submit"
                    disabled={generatingPdf}
                    className="w-full py-2.5 rounded-lg bg-[#00447C] hover:bg-[#003366] text-white text-sm font-semibold transition-colors disabled:opacity-50"
                  >
                    {generatingPdf ? 'Enviando y generando PDF...' : 'Enviar y descargar PDF'}
                  </button>
                </form>
              )}

              <p className="text-xs text-gray-500 mb-2">Compartir en redes</p>
              <div className="flex gap-2">
                <button onClick={() => handleShare('whatsapp')} className="group w-9 h-9 rounded-full bg-green-500 text-white flex items-center justify-center transition-all duration-300 hover:scale-125 hover:shadow-lg hover:shadow-green-500/40 hover:-translate-y-0.5" title="WhatsApp">
                  <MessageCircle className="w-4 h-4" />
                </button>
                <button onClick={() => handleShare('facebook')} className="group w-9 h-9 rounded-full bg-[#1877F2] text-white flex items-center justify-center transition-all duration-300 hover:scale-125 hover:shadow-lg hover:shadow-[#1877F2]/40 hover:-translate-y-0.5" title="Facebook">
                  <Facebook className="w-4 h-4" />
                </button>
                <button onClick={() => handleShare('twitter')} className="group w-9 h-9 rounded-full bg-black text-white flex items-center justify-center transition-all duration-300 hover:scale-125 hover:shadow-lg hover:shadow-black/40 hover:-translate-y-0.5" title="X">
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </button>
                <button onClick={() => handleShare('linkedin')} className="group w-9 h-9 rounded-full bg-[#0A66C2] text-white flex items-center justify-center transition-all duration-300 hover:scale-125 hover:shadow-lg hover:shadow-[#0A66C2]/40 hover:-translate-y-0.5" title="LinkedIn">
                  <span className="text-xs font-bold">in</span>
                </button>
              </div>
            </div>

            {/* Contact form */}
            {showContactForm && (
              <form onSubmit={handleSubmitContact} className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                <h4 className="font-semibold text-gray-900 text-sm">Solicitar que te contacten</h4>
                <input
                  type="text"
                  placeholder="Tu nombre *"
                  value={formData.name}
                  onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#00447C]"
                  required
                  maxLength={100}
                />
                <input
                  type="email"
                  placeholder="Tu email"
                  value={formData.email}
                  onChange={e => setFormData(f => ({ ...f, email: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#00447C]"
                  maxLength={255}
                />
                <input
                  type="tel"
                  placeholder="Tu teléfono *"
                  value={formData.phone}
                  onChange={e => setFormData(f => ({ ...f, phone: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#00447C]"
                  required
                  maxLength={20}
                />
                <textarea
                  placeholder="Mensaje (opcional)"
                  value={formData.message}
                  onChange={e => setFormData(f => ({ ...f, message: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#00447C] resize-none"
                  maxLength={500}
                />
                <select
                  value={formData.schedule}
                  onChange={e => setFormData(f => ({ ...f, schedule: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                >
                  <option value="">¿A qué hora prefiere ser contactado/a?</option>
                  <option value="mañana">Mañana (8-12hs)</option>
                  <option value="tarde">Tarde (14-18hs)</option>
                  <option value="flexible">Cualquier horario</option>
                </select>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-2.5 bg-[#00447C] hover:bg-[#003366] text-white font-semibold rounded-lg text-sm transition-colors disabled:opacity-50"
                  >
                    {submitting ? 'Enviando...' : 'Enviar solicitud'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowContactForm(false)}
                    className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Property code */}
          <div className="text-center text-xs text-gray-400">
            Código: {property.property_code}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PortalDetail;
