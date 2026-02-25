import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, Lock, Unlock, CheckCircle2, ArrowRightLeft, Send, XCircle } from 'lucide-react';
import { insertReservationEvent } from '@/hooks/useReservationHistory';

interface ReservationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  property: any;
  mode: 'reserve' | 'cancel' | 'confirm' | 'transfer' | 'request' | 'approve' | 'reject' | 'cancel_request';
}

export const ReservationDialog = ({ open, onOpenChange, property, mode }: ReservationDialogProps) => {
  const { user, profile, role, isAdmin } = useAuth();
  const isSecretaria = role === 'secretaria';
  const canApprove = isAdmin || isSecretaria;
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState('');
  const [clientName, setClientName] = useState('');
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [agents, setAgents] = useState<{ id: string; full_name: string }[]>([]);

  // Load agents list for admin (reserve & transfer modes)
  useEffect(() => {
    if (!open || !isAdmin || (mode !== 'reserve' && mode !== 'transfer')) return;
    const fetchAgents = async () => {
      const { data } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'agent');
      if (!data?.length) return;
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', data.map(r => r.user_id))
        .eq('status', 'active')
        .order('full_name');
      if (profiles) setAgents(profiles);
    };
    fetchAgents();
  }, [open, isAdmin, mode]);

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['available-properties'] });
    qc.invalidateQueries({ queryKey: ['properties'] });
    qc.invalidateQueries({ queryKey: ['property-overview-stats'] });
    qc.invalidateQueries({ queryKey: ['reservation-history'] });
  };

  // === AGENT: Request reservation (status: available -> reservation_request) ===
  const handleRequest = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: updated, error } = await supabase
        .from('properties')
        .update({
          status: 'reservation_request' as any,
          reservation_requested_by: user.id,
          reservation_requested_at: new Date().toISOString(),
          reservation_request_client_name: clientName.trim() || null,
          reservation_request_amount: amount ? Number(amount) : null,
        })
        .eq('id', property.id)
        .eq('status', 'available')
        .select('id')
        .maybeSingle();

      if (error) throw error;

      if (!updated) {
        invalidateAll();
        toast.error('Esta propiedad ya no está disponible. La vista se ha actualizado.', { duration: 6000 });
        onOpenChange(false);
        return;
      }

      // Audit log
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: 'request_reservation',
        target_table: 'properties',
        target_id: property.id,
        new_data: {
          status: 'reservation_request',
          requested_by: user.id,
          agent_name: profile?.full_name,
          client_name: clientName || null,
          amount: amount || null,
        },
      });

      // Reservation history
      await insertReservationEvent({
        property_id: property.id,
        event_type: 'SOLICITUD_RESERVA',
        agent_origin_id: user.id,
        agent_origin_name: profile?.full_name || '',
        executed_by: user.id,
        executed_by_name: profile?.full_name || '',
        executed_by_role: role || '',
        snapshot_after: { status: 'reservation_request', requested_by: user.id, client: clientName || null, amount: amount || null },
      });

      // Create alerts for admin, superadmin and secretaria
      const { data: notifyUsers } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('role', ['admin', 'superadmin', 'secretaria']);

      if (notifyUsers?.length) {
        const alerts = notifyUsers.map(u => ({
          user_id: u.user_id,
          title: 'Solicitud de Reserva',
          message: `${profile?.full_name || 'Un agente'} solicita reservar "${property.title}"${clientName ? ` para ${clientName}` : ''}`,
          alert_type: 'reservation_request',
          related_entity_id: property.id,
          related_entity_type: 'property',
        }));
        await supabase.from('alerts').insert(alerts);
      }

      invalidateAll();
      toast.success('Solicitud de reserva enviada. Pendiente de aprobación.');
      onOpenChange(false);
    } catch (err: any) {
      toast.error('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // === AGENT: Cancel own request (status: reservation_request -> available) ===
  const handleCancelRequest = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('properties')
        .update({
          status: 'available' as any,
          reservation_requested_by: null,
          reservation_requested_at: null,
          reservation_request_client_name: null,
          reservation_request_amount: null,
        })
        .eq('id', property.id)
        .eq('status', 'reservation_request');
      if (error) throw error;

      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: 'cancel_reservation_request',
        target_table: 'properties',
        target_id: property.id,
        new_data: { status: 'available', cancelled_by: user.id },
      });

      await insertReservationEvent({
        property_id: property.id,
        event_type: 'SOLICITUD_CANCELADA',
        agent_origin_id: property.reservation_requested_by,
        agent_origin_name: property.requested_by_name || null,
        executed_by: user.id,
        executed_by_name: profile?.full_name || '',
        executed_by_role: role || '',
        snapshot_before: { status: 'reservation_request' },
        snapshot_after: { status: 'available' },
      });

      invalidateAll();
      toast.success('Solicitud de reserva cancelada');
      onOpenChange(false);
    } catch (err: any) {
      toast.error('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // === ADMIN/SECRETARIA: Approve request (reservation_request -> reserved) ===
  const handleApprove = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('properties')
        .update({
          status: 'reserved' as any,
          reserved_by: property.reservation_requested_by,
          reserved_at: new Date().toISOString(),
          reservation_amount: property.reservation_request_amount || (amount ? Number(amount) : null),
          reservation_client_name: property.reservation_request_client_name || clientName.trim() || null,
          // Clear request fields
          reservation_requested_by: null,
          reservation_requested_at: null,
          reservation_request_client_name: null,
          reservation_request_amount: null,
        })
        .eq('id', property.id)
        .eq('status', 'reservation_request');
      if (error) throw error;

      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: 'approve_reservation',
        target_table: 'properties',
        target_id: property.id,
        old_data: { status: 'reservation_request', requested_by: property.reservation_requested_by },
        new_data: { status: 'reserved', approved_by: user.id, approver_name: profile?.full_name },
      });

      await insertReservationEvent({
        property_id: property.id,
        event_type: 'RESERVADA',
        agent_origin_id: property.reservation_requested_by,
        agent_origin_name: property.requested_by_name || null,
        executed_by: user.id,
        executed_by_name: profile?.full_name || '',
        executed_by_role: role || '',
        snapshot_before: { status: 'reservation_request', requested_by: property.reservation_requested_by },
        snapshot_after: { status: 'reserved', reserved_by: property.reservation_requested_by },
      });

      // Notify the requesting agent
      if (property.reservation_requested_by) {
        await supabase.from('alerts').insert({
          user_id: property.reservation_requested_by,
          title: 'Reserva Aprobada ✅',
          message: `Tu solicitud de reserva para "${property.title}" fue aprobada por ${profile?.full_name || 'un administrador'}.`,
          alert_type: 'reservation_approved',
          related_entity_id: property.id,
          related_entity_type: 'property',
        });
      }

      invalidateAll();
      toast.success('Reserva aprobada exitosamente');
      onOpenChange(false);
    } catch (err: any) {
      toast.error('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // === ADMIN/SECRETARIA: Reject request (reservation_request -> available) ===
  const handleReject = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('properties')
        .update({
          status: 'available' as any,
          reservation_requested_by: null,
          reservation_requested_at: null,
          reservation_request_client_name: null,
          reservation_request_amount: null,
        })
        .eq('id', property.id)
        .eq('status', 'reservation_request');
      if (error) throw error;

      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: 'reject_reservation',
        target_table: 'properties',
        target_id: property.id,
        old_data: { status: 'reservation_request', requested_by: property.reservation_requested_by },
        new_data: { status: 'available', rejected_by: user.id, reason: rejectReason || null },
      });

      await insertReservationEvent({
        property_id: property.id,
        event_type: 'SOLICITUD_RECHAZADA',
        agent_origin_id: property.reservation_requested_by,
        agent_origin_name: property.requested_by_name || null,
        executed_by: user.id,
        executed_by_name: profile?.full_name || '',
        executed_by_role: role || '',
        reason: rejectReason || null,
        snapshot_before: { status: 'reservation_request' },
        snapshot_after: { status: 'available' },
      });

      // Notify the requesting agent
      if (property.reservation_requested_by) {
        await supabase.from('alerts').insert({
          user_id: property.reservation_requested_by,
          title: 'Solicitud de Reserva Rechazada ❌',
          message: `Tu solicitud para "${property.title}" fue rechazada.${rejectReason ? ` Motivo: ${rejectReason}` : ''}`,
          alert_type: 'reservation_rejected',
          related_entity_id: property.id,
          related_entity_type: 'property',
        });
      }

      invalidateAll();
      toast.success('Solicitud rechazada');
      onOpenChange(false);
    } catch (err: any) {
      toast.error('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // === ADMIN: Direct reserve (bypasses request flow) ===
  const handleReserve = async () => {
    if (!user) return;
    const reservingAgentId = selectedAgentId || user.id;
    const reservingAgentName = selectedAgentId
      ? agents.find(a => a.id === selectedAgentId)?.full_name || ''
      : profile?.full_name || '';

    setLoading(true);
    try {
      const { data: updated, error } = await supabase
        .from('properties')
        .update({
          status: 'reserved' as any,
          reserved_by: reservingAgentId,
          reserved_at: new Date().toISOString(),
          reservation_amount: amount ? Number(amount) : null,
          reservation_client_name: clientName.trim() || null,
        })
        .eq('id', property.id)
        .eq('status', 'available')
        .select('id')
        .maybeSingle();

      if (error) throw error;

      if (!updated) {
        invalidateAll();
        toast.error('Esta propiedad ya no está disponible.', { duration: 6000 });
        onOpenChange(false);
        return;
      }

      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: 'reserve_property',
        target_table: 'properties',
        target_id: property.id,
        new_data: {
          status: 'reserved',
          reserved_by: reservingAgentId,
          agent_name: reservingAgentName,
          reserved_by_admin: user.id,
          reservation_amount: amount || null,
          reservation_client_name: clientName || null,
        },
      });

      await insertReservationEvent({
        property_id: property.id,
        event_type: 'RESERVADA',
        agent_origin_id: reservingAgentId,
        agent_origin_name: reservingAgentName,
        executed_by: user.id,
        executed_by_name: profile?.full_name || '',
        executed_by_role: role || '',
        snapshot_after: { status: 'reserved', reserved_by: reservingAgentId, client: clientName || null, amount: amount || null },
      });

      invalidateAll();
      toast.success('Propiedad reservada exitosamente');
      onOpenChange(false);
    } catch (err: any) {
      toast.error('Error al reservar: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('properties')
        .update({
          status: 'available' as any,
          reserved_by: null,
          reserved_at: null,
          reservation_amount: null,
          reservation_client_name: null,
        })
        .eq('id', property.id);
      if (error) throw error;

      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: 'cancel_reservation',
        target_table: 'properties',
        target_id: property.id,
        old_data: {
          reserved_by: property.reserved_by,
          reserved_at: property.reserved_at,
          reservation_client_name: property.reservation_client_name,
          reservation_amount: property.reservation_amount,
        },
        new_data: { status: 'available', cancelled_by: user.id, agent_name: profile?.full_name },
      });

      await insertReservationEvent({
        property_id: property.id,
        event_type: 'RESERVA_CANCELADA',
        agent_origin_id: property.reserved_by,
        agent_origin_name: property.reserved_by_name || null,
        executed_by: user.id,
        executed_by_name: profile?.full_name || '',
        executed_by_role: role || '',
        snapshot_before: { status: 'reserved', reserved_by: property.reserved_by },
        snapshot_after: { status: 'available' },
      });

      invalidateAll();
      toast.success('Reserva cancelada');
      onOpenChange(false);
    } catch (err: any) {
      toast.error('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const hasRent = Number(property.rental_price) > 0;
      const targetStatus = hasRent ? 'rented' : 'sold';

      const { error } = await supabase
        .from('properties')
        .update({
          status: targetStatus as any,
          reserved_by: null,
          reserved_at: null,
          reservation_amount: null,
          reservation_client_name: null,
        })
        .eq('id', property.id);
      if (error) throw error;

      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: 'confirm_reservation',
        target_table: 'properties',
        target_id: property.id,
        old_data: { status: 'reserved', reserved_by: property.reserved_by },
        new_data: { status: targetStatus, confirmed_by: user.id, agent_name: profile?.full_name },
      });

      await insertReservationEvent({
        property_id: property.id,
        event_type: 'RESERVA_CONFIRMADA',
        agent_origin_id: property.reserved_by,
        agent_origin_name: property.reserved_by_name || null,
        executed_by: user.id,
        executed_by_name: profile?.full_name || '',
        executed_by_role: role || '',
        snapshot_before: { status: 'reserved', reserved_by: property.reserved_by },
        snapshot_after: { status: targetStatus },
      });

      invalidateAll();
      toast.success(`Propiedad marcada como ${targetStatus === 'rented' ? 'alquilada' : 'vendida'}`);
      onOpenChange(false);
    } catch (err: any) {
      toast.error('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = async () => {
    if (!user || !selectedAgentId) return;
    setLoading(true);
    try {
      const newAgentName = agents.find(a => a.id === selectedAgentId)?.full_name || '';

      const { error } = await supabase
        .from('properties')
        .update({
          reserved_by: selectedAgentId,
          reserved_at: new Date().toISOString(),
        })
        .eq('id', property.id)
        .eq('status', 'reserved');
      if (error) throw error;

      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: 'transfer_reservation',
        target_table: 'properties',
        target_id: property.id,
        old_data: { reserved_by: property.reserved_by, previous_agent: property.reserved_by_name },
        new_data: { reserved_by: selectedAgentId, new_agent: newAgentName, transferred_by: user.id, reason: transferReason || null },
      });

      await insertReservationEvent({
        property_id: property.id,
        event_type: 'RESERVA_TRANSFERIDA',
        agent_origin_id: property.reserved_by,
        agent_origin_name: property.reserved_by_name || null,
        agent_destination_id: selectedAgentId,
        agent_destination_name: newAgentName,
        executed_by: user.id,
        executed_by_name: profile?.full_name || '',
        executed_by_role: role || '',
        reason: transferReason || null,
        snapshot_before: { reserved_by: property.reserved_by },
        snapshot_after: { reserved_by: selectedAgentId, new_agent: newAgentName },
      });

      invalidateAll();
      toast.success(`Reserva transferida a ${newAgentName}`);
      onOpenChange(false);
    } catch (err: any) {
      toast.error('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const titles: Record<string, string> = {
    request: 'Solicitar Reserva',
    reserve: 'Reservar Propiedad',
    cancel: 'Cancelar Reserva',
    confirm: 'Confirmar Operación',
    transfer: 'Transferir Reserva',
    approve: 'Aprobar Solicitud de Reserva',
    reject: 'Rechazar Solicitud de Reserva',
    cancel_request: 'Cancelar Solicitud',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-lg">{titles[mode]}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Propiedad: <span className="font-medium text-foreground">{property?.title}</span>
          </p>

          {/* === AGENT REQUEST === */}
          {mode === 'request' && (
            <>
              <p className="text-sm text-muted-foreground">
                Tu solicitud será enviada a Secretaría/Admin para su aprobación. La propiedad <strong>no se bloquea</strong> hasta que sea aprobada.
              </p>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Nombre del cliente <span className="text-muted-foreground font-normal">(opcional)</span>
                </label>
                <input value={clientName} onChange={e => setClientName(e.target.value)} className="input-field" placeholder="Ej: María García" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Monto de seña <span className="text-muted-foreground font-normal">(opcional)</span>
                </label>
                <input type="number" min={0} value={amount} onChange={e => setAmount(e.target.value)} className="input-field" placeholder="0" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => onOpenChange(false)} className="px-4 py-2 rounded-lg bg-muted text-muted-foreground text-sm font-medium">Cancelar</button>
                <button onClick={handleRequest} disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Enviar Solicitud
                </button>
              </div>
            </>
          )}

          {/* === CANCEL REQUEST (agent cancels own request) === */}
          {mode === 'cancel_request' && (
            <>
              <p className="text-sm text-destructive">¿Cancelar tu solicitud de reserva? La propiedad volverá a estar disponible.</p>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => onOpenChange(false)} className="px-4 py-2 rounded-lg bg-muted text-muted-foreground text-sm font-medium">No, mantener</button>
                <button onClick={handleCancelRequest} disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 disabled:opacity-50">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                  Cancelar Solicitud
                </button>
              </div>
            </>
          )}

          {/* === APPROVE REQUEST === */}
          {mode === 'approve' && (
            <>
              <div className="p-3 rounded-xl bg-primary/10 border border-primary/30 space-y-1">
                <p className="text-sm text-foreground">
                  Solicitado por: <span className="font-semibold">{property?.requested_by_name || 'Agente'}</span>
                </p>
                {property?.reservation_requested_at && (
                  <p className="text-xs text-muted-foreground">
                    Fecha: {new Date(property.reservation_requested_at).toLocaleDateString('es-PY')} – {new Date(property.reservation_requested_at).toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
                {property?.reservation_request_client_name && (
                  <p className="text-xs text-muted-foreground">Cliente: <span className="font-medium text-foreground">{property.reservation_request_client_name}</span></p>
                )}
                {Number(property?.reservation_request_amount) > 0 && (
                  <p className="text-xs text-muted-foreground">Seña: <span className="font-medium text-foreground">₲ {Number(property.reservation_request_amount).toLocaleString('es-PY')}</span></p>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Al aprobar, la propiedad pasará a estado <strong>"Reservada"</strong> y quedará bloqueada.
              </p>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => onOpenChange(false)} className="px-4 py-2 rounded-lg bg-muted text-muted-foreground text-sm font-medium">Cancelar</button>
                <button onClick={handleApprove} disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-success text-success-foreground text-sm font-medium hover:bg-success/90 disabled:opacity-50">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Aprobar Reserva
                </button>
              </div>
            </>
          )}

          {/* === REJECT REQUEST === */}
          {mode === 'reject' && (
            <>
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 space-y-1">
                <p className="text-sm text-foreground">
                  Solicitado por: <span className="font-semibold">{property?.requested_by_name || 'Agente'}</span>
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Motivo del rechazo <span className="text-muted-foreground font-normal">(opcional)</span></label>
                <input value={rejectReason} onChange={e => setRejectReason(e.target.value)} className="input-field" placeholder="Ej: No se verificó ingreso de seña" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => onOpenChange(false)} className="px-4 py-2 rounded-lg bg-muted text-muted-foreground text-sm font-medium">Cancelar</button>
                <button onClick={handleReject} disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 disabled:opacity-50">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                  Rechazar
                </button>
              </div>
            </>
          )}

          {/* === ADMIN DIRECT RESERVE === */}
          {mode === 'reserve' && (
            <>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Agente que reserva</label>
                <select value={selectedAgentId} onChange={e => setSelectedAgentId(e.target.value)} className="input-field">
                  <option value="">-- Yo mismo --</option>
                  {agents.map(a => (
                    <option key={a.id} value={a.id}>{a.full_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Nombre del cliente <span className="text-muted-foreground font-normal">(opcional)</span>
                </label>
                <input value={clientName} onChange={e => setClientName(e.target.value)} className="input-field" placeholder="Ej: María García" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Monto de seña <span className="text-muted-foreground font-normal">(opcional)</span>
                </label>
                <input type="number" min={0} value={amount} onChange={e => setAmount(e.target.value)} className="input-field" placeholder="0" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => onOpenChange(false)} className="px-4 py-2 rounded-lg bg-muted text-muted-foreground text-sm font-medium">Cancelar</button>
                <button onClick={handleReserve} disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-warning text-warning-foreground text-sm font-medium hover:bg-warning/90 disabled:opacity-50">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                  Reservar
                </button>
              </div>
            </>
          )}

          {mode === 'cancel' && (
            <>
              <p className="text-sm text-destructive">¿Estás seguro de cancelar la reserva? La propiedad volverá a estar disponible.</p>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => onOpenChange(false)} className="px-4 py-2 rounded-lg bg-muted text-muted-foreground text-sm font-medium">No, mantener</button>
                <button onClick={handleCancel} disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 disabled:opacity-50">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4" />}
                  Cancelar Reserva
                </button>
              </div>
            </>
          )}

          {mode === 'confirm' && (
            <>
              <p className="text-sm text-muted-foreground">
                Confirmar la operación cambiará el estado a <strong>{Number(property?.rental_price) > 0 ? 'Alquilada' : 'Vendida'}</strong>.
              </p>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => onOpenChange(false)} className="px-4 py-2 rounded-lg bg-muted text-muted-foreground text-sm font-medium">Cancelar</button>
                <button onClick={handleConfirm} disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-success text-success-foreground text-sm font-medium hover:bg-success/90 disabled:opacity-50">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Confirmar Operación
                </button>
              </div>
            </>
          )}

          {mode === 'transfer' && (
            <>
              <p className="text-sm text-muted-foreground">
                Actualmente reservada por: <span className="font-semibold text-foreground">{property?.reserved_by_name || 'Agente'}</span>
              </p>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Transferir a</label>
                <select value={selectedAgentId} onChange={e => setSelectedAgentId(e.target.value)} className="input-field">
                  <option value="">-- Seleccionar agente --</option>
                  {agents.filter(a => a.id !== property?.reserved_by).map(a => (
                    <option key={a.id} value={a.id}>{a.full_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Motivo <span className="text-muted-foreground font-normal">(opcional)</span></label>
                <input value={transferReason} onChange={e => setTransferReason(e.target.value)} className="input-field" placeholder="Ej: Reasignación de zona" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => onOpenChange(false)} className="px-4 py-2 rounded-lg bg-muted text-muted-foreground text-sm font-medium">Cancelar</button>
                <button onClick={handleTransfer} disabled={loading || !selectedAgentId}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRightLeft className="w-4 h-4" />}
                  Transferir
                </button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
