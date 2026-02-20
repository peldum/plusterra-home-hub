import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useKeyHistory, useKeyStatus } from '@/hooks/useKeyMovements';
import { KeyMovement } from '@/hooks/useKeyMovements';
import { KeyStatusBadge } from './KeyStatusBadge';
import { Key, ArrowDownCircle, ArrowUpCircle, User, Users, Wrench, Clock, Loader2 } from 'lucide-react';

interface KeyHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  propertyTitle: string;
}

const typeConfig = {
  AGENTE_INTERNO: { icon: User, label: 'Agente Interno', color: 'text-primary' },
  AGENTE_EXTERNO: { icon: Users, label: 'Agente Externo', color: 'text-warning' },
  MANTENIMIENTO: { icon: Wrench, label: 'Mantenimiento', color: 'text-info' },
};

const MovementRow = ({ m }: { m: KeyMovement }) => {
  const isRetiro = m.direction === 'RETIRO';
  const type = typeConfig[m.movement_type];
  const TypeIcon = type.icon;
  const formatDT = (iso: string) =>
    new Date(iso).toLocaleString('es-PY', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const name = m.movement_type === 'AGENTE_INTERNO'
    ? (m.agent_name || 'Agente')
    : (m.external_name || 'Tercero');
  const company = m.external_company || m.work_type || null;

  return (
    <div className="flex items-start gap-3 py-3 border-b border-border last:border-0">
      <div className={`p-1.5 rounded-full ${isRetiro ? 'bg-warning/10' : 'bg-success/10'} flex-shrink-0 mt-0.5`}>
        {isRetiro
          ? <ArrowUpCircle className="w-4 h-4 text-warning" />
          : <ArrowDownCircle className="w-4 h-4 text-success" />
        }
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`text-xs font-semibold ${isRetiro ? 'text-warning' : 'text-success'}`}>
            {isRetiro ? 'RETIRO' : 'DEVOLUCIÓN'}
          </span>
          <span className="text-xs text-muted-foreground">·</span>
          <TypeIcon className={`w-3 h-3 ${type.color}`} />
          <span className={`text-xs ${type.color}`}>{type.label}</span>
        </div>
        <p className="text-sm font-medium text-foreground mt-0.5">{name}</p>
        {company && <p className="text-xs text-muted-foreground">{company}</p>}
        {m.external_document && <p className="text-xs text-muted-foreground">CI: {m.external_document}</p>}
        {m.motivo && <p className="text-xs text-muted-foreground italic">"{m.motivo}"</p>}
        {m.notes && <p className="text-xs text-muted-foreground italic">Nota: {m.notes}</p>}
        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          {formatDT(m.created_at)}
        </div>
      </div>
    </div>
  );
};

export const KeyHistoryDialog = ({ open, onOpenChange, propertyId, propertyTitle }: KeyHistoryDialogProps) => {
  const { data: movements, isLoading } = useKeyHistory(open ? propertyId : null);
  const { data: keyStatus } = useKeyStatus(open ? propertyId : null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Key className="w-5 h-5 text-primary" />
            Historial de Llaves
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1 truncate">{propertyTitle}</p>
        </DialogHeader>

        {/* Current key status indicator */}
        {keyStatus && (
          <div className="flex-shrink-0 -mt-1 mb-1">
            <KeyStatusBadge
              status={keyStatus.status}
              responsibleName={keyStatus.responsibleName}
              since={keyStatus.since}
            />
          </div>
        )}

        <div className="overflow-y-auto flex-1 -mx-2 px-2">
          {isLoading && (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          )}
          {!isLoading && (!movements || movements.length === 0) && (
            <div className="text-center py-8">
              <Key className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Sin movimientos registrados</p>
            </div>
          )}
          {movements?.map((m) => <MovementRow key={m.id} m={m} />)}
        </div>
      </DialogContent>
    </Dialog>
  );
};
