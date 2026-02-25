import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, Lock, Unlock, CheckCircle2 } from 'lucide-react';

interface ReservationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  property: any;
  mode: 'reserve' | 'cancel' | 'confirm';
}

export const ReservationDialog = ({ open, onOpenChange, property, mode }: ReservationDialogProps) => {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState('');
  const [clientName, setClientName] = useState('');

  const handleReserve = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('properties')
        .update({
          status: 'reserved' as any,
          reserved_by: user.id,
          reserved_at: new Date().toISOString(),
          reservation_amount: amount ? Number(amount) : null,
          reservation_client_name: clientName.trim() || null,
        })
        .eq('id', property.id)
        .eq('status', 'available');
      if (error) throw error;

      // Audit log
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: 'reserve_property',
        target_table: 'properties',
        target_id: property.id,
        new_data: {
          status: 'reserved',
          reserved_by: user.id,
          agent_name: profile?.full_name,
          reservation_amount: amount || null,
          reservation_client_name: clientName || null,
        },
      });

      qc.invalidateQueries({ queryKey: ['available-properties'] });
      qc.invalidateQueries({ queryKey: ['properties'] });
      qc.invalidateQueries({ queryKey: ['property-overview-stats'] });
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
        },
        new_data: { status: 'available', cancelled_by: user.id, agent_name: profile?.full_name },
      });

      qc.invalidateQueries({ queryKey: ['available-properties'] });
      qc.invalidateQueries({ queryKey: ['properties'] });
      qc.invalidateQueries({ queryKey: ['property-overview-stats'] });
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
      // Determine target status based on operation type
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

      qc.invalidateQueries({ queryKey: ['available-properties'] });
      qc.invalidateQueries({ queryKey: ['properties'] });
      qc.invalidateQueries({ queryKey: ['property-overview-stats'] });
      toast.success(`Propiedad marcada como ${targetStatus === 'rented' ? 'alquilada' : 'vendida'}`);
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
        </div>
      </DialogContent>
    </Dialog>
  );
};
