import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, Lock, Unlock, CheckCircle2, ArrowRightLeft } from 'lucide-react';

interface ReservationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  property: any;
  mode: 'reserve' | 'cancel' | 'confirm' | 'transfer';
}

export const ReservationDialog = ({ open, onOpenChange, property, mode }: ReservationDialogProps) => {
  const { user, profile, role, isAdmin } = useAuth();
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState('');
  const [clientName, setClientName] = useState('');
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [transferReason, setTransferReason] = useState('');
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
  };

  const handleReserve = async () => {
    if (!user) return;
    const reservingAgentId = isAdmin && selectedAgentId ? selectedAgentId : user.id;
    const reservingAgentName = isAdmin && selectedAgentId
      ? agents.find(a => a.id === selectedAgentId)?.full_name || ''
      : profile?.full_name || '';

    setLoading(true);
    try {
      // ATOMIC: Only update if status is still 'available'
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

      // RACE CONDITION CHECK: If no row was updated, someone else reserved first
      if (!updated) {
        // Fetch who reserved it
        const { data: fresh } = await supabase
          .from('properties')
          .select('status, reserved_by')
          .eq('id', property.id)
          .single();

        let rivalName = 'otro agente';
        if (fresh?.reserved_by) {
          const { data: rivalProfile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', fresh.reserved_by)
            .single();
          if (rivalProfile) rivalName = rivalProfile.full_name;
        }

        invalidateAll();
        toast.error(
          `Esta propiedad fue reservada hace unos segundos por ${rivalName}. La vista se ha actualizado.`,
          { duration: 6000 }
        );
        onOpenChange(false);
        return;
      }

      // Audit log
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: 'reserve_property',
        target_table: 'properties',
        target_id: property.id,
        new_data: {
          status: 'reserved',
          reserved_by: reservingAgentId,
          agent_name: reservingAgentName,
          reserved_by_admin: isAdmin ? user.id : null,
          reservation_amount: amount || null,
          reservation_client_name: clientName || null,
        },
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
        old_data: {
          reserved_by: property.reserved_by,
          previous_agent: property.reserved_by_name,
        },
        new_data: {
          reserved_by: selectedAgentId,
          new_agent: newAgentName,
          transferred_by: user.id,
          reason: transferReason || null,
        },
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
    reserve: 'Reservar Propiedad',
    cancel: 'Cancelar Reserva',
    confirm: 'Confirmar Operación',
    transfer: 'Transferir Reserva',
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

          {mode === 'reserve' && (
            <>
              {isAdmin && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Agente que reserva
                  </label>
                  <select
                    value={selectedAgentId}
                    onChange={e => setSelectedAgentId(e.target.value)}
                    className="input-field"
                  >
                    <option value="">-- Yo mismo --</option>
                    {agents.map(a => (
                      <option key={a.id} value={a.id}>{a.full_name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Nombre del cliente <span className="text-muted-foreground font-normal">(opcional)</span>
                </label>
                <input
                  value={clientName}
                  onChange={e => setClientName(e.target.value)}
                  className="input-field"
                  placeholder="Ej: María García"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Monto de seña <span className="text-muted-foreground font-normal">(opcional)</span>
                </label>
                <input
                  type="number"
                  min={0}
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="input-field"
                  placeholder="0"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => onOpenChange(false)}
                  className="px-4 py-2 rounded-lg bg-muted text-muted-foreground text-sm font-medium">
                  Cancelar
                </button>
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
              <p className="text-sm text-destructive">
                ¿Estás seguro de cancelar la reserva? La propiedad volverá a estar disponible.
              </p>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => onOpenChange(false)}
                  className="px-4 py-2 rounded-lg bg-muted text-muted-foreground text-sm font-medium">
                  No, mantener
                </button>
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
                <button onClick={() => onOpenChange(false)}
                  className="px-4 py-2 rounded-lg bg-muted text-muted-foreground text-sm font-medium">
                  Cancelar
                </button>
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
                <label className="block text-sm font-medium text-foreground mb-1">
                  Transferir a
                </label>
                <select
                  value={selectedAgentId}
                  onChange={e => setSelectedAgentId(e.target.value)}
                  className="input-field"
                >
                  <option value="">-- Seleccionar agente --</option>
                  {agents.filter(a => a.id !== property?.reserved_by).map(a => (
                    <option key={a.id} value={a.id}>{a.full_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Motivo <span className="text-muted-foreground font-normal">(opcional)</span>
                </label>
                <input
                  value={transferReason}
                  onChange={e => setTransferReason(e.target.value)}
                  className="input-field"
                  placeholder="Ej: Reasignación de zona"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => onOpenChange(false)}
                  className="px-4 py-2 rounded-lg bg-muted text-muted-foreground text-sm font-medium">
                  Cancelar
                </button>
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