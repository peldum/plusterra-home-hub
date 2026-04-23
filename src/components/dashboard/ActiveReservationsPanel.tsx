import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Lock, AlertTriangle, Clock, User, CalendarClock, CheckCircle2, XCircle, Unlock, History, Home, Tag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ReservationDialog } from '@/components/properties/ReservationDialog';
import { ReservationHistoryDialog } from './ReservationHistoryDialog';
import { toast } from 'sonner';

interface ReservedProperty {
  id: string;
  title: string;
  property_code: string | null;
  status: string;
  reserved_by: string | null;
  reserved_at: string | null;
  reservation_amount: number | null;
  reservation_client_name: string | null;
  reservation_expires_at: string | null;
  reservation_confirmed_by: string | null;
  reservation_confirmed_at: string | null;
  reservation_requested_by: string | null;
  reservation_requested_at: string | null;
  reservation_request_client_name: string | null;
  reservation_request_amount: number | null;
  currency: string | null;
  rental_price: number | null;
  sale_price: number | null;
  neighborhood: string | null;
  city: string | null;
}

const fmt = (n: number) => n.toLocaleString('es-PY');

const getDaysLeft = (expiresAt: string | null): number | null => {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};

const ACTIVE_RESERVATION_STATUSES = ['reserved', 'reservation_request'] as const;

