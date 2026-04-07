import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, Lock, Unlock, CheckCircle2, ArrowRightLeft, Send, XCircle, AlertTriangle } from 'lucide-react';
import { insertReservationEvent } from '@/hooks/useReservationHistory';
import { PostRentalCommissionDialog } from '@/components/commissions/PostRentalCommissionDialog';
import { MontoInputValidado, ValidatedSubmitButton, validateMonto } from '@/components/ui/monto-input-validado';

// === BUSINESS RULES (immutable) ===
const MIN_DEPOSIT_PCT = 0.5; // 50% del valor de la propiedad
const RESERVATION_DAYS = 5;  // días corridos máximo

interface ReservationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  property: any;
  mode: 'reserve' | 'cancel' | 'confirm' | 'transfer' | 'request' | 'approve' | 'reject' | 'cancel_request';
}

/** Get the property value for deposit validation */
const getPropertyValue = (property: any): number => {
  const rental = Number(property?.rental_price) || 0;
  const sale = Number(property?.sale_price) || 0;
  return rental > 0 ? rental : sale;
};

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
  const [cancelReason, setCancelReason] = useState('');
  const [cancelReasonCustom, setCancelReasonCustom] = useState('');
  const [agents, setAgents] = useState<{ id: string; full_name: string }[]>([]);
  const [showCommissionDialog, setShowCommissionDialog] = useState(false);
  const [confirmedProperty, setConfirmedProperty] = useState<any>(null);

  // Pre-fill amount from request when approving
  useEffect(() => {
    if (open && mode === 'approve' && property?.reservation_request_amount) {
      setAmount(String(property.reservation_request_amount));
    }
  }, [open, mode, property?.reservation_request_amount]);

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
    qc.invalidateQueries({ queryKey: ['active-reservations-panel'] });
  };

  /** Validate deposit amount >= 50% of property value */
  const validateDeposit = (): boolean => {
    const propertyValue = getPropertyValue(property);
    const depositAmount = Number(amount);
    if (!depositAmount || depositAmount <= 0) {
      toast.error('Debe ingresar el monto de seña recibido antes de confirmar.');
      return false;
    }
    if (propertyValue > 0) {
      const minRequired = propertyValue * MIN_DEPOSIT_PCT;
      if (depositAmount < minRequired) {
        toast.error(
          `Seña insuficiente. Mínimo requerido: ₲ ${minRequired.toLocaleString('es-PY')} (50% del valor de ₲ ${propertyValue.toLocaleString('es-PY')}).`,
          { duration: 3000 }
        );
        return false;
      }
    }
    return true;
  };

  /** Calculate expiration date (5 calendar days from now) */
  const getExpirationDate = (): string => {
    const d = new Date();
    d.setDate(d.getDate() + RESERVATION_DAYS);
    return d.toISOString();
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
        toast.error('Esta propiedad ya no está disponible. La vista se ha actualizado.', { duration: 3000 });
        onOpenChange(false);
        return;
      }

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

  // === AGENT: Cancel own request ===
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

  // === ADMIN/SECRETARIA: Approve request (reservation_request -> reserved) WITH VALIDATION ===
  const handleApprove = async () => {
    if (!user) return;
    if (!validateDeposit()) return;

    setLoading(true);
    try {
      const expiresAt = getExpirationDate();
      const depositAmount = Number(amount);

      const { error } = await supabase
        .from('properties')
        .update({
          status: 'reserved' as any,
          reserved_by: property.reservation_requested_by,
          reserved_at: new Date().toISOString(),
          reservation_amount: depositAmount,
          reservation_client_name: property.reservation_request_client_name || clientName.trim() || null,
          reservation_expires_at: expiresAt,
          reservation_confirmed_by: user.id,
          reservation_confirmed_at: new Date().toISOString(),
          reservation_requested_by: null,
          reservation_requested_at: null,
          reservation_request_client_name: null,
          reservation_request_amount: null,
        } as any)
        .eq('id', property.id)
        .eq('status', 'reservation_request');
      if (error) throw error;

      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: 'approve_reservation',
        target_table: 'properties',
        target_id: property.id,
        old_data: { status: 'reservation_request', requested_by: property.reservation_requested_by },
        new_data: { status: 'reserved', approved_by: user.id, approver_name: profile?.full_name, deposit: depositAmount, expires_at: expiresAt },
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
        snapshot_after: { status: 'reserved', reserved_by: property.reservation_requested_by, deposit: depositAmount, expires_at: expiresAt },
      });

      if (property.reservation_requested_by) {
        await supabase.from('alerts').insert({
          user_id: property.reservation_requested_by,
          title: 'Reserva Aprobada ✅',
          message: `Tu solicitud de reserva para "${property.title}" fue aprobada por ${profile?.full_name || 'un administrador'}. Tienes ${RESERVATION_DAYS} días para firmar contrato.`,
          alert_type: 'reservation_approved',
          related_entity_id: property.id,
          related_entity_type: 'property',
        });
      }

      invalidateAll();
      toast.success(`Reserva aprobada. Vence en ${RESERVATION_DAYS} días.`);
      onOpenChange(false);
    } catch (err: any) {
      toast.error('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // === ADMIN/SECRETARIA: Reject request ===
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

  // === ADMIN: Direct reserve (WITH VALIDATION) ===
  const handleReserve = async () => {
    if (!user) return;
    if (!validateDeposit()) return;

    const reservingAgentId = selectedAgentId || user.id;
    const reservingAgentName = selectedAgentId
      ? agents.find(a => a.id === selectedAgentId)?.full_name || ''
      : profile?.full_name || '';

    setLoading(true);
    try {
      const expiresAt = getExpirationDate();
      const depositAmount = Number(amount);

      const { data: updated, error } = await supabase
        .from('properties')
        .update({
          status: 'reserved' as any,
          reserved_by: reservingAgentId,
          reserved_at: new Date().toISOString(),
          reservation_amount: depositAmount,
          reservation_client_name: clientName.trim() || null,
          reservation_expires_at: expiresAt,
          reservation_confirmed_by: user.id,
          reservation_confirmed_at: new Date().toISOString(),
        } as any)
        .eq('id', property.id)
        .eq('status', 'available')
        .select('id')
        .maybeSingle();

      if (error) throw error;

      if (!updated) {
        invalidateAll();
        toast.error('Esta propiedad ya no está disponible.', { duration: 3000 });
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
          deposit: depositAmount,
          expires_at: expiresAt,
          confirmed_by: user.id,
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
        snapshot_after: { status: 'reserved', reserved_by: reservingAgentId, deposit: depositAmount, expires_at: expiresAt },
      });

      invalidateAll();
      toast.success(`Propiedad reservada. Vence en ${RESERVATION_DAYS} días.`);
      onOpenChange(false);
    } catch (err: any) {
      toast.error('Error al reservar: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!user) return;
    const finalReason = cancelReason === 'Otro' ? cancelReasonCustom.trim() : cancelReason.trim();
    if (!finalReason) {
      toast.error('Debe indicar el motivo de la cancelación.');
      return;
    }
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
          reservation_expires_at: null,
          reservation_confirmed_by: null,
          reservation_confirmed_at: null,
        } as any)
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
        new_data: { status: 'available', cancelled_by: user.id, agent_name: profile?.full_name, reason: finalReason },
      });

      await insertReservationEvent({
        property_id: property.id,
        event_type: 'RESERVA_CANCELADA',
        agent_origin_id: property.reserved_by,
        agent_origin_name: property.reserved_by_name || null,
        executed_by: user.id,
        executed_by_name: profile?.full_name || '',
        executed_by_role: role || '',
        reason: finalReason,
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
          reservation_expires_at: null,
          reservation_confirmed_by: null,
          reservation_confirmed_at: null,
        } as any)
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
      
      // Open commission registration dialog for both rented and sold
      setConfirmedProperty({
        id: property.id,
        title: property.title,
        property_code: property.property_code,
        rental_price: property.rental_price,
        currency: property.currency,
        reserved_by: property.reserved_by,
        captor_agent_id: property.captor_agent_id,
      });
      onOpenChange(false);
      setShowCommissionDialog(true);
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

  // === Computed values for UI ===
  const propertyValue = getPropertyValue(property);
  const minDeposit = propertyValue * MIN_DEPOSIT_PCT;
  const currentDeposit = Number(amount) || 0;
  const depositValidation = useMemo(
    () => validateMonto(amount, propertyValue > 0 ? minDeposit : undefined, propertyValue > 0 ? propertyValue : undefined, '50% del valor', 'valor de la propiedad'),
    [amount, minDeposit, propertyValue],
  );
  const depositValid = depositValidation.valid;
  const hasDepositValue = !!amount && currentDeposit > 0;

  // Expiration info for reserved properties
  const expiresAt = property?.reservation_expires_at ? new Date(property.reservation_expires_at) : null;
  const now = new Date();
  const daysLeft = expiresAt ? Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : null;

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

  /** Deposit input using MontoInputValidado */
  const renderDepositInput = (required = false) => (
    <MontoInputValidado
      value={amount}
      onChange={setAmount}
      label="Monto de seña recibido"
      required={required}
      min={propertyValue > 0 ? minDeposit : undefined}
      max={propertyValue > 0 ? propertyValue : undefined}
      minLabel="50% del valor"
      maxLabel="valor de la propiedad"
      helpText={propertyValue > 0 ? `Valor de propiedad: ₲ ${propertyValue.toLocaleString('es-PY')} · Seña mínima (50%): ₲ ${minDeposit.toLocaleString('es-PY')}` : undefined}
    />
  );

  /** Expiration badge for reserved properties */
  const ExpirationBadge = () => {
    if (!expiresAt || !daysLeft) return null;
    return (
      <div className={`p-2 rounded-lg text-xs font-medium flex items-center gap-1.5 ${
        daysLeft <= 1 ? 'bg-destructive/10 text-destructive border border-destructive/30' :
        daysLeft <= 3 ? 'bg-warning/10 text-warning border border-warning/30' :
        'bg-muted text-muted-foreground border border-border'
      }`}>
        <AlertTriangle className="w-3.5 h-3.5" />
        {daysLeft === 0
          ? 'Reserva vence hoy'
          : `Vence en ${daysLeft} día${daysLeft > 1 ? 's' : ''} (${expiresAt.toLocaleDateString('es-PY')})`}
      </div>
    );
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-lg">{titles[mode]}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Propiedad: <span className="font-medium text-foreground">{property?.title}</span>
          </p>

          {/* Show expiration badge on cancel/confirm/transfer */}
          {(mode === 'cancel' || mode === 'confirm' || mode === 'transfer') && <ExpirationBadge />}

          {/* === AGENT REQUEST === */}
          {mode === 'request' && (
            <>
              <p className="text-sm text-muted-foreground">
                Tu solicitud será enviada a Secretaría/Admin para su aprobación. La propiedad <strong>no se bloquea</strong> hasta que sea aprobada.
              </p>
              {/* Business rules info */}
              <div className="p-3 rounded-xl bg-muted border border-border space-y-1">
                <p className="text-xs font-semibold text-foreground">📋 Reglas de reserva:</p>
                <p className="text-xs text-muted-foreground">• Seña mínima: 50% del valor de la propiedad</p>
                <p className="text-xs text-muted-foreground">• Plazo máximo: {RESERVATION_DAYS} días corridos</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Nombre del cliente <span className="text-muted-foreground font-normal">(opcional)</span>
                </label>
                <input value={clientName} onChange={e => setClientName(e.target.value)} className="input-field" placeholder="Ej: María García" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Monto de seña propuesto <span className="text-muted-foreground font-normal">(opcional)</span>
                </label>
                <input type="text" inputMode="numeric" value={amount} onChange={e => { const v = e.target.value.replace(/\D/g, ''); setAmount(v); }} className="input-field"
                  placeholder={minDeposit > 0 ? `Mín. recomendado: ₲ ${minDeposit.toLocaleString('es-PY')}` : '0'} />
                {propertyValue > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Seña mínima requerida: ₲ {minDeposit.toLocaleString('es-PY')} (50% de ₲ {propertyValue.toLocaleString('es-PY')})
                  </p>
                )}
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

          {/* === CANCEL REQUEST === */}
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

          {/* === APPROVE REQUEST (with deposit validation) === */}
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
                  <p className="text-xs text-muted-foreground">Seña propuesta: <span className="font-medium text-foreground">₲ {Number(property.reservation_request_amount).toLocaleString('es-PY')}</span></p>
                )}
              </div>

              {/* Deposit validation */}
              {renderDepositInput(true)}

              <div className="p-3 rounded-xl bg-warning/10 border border-warning/30 space-y-1">
                <p className="text-xs font-semibold text-foreground">⚠️ Al aprobar:</p>
                <p className="text-xs text-muted-foreground">• La propiedad quedará bloqueada por {RESERVATION_DAYS} días</p>
                <p className="text-xs text-muted-foreground">• Si no se firma contrato, se libera automáticamente</p>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => onOpenChange(false)} className="px-4 py-2 rounded-lg bg-muted text-muted-foreground text-sm font-medium">Cancelar</button>
                <ValidatedSubmitButton
                  validation={depositValidation}
                  hasValue={hasDepositValue}
                  loading={loading}
                  onClick={handleApprove}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-success text-success-foreground text-sm font-medium hover:bg-success/90"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Aprobar Reserva
                </ValidatedSubmitButton>
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

          {/* === ADMIN DIRECT RESERVE (with deposit validation) === */}
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
              {renderDepositInput(true)}
              <div className="p-2 rounded-lg bg-muted border border-border">
                <p className="text-xs text-muted-foreground">⏱ La reserva vencerá automáticamente en {RESERVATION_DAYS} días si no se firma contrato.</p>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => onOpenChange(false)} className="px-4 py-2 rounded-lg bg-muted text-muted-foreground text-sm font-medium">Cancelar</button>
                <ValidatedSubmitButton
                  validation={depositValidation}
                  hasValue={hasDepositValue}
                  loading={loading}
                  onClick={handleReserve}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-warning text-warning-foreground text-sm font-medium hover:bg-warning/90"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                  Reservar
                </ValidatedSubmitButton>
              </div>
            </>
          )}

          {mode === 'cancel' && (
            <>
              <p className="text-sm text-destructive">¿Estás seguro de cancelar la reserva? La propiedad volverá a estar disponible.</p>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Motivo de cancelación <span className="text-destructive">*</span>
                </label>
                <select
                  value={cancelReason}
                  onChange={e => setCancelReason(e.target.value)}
                  className="input-field mb-2"
                >
                  <option value="">-- Seleccionar motivo --</option>
                  <option value="Cliente no confirmó">Cliente no confirmó</option>
                  <option value="No se realizó el pago">No se realizó el pago</option>
                  <option value="Cliente desistió">Cliente desistió</option>
                  <option value="Propiedad ya no disponible">Propiedad ya no disponible</option>
                  <option value="Error administrativo">Error administrativo</option>
                  <option value="Vencimiento de plazo">Vencimiento de plazo</option>
                  <option value="Otro">Otro</option>
                </select>
                {cancelReason === 'Otro' && (
                  <input
                    value={cancelReasonCustom}
                    onChange={e => setCancelReasonCustom(e.target.value)}
                    className="input-field"
                    placeholder="Especificar motivo..."
                  />
                )}
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => onOpenChange(false)} className="px-4 py-2 rounded-lg bg-muted text-muted-foreground text-sm font-medium">No, mantener</button>
                <button onClick={handleCancel} disabled={loading || !cancelReason || (cancelReason === 'Otro' && !cancelReasonCustom.trim())}
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

    {/* Auto commission dialog after confirming rental */}
    {confirmedProperty && (
      <PostRentalCommissionDialog
        open={showCommissionDialog}
        onOpenChange={(v) => {
          setShowCommissionDialog(v);
          if (!v) setConfirmedProperty(null);
        }}
        property={confirmedProperty}
      />
    )}
    </>
  );
};
