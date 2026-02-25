/**
 * KeyControlPanel — Panel de control de llaves para la ficha de propiedad.
 * Lógica guiada por key_location (estado base) + key_movements (movimientos reales).
 */
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useKeyStatus } from '@/hooks/useKeyMovements';
import { KeyStatusBadge } from './KeyStatusBadge';
import { KeyQRDialog } from './KeyQRDialog';
import { KeyHistoryDialog } from './KeyHistoryDialog';
import { ExternalKeyDialog } from './ExternalKeyDialog';
import { KeyReturnDialog } from './KeyReturnDialog';
import { Key, QrCode, History, Users, Wrench, ArrowDownCircle, Loader2, Home, UserCog, MessageCircle, ShieldOff } from 'lucide-react';

interface KeyControlPanelProps {
  property: { id: string; title: string; property_code?: string; key_location?: string; captor_phone?: string; captor_name?: string };
}

export const KeyControlPanel = ({ property }: KeyControlPanelProps) => {
  const { role } = useAuth();
  const keyLoc = property.key_location || 'office';

  // Only fetch movement-based status when key is managed from office
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

  return (
    <div className="border-t border-border pt-4 mt-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Key className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Control de Llaves</h3>
      </div>

      {/* ===== NOT MANAGED ===== */}
      {keyLoc === 'not_managed' && (
        <div className="flex items-start gap-3 p-3 rounded-xl border border-border bg-muted/50">
          <ShieldOff className="w-4 h-4 text-muted-foreground mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">No administramos llaves</p>
            <p className="text-xs text-muted-foreground mt-0.5">Esta propiedad no tiene llave gestionada por Plusterra.</p>
          </div>
        </div>
      )}

      {/* ===== OWNER ===== */}
      {keyLoc === 'owner' && (
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 rounded-xl border border-primary/20 bg-primary/5">
            <Home className="w-4 h-4 text-primary mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-primary">🏠 Llave en poder del Propietario</p>
              {isAgent ? (
                <p className="text-xs text-muted-foreground mt-1">
                  Para coordinar acceso, contactá al captador de esta propiedad.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground mt-1">
                  La llave se encuentra con el propietario. Coordinar retiro si es necesario.
                </p>
              )}
            </div>
          </div>
          {/* CTA: Contact captor via WhatsApp */}
          {property.captor_phone && (
            <a
              href={`https://wa.me/${property.captor_phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola ${property.captor_name || ''}, necesito coordinar el acceso a la propiedad "${property.title}". La llave está con el propietario.`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[hsl(142,70%,45%)] text-white text-xs font-medium hover:bg-[hsl(142,70%,40%)] transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" /> Coordinar con captador
            </a>
          )}
        </div>
      )}

      {/* ===== AGENT (captor has key) ===== */}
      {keyLoc === 'agent' && (
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 rounded-xl border border-warning/20 bg-warning/5">
            <Key className="w-4 h-4 text-warning mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-warning">🔑 Llave en poder del Captador</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {property.captor_name ? `Captador: ${property.captor_name}` : 'Coordinar con el agente captador.'}
              </p>
            </div>
          </div>
          {property.captor_phone && (
            <a
              href={`https://wa.me/${property.captor_phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola ${property.captor_name || ''}, necesito la llave de la propiedad "${property.title}".`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[hsl(142,70%,45%)] text-white text-xs font-medium hover:bg-[hsl(142,70%,40%)] transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" /> Contactar captador
            </a>
          )}
        </div>
      )}

      {/* ===== OFFICE (full movement tracking) ===== */}
      {keyLoc === 'office' && (
        <>
          {/* Key status from movements */}
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

          {/* Action buttons - only for privileged roles */}
          {canManage && (
            <div className="mt-3 space-y-2">
              {/* QR + History row */}
              <div className="flex gap-2">
                <button
                  onClick={() => setShowQR(true)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors"
                >
                  <QrCode className="w-3.5 h-3.5 text-primary" /> Ver QR
                </button>
                <button
                  onClick={() => setShowHistory(true)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors"
                >
                  <History className="w-3.5 h-3.5 text-muted-foreground" /> Historial
                </button>
              </div>

              {/* Register external / maintenance (only if key is in office) */}
              {!isOut && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowExternal(true)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-muted text-xs font-medium hover:bg-muted/80 transition-colors"
                  >
                    <Users className="w-3.5 h-3.5" /> Tercero
                  </button>
                  <button
                    onClick={() => setShowMaintenance(true)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-muted text-xs font-medium hover:bg-muted/80 transition-colors"
                  >
                    <Wrench className="w-3.5 h-3.5" /> Mantenimiento
                  </button>
                </div>
              )}

              {/* Return key (only if key is out) */}
              {isOut && keyStatus && (
                <button
                  onClick={() => setShowReturn(true)}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-success/10 text-success border border-success/20 text-xs font-medium hover:bg-success/20 transition-colors"
                >
                  <ArrowDownCircle className="w-3.5 h-3.5" /> Registrar Devolución
                </button>
              )}
            </div>
          )}

          {/* Dialogs */}
          <KeyQRDialog open={showQR} onOpenChange={setShowQR} property={property} />
          <KeyHistoryDialog
            open={showHistory}
            onOpenChange={setShowHistory}
            propertyId={property.id}
            propertyTitle={property.title}
          />
          <ExternalKeyDialog
            open={showExternal}
            onOpenChange={setShowExternal}
            propertyId={property.id}
            propertyTitle={property.title}
            defaultType="AGENTE_EXTERNO"
          />
          <ExternalKeyDialog
            open={showMaintenance}
            onOpenChange={setShowMaintenance}
            propertyId={property.id}
            propertyTitle={property.title}
            defaultType="MANTENIMIENTO"
          />
          {keyStatus && isOut && (
            <KeyReturnDialog
              open={showReturn}
              onOpenChange={setShowReturn}
              propertyId={property.id}
              propertyTitle={property.title}
              currentStatus={keyStatus}
            />
          )}
        </>
      )}
    </div>
  );
};
