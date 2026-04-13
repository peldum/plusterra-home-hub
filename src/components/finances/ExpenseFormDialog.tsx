import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface ExpenseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ExpenseFormDialog = ({ open, onOpenChange }: ExpenseFormDialogProps) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [isPending, setIsPending] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  const [form, setForm] = useState({
    description: '',
    amount: '',
    category: 'alquiler_oficina',
    payment_date: today,
    payment_method: 'transferencia',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Number(form.amount) || 0;
    if (!form.description.trim() || numAmount <= 0) return;

    setIsPending(true);
    const { error } = await supabase.from('payments').insert({
      description: form.description,
      amount: numAmount,
      category: form.category,
      payment_type: 'expense' as const,
      payment_date: form.payment_date,
      payment_method: form.payment_method,
      notes: form.notes || null,
      status: 'paid' as const,
      created_by: user!.id,
    });
    setIsPending(false);

    if (error) {
      toast.error('Error al registrar egreso: ' + error.message);
      return;
    }

    toast.success('Egreso registrado exitosamente');
    qc.invalidateQueries({ queryKey: ['admin-payments'] });
    qc.invalidateQueries({ queryKey: ['payments'] });
    setForm({
      description: '', amount: '', category: 'alquiler_oficina',
      payment_date: today, payment_method: 'transferencia', notes: '',
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Registrar Egreso</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-medium text-foreground mb-1">Categoría</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="input-field">
                <option value="alquiler_oficina">Alquiler oficina</option>
                <option value="internet">Internet</option>
                <option value="servicios">Servicios (luz, agua, etc.)</option>
                <option value="salarios">Salarios</option>
                <option value="impuesto">Impuestos</option>
                <option value="mantenimiento">Mantenimiento</option>
                <option value="insumos">Insumos / Papelería</option>
                <option value="marketing">Marketing / Publicidad</option>
                <option value="otro">Otro</option>
              </select>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-medium text-foreground mb-1">Monto (Gs.) *</label>
              <input type="text" inputMode="numeric" value={form.amount ? Number(form.amount).toLocaleString('es-PY') : ''} onChange={e => setForm(f => ({ ...f, amount: e.target.value.replace(/\D/g, '') }))}
                placeholder="Ej: 500.000"
                className="input-field" required />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Descripción *</label>
            <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="input-field" placeholder="Ej: Pago internet mes de marzo" required />
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
                <option value="tarjeta">Tarjeta</option>
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
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 transition-colors disabled:opacity-50">
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Registrar Egreso
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
