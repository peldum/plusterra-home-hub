/**
 * KeyControlPanel — Panel de control de llaves para la ficha de propiedad.
 * Visible para: Admin, SuperAdmin, Secretaría (acceso completo).
 * Agentes: solo ven el estado actual.
 */
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useKeyStatus } from '@/hooks/useKeyMovements';
import { KeyStatusBadge } from './KeyStatusBadge';
import { KeyQRDialog } from './KeyQRDialog';
import { KeyHistoryDialog } from './KeyHistoryDialog';
import { ExternalKeyDialog } from './ExternalKeyDialog';
import { KeyReturnDialog } from './KeyReturnDialog';
import { Key, QrCode, History, Users, Wrench, ArrowDownCircle, Loader2, Home, UserCog } from 'lucide-react';

interface KeyControlPanelProps {
  property: { id: string; title: string; property_code?: string };
}

export const KeyControlPanel = ({ property }: KeyControlPanelProps) => {
  const { role } = useAuth();
  const { data: keyStatus, isLoading } = useKeyStatus(property.id);

  const [showQR, setShowQR] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showExternal, setShowExternal] = useState(false);
  const [showMaintenance, setShowMaintenance] = useState(false);
  const [showReturn, setShowReturn] = useState(false);
  const [showPropietario, setShowPropietario] = useState(false);
  const [showEncargado, setShowEncargado] = useState(false);

  const canManage = role === 'admin' || role === 'superadmin' || role === 'secretaria' || role === 'accounting';
  const isPrivilegedRole = role === 'admin' || role === 'superadmin' || role === 'secretaria' || role === 'accounting';
  const isOut = keyStatus && keyStatus.status !== 'EN_OFICINA';

  // Show phone/whatsapp for propietario/encargado only to privileged roles (not agents)
  const showOwnerContact = isPrivilegedRole && keyStatus &&
    (keyStatus.status === 'EN_PROPIETARIO' || keyStatus.status === 'EN_ENCARGADO');
  const ownerPhone = keyStatus?.lastMovement?.external_phone || null;

  return (
    <div className="border-t border-border pt-4 mt-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Key className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Control de Llaves</h3>
      </div>

      {/* Key status */}
      {isLoading ? (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-muted">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Cargando estado...</span>
        </div>
      ) : keyStatus ? (
        <KeyStatusBadge
          status={keyStatus.status}
          responsibleName={keyStatus.responsibleName}
          since={keyStatus.since}
          phone={showOwnerContact ? ownerPhone : undefined}
          showWhatsApp={!!showOwnerContact}
        />
      ) : null}

      {/* Action buttons */}
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
            <>
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
              <div className="flex gap-2">
                <button
                  onClick={() => setShowPropietario(true)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-muted text-xs font-medium hover:bg-muted/80 transition-colors"
                >
                  <Home className="w-3.5 h-3.5" /> Propietario
                </button>
                <button
                  onClick={() => setShowEncargado(true)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-muted text-xs font-medium hover:bg-muted/80 transition-colors"
                >
                  <UserCog className="w-3.5 h-3.5" /> Encargado
                </button>
              </div>
            </>
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
      <ExternalKeyDialog
        open={showPropietario}
        onOpenChange={setShowPropietario}
        propertyId={property.id}
        propertyTitle={property.title}
        defaultType="PROPIETARIO"
      />
      <ExternalKeyDialog
        open={showEncargado}
        onOpenChange={setShowEncargado}
        propertyId={property.id}
        propertyTitle={property.title}
        defaultType="ENCARGADO"
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
    </div>
  );
};
