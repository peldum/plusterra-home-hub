import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  whatsapp?: string;
  systemSuspended?: boolean;
}

export const PortalMaintenancePage = ({ whatsapp, systemSuspended }: Props) => {
  const { data: settings } = useQuery({
    queryKey: ["portal-maintenance-logo"],
    queryFn: async () => {
      const { data, error } = await supabase.from("portal_settings").select("logo_url_webp").limit(1).single();
      if (error) throw error;
      return data as { logo_url_webp: string | null };
    },
    staleTime: 5 * 60 * 1000,
  });

  if (systemSuspended) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#202124",
          display: "flex",
          alignItems: "center",
          padding: "3rem 2rem",
          justifyContent: "center",
        }}
      >
        <div style={{ maxWidth: 520 }}>
          <div style={{ marginBottom: "1.5rem" }}>
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none" stroke="#5f6368" strokeWidth="2">
              <rect x="4" y="8" width="56" height="38" rx="4" />
              <line x1="20" y1="58" x2="44" y2="58" />
              <line x1="32" y1="46" x2="32" y2="58" />
              <line x1="23" y1="24" x2="23" y2="24" strokeWidth="4" strokeLinecap="round" />
              <line x1="41" y1="24" x2="41" y2="24" strokeWidth="4" strokeLinecap="round" />
              <path d="M22 36 Q32 28 42 36" strokeLinecap="round" />
            </svg>
          </div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 400,
              color: "#e8eaed",
              margin: "0 0 1rem",
              lineHeight: 1.4,
              fontFamily: "sans-serif",
            }}
          >
            Este sitio no puede ser alcanzado
          </h1>
          <p
            style={{ fontSize: 15, color: "#9aa0a6", margin: "0 0 0.5rem", lineHeight: 1.6, fontFamily: "sans-serif" }}
          >
            <strong style={{ color: "#bdc1c6" }}>plusterra.com.py</strong> tardó demasiado en responder.
          </p>
          <p style={{ fontSize: 14, color: "#9aa0a6", margin: "0 0 2rem", lineHeight: 1.6, fontFamily: "sans-serif" }}>
            Intentá ejecutar el diagnóstico de red de Windows.
          </p>
          <p
            style={{
              fontSize: 12,
              color: "#5f6368",
              fontFamily: "monospace",
              margin: "0 0 2rem",
              letterSpacing: "0.03em",
            }}
          >
            ERR_CONNECTION_TIMED_OUT
          </p>
          <div style={{ display: "flex", gap: 12 }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: "#303134",
                border: "none",
                color: "#8ab4f8",
                padding: "8px 18px",
                borderRadius: 4,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              Volver a cargar
            </button>
          </div>
        </div>
      </div>
    );
  }

  const waLink = whatsapp
    ? `https://wa.me/${whatsapp.replace(/[^0-9]/g, "")}?text=${encodeURIComponent("Hola, tengo una consulta sobre propiedades.")}`
    : null;

  return (
    <div className="min-h-screen bg-[#00447C] flex flex-col items-center justify-center relative overflow-hidden px-4">
      <div className="relative z-10 text-center max-w-lg">
        <div className="mx-auto mb-8">
          {settings?.logo_url_webp ? (
            <img src={settings.logo_url_webp} alt="Logo" className="h-20 mx-auto object-contain" />
          ) : (
            <div className="w-20 h-20 mx-auto rounded-2xl bg-[#FC5100] flex items-center justify-center">
              <span className="text-white font-black text-2xl tracking-tight">P+</span>
            </div>
          )}
        </div>
        <h1 className="text-white text-3xl sm:text-4xl font-bold tracking-tight mb-3">Sitio en Mantenimiento</h1>
        <p className="text-white/70 text-base sm:text-lg leading-relaxed mb-10">
          Estamos trabajando para ofrecerte una mejor experiencia.
          <br />
          Volveremos muy pronto.
        </p>
        {waLink && (
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-[#25D366] hover:bg-[#20BD5A] text-white font-bold text-lg transition-all"
          >
            Escribinos por WhatsApp
          </a>
        )}
        <p className="text-white/30 text-xs mt-16">© {new Date().getFullYear()} Plusterra Inmobiliaria</p>
      </div>
    </div>
  );
};
