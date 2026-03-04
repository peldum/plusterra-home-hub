import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Building2, MapPin, Calendar, DollarSign, Layers, ArrowLeft, Phone, FileText, Play, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { z } from 'zod';

const leadSchema = z.object({
  visitor_name: z.string().trim().min(2, 'Nombre muy corto').max(100),
  visitor_phone: z.string().trim().min(6, 'Teléfono inválido').max(20),
  visitor_email: z.string().trim().email('Email inválido').max(255).optional().or(z.literal('')),
});

const PortalShowroomDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [leadGateOpen, setLeadGateOpen] = useState(false);
  const [leadGateAction, setLeadGateAction] = useState<'brochure' | 'whatsapp' | 'floorplan'>('whatsapp');
  const [leadForm, setLeadForm] = useState({ visitor_name: '', visitor_phone: '', visitor_email: '' });
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [floorplanUnlocked, setFloorplanUnlocked] = useState(false);

  const { data: project, isLoading } = useQuery({
    queryKey: ['showroom-detail', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('buildings')
        .select('*')
        .eq('id', id!)
        .eq('is_showroom', true)
        .eq('showroom_enabled', true)
        .single();
      if (error) throw error;

      const { data: gallery } = await supabase
        .from('showroom_gallery')
        .select('*')
        .eq('building_id', id!)
        .order('order_index');

      return {
        ...data,
        showroom_amenities: Array.isArray((data as any).showroom_amenities) ? (data as any).showroom_amenities : [],
        gallery: (gallery || []) as any[],
      } as any;
    },
    enabled: !!id,
  });

  const submitLead = useMutation({
    mutationFn: async (form: typeof leadForm) => {
      const parsed = leadSchema.parse(form);
      const { error } = await supabase.from('showroom_leads').insert({
        building_id: id!,
        visitor_name: parsed.visitor_name,
        visitor_phone: parsed.visitor_phone,
        visitor_email: parsed.visitor_email || null,
        interest_type: leadGateAction,
      });
      if (error) {
        // Rate limit = already submitted recently, treat as success
        if (error.message?.includes('Rate limit')) return 'rate_limited';
        throw error;
      }
      return 'inserted';
    },
    onSuccess: () => {
      toast.success('¡Gracias! Un asesor te contactará pronto.');
      setLeadGateOpen(false);

      if (leadGateAction === 'brochure' && project?.showroom_brochure_url) {
        window.open(project.showroom_brochure_url, '_blank');
      } else if (leadGateAction === 'whatsapp' && project?.showroom_contact_whatsapp) {
        const msg = encodeURIComponent(`Hola, me interesa el proyecto ${project.name}. Mi nombre es ${leadForm.visitor_name}.`);
        window.open(`https://wa.me/${project.showroom_contact_whatsapp.replace(/\D/g, '')}?text=${msg}`, '_blank');
      } else if (leadGateAction === 'floorplan') {
        setFloorplanUnlocked(true);
      }
      setLeadForm({ visitor_name: '', visitor_phone: '', visitor_email: '' });
    },
    onError: (err: any) => {
      toast.error('Error al enviar. Intentá de nuevo.');
    },
  });

  const openLeadGate = (action: typeof leadGateAction) => {
    setLeadGateAction(action);
    setLeadGateOpen(true);
  };

  if (isLoading) return (
    <div className="flex justify-center items-center min-h-[60vh]">
      <Loader2 className="w-8 h-8 animate-spin text-[#00447C]" />
    </div>
  );

  if (!project) return (
    <div className="text-center py-20">
      <Building2 className="w-16 h-16 mx-auto text-gray-300 mb-4" />
      <p className="text-gray-500">Proyecto no encontrado.</p>
      <Link to="/portal/proyectos" className="text-[#FC5100] text-sm mt-2 inline-block">← Volver a proyectos</Link>
    </div>
  );

  const renders = (project.gallery || []).filter((g: any) => g.image_type === 'render');
  const floorPlans = (project.gallery || []).filter((g: any) => g.image_type === 'floor_plan');
  const allImages = project.gallery || [];
  const coverImg = project.showroom_cover_url || renders[0]?.image_url;
  const amenities: string[] = project.showroom_amenities || [];

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Back nav */}
      <Link to="/portal/proyectos" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[#00447C] mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Volver a proyectos
      </Link>

      {/* Hero */}
      <div className="relative rounded-2xl overflow-hidden mb-8">
        {coverImg ? (
          <img src={coverImg} alt={project.name} className="w-full h-[400px] md:h-[500px] object-cover" />
        ) : (
          <div className="w-full h-[400px] bg-gradient-to-br from-[#00447C] to-[#003366] flex items-center justify-center">
            <Building2 className="w-20 h-20 text-white/20" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
          {project.showroom_developer && (
            <span className="inline-block bg-[#FC5100] text-white text-xs font-semibold px-3 py-1 rounded-full mb-3">
              {project.showroom_developer}
            </span>
          )}
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{project.name}</h1>
          <div className="flex flex-wrap gap-4 text-white/80 text-sm">
            <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {project.city || project.address}</span>
            {project.showroom_delivery_date && (
              <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> Entrega: {project.showroom_delivery_date}</span>
            )}
            {project.floors && <span className="flex items-center gap-1"><Layers className="w-4 h-4" /> {project.floors} pisos</span>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Description */}
          {project.showroom_description && (
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">Sobre el Proyecto</h2>
              <p className="text-gray-600 leading-relaxed whitespace-pre-line">{project.showroom_description}</p>
            </section>
          )}

          {/* Gallery renders */}
          {renders.length > 0 && (
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Renders</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {renders.map((img: any, idx: number) => (
                  <button
                    key={img.id}
                    onClick={() => setLightboxIdx(allImages.findIndex((g: any) => g.id === img.id))}
                    className="aspect-[4/3] rounded-xl overflow-hidden group"
                  >
                    <img src={img.image_url} alt={img.caption || 'Render'} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Floor plans — behind lead gate */}
          {floorPlans.length > 0 && (
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Planos</h2>
              {floorplanUnlocked ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {floorPlans.map((img: any) => (
                    <button
                      key={img.id}
                      onClick={() => setLightboxIdx(allImages.findIndex((g: any) => g.id === img.id))}
                      className="aspect-[4/3] rounded-xl overflow-hidden group"
                    >
                      <img src={img.image_url} alt={img.caption || 'Plano'} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="relative">
                  <div className="grid grid-cols-2 gap-3 blur-sm pointer-events-none select-none">
                    {floorPlans.slice(0, 4).map((img: any) => (
                      <div key={img.id} className="aspect-[4/3] rounded-xl overflow-hidden bg-gray-100">
                        <img src={img.image_url} alt="Plano" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/60 backdrop-blur-[2px] rounded-xl">
                    <FileText className="w-10 h-10 text-[#00447C] mb-3" />
                    <p className="text-gray-700 font-semibold mb-1">Planos disponibles</p>
                    <p className="text-gray-500 text-sm mb-4">Dejá tus datos para acceder</p>
                    <Button onClick={() => openLeadGate('floorplan')} className="bg-[#00447C] hover:bg-[#003366]">
                      Ver planos
                    </Button>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Video */}
          {project.showroom_video_url && (
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Video del Proyecto</h2>
              <div className="aspect-video rounded-xl overflow-hidden bg-black">
                <iframe
                  src={project.showroom_video_url.replace('watch?v=', 'embed/')}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title="Video del proyecto"
                />
              </div>
            </section>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Price card */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm sticky top-24">
            {project.showroom_price_from && (
              <div className="mb-4">
                <p className="text-xs text-gray-400 uppercase tracking-wider">Desde</p>
                <p className="text-2xl font-bold text-[#00447C]">
                  {project.showroom_currency || 'USD'} {project.showroom_price_from.toLocaleString()}
                </p>
              </div>
            )}

            <div className="space-y-3 mb-6 text-sm text-gray-600">
              {project.total_units && (
                <div className="flex justify-between"><span>Unidades</span><span className="font-medium">{project.total_units}</span></div>
              )}
              {project.floors && (
                <div className="flex justify-between"><span>Pisos</span><span className="font-medium">{project.floors}</span></div>
              )}
              {project.showroom_delivery_date && (
                <div className="flex justify-between"><span>Entrega</span><span className="font-medium">{project.showroom_delivery_date}</span></div>
              )}
            </div>

            <div className="space-y-2">
              <Button
                className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white"
                onClick={() => openLeadGate('whatsapp')}
              >
                <Phone className="w-4 h-4 mr-2" /> Consultar por WhatsApp
              </Button>

              {project.showroom_brochure_url && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => openLeadGate('brochure')}
                >
                  <FileText className="w-4 h-4 mr-2" /> Descargar Brochure
                </Button>
              )}
            </div>
          </div>

          {/* Amenities */}
          {amenities.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-2xl p-6">
              <h3 className="font-semibold text-gray-900 mb-3">Amenidades</h3>
              <div className="flex flex-wrap gap-2">
                {amenities.map((a: string, i: number) => (
                  <span key={i} className="text-xs bg-gray-100 text-gray-700 px-3 py-1.5 rounded-full">
                    {a}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lead Gate Dialog */}
      <Dialog open={leadGateOpen} onOpenChange={setLeadGateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {leadGateAction === 'brochure' ? 'Descargar Brochure' :
               leadGateAction === 'floorplan' ? 'Ver Planos' :
               'Contactar un Asesor'}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500 -mt-2">
            Dejá tus datos y un asesor especializado te contactará.
          </p>
          <form
            onSubmit={e => { e.preventDefault(); submitLead.mutate(leadForm); }}
            className="space-y-4 mt-2"
          >
            <div>
              <Label>Nombre *</Label>
              <Input value={leadForm.visitor_name} onChange={e => setLeadForm(f => ({ ...f, visitor_name: e.target.value }))} required maxLength={100} />
            </div>
            <div>
              <Label>Teléfono *</Label>
              <Input value={leadForm.visitor_phone} onChange={e => setLeadForm(f => ({ ...f, visitor_phone: e.target.value }))} required maxLength={20} placeholder="+595..." />
            </div>
            <div>
              <Label>Email (opcional)</Label>
              <Input type="email" value={leadForm.visitor_email} onChange={e => setLeadForm(f => ({ ...f, visitor_email: e.target.value }))} maxLength={255} />
            </div>
            <Button type="submit" className="w-full bg-[#00447C] hover:bg-[#003366]" disabled={submitLead.isPending}>
              {submitLead.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {leadGateAction === 'brochure' ? 'Descargar' :
               leadGateAction === 'floorplan' ? 'Ver planos' : 'Enviar'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Lightbox */}
      {lightboxIdx !== null && allImages.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={() => setLightboxIdx(null)}>
          <button className="absolute top-4 right-4 text-white/70 hover:text-white" onClick={() => setLightboxIdx(null)}>
            <X className="w-6 h-6" />
          </button>
          {lightboxIdx > 0 && (
            <button className="absolute left-4 text-white/70 hover:text-white" onClick={e => { e.stopPropagation(); setLightboxIdx(lightboxIdx - 1); }}>
              <ChevronLeft className="w-8 h-8" />
            </button>
          )}
          {lightboxIdx < allImages.length - 1 && (
            <button className="absolute right-4 text-white/70 hover:text-white" onClick={e => { e.stopPropagation(); setLightboxIdx(lightboxIdx + 1); }}>
              <ChevronRight className="w-8 h-8" />
            </button>
          )}
          <img
            src={allImages[lightboxIdx].image_url}
            alt={allImages[lightboxIdx].caption || 'Imagen'}
            className="max-w-[90vw] max-h-[85vh] object-contain"
            onClick={e => e.stopPropagation()}
          />
          {allImages[lightboxIdx].caption && (
            <p className="absolute bottom-6 text-white/80 text-sm text-center">{allImages[lightboxIdx].caption}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default PortalShowroomDetail;
