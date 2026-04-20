import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "superadmin" | "admin" | "agent" | "accounting" | "secretaria";

interface ProtectedRouteProps {
  children: React.ReactNode;
  denyRoles?: AppRole[];
}

export const ProtectedRoute = ({ children, denyRoles }: ProtectedRouteProps) => {
  const { user, role, loading } = useAuth();

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ["system-suspended"],
    queryFn: async () => {
      const { data, error } = await supabase.from("portal_settings").select("system_suspended").limit(1).single();
      if (error) return { system_suspended: false };
      return data as unknown as { system_suspended: boolean };
    },
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  if (loading || settingsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (settings?.system_suspended) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#202124",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "3rem 2rem",
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
              <path d="M23 34 Q32 28 41 34" strokeLinecap="round" />
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
            <strong style={{ color: "#bdc1c6" }}>pluspy.app</strong> tardó demasiado en responder.
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
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (denyRoles && denyRoles.length > 0) {
    if (role === null) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Verificando permisos...</p>
          </div>
        </div>
      );
    }
    if (denyRoles.includes(role)) {
      return <Navigate to="/acceso-denegado" replace />;
    }
  }

  return <>{children}</>;
};
