/**
 * KeyWithdrawalPage — Página de confirmación de retiro de llave para agentes internos.
 * Se accede via QR: /retiro-llave?property=<property_id>
 * Requiere sesión activa. Si está MOROSO, se bloquea.
 */
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAgentSoftLock } from '@/hooks/useAgentSoftLock';
import { useKeyStatus, useRegisterKeyRetiro } from '@/hooks/useKeyMovements';
import { KeyStatusBadge } from '@/components/keys/KeyStatusBadge';
import { supabase } from '@/integrations/supabase/client';
import { Key, Lock, CheckCircle2, ArrowLeft, Building2, Loader2, AlertTriangle } from 'lucide-react';
import logoVertical from '@/assets/logo-plusterra-vertical.png';

export default function KeyWithdrawalPage() {
  const [searchParams] = useSearchParams();
  const propertyId = searchParams.get('property');
  const navigate = useNavigate();
  const { user, profile, role, loading: authLoading } = useAuth();
  const { isLocked, isLoading: lockLoading } = useAgentSoftLock();
  const { data: keyStatus, isLoading: statusLoading, isError: statusError } = useKeyStatus(propertyId);
  const registerRetiro = useRegisterKeyRetiro();

  const [property, setProperty] = useState<{ title: string; property_code: string; address?: string } | null>(null);
  const [loadingProperty, setLoadingProperty] = useState(true);
  const [confirmed, setConfirmed] = useState(false);

  // Fetch property info
  useEffect(() => {
    if (!propertyId || !user) return;
    setLoadingProperty(true);
    const load = async () => {
      try {
        const { data } = await supabase
          .from('properties')
          .select('title, property_code, address, neighborhood, city')
          .eq('id', propertyId)
          .single();
        if (data) setProperty({
          title: data.title,
          property_code: data.property_code,
          address: [data.address, data.neighborhood, data.city].filter(Boolean).join(', '),
        });
      } finally {
        setLoadingProperty(false);
      }
    };
    load();
  }, [propertyId, user]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate(`/login?redirect=/retiro-llave?property=${propertyId}`, { replace: true });
    }
  }, [authLoading, user, navigate, propertyId]);

  const isAgent = role === 'agent';
  const isLoading = authLoading || lockLoading || (statusLoading && !statusError) || loadingProperty;
  const isKeyAlreadyOut = keyStatus && keyStatus.status !== 'EN_OFICINA';

  const handleConfirm = async () => {
    if (!propertyId) return;
    await registerRetiro.mutateAsync({ propertyId });
    setConfirmed(true);
  };

  // ─── Loading ───────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Verificando acceso...</p>
        </div>
      </div>
    );
  }

  // ─── Error: No property ─────────────────────────────────────────
  if (!propertyId || !property) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-sm">
          <AlertTriangle className="w-12 h-12 text-destructive mx-auto" />
          <h1 className="text-xl font-bold">Propiedad no encontrada</h1>
          <p className="text-sm text-muted-foreground">El QR escaneado no corresponde a ninguna propiedad activa.</p>
          <button onClick={() => navigate('/')} className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm">
            Ir al inicio
          </button>
        </div>
      </div>
    );
  }

  // ─── Not an agent ───────────────────────────────────────────────
  if (!isAgent) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-sm">
          <Lock className="w-12 h-12 text-muted-foreground mx-auto" />
          <h1 className="text-xl font-bold">Acceso no permitido</h1>
          <p className="text-sm text-muted-foreground">Esta función es exclusiva para agentes internos autenticados.</p>
          <button onClick={() => navigate('/')} className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm">
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  // ─── MOROSO ────────────────────────────────────────────────────
  if (isLocked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-sm w-full text-center space-y-4">
          <img src={logoVertical} alt="Logo" className="h-14 mx-auto opacity-60" />
          <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20">
            <Lock className="w-10 h-10 text-destructive mx-auto mb-3" />
            <h1 className="text-lg font-bold text-destructive">Acción bloqueada</h1>
            <p className="text-sm text-destructive/80 mt-2">
              No puede retirar llaves por canon mensual impago.
              Regularice su cuenta para continuar.
            </p>
          </div>
          <button onClick={() => navigate('/')}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-muted text-muted-foreground text-sm">
            <ArrowLeft className="w-4 h-4" /> Volver al panel
          </button>
        </div>
      </div>
    );
  }

  // ─── SUCCESS ───────────────────────────────────────────────────
  if (confirmed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-sm w-full text-center space-y-4">
          <div className="p-6 rounded-2xl bg-success/10 border border-success/20">
            <CheckCircle2 className="w-14 h-14 text-success mx-auto mb-3" />
            <h1 className="text-xl font-bold text-success">¡Retiro registrado!</h1>
            <p className="text-sm text-foreground mt-2 font-medium">{property.title}</p>
            <p className="text-xs text-muted-foreground mt-1">{property.property_code}</p>
            <div className="mt-4 p-3 rounded-xl bg-background border border-border text-left">
              <p className="text-xs text-muted-foreground">Agente</p>
              <p className="text-sm font-medium">{profile?.full_name}</p>
              <p className="text-xs text-muted-foreground mt-2">Fecha y hora</p>
              <p className="text-sm font-medium">{new Date().toLocaleString('es-PY')}</p>
            </div>
          </div>
          <button onClick={() => navigate('/')}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium">
            <ArrowLeft className="w-4 h-4" /> Volver al panel
          </button>
        </div>
      </div>
    );
  }

  // ─── MAIN CONFIRMATION ─────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-sm w-full space-y-4">
        {/* Header */}
        <div className="text-center">
          <img src={logoVertical} alt="Logo" className="h-12 mx-auto mb-3 opacity-70" />
          <h1 className="text-lg font-bold text-foreground flex items-center justify-center gap-2">
            <Key className="w-5 h-5 text-primary" />
            Retiro de Llave
          </h1>
        </div>

        {/* Property card */}
        <div className="p-4 rounded-2xl border border-border bg-card space-y-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Propiedad</p>
              <p className="font-semibold text-foreground truncate">{property.title}</p>
              <p className="text-xs font-mono text-muted-foreground">{property.property_code}</p>
              {property.address && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{property.address}</p>
              )}
            </div>
          </div>

          {/* Current key status */}
          {keyStatus && (
            <KeyStatusBadge
              status={keyStatus.status}
              responsibleName={keyStatus.responsibleName}
              since={keyStatus.since}
            />
          )}
        </div>

        {/* Agent info */}
        <div className="p-4 rounded-2xl border border-border bg-card">
          <p className="text-xs text-muted-foreground mb-1">Agente solicitante</p>
          <p className="font-semibold text-foreground">{profile?.full_name}</p>
          <p className="text-xs text-muted-foreground mt-2">Fecha y hora de retiro</p>
          <p className="text-sm font-medium text-foreground">{new Date().toLocaleString('es-PY')}</p>
        </div>

        {/* Key already out warning */}
        {isKeyAlreadyOut && (
          <div className="p-3 rounded-xl bg-warning/10 border border-warning/20 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
            <p className="text-xs text-warning">
              Esta llave no está en oficina actualmente. Consulte con Secretaría antes de proceder.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-2">
          <button
            onClick={handleConfirm}
            disabled={registerRetiro.isPending}
            className="w-full flex items-center justify-center gap-2 px-4 py-4 rounded-2xl bg-primary text-primary-foreground font-semibold text-base hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {registerRetiro.isPending
              ? <><Loader2 className="w-5 h-5 animate-spin" /> Registrando...</>
              : <><Key className="w-5 h-5" /> CONFIRMAR RETIRO</>
            }
          </button>
          <button onClick={() => navigate('/')}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border text-sm text-muted-foreground hover:bg-muted transition-colors">
            <ArrowLeft className="w-4 h-4" /> Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
