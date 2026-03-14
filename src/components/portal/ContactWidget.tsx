import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon';
import { usePortalSettings } from '@/hooks/usePortalSettings';
import { useLocation, useParams } from 'react-router-dom';
import { usePublicListings } from '@/hooks/usePublicListings';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useConversation } from '@elevenlabs/react';

import { useVoiceWidgetConfig } from '@/hooks/useVoiceWidgetConfig';
import { useIsMobile } from '@/hooks/use-mobile';

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

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      elevenlabs-convai, [class*="elevenlabs"], .elevenlabs-widget,
      div[data-elevenlabs], iframe[src*="elevenlabs"] {
        display: none !important;
        visibility: hidden !important;
        pointer-events: none !important;
        width: 0 !important;
        height: 0 !important;
        position: absolute !important;
        overflow: hidden !important;
      }
    `;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);

  if (widgetTipo === 'orbia') {
    return <OrbiaWidget />;
  }

  return <WhatsAppWidget />;
};

/* ─── Audio Bars Animation ─── */
const AudioBars = ({ active }: { active: boolean }) => (
  <div className="flex items-end gap-[3px] h-8 justify-center">
    {[0, 1, 2].map(i => (
      <div
        key={i}
        className="w-[4px] rounded-full transition-all duration-150"
        style={{
          backgroundColor: '#FF6B2C',
          height: active ? undefined : '8px',
          animation: active ? `audioBounce 0.8s ease-in-out ${i * 0.15}s infinite alternate` : 'none',
        }}
      />
    ))}
    <style>{`
      @keyframes audioBounce {
        0% { height: 8px; }
        100% { height: 28px; }
      }
    `}</style>
  </div>
);

/* ─── Orbia Voice Widget (Valentina) ─── */
const OrbiaWidget = () => {
  const [panelOpen, setPanelOpen] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(80);
  const streamRef = useRef<MediaStream | null>(null);
  const { config } = useVoiceWidgetConfig();
  const isMobile = useIsMobile();

  const conversation = useConversation({
    onConnect: () => console.log('[Valentina] Connected'),
    onDisconnect: () => {
      console.log('[Valentina] Disconnected');
    },
    onError: (err) => console.error('[Valentina] Error:', err),
  });

  const isConnected = conversation.status === 'connected';
  const isSpeaking = isConnected && conversation.isSpeaking;

  // Auto-connect when panel opens
  const openPanel = useCallback(async () => {
    setPanelOpen(true);
    if (conversation.status !== 'connected') {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        await (conversation as any).startSession({ agentId: ORBIA_AGENT_ID });
      } catch (e) {
        console.error('[Valentina] Failed to start:', e);
      }
    }
  }, [conversation]);

  const closePanel = useCallback(async () => {
    setPanelOpen(false);
    if (conversation.status === 'connected') {
      await conversation.endSession();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, [conversation]);

  // Volume control
  useEffect(() => {
    if (isConnected) {
      conversation.setVolume({ volume: volume / 100 });
    }
  }, [volume, isConnected, conversation]);

  // Mute control
  useEffect(() => {
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach(t => { t.enabled = !muted; });
    }
  }, [muted]);

  return (
    <>
      {/* Expanded Panel */}
      <div
        className="fixed bottom-[100px] right-6 z-50 w-[320px] rounded-2xl overflow-hidden transition-all duration-300 ease-in-out"
        style={{
          boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
          opacity: panelOpen ? 1 : 0,
          transform: panelOpen ? 'translateY(0) scale(1)' : 'translateY(16px) scale(0.95)',
          pointerEvents: panelOpen ? 'auto' : 'none',
        }}
      >
        {/* Header */}
        <div className="relative px-4 py-3 flex items-center gap-3" style={{ backgroundColor: config.header_color }}>
          <img
            src={config.assistant_photo_url}
            alt={config.assistant_name}
            className="w-14 h-14 rounded-full object-cover border-2 border-white/40 shrink-0"
          />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-white text-[15px] leading-tight">{config.assistant_name}</p>
            <p className="text-white/80 text-xs leading-tight">Asistente virtual · Plusterra</p>
            <span className="inline-flex items-center gap-1 mt-1 text-[11px] text-white/90">
              <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
              En línea ahora
            </span>
          </div>
          <button
            onClick={closePanel}
            className="absolute top-2 right-2 p-1.5 rounded-full hover:bg-white/20 text-white/90 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Conversation Area */}
        <div className="flex flex-col items-center justify-center py-8 px-4 min-h-[140px]" style={{ backgroundColor: '#F8F8F8' }}>
          {!isConnected && (
            <p className="text-sm text-center px-2 mb-3" style={{ color: '#555' }}>{config.welcome_message}</p>
          )}
          <AudioBars active={isSpeaking} />
          <p className="mt-3 text-sm font-medium" style={{ color: '#555' }}>
            {!isConnected ? 'Conectando…' : isSpeaking ? 'Hablando…' : 'Escuchando…'}
          </p>
        </div>

        {/* Controls */}
        <div className="bg-white px-4 py-4 flex flex-col gap-3">
          {/* Volume slider */}
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 shrink-0" style={{ color: '#888' }} />
            <input
              type="range"
              min={0}
              max={100}
              value={volume}
              onChange={e => setVolume(Number(e.target.value))}
              className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #FF6B2C ${volume}%, #e0e0e0 ${volume}%)`,
              }}
            />
            <span className="text-xs w-8 text-right" style={{ color: '#888' }}>{volume}%</span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-center gap-4">
            {/* Mute toggle */}
            <button
              onClick={() => setMuted(m => !m)}
              className="w-11 h-11 rounded-full flex items-center justify-center transition-colors"
              style={{
                backgroundColor: muted ? '#fee2e2' : '#f3f4f6',
                color: muted ? '#ef4444' : '#555',
              }}
              aria-label={muted ? 'Activar micrófono' : 'Silenciar micrófono'}
            >
              {muted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            {/* End call */}
            <button
              onClick={closePanel}
              className="w-12 h-12 rounded-full flex items-center justify-center text-white transition-colors hover:brightness-110"
              style={{ backgroundColor: '#ef4444' }}
              aria-label="Terminar llamada"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Floating Avatar Button */}
      {!panelOpen && (
        <button
          onClick={openPanel}
          className="fixed bottom-6 right-6 z-50 flex flex-col items-center gap-1 transition-transform duration-300 hover:scale-105 group"
          aria-label={config.button_text}
        >
          <div
            className="w-16 h-16 rounded-full overflow-hidden"
            style={{
              border: `3px solid ${config.border_color}`,
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            }}
          >
            <img
              src={config.assistant_photo_url}
              alt={config.assistant_name}
              className="w-full h-full object-cover"
            />
          </div>
          {/* Online dot */}
          <span
            className="absolute top-0 right-0 w-4 h-4 rounded-full border-2 border-white"
            style={{ backgroundColor: '#22c55e' }}
          />
          <span className="text-[11px] font-medium text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)] max-w-[100px] text-center leading-tight">
            {config.button_text}
          </span>
        </button>
      )}
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
