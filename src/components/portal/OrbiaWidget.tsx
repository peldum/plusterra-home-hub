import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { X, Mic, MicOff, Volume2 } from 'lucide-react';
import { useConversation } from '@elevenlabs/react';
import { useVoiceWidgetConfig } from '@/hooks/useVoiceWidgetConfig';
import { useIsMobile } from '@/hooks/use-mobile';

const ORBIA_AGENT_ID = 'agent_9701kkpng0eeexpbjd3vx6qq74td';

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

const OrbiaWidget = () => {
  const [panelOpen, setPanelOpen] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(80);
  const streamRef = useRef<MediaStream | null>(null);
  const { config } = useVoiceWidgetConfig();
  const isMobile = useIsMobile();

  const onConnect = useCallback(() => console.log('[Valentina] Connected'), []);
  const onDisconnect = useCallback(() => console.log('[Valentina] Disconnected'), []);
  const onError = useCallback((err: any) => console.error('[Valentina] Error:', err), []);

  const conversationOptions = useMemo(() => ({
    onConnect,
    onDisconnect,
    onError,
  }), [onConnect, onDisconnect, onError]);

  const conversation = useConversation(conversationOptions);

  const conversationRef = useRef(conversation);
  conversationRef.current = conversation;

  const isConnected = conversation.status === 'connected';
  const isSpeaking = isConnected && conversation.isSpeaking;

  const openPanel = useCallback(async () => {
    setPanelOpen(true);
    if (conversationRef.current.status !== 'connected') {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        await (conversationRef.current as any).startSession({ agentId: ORBIA_AGENT_ID });
      } catch (e) {
        console.error('[Valentina] Failed to start:', e);
      }
    }
  }, []);

  const closePanel = useCallback(async () => {
    setPanelOpen(false);
    try {
      if (conversationRef.current.status === 'connected') {
        await conversationRef.current.endSession();
      }
    } catch (e) {
      console.error('[Valentina] Failed to close:', e);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  // Direct volume change handler (no reactive useEffect → no loop)
  const handleVolumeChange = useCallback((newVolume: number) => {
    setVolume(newVolume);
    try {
      if (conversationRef.current.status === 'connected') {
        conversationRef.current.setVolume({ volume: newVolume / 100 });
      }
    } catch (e) {
      console.error('[Valentina] Volume error:', e);
    }
  }, []);

  // Mute control — only side effect on mic stream, doesn't touch SDK state
  useEffect(() => {
    try {
      if (streamRef.current) {
        streamRef.current.getAudioTracks().forEach(t => { t.enabled = !muted; });
      }
    } catch (e) {
      console.error('[Valentina] Mute toggle error:', e);
    }
  }, [muted]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      try {
        if (conversationRef.current.status === 'connected') {
          conversationRef.current.endSession();
        }
      } catch {}
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    };
  }, []);

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

        <div className="flex flex-col items-center justify-center py-8 px-4 min-h-[140px]" style={{ backgroundColor: '#F8F8F8' }}>
          {!isConnected && (
            <p className="text-sm text-center px-2 mb-3" style={{ color: '#555' }}>{config.welcome_message}</p>
          )}
          <AudioBars active={isSpeaking} />
          <p className="mt-3 text-sm font-medium" style={{ color: '#555' }}>
            {!isConnected ? 'Conectando…' : isSpeaking ? 'Hablando…' : 'Escuchando…'}
          </p>
        </div>

        <div className="bg-white px-4 py-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 shrink-0" style={{ color: '#888' }} />
            <input
              type="range"
              min={0}
              max={100}
              value={volume}
              onChange={e => handleVolumeChange(Number(e.target.value))}
              className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #FF6B2C ${volume}%, #e0e0e0 ${volume}%)`,
              }}
            />
            <span className="text-xs w-8 text-right" style={{ color: '#888' }}>{volume}%</span>
          </div>

          <div className="flex items-center justify-center gap-4">
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
          className="fixed z-50 flex flex-col items-center gap-1 transition-transform duration-300 hover:scale-105 group"
          style={{
            bottom: isMobile ? 16 : 24,
            right: isMobile ? 16 : 24,
          }}
          aria-label={config.button_text}
        >
          <div
            className="rounded-full overflow-hidden"
            style={{
              width: isMobile ? 56 : 64,
              height: isMobile ? 56 : 64,
              border: `3px solid ${isMobile ? '#FF6B2C' : config.border_color}`,
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            }}
          >
            <img
              src={config.assistant_photo_url}
              alt={config.assistant_name}
              className="w-full h-full object-cover"
            />
          </div>
          <span
            className="absolute top-0 right-0 w-4 h-4 rounded-full border-2 border-white"
            style={{ backgroundColor: '#22c55e' }}
          />
          <span
            className="font-medium max-w-[100px] text-center leading-tight"
            style={{
              fontSize: isMobile ? 10 : 11,
              color: isMobile ? '#FF6B2C' : '#4B5563',
              textShadow: isMobile ? 'none' : '0 1px 3px rgba(0,0,0,0.6)',
            }}
          >
            {config.button_text}
          </span>
        </button>
      )}
    </>
  );
};

export default OrbiaWidget;