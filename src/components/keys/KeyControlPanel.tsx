/**
 * KeyControlPanel — Panel de control de llaves para la ficha de propiedad.
 * Lógica guiada por key_location (estado base) + key_movements (movimientos reales).
 * Incluye checklist visual "Antes de mostrar esta propiedad".
 */
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useKeyStatus } from '@/hooks/useKeyMovements';
import { KeyStatusBadge } from './KeyStatusBadge';
import { KeyQRDialog } from './KeyQRDialog';
import { KeyHistoryDialog } from './KeyHistoryDialog';
import { ExternalKeyDialog } from './ExternalKeyDialog';
import { KeyReturnDialog } from './KeyReturnDialog';
import { Key, QrCode, History, Users, Wrench, ArrowDownCircle, Loader2, Home, MessageCircle, ShieldOff, CheckCircle2, XCircle, ClipboardList } from 'lucide-react';

/* ── Checklist definitions per key_location ── */
interface CheckStep {
  label: string;
  type: 'check' | 'block';
}

const checklistByLocation: Record<string, { steps: CheckStep[]; guide?: string }> = {
  office: {
    steps: [
      { label: 'Coordinar visita', type: 'check' },
      { label: 'Retirar llave de oficina', type: 'check' },
      { label: 'Registrar salida de llave', type: 'check' },
      { label: 'Realizar visita', type: 'check' },
      { label: 'Devolver llave a oficina', type: 'check' },
    ],
  },
  owner: {
    steps: [
      { label: 'No retirar llave de oficina', type: 'block' },
      { label: 'Contactar captador', type: 'check' },
      { label: 'Coordinar con propietario', type: 'check' },
      { label: 'Registrar visita', type: 'check' },
    ],
    guide: 'Esta propiedad no tiene llaves en oficina.',
  },
  agent: {
    steps: [
      { label: 'Contactar captador', type: 'check' },
      { label: 'Coordinar entrega de llave', type: 'check' },
      { label: 'Registrar visita', type: 'check' },
    ],
  },
  not_managed: {
    steps: [
      { label: 'No administrar llaves', type: 'block' },
      { label: 'Coordinar vía captador', type: 'check' },
    ],
  },
};

/* ── Component ── */
interface KeyControlPanelProps {
  property: {
    id: string;
    title: string;
    property_code?: string;
    key_location?: string;
    captor_phone?: string;
    captor_name?: string;
  };
}

