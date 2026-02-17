import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface IncomeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const IncomeFormDialog = ({ open, onOpenChange }: IncomeFormDialogProps) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [isPending, setIsPending] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  const [form, setForm] = useState({
    description: '',
    amount: 0,
    category: 'Alquiler',
    payment_date: today,
    payment_method: 'transferencia',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.description.trim() || form.amount <= 0) return;

    setIsPending(true);
    const { error } = await supabase.from('payments').insert({
      description: form.description,
      amount: form.amount,
      category: form.category,
      payment_type: 'income' as const,
      payment_date: form.payment_date,
      payment_method: form.payment_method,
      notes: form.notes || null,
      created_by: user!.id,
    });
    setIsPending(false);

    if (error) {
      toast.error('Error al registrar ingreso: ' + error.message);
      return;
    }

    toast.success('Ingreso registrado exitosamente');
    qc.invalidateQueries({ queryKey: ['payments'] });
    setForm({ description: '', amount: 0, category: 'Alquiler', payment_date: today, payment_method: 'transferencia', notes: '' });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Registrar Ingreso</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Descripción *</label>
            <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="input-field" placeholder="Ej: Cobro alquiler mensual" required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Monto *</label>
              <input type="number" min={1} value={form.amount} onChange={e => setForm(f => ({ ...f, amount: +e.target.value }))}
                className="input-field" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Categoría</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="input-field">
                <option value="Alquiler">Alquiler</option>
                <option value="Venta">Venta</option>
                <option value="Comisión">Comisión</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Fecha</label>
              <input type="date" value={form.payment_date} onChange={e => setForm(f => ({ ...f, payment_date: e.target.value }))}
                className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Método de pago</label>
              <select value={form.payment_method} onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}
                className="input-field">
                <option value="transferencia">Transferencia</option>
                <option value="efectivo">Efectivo</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Notas</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="input-field min-h-[60px] resize-y" placeholder="Observaciones..." />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button type="button" onClick={() => onOpenChange(false)}
              className="px-4 py-2 rounded-lg bg-muted text-muted-foreground text-sm font-medium hover:bg-muted/80 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={isPending}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Registrar Ingreso
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
