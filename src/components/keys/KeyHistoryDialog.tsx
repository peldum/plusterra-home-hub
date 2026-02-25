import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useKeyHistory, useKeyStatus } from '@/hooks/useKeyMovements';
import { KeyMovement } from '@/hooks/useKeyMovements';
import { KeyStatusBadge } from './KeyStatusBadge';
import { Input } from '@/components/ui/input';
import { Key, ArrowDownCircle, ArrowUpCircle, User, Users, Wrench, Clock, Loader2, Filter, X } from 'lucide-react';

interface KeyHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  propertyTitle: string;
}

const typeConfig: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  AGENTE_INTERNO: { icon: User, label: 'Agente Interno', color: 'text-primary' },
  AGENTE_EXTERNO: { icon: Users, label: 'Agente Externo', color: 'text-warning' },
  MANTENIMIENTO: { icon: Wrench, label: 'Mantenimiento', color: 'text-info' },
  PROPIETARIO: { icon: User, label: 'Propietario', color: 'text-primary' },
  ENCARGADO: { icon: Users, label: 'Encargado', color: 'text-accent-foreground' },
};

const MovementRow = ({ m }: { m: KeyMovement }) => {
  const isRetiro = m.direction === 'RETIRO';
  const type = typeConfig[m.movement_type] || { icon: User, label: m.movement_type, color: 'text-foreground' };
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

  const [showFilters, setShowFilters] = useState(false);
  const [filterDirection, setFilterDirection] = useState<'ALL' | 'RETIRO' | 'DEVOLUCION'>('ALL');
  const [filterType, setFilterType] = useState<'ALL' | 'AGENTE_INTERNO' | 'AGENTE_EXTERNO' | 'MANTENIMIENTO'>('ALL');
  const [filterDate, setFilterDate] = useState('');

  const hasActiveFilters = filterDirection !== 'ALL' || filterType !== 'ALL' || filterDate !== '';

  const clearFilters = () => {
    setFilterDirection('ALL');
    setFilterType('ALL');
    setFilterDate('');
  };

  const filtered = useMemo(() => {
    if (!movements) return [];
    return movements.filter((m) => {
      if (filterDirection !== 'ALL' && m.direction !== filterDirection) return false;
      if (filterType !== 'ALL' && m.movement_type !== filterType) return false;
      if (filterDate) {
        const movDate = m.created_at.slice(0, 10);
        if (movDate !== filterDate) return false;
      }
      return true;
    });
  }, [movements, filterDirection, filterType, filterDate]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Key className="w-5 h-5 text-primary" />
            Historial de Llaves
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`ml-auto p-1.5 rounded-lg border text-xs transition-colors ${hasActiveFilters ? 'bg-primary/10 border-primary/30 text-primary' : 'border-border hover:bg-muted text-muted-foreground'}`}
            >
              <Filter className="w-3.5 h-3.5" />
            </button>
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

        {/* Filters */}
        {showFilters && (
          <div className="flex-shrink-0 space-y-2 p-3 rounded-xl bg-muted/50 border border-border">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">Filtros</span>
              {hasActiveFilters && (
                <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <X className="w-3 h-3" /> Limpiar
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={filterDirection}
                onChange={(e) => setFilterDirection(e.target.value as any)}
                className="text-xs rounded-lg border border-border bg-background px-2 py-1.5 text-foreground"
              >
                <option value="ALL">Dirección: Todas</option>
                <option value="RETIRO">Retiros</option>
                <option value="DEVOLUCION">Devoluciones</option>
              </select>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="text-xs rounded-lg border border-border bg-background px-2 py-1.5 text-foreground"
              >
                <option value="ALL">Tipo: Todos</option>
                <option value="AGENTE_INTERNO">Agente Interno</option>
                <option value="AGENTE_EXTERNO">Agente Externo</option>
                <option value="MANTENIMIENTO">Mantenimiento</option>
                <option value="PROPIETARIO">Propietario</option>
                <option value="ENCARGADO">Encargado</option>
              </select>
            </div>
            <Input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="text-xs h-8"
              placeholder="Filtrar por fecha"
            />
          </div>
        )}

        <div className="overflow-y-auto flex-1 -mx-2 px-2">
          {isLoading && (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          )}
          {!isLoading && filtered.length === 0 && (
            <div className="text-center py-8">
              <Key className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                {hasActiveFilters ? 'Sin resultados con los filtros aplicados' : 'Sin movimientos registrados'}
              </p>
            </div>
          )}
          {filtered.map((m) => <MovementRow key={m.id} m={m} />)}
        </div>
      </DialogContent>
    </Dialog>
  );
};
