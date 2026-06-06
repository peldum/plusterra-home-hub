import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MapPin, Phone, Mail, MessageCircle, Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';

const PortalContact = () => {
  const { data: settings, isLoading } = useQuery({
    queryKey: ['portal-contact-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('portal_settings')
        .select('company_address, company_phone, company_email, contact_phone, contact_email, facebook_url, instagram_url')
        .limit(1)
        .single();
      if (error) throw error;
      return data as any;
    },
    staleTime: 5 * 60_000,
  });

  const [form, setForm] = useState({ name: '', phone: '', email: '', message: '' });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error('Nombre y teléfono son obligatorios');
      return;
    }

    // Rate limit
    const last = sessionStorage.getItem('_contact_ts');
    if (last && Date.now() - Number(last) < 30000) {
      toast.error('Por favor esperá unos segundos');
      return;
    }

    setSubmitting(true);
    try {
      const { data: assignee, error: rpcError } = await supabase.rpc('get_default_portal_lead_assignee');
      if (rpcError) throw rpcError;
      if (!assignee) {
        toast.error('No hay un agente asignado para contactos generales. Contacte por WhatsApp.');
        return;
      }
      const { error } = await supabase.from('portal_leads').insert({
        captor_agent_id: assignee,
        visitor_name: form.name.trim(),
        visitor_phone: form.phone.trim(),
        visitor_message: form.message.trim() || null,
        channel: 'web_contact',
      } as any);
      if (error) throw error;
      sessionStorage.setItem('_contact_ts', String(Date.now()));
      toast.success('¡Mensaje enviado! Nos comunicaremos contigo pronto.');
      setForm({ name: '', phone: '', email: '', message: '' });
    } catch {
      toast.error('Error al enviar. Intentá de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  const waPhone = (settings?.contact_phone || settings?.company_phone || '').replace(/\D/g, '');
  const waUrl = waPhone ? `https://wa.me/${waPhone.startsWith('595') ? waPhone : '595' + waPhone}?text=${encodeURIComponent('Hola, quiero consultar sobre sus servicios inmobiliarios.')}` : null;

  if (isLoading) return (
    <div className="flex justify-center items-center min-h-[60vh]">
      <Loader2 className="w-8 h-8 animate-spin text-[#00447C]" />
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Contáctenos</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Nombre *</label>
                <input
                  type="text" required value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#FC5100]/40 focus:border-[#FC5100]"
                  placeholder="Tu nombre completo"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Teléfono *</label>
                <input
                  type="tel" required value={form.phone}
                  onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#FC5100]/40 focus:border-[#FC5100]"
                  placeholder="+595 9xx xxx xxx"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Email</label>
              <input
                type="email" value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#FC5100]/40 focus:border-[#FC5100]"
                placeholder="correo@ejemplo.com"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Mensaje</label>
              <textarea
                value={form.message}
                onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                rows={4}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#FC5100]/40 focus:border-[#FC5100] resize-none"
                placeholder="¿En qué podemos ayudarte?"
              />
            </div>
            <button
              type="submit" disabled={submitting}
              className="flex items-center gap-2 px-6 py-3 bg-[#FC5100] hover:bg-[#e54900] text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {submitting ? 'Enviando...' : 'Enviar formulario'}
            </button>
          </form>
        </div>

        {/* Sidebar contact info */}
        <div className="space-y-6">
          <div className="bg-gray-50 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Datos de contacto</h2>
            {(settings?.company_address) && (
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-[#FC5100] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-900 text-sm">Ubicación</p>
                  <p className="text-gray-600 text-xs">{settings.company_address}</p>
                </div>
              </div>
            )}
            {(settings?.company_phone || settings?.contact_phone) && (
              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-[#FC5100] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-900 text-sm">Teléfono</p>
                  <a href={`tel:${settings.company_phone || settings.contact_phone}`} className="text-[#00447C] hover:underline text-xs">
                    {settings.company_phone || settings.contact_phone}
                  </a>
                </div>
              </div>
            )}
            {(settings?.company_email || settings?.contact_email) && (
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-[#FC5100] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-900 text-sm">Email</p>
                  <a href={`mailto:${settings.company_email || settings.contact_email}`} className="text-[#00447C] hover:underline text-xs">
                    {settings.company_email || settings.contact_email}
                  </a>
                </div>
              </div>
            )}
          </div>

          {waUrl && (
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl transition-colors"
            >
              <MessageCircle className="w-5 h-5" />
              Escribirnos por WhatsApp
            </a>
          )}

          {(settings?.facebook_url || settings?.instagram_url) && (
            <div className="bg-gray-50 rounded-xl p-6">
              <p className="font-medium text-gray-900 text-sm mb-3">Seguinos</p>
              <div className="flex gap-3">
                {settings.facebook_url && (
                  <a href={settings.facebook_url} target="_blank" rel="noopener noreferrer"
                    className="w-10 h-10 rounded-full bg-[#1877F2] text-white flex items-center justify-center hover:opacity-80 transition-opacity">
                    <span className="text-sm font-bold">f</span>
                  </a>
                )}
                {settings.instagram_url && (
                  <a href={settings.instagram_url} target="_blank" rel="noopener noreferrer"
                    className="w-10 h-10 rounded-full bg-gradient-to-br from-[#f09433] via-[#e6683c] to-[#bc1888] text-white flex items-center justify-center hover:opacity-80 transition-opacity">
                    <span className="text-sm font-bold">ig</span>
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PortalContact;
