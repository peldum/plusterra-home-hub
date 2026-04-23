import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Clock, Loader2, Filter, CheckCircle2, XCircle, AlertTriangle, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const eventConfig: Record<string, { emoji: string; label: string; badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  SOLICITUD_RESERVA: { emoji: '📤', label: 'Solicitud', badgeVariant: 'outline' },
  SOLICITUD_CANCELADA: { emoji: '🚫', label: 'Solicitud cancelada', badgeVariant: 'secondary' },
  SOLICITUD_RECHAZADA: { emoji: '❌', label: 'Rechazada', badgeVariant: 'destructive' },
  RESERVADA: { emoji: '📌', label: 'Reservada', badgeVariant: 'default' },
  RESERVA_CANCELADA: { emoji: '❌', label: 'Cancelada', badgeVariant: 'destructive' },
  RESERVA_CONFIRMADA: { emoji: '✅', label: 'Cerrada', badgeVariant: 'default' },
  RESERVA_VENCIDA: { emoji: '⏰', label: 'Vencida', badgeVariant: 'secondary' },
  RESERVA_TRANSFERIDA: { emoji: '🔄', label: 'Transferida', badgeVariant: 'outline' },
};

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString('es-PY', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' });
};

type FilterType = 'all' | 'cancelled' | 'closed' | 'expired';

const getEventDisplay = (event: any) => {
  const cfg = eventConfig[event.event_type] || { emoji: '📋', label: event.event_type, badgeVariant: 'secondary' as const };
  if (event.event_type !== 'RESERVA_CONFIRMADA') return cfg;
  const finalStatus = event.snapshot_after?.status;
  if (finalStatus === 'rented') return { ...cfg, label: 'Alquilada' };
  if (finalStatus === 'sold') return { ...cfg, label: 'Vendida' };
  return cfg;
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ReservationHistoryDialog = ({ open, onOpenChange }: Props) => {
  const { role } = useAuth();
  const isAgent = role === 'agent';
  const [filter, setFilter] = useState<FilterType>('all');
  const [search, setSearch] = useState('');

  const { data: events, isLoading } = useQuery({
    queryKey: ['reservation-history-global'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reservation_history' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;

      // Enrich with property titles
      const propertyIds = [...new Set((data || []).map((e: any) => e.property_id))];
      let propertyMap: Record<string, string> = {};
      if (propertyIds.length > 0) {
        const { data: props } = await supabase
          .from('properties')
          .select('id, title')
          .in('id', propertyIds);
        if (props) {
          propertyMap = Object.fromEntries(props.map(p => [p.id, p.title]));
        }
      }

      return (data || []).map((e: any) => ({
        ...e,
        property_title: propertyMap[e.property_id] || 'Propiedad eliminada',
      }));
    },
    enabled: open,
  });

  const filtered = (events || []).filter((e: any) => {
    if (filter === 'cancelled' && e.event_type !== 'RESERVA_CANCELADA' && e.event_type !== 'SOLICITUD_CANCELADA') return false;
    if (filter === 'closed' && e.event_type !== 'RESERVA_CONFIRMADA') return false;
    if (filter === 'expired' && e.event_type !== 'RESERVA_VENCIDA') return false;
    if (search) {
      const s = search.toLowerCase();
      const matchTitle = (e.property_title || '').toLowerCase().includes(s);
      const matchAgent = (e.agent_origin_name || '').toLowerCase().includes(s);
      const matchExecutor = (e.executed_by_name || '').toLowerCase().includes(s);
      const matchReason = (e.reason || '').toLowerCase().includes(s);
      if (!matchTitle && !matchAgent && !matchExecutor && !matchReason) return false;
    }
    return true;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Historial de Reservas
          </DialogTitle>
        </DialogHeader>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 pb-3 border-b border-border">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input-field pl-9 text-sm"
              placeholder="Buscar propiedad, agente o motivo..."
            />
          </div>
          <div className="flex items-center gap-1">
            {([
              { key: 'all', label: 'Todos' },
              { key: 'cancelled', label: 'Canceladas' },
              { key: 'closed', label: 'Cerradas' },
              { key: 'expired', label: 'Vencidas' },
            ] as { key: FilterType; label: string }[]).map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filter === f.key
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">No se encontraron registros.</p>
          ) : (
            filtered.map((e: any) => {
              const cfg = getEventDisplay(e);
              return (
                <div key={e.id} className="p-3 rounded-lg border border-border bg-muted/30 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {cfg.emoji} {e.property_title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {e.agent_origin_name && `Agente: ${e.agent_origin_name}`}
                        {e.executed_by_name && e.executed_by_name !== e.agent_origin_name && ` · Ejecutó: ${e.executed_by_name}`}
                        {e.executed_by_role && ` (${e.executed_by_role})`}
                      </p>
                    </div>
                    <Badge variant={cfg.badgeVariant} className="text-xs flex-shrink-0">
                      {cfg.label}
                    </Badge>
                  </div>
                  {e.reason && (
                    <div className="flex items-start gap-1.5 p-2 rounded-md bg-destructive/5 border border-destructive/20">
                      <AlertTriangle className="w-3.5 h-3.5 text-destructive mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-foreground"><span className="font-medium">Motivo:</span> {e.reason}</p>
                    </div>
                  )}
                  {e.snapshot_after?.deposit && (
                    <p className="text-xs text-muted-foreground">Seña: ₲ {Number(e.snapshot_after.deposit).toLocaleString('es-PY')}</p>
                  )}
                  <p className="text-xs text-muted-foreground">{formatDate(e.created_at)}</p>
                </div>
              );
            })
          )}
        </div>

        <div className="pt-3 border-t border-border text-xs text-muted-foreground text-center">
          {filtered.length} registro{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
        </div>
      </DialogContent>
    </Dialog>
  );
};
