import { useState, useEffect } from 'react';
import { X, Mic } from 'lucide-react';
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon';
import { usePortalSettings } from '@/hooks/usePortalSettings';
import { useLocation, useParams } from 'react-router-dom';
import { usePublicListings } from '@/hooks/usePublicListings';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const ORBIA_AGENT_ID = 'agent_9701kkpng0eeexpbjd3vx6qq74td';

export const ContactWidget = () => {
  const { data: widgetTipo } = useQuery({
    queryKey: ['widget-tipo'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_settings')
        .select('setting_value')
        .eq('setting_key', 'widget_tipo')
        .maybeSingle();
      if (error) throw error;
      return (data?.setting_value as string) || 'whatsapp';
    },
    staleTime: 60 * 1000,
  });

  if (widgetTipo === 'orbia') {
    return <OrbiaWidget />;
  }

  return <WhatsAppWidget />;
};

/* ─── Orbia Voice Widget ─── */
const OrbiaWidget = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Load ElevenLabs widget script
    const existingScript = document.querySelector('script[src*="elevenlabs.io/convai-widget"]');
    if (!existingScript) {
      const script = document.createElement('script');
      script.src = 'https://elevenlabs.io/convai-widget/index.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  return (
    <>
      {open && (
        <div className="fixed bottom-24 right-5 z-50 animate-in slide-in-from-bottom-4 fade-in duration-200">
          <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden" style={{ width: 320, height: 400 }}>
            <button
              onClick={() => setOpen(false)}
              className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-white/80 hover:bg-gray-100 text-gray-500"
            >
              <X className="w-4 h-4" />
            </button>
            {/* @ts-ignore - custom element from ElevenLabs script */}
            <elevenlabs-convai agent-id={ORBIA_AGENT_ID} style={{ width: '100%', height: '100%' }} />
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen(v => !v)}
        className="fixed bottom-6 right-5 z-50 w-[60px] h-[60px] rounded-full text-white flex items-center justify-center transition-all duration-300 hover:scale-110 group"
        style={{
          backgroundColor: '#FF6B2C',
          boxShadow: '0 0 20px rgba(255, 107, 44, 0.5), 0 0 40px rgba(255, 107, 44, 0.2), 0 4px 15px rgba(0, 0, 0, 0.15)',
        }}
        aria-label="Hablar con Orbia"
      >
        <span className="absolute inset-0 rounded-full animate-ping opacity-20" style={{ backgroundColor: '#FF6B2C' }} />
        <span className="relative z-10 transition-transform duration-200 group-hover:rotate-12">
          {open ? <X className="w-7 h-7" /> : <Mic className="w-7 h-7" />}
        </span>
      </button>
    </>
  );
};

/* ─── WhatsApp Widget (original) ─── */
const WhatsAppWidget = () => {
  const [open, setOpen] = useState(false);
  const { settings } = usePortalSettings();
  const location = useLocation();
  const params = useParams<{ id: string }>();
  const { data: listings } = usePublicListings();

  const blocks = (settings?.blocks_config || []) as any[];
  const whatsappBlock = blocks.find((b: any) => b.id === 'whatsapp_cta');
  const phone = whatsappBlock?.config?.phone || settings?.contact_phone || settings?.company_phone;

  if (!phone) return null;

  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const fullPhone = cleanPhone.startsWith('595') ? cleanPhone : '595' + cleanPhone;

  let message = '¡Hola! Me interesa conocer más sobre sus propiedades disponibles.';
  if (location.pathname.includes('/portal/propiedades/') && params.id && listings) {
    const property = listings.find(p => p.id === params.id);
    if (property) {
      message = `Hola, vi la propiedad "${property.title}" (${property.property_code}) en su portal y me gustaría más información.`;
    }
  }

  const whatsappUrl = `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;

  return (
    <>
      {open && (
        <div className="fixed bottom-24 right-5 z-50 bg-white rounded-2xl shadow-2xl p-4 w-72 animate-in slide-in-from-bottom-4 fade-in duration-200">
          <button
            onClick={() => setOpen(false)}
            className="absolute top-2 right-2 p-1 rounded-full hover:bg-gray-100 text-gray-400"
          >
            <X className="w-4 h-4" />
          </button>
          <p className="text-sm text-gray-700 mb-3 pr-4">
            ¿Tenés alguna consulta? ¡Escribinos por WhatsApp y te respondemos al instante!
          </p>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2.5 bg-[#25D366] hover:bg-[#20BD5A] text-white font-semibold rounded-xl text-sm transition-colors"
          >
            <WhatsAppIcon className="w-4 h-4" />
            Iniciar conversación
          </a>
        </div>
      )}

      <button
        onClick={() => setOpen(v => !v)}
        className="fixed bottom-6 right-5 z-50 w-[60px] h-[60px] rounded-full bg-[#25D366] text-white flex items-center justify-center transition-all duration-300 hover:scale-110 group"
        style={{
          boxShadow: '0 0 20px rgba(37, 211, 102, 0.5), 0 0 40px rgba(37, 211, 102, 0.2), 0 4px 15px rgba(0, 0, 0, 0.15)',
        }}
        aria-label="Contactar por WhatsApp"
      >
        <span className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-20" />
        <span className="relative z-10 transition-transform duration-200 group-hover:rotate-12">
          {open ? <X className="w-7 h-7" /> : <WhatsAppIcon className="w-7 h-7" />}
        </span>
      </button>
    </>
  );
};