export const ActiveReservationsPanel = () => {
  const { user, role, isAdmin, profile } = useAuth();
  const isAgent = role === 'agent';
  const isSecretaria = role === 'secretaria';
  const isGerente = role === 'accounting';
  const canManage = isAdmin || isSecretaria || isGerente;

  const [dialogProperty, setDialogProperty] = useState<any>(null);
  const [dialogMode, setDialogMode] = useState<'approve' | 'reject' | 'cancel' | 'confirm'>('approve');
  const [showHistory, setShowHistory] = useState(false);

  const { data: reservations, isLoading } = useQuery({
    queryKey: ['active-reservations-panel'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('properties')
        .select('id, title, property_code, status, reserved_by, reserved_at, reservation_amount, reservation_client_name, reservation_expires_at, reservation_confirmed_by, reservation_confirmed_at, reservation_requested_by, reservation_requested_at, reservation_request_client_name, reservation_request_amount, currency, rental_price, sale_price, neighborhood, city')
        .in('status', ACTIVE_RESERVATION_STATUSES)
        .order('reserved_at', { ascending: false });
      if (error) throw error;

      const activeOnly = (data || []).filter(p => ACTIVE_RESERVATION_STATUSES.includes(p.status as typeof ACTIVE_RESERVATION_STATUSES[number]));

      const agentIds = [...new Set(
        activeOnly.flatMap(p => [p.reserved_by, p.reservation_requested_by, p.reservation_confirmed_by].filter(Boolean))
      )] as string[];

      let agentMap: Record<string, string> = {};
      if (agentIds.length > 0) {
        const { data: profiles } = await supabase
          .rpc('get_profiles_public_by_ids', { _ids: agentIds });
        if (profiles) {
          agentMap = Object.fromEntries((profiles as any[]).map(p => [p.id, p.full_name || 'Sin nombre']));
        }
      }

      return activeOnly.map(p => ({
        ...p,
        reserved_by_name: p.reserved_by ? agentMap[p.reserved_by] || 'Desconocido' : null,
        requested_by_name: p.reservation_requested_by ? agentMap[p.reservation_requested_by] || 'Desconocido' : null,
        confirmed_by_name: p.reservation_confirmed_by ? agentMap[p.reservation_confirmed_by] || 'Desconocido' : null,
      }));
    },
    enabled: !!user,
    refetchInterval: 60_000,
  });

  const confirmed = (reservations || []).filter(r => r.status === 'reserved');
  const requests = (reservations || []).filter(r => r.status === 'reservation_request');

  const openAction = (property: any, mode: 'approve' | 'reject' | 'cancel' | 'confirm') => {
    setDialogProperty(property);
    setDialogMode(mode);
  };

  if (isLoading) {
    return (
      <section className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-xl bg-warning/10 text-warning"><Lock className="w-5 h-5" /></div>
          <h2 className="text-lg font-semibold text-foreground">Reservas Activas</h2>
        </div>
        <div className="flex items-center justify-center h-24">
          <Clock className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      </section>
    );
  }

  const total = (reservations || []).length;

  return (
    <>
      <section className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-warning/10 text-warning"><Lock className="w-5 h-5" /></div>
            <h2 className="text-lg font-semibold text-foreground">Reservas Activas</h2>
          </div>
          <Badge variant="secondary" className="text-xs">{total} en curso</Badge>
          {canManage && (
            <button
              onClick={() => setShowHistory(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
            >
              <History className="w-3.5 h-3.5" />
              Historial de cierres
            </button>
          )}
        </div>

        {total === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No hay reservas pendientes ni operaciones en curso.</p>
        ) : (
          <div className="space-y-5">
            {/* Pending requests - shown FIRST for urgency */}
            {requests.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  ⏳ Solicitudes Pendientes ({requests.length})
                </p>
                <div className="space-y-2">
                  {requests.map(r => (
                    <div key={r.id} className="p-4 rounded-lg border border-info/30 bg-info/5 animate-fade-in">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {r.property_code && (
                              <Badge variant="secondary" className="shrink-0 text-[10px] px-1.5 py-0 font-mono bg-primary/10 text-primary border-primary/30">
                                {r.property_code}
                              </Badge>
                            )}
                            {r.rental_price ? (
                              <Badge variant="outline" className="shrink-0 text-[10px] px-1.5 py-0 border-success/40 text-success">Alquiler</Badge>
                            ) : r.sale_price ? (
                              <Badge variant="outline" className="shrink-0 text-[10px] px-1.5 py-0 border-info/40 text-info">Venta</Badge>
                            ) : null}
                          </div>
                          <p className="text-sm font-semibold text-foreground truncate">{r.title}</p>
                          <p className="text-xs text-muted-foreground">{[r.neighborhood, r.city].filter(Boolean).join(', ')}</p>
                          {(r.rental_price || r.sale_price) && (
                            <p className="text-xs font-medium text-foreground mt-0.5">
                              {r.rental_price ? `₲ ${fmt(r.rental_price)}/mes` : `₲ ${fmt(r.sale_price!)}`}
                            </p>
                          )}
                        </div>
                        <Badge variant="outline" className="text-xs border-info text-info flex-shrink-0">Pendiente</Badge>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        {r.reservation_request_amount && (
                          <span className="font-medium text-foreground">Seña propuesta: ₲ {fmt(r.reservation_request_amount)}</span>
                        )}
                        {!isAgent && r.reservation_request_client_name && (
                          <span className="flex items-center gap-1"><User className="w-3 h-3" />{r.reservation_request_client_name}</span>
                        )}
                        {r.requested_by_name && (
                          <span>Solicitó: {r.requested_by_name}</span>
                        )}
                        {r.reservation_requested_at && (
                          <span className="flex items-center gap-1">
                            <CalendarClock className="w-3 h-3" />
                            {new Date(r.reservation_requested_at).toLocaleDateString('es-PY')}
                          </span>
                        )}
                      </div>

                      {/* Action buttons for admin/secretaria */}
                      {canManage && (
                        <div className="mt-3 flex items-center gap-2 pt-2 border-t border-border/50">
                          <button
                            onClick={() => openAction(r, 'approve')}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-success/10 text-success hover:bg-success/20 transition-colors"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Aprobar
                          </button>
                          <button
                            onClick={() => openAction(r, 'reject')}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Rechazar
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Confirmed reservations */}
            {confirmed.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  🔒 Confirmadas ({confirmed.length})
                </p>
                <div className="space-y-2">
                  {confirmed.map(r => {
                    const daysLeft = getDaysLeft(r.reservation_expires_at);
                    const isUrgent = daysLeft !== null && daysLeft <= 1;
                    const isWarning = daysLeft !== null && daysLeft <= 3;
                    return (
                      <div key={r.id} className={`p-4 rounded-lg border transition-all ${isUrgent ? 'border-destructive/40 bg-destructive/5' : isWarning ? 'border-warning/40 bg-warning/5' : 'border-border bg-muted/30'}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              {r.property_code && (
                                <Badge variant="secondary" className="shrink-0 text-[10px] px-1.5 py-0 font-mono bg-primary/10 text-primary border-primary/30">
                                  {r.property_code}
                                </Badge>
                              )}
                              {r.rental_price ? (
                                <Badge variant="outline" className="shrink-0 text-[10px] px-1.5 py-0 border-success/40 text-success">Alquiler</Badge>
                              ) : r.sale_price ? (
                                <Badge variant="outline" className="shrink-0 text-[10px] px-1.5 py-0 border-info/40 text-info">Venta</Badge>
                              ) : null}
                            </div>
                            <p className="text-sm font-semibold text-foreground truncate">{r.title}</p>
                            <p className="text-xs text-muted-foreground">{[r.neighborhood, r.city].filter(Boolean).join(', ')}</p>
                            {(r.rental_price || r.sale_price) && (
                              <p className="text-xs font-medium text-foreground mt-0.5">
                                {r.rental_price ? `₲ ${fmt(r.rental_price)}/mes` : `₲ ${fmt(r.sale_price!)}`}
                              </p>
                            )}
                          </div>
                          {daysLeft !== null && (
                            <Badge variant={isUrgent ? 'destructive' : isWarning ? 'outline' : 'secondary'} className={`flex-shrink-0 text-xs gap-1 ${isWarning && !isUrgent ? 'border-warning text-warning' : ''}`}>
                              <AlertTriangle className="w-3 h-3" />
                              {daysLeft === 0 ? 'Vence hoy' : `${daysLeft}d restantes`}
                            </Badge>
                          )}
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          {r.reservation_amount && (
                            <span className="font-medium text-foreground">Seña: ₲ {fmt(r.reservation_amount)}</span>
                          )}
                          {!isAgent && r.reservation_client_name && (
                            <span className="flex items-center gap-1"><User className="w-3 h-3" />{r.reservation_client_name}</span>
                          )}
                          {r.reserved_by_name && (
                            <span>Agente: {r.reserved_by_name}</span>
                          )}
                          {r.confirmed_by_name && (
                            <span>Confirmó: {r.confirmed_by_name}</span>
                          )}
                          {r.reservation_confirmed_at && (
                            <span className="flex items-center gap-1">
                              <CalendarClock className="w-3 h-3" />
                              {new Date(r.reservation_confirmed_at).toLocaleDateString('es-PY')}
                            </span>
                          )}
                        </div>

                        {/* Action buttons for admin/secretaria on confirmed reservations */}
                        {canManage && (
                          <div className="mt-3 flex items-center gap-2 pt-2 border-t border-border/50">
                            <button
                              onClick={() => openAction(r, 'confirm' as any)}
                              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-success/15 text-success hover:bg-success/25 transition-colors"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              Cerrar operación
                            </button>
                            <button
                              onClick={() => openAction(r, 'cancel')}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-muted text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                            >
                              <Unlock className="w-3.5 h-3.5" />
                              Cancelar reserva
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Reservation Dialog - reuses existing component */}
      {dialogProperty && (
        <ReservationDialog
          open={!!dialogProperty}
          onOpenChange={(open) => { if (!open) setDialogProperty(null); }}
          property={dialogProperty}
          mode={dialogMode}
        />
      )}

      {/* Reservation History Dialog */}
      <ReservationHistoryDialog open={showHistory} onOpenChange={setShowHistory} />
    </>
  );
};
