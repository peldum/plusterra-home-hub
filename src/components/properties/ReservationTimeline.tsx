import { useReservationHistory, ReservationEvent } from '@/hooks/useReservationHistory';
import { Clock, Loader2 } from 'lucide-react';

const eventConfig: Record<string, { emoji: string; label: string; color: string }> = {
  SOLICITUD_RESERVA: { emoji: '📤', label: 'Solicitud de reserva', color: 'text-primary' },
  SOLICITUD_CANCELADA: { emoji: '🚫', label: 'Solicitud cancelada', color: 'text-muted-foreground' },
  SOLICITUD_RECHAZADA: { emoji: '❌', label: 'Solicitud rechazada', color: 'text-destructive' },
  RESERVADA: { emoji: '📌', label: 'Reservado', color: 'text-warning' },
  RESERVA_CANCELADA: { emoji: '❌', label: 'Reserva cancelada', color: 'text-destructive' },
  RESERVA_CONFIRMADA: { emoji: '✅', label: 'Reserva confirmada', color: 'text-success' },
  RESERVA_VENCIDA: { emoji: '⏰', label: 'Reserva vencida', color: 'text-muted-foreground' },
  RESERVA_TRANSFERIDA: { emoji: '🔄', label: 'Reserva transferida', color: 'text-primary' },
};

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString('es-PY', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' });
};

const EventItem = ({ event }: { event: ReservationEvent }) => {
  const cfg = eventConfig[event.event_type] || { emoji: '📋', label: event.event_type, color: 'text-foreground' };

  let description = '';
  if (event.event_type === 'RESERVADA') {
    description = `${cfg.emoji} ${cfg.label} por ${event.agent_origin_name || 'Agente'}`;
    if (event.executed_by_role && event.executed_by_role !== 'agent' && event.executed_by !== event.agent_origin_id) {
      description += ` (asignado por ${event.executed_by_name || event.executed_by_role})`;
    }
  } else if (event.event_type === 'RESERVA_TRANSFERIDA') {
    description = `${cfg.emoji} Transferida de ${event.agent_origin_name || '?'} a ${event.agent_destination_name || '?'}`;
    if (event.executed_by_name) description += ` por ${event.executed_by_name}`;
  } else {
    description = `${cfg.emoji} ${cfg.label} por ${event.executed_by_name || event.executed_by_role || 'Sistema'}`;
  }

  return (
    <div className="flex gap-3 relative">
      {/* Timeline line */}
      <div className="flex flex-col items-center">
        <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${
          event.event_type === 'SOLICITUD_RESERVA' ? 'bg-primary' :
          event.event_type === 'SOLICITUD_RECHAZADA' ? 'bg-destructive' :
          event.event_type === 'RESERVADA' ? 'bg-warning' :
          event.event_type === 'RESERVA_CANCELADA' ? 'bg-destructive' :
          event.event_type === 'RESERVA_CONFIRMADA' ? 'bg-success' :
          event.event_type === 'RESERVA_TRANSFERIDA' ? 'bg-primary' :
          'bg-muted-foreground'
        }`} />
        <div className="w-px flex-1 bg-border" />
      </div>
      {/* Content */}
      <div className="pb-4 min-w-0">
        <p className={`text-sm font-medium ${cfg.color}`}>{description}</p>
        {event.reason && (
          <p className="text-xs text-muted-foreground mt-0.5">Motivo: {event.reason}</p>
        )}
        <p className="text-xs text-muted-foreground mt-0.5">{formatDate(event.created_at)}</p>
      </div>
    </div>
  );
};

interface ReservationTimelineProps {
  propertyId: string;
}

export const ReservationTimeline = ({ propertyId }: ReservationTimelineProps) => {
  const { data: events, isLoading } = useReservationHistory(propertyId);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-3 text-muted-foreground text-xs">
        <Loader2 className="w-3 h-3 animate-spin" /> Cargando historial…
      </div>
    );
  }

  if (!events?.length) return null;

  return (
    <div className="pt-3 border-t border-border">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">Historial de Reserva</h3>
      </div>
      <div className="max-h-48 overflow-y-auto pr-1">
        {events.map(ev => (
          <EventItem key={ev.id} event={ev} />
        ))}
      </div>
    </div>
  );
};
