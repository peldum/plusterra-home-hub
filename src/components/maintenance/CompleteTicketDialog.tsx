import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MoneyInput } from '@/components/ui/money-input';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, CheckCircle, Wallet } from 'lucide-react';

interface CompleteTicketDialogProps {
  ticket: any | null;
  providers?: { id: string; name: string }[];
  onClose: () => void;
}

export const CompleteTicketDialog = ({ ticket, providers = [], onClose }: CompleteTicketDialogProps) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const today = new Date().toISOString().split('T')[0];

  const [actualCost, setActualCost] = useState<number | ''>(ticket?.actual_cost || ticket?.estimated_cost || '');
  const [completedDate, setCompletedDate] = useState<string>(today);
  const [providerId, setProviderId] = useState<string>(ticket?.provider_id || '');
  const [registerExpense, setRegisterExpense] = useState<boolean>(true);
  const [notes, setNotes] = useState<string>(ticket?.notes || '');

  const completeMutation = useMutation({
    mutationFn: async () => {
      if (!ticket) throw new Error('No ticket');
      const cost = actualCost === '' ? 0 : Number(actualCost);

      // 1) Update ticket
      const ticketUpdates: any = {
        status: 'completed',
        completed_date: completedDate,
        actual_cost: cost > 0 ? cost : null,
        provider_id: providerId || null,
        notes: notes || null,
        updated_at: new Date().toISOString(),
      };
      const { error: upErr } = await supabase
        .from('maintenance_tickets')
        .update(ticketUpdates)
        .eq('id', ticket.id);
      if (upErr) throw upErr;

      // 2) Optional: register payment expense
      if (registerExpense && cost > 0) {
        const propTitle = ticket?.properties?.title || ticket?.properties?.property_code || 'Propiedad';
        const description = `Mantenimiento: ${ticket.description} (${propTitle})`;
        const { error: payErr } = await supabase.from('payments').insert({
          payment_type: 'expense',
          category: 'mantenimiento',
          description,
          amount: cost,
          payment_date: completedDate,
          payment_method: 'efectivo',
          monto_efectivo: cost,
          monto_banco: 0,
          currency: ticket.currency || 'PYG',
          status: 'paid',
          notes: `Ticket de mantenimiento ID: ${ticket.id}`,
          property_id: ticket.property_id || null,
          created_by: user!.id,
        });
        if (payErr) throw payErr;
      }

      return { cost, registered: registerExpense && cost > 0 };
    },
    onSuccess: ({ cost, registered }) => {
      qc.invalidateQueries({ queryKey: ['maintenance_tickets'] });
      qc.invalidateQueries({ queryKey: ['maintenance_tickets_with_expense'] });
      qc.invalidateQueries({ queryKey: ['payments'] });
      qc.invalidateQueries({ queryKey: ['admin-payments'] });
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
      qc.invalidateQueries({ queryKey: ['plusterra-income-widget'] });
      if (registered) {
        toast.success(`Ticket completado · Egreso de Gs. ${Math.round(cost).toLocaleString('es-PY')} registrado en Finanzas`);
      } else {
        toast.success('Ticket marcado como completado');
      }
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const numericCost = actualCost === '' ? 0 : Number(actualCost);

  return (
    <Dialog open={!!ticket} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-success" />
            Completar Ticket
          </DialogTitle>
        </DialogHeader>
        {ticket && (
          <form
            onSubmit={(e) => { e.preventDefault(); completeMutation.mutate(); }}
            className="space-y-4"
          >
            <div className="bg-muted/40 rounded-lg p-3 text-sm">
              <p className="font-medium text-foreground line-clamp-2">{ticket.description}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {ticket?.properties?.title || 'Propiedad'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Costo Real</label>
              <MoneyInput
                value={actualCost}
                onChange={(v) => setActualCost(v)}
                currency="Gs."
                placeholder="0"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Dejá en 0 si no hubo costo. El monto se registrará como egreso en Finanzas.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Fecha realización</label>
                <input
                  type="date"
                  value={completedDate}
                  onChange={(e) => setCompletedDate(e.target.value)}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Proveedor</label>
                <select
                  value={providerId}
                  onChange={(e) => setProviderId(e.target.value)}
                  className="input-field"
                >
                  <option value="">Sin asignar</option>
                  {providers.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Notas (opcional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="input-field min-h-[60px]"
                placeholder="Detalle del trabajo realizado..."
              />
            </div>

            <label className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
              registerExpense ? 'border-primary bg-primary/5' : 'border-border bg-background'
            } ${numericCost <= 0 ? 'opacity-60' : ''}`}>
              <Checkbox
                checked={registerExpense}
                onCheckedChange={(v) => setRegisterExpense(!!v)}
                disabled={numericCost <= 0}
                className="mt-0.5"
              />
              <div className="flex-1">
                <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  <Wallet className="w-4 h-4 text-primary" />
                  Registrar este monto como egreso en Finanzas
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Aparecerá automáticamente en <strong>Finanzas → Egresos</strong> con categoría "Mantenimiento".
                  {numericCost <= 0 && ' (Cargá un costo mayor a 0 para activar)'}
                </p>
              </div>
            </label>

            <div className="flex justify-end gap-3 pt-2 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-muted text-muted-foreground text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={completeMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-success text-success-foreground text-sm font-medium disabled:opacity-50"
              >
                {completeMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Confirmar Completado
              </button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};