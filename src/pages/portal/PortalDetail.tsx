import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { usePublicListings, useSubmitPortalLead } from '@/hooks/usePublicListings';
import { ArrowLeft, MapPin, Bed, Bath, Ruler, Car, MessageCircle, Calendar, Loader2, ChevronLeft, ChevronRight, Phone } from 'lucide-react';
import { toast } from 'sonner';

const formatPrice = (amount: number) =>
  'Gs. ' + Math.round(amount).toLocaleString('es-PY');

const PortalDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { data: listings, isLoading } = usePublicListings();
  const property = listings?.find(p => p.id === id);
  const { submit } = useSubmitPortalLead();

  const [photoIdx, setPhotoIdx] = useState(0);
  const [showVisitForm, setShowVisitForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '', message: '', schedule: '' });
  const [submitting, setSubmitting] = useState(false);

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

  const whatsappMsg = encodeURIComponent(
    `Hola ${property.captor_name || ''}, vi la propiedad "${property.title}" (${property.property_code}) en Plusterra. ¿Sigue disponible? Me interesa coordinar visita.`
  );
  const whatsappPhone = (property.captor_phone || '').replace(/\D/g, '');
  const whatsappUrl = whatsappPhone ? `https://wa.me/${whatsappPhone.startsWith('595') ? whatsappPhone : '595' + whatsappPhone}?text=${whatsappMsg}` : null;

  const handleSubmitVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) {
      toast.error('Nombre y teléfono son requeridos');
      return;
    }
    setSubmitting(true);
    try {
      await submit({
        property_id: property.id,
        captor_agent_id: property.captor_agent_id,
        visitor_name: formData.name.trim(),
        visitor_phone: formData.phone.trim(),
        visitor_message: formData.message.trim() || undefined,
        preferred_schedule: formData.schedule.trim() || undefined,
      });
      toast.success('¡Solicitud enviada! El agente te contactará pronto.');
      setShowVisitForm(false);
      setFormData({ name: '', phone: '', message: '', schedule: '' });
    } catch {
      toast.error('Error al enviar. Intentá de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <Link to="/portal/propiedades" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[#00447C] mb-4 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Volver al catálogo
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Gallery + Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Gallery */}
          <div className="relative rounded-xl overflow-hidden bg-gray-100 aspect-[16/9]">
            {photos.length > 0 ? (
              <>
                <img
                  src={photos[photoIdx]?.photo_url}
                  alt={property.title}
                  className="w-full h-full object-cover"
                />
                {photos.length > 1 && (
                  <>
                    <button
                      onClick={() => setPhotoIdx(i => (i - 1 + photos.length) % photos.length)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setPhotoIdx(i => (i + 1) % photos.length)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs px-3 py-1 rounded-full">
                      {photoIdx + 1} / {photos.length}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">Sin fotos disponibles</div>
            )}
          </div>

          {/* Thumbnails */}
          {photos.length > 1 && (
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
            <h1 className="text-2xl font-bold text-gray-900">{property.title}</h1>
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
                    {formatPrice(Number(property.rental_price))}
                    <span className="text-sm font-normal text-gray-500">
                      /{property.rental_period === 'daily' ? 'día' : 'mes'}
                    </span>
                  </p>
                </div>
              )}
              {hasSale && (
                <div>
                  <span className="text-xs text-gray-500 uppercase font-medium">Venta</span>
                  <p className="text-2xl font-bold text-[#00447C]">{formatPrice(Number(property.sale_price))}</p>
                </div>
              )}
            </div>

            {/* Agent */}
            {property.captor_name && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-1">Agente responsable</p>
                <p className="font-semibold text-gray-900">{property.captor_name}</p>
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
                onClick={() => setShowVisitForm(true)}
                className="flex items-center justify-center gap-2 w-full py-3 bg-[#FC5100] hover:bg-[#e54900] text-white font-semibold rounded-xl transition-colors"
              >
                <Calendar className="w-5 h-5" />
                Agendar Visita
              </button>
            </div>

            {/* Visit form */}
            {showVisitForm && (
              <form onSubmit={handleSubmitVisit} className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                <h4 className="font-semibold text-gray-900 text-sm">Solicitar Visita</h4>
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
                  <option value="">Preferencia horaria</option>
                  <option value="mañana">Mañana (8-12hs)</option>
                  <option value="tarde">Tarde (14-18hs)</option>
                  <option value="flexible">Flexible</option>
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
                    onClick={() => setShowVisitForm(false)}
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