export const KeyControlPanel = ({ property }: KeyControlPanelProps) => {
  const { role } = useAuth();
  const keyLoc = property.key_location || 'office';

  const shouldTrackMovements = keyLoc === 'office';
  const { data: keyStatus, isLoading } = useKeyStatus(shouldTrackMovements ? property.id : null);

  const [showQR, setShowQR] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showExternal, setShowExternal] = useState(false);
  const [showMaintenance, setShowMaintenance] = useState(false);
  const [showReturn, setShowReturn] = useState(false);

  const canManage = role === 'admin' || role === 'superadmin' || role === 'secretaria' || role === 'accounting';
  const isPrivilegedRole = canManage;
  const isAgent = role === 'agent';
  const isOut = keyStatus && keyStatus.status !== 'EN_OFICINA';

  const checklist = checklistByLocation[keyLoc] || checklistByLocation.office;

  /* WhatsApp CTA builder — always to the captor */
  const buildCaptorWhatsApp = (contextMsg: string) => {
    if (!property.captor_phone) return null;
    const phone = property.captor_phone.replace(/\D/g, '');
    const text = encodeURIComponent(
      `Hola ${property.captor_name || ''}, ${contextMsg} — Propiedad: "${property.title}".`
    );
    return `https://wa.me/${phone}?text=${text}`;
  };

  const captorLink =
    keyLoc === 'owner'
      ? buildCaptorWhatsApp('necesito coordinar el acceso. La llave está con el propietario')
      : keyLoc === 'agent'
        ? buildCaptorWhatsApp('necesito la llave de la propiedad')
        : keyLoc === 'not_managed'
          ? buildCaptorWhatsApp('necesito coordinar una visita')
          : null;

  const ctaLabel: Record<string, string> = {
    office: 'Retirar llave',
    owner: 'Contactar captador',
    agent: 'Contactar captador',
    not_managed: 'Contactar captador',
  };

  return (
    <div className="border-t border-border pt-4 mt-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Key className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Control de Llaves</h3>
      </div>

      {/* ===== Status badges ===== */}
      {keyLoc === 'not_managed' && (
        <div className="flex items-start gap-3 p-3 rounded-xl border border-border bg-muted/50">
          <ShieldOff className="w-4 h-4 text-muted-foreground mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">No administramos llaves</p>
            <p className="text-xs text-muted-foreground mt-0.5">Esta propiedad no tiene llave gestionada por Plusterra.</p>
          </div>
        </div>
      )}

      {keyLoc === 'owner' && (
        <div className="flex items-start gap-3 p-3 rounded-xl border border-primary/20 bg-primary/5">
          <Home className="w-4 h-4 text-primary mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-primary">🏠 Llave en poder del Propietario</p>
            {isAgent ? (
              <p className="text-xs text-muted-foreground mt-1">Para coordinar acceso, contactá al captador de esta propiedad.</p>
            ) : (
              <p className="text-xs text-muted-foreground mt-1">La llave se encuentra con el propietario. Coordinar retiro si es necesario.</p>
            )}
          </div>
        </div>
      )}

      {keyLoc === 'agent' && (
        <div className="flex items-start gap-3 p-3 rounded-xl border border-warning/20 bg-warning/5">
          <Key className="w-4 h-4 text-warning mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-warning">🔑 Llave en poder del Captador</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {property.captor_name ? `Captador: ${property.captor_name}` : 'Coordinar con el agente captador.'}
            </p>
          </div>
        </div>
      )}

      {keyLoc === 'office' && (
        <>
          {isLoading ? (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-muted">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Cargando estado...</span>
            </div>
          ) : keyStatus ? (
            <KeyStatusBadge
              status={keyStatus.status}
              responsibleName={isPrivilegedRole ? keyStatus.responsibleName : undefined}
              since={keyStatus.since}
              phone={isPrivilegedRole && (keyStatus.status === 'EN_PROPIETARIO' || keyStatus.status === 'EN_ENCARGADO') ? keyStatus.lastMovement?.external_phone : undefined}
              showWhatsApp={isPrivilegedRole && (keyStatus.status === 'EN_PROPIETARIO' || keyStatus.status === 'EN_ENCARGADO')}
            />
          ) : null}
        </>
      )}

      {/* ===== CHECKLIST: "Antes de mostrar esta propiedad" ===== */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2.5 bg-muted/60 border-b border-border">
          <ClipboardList className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-semibold text-foreground">Antes de mostrar esta propiedad</span>
        </div>

        <div className="px-3 py-2.5 space-y-1.5">
          {checklist.steps.map((step, i) => (
            <div key={i} className="flex items-center gap-2">
              {step.type === 'check' ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-success flex-shrink-0" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-destructive flex-shrink-0" />
              )}
              <span className={`text-xs ${step.type === 'block' ? 'text-destructive font-medium' : 'text-foreground'}`}>
                {step.label}
              </span>
            </div>
          ))}
        </div>

        {checklist.guide && (
          <div className="px-3 pb-2.5">
            <p className="text-[11px] text-muted-foreground italic leading-tight">{checklist.guide}</p>
          </div>
        )}

        {/* CTA */}
        <div className="px-3 pb-3 pt-1">
          {keyLoc === 'office' ? (
            // For office: the "Retirar llave" is handled by the existing key withdrawal flow (QR scan page)
            <a
              href="/retiro-llave"
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
            >
              <Key className="w-3.5 h-3.5" /> {ctaLabel[keyLoc]}
            </a>
          ) : captorLink ? (
            <a
              href={captorLink}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[hsl(142,70%,45%)] text-white text-xs font-medium hover:bg-[hsl(142,70%,40%)] transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" /> {ctaLabel[keyLoc]}
            </a>
          ) : (
            <div className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-muted text-muted-foreground text-xs font-medium cursor-not-allowed">
              <MessageCircle className="w-3.5 h-3.5" /> Sin teléfono del captador
            </div>
          )}
        </div>
      </div>

      {/* ===== Office: management actions (admin only) ===== */}
      {keyLoc === 'office' && canManage && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <button onClick={() => setShowQR(true)}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors">
              <QrCode className="w-3.5 h-3.5 text-primary" /> Ver QR
            </button>
            <button onClick={() => setShowHistory(true)}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors">
              <History className="w-3.5 h-3.5 text-muted-foreground" /> Historial
            </button>
          </div>

          {!isOut && (
            <div className="flex gap-2">
              <button onClick={() => setShowExternal(true)}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-muted text-xs font-medium hover:bg-muted/80 transition-colors">
                <Users className="w-3.5 h-3.5" /> Tercero
              </button>
              <button onClick={() => setShowMaintenance(true)}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-muted text-xs font-medium hover:bg-muted/80 transition-colors">
                <Wrench className="w-3.5 h-3.5" /> Mantenimiento
              </button>
            </div>
          )}

          {isOut && keyStatus && (
            <button onClick={() => setShowReturn(true)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-success/10 text-success border border-success/20 text-xs font-medium hover:bg-success/20 transition-colors">
              <ArrowDownCircle className="w-3.5 h-3.5" /> Registrar Devolución
            </button>
          )}
        </div>
      )}

      {/* ===== Dialogs (office only) ===== */}
      {keyLoc === 'office' && (
        <>
          <KeyQRDialog open={showQR} onOpenChange={setShowQR} property={property} />
          <KeyHistoryDialog open={showHistory} onOpenChange={setShowHistory} propertyId={property.id} propertyTitle={property.title} />
          <ExternalKeyDialog open={showExternal} onOpenChange={setShowExternal} propertyId={property.id} propertyTitle={property.title} defaultType="AGENTE_EXTERNO" />
          <ExternalKeyDialog open={showMaintenance} onOpenChange={setShowMaintenance} propertyId={property.id} propertyTitle={property.title} defaultType="MANTENIMIENTO" />
          {keyStatus && isOut && (
            <KeyReturnDialog open={showReturn} onOpenChange={setShowReturn} propertyId={property.id} propertyTitle={property.title} currentStatus={keyStatus} />
          )}
        </>
      )}
    </div>
  );
};
