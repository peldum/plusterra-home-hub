import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Loader2, ArrowDownLeft, ArrowUpRight, Car, PackageOpen,
  ClipboardList, Coins, Receipt, Lightbulb, Building2, Wifi,
  Users, Megaphone, Wrench, HelpCircle,
} from 'lucide-react';

// ─── Categorías unificadas con el módulo de Finanzas ─────────────────────────
const CATEGORIAS_INGRESO = [
  { value: 'canon_agente_cobro', label: 'Cobro canon agente', icon: Coins },
  { value: 'alquiler', label: 'Cobro alquiler', icon: Building2 },
  { value: 'comision', label: 'Comisión', icon: Receipt },
  { value: 'otro_ingreso', label: 'Otro ingreso', icon: HelpCircle },
];

const CATEGORIAS_EGRESO = [
  { value: 'uber_movilidad', label: 'Uber / Movilidad', icon: Car },
  { value: 'envio_encomienda', label: 'Envío / Encomienda', icon: PackageOpen },
  { value: 'insumos_oficina', label: 'Insumos de oficina', icon: ClipboardList },
  { value: 'alquiler_oficina', label: 'Alquiler oficina', icon: Building2 },
  { value: 'internet', label: 'Internet', icon: Wifi },
  { value: 'servicios', label: 'Servicios (luz, agua)', icon: Lightbulb },
  { value: 'salarios', label: 'Salarios', icon: Users },
  { value: 'marketing', label: 'Marketing', icon: Megaphone },
  { value: 'mantenimiento', label: 'Mantenimiento', icon: Wrench },
  { value: 'otro_operativo', label: 'Otro gasto', icon: HelpCircle },
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultType?: 'income' | 'expense';
}

export const NuevoMovimientoDialog = ({ open, onOpenChange, defaultType = 'income' }: Props) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const today = new Date().toISOString().split('T')[0];

  const [tipo, setTipo] = useState<'income' | 'expense'>(defaultType);
  const [form, setForm] = useState({
    description: '',
    amount: '',
    category: defaultType === 'income' ? 'otro_ingreso' : 'otro_operativo',
    payment_date: today,
    payment_method: 'efectivo',
    notes: '',
  });
  const [isPending, setIsPending] = useState(false);

  const categorias = tipo === 'income' ? CATEGORIAS_INGRESO : CATEGORIAS_EGRESO;

  const resetForm = () => {
    setTipo(defaultType);
    setForm({
      description: '', amount: '',
      category: defaultType === 'income' ? 'otro_ingreso' : 'otro_operativo',
      payment_date: today, payment_method: 'efectivo', notes: '',
    });
  };

  const handleTipoChange = (newTipo: 'income' | 'expense') => {
    setTipo(newTipo);
    setForm(f => ({
      ...f,
      category: newTipo === 'income' ? 'otro_ingreso' : 'otro_operativo',
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const monto = parseFloat(form.amount);
    if (!form.description.trim() || isNaN(monto) || monto <= 0) {
      toast.error('Completá la descripción y un monto válido.');
      return;
    }

    setIsPending(true);
    const { error } = await supabase.from('payments').insert({
      description: form.description.trim(),
      amount: monto,
      category: form.category,
      payment_type: tipo as 'income' | 'expense',
      payment_date: form.payment_date,
      payment_method: form.payment_method,
      notes: form.notes.trim() || null,
      currency: 'PYG' as const,
      status: 'paid' as const,
      created_by: user!.id,
    });
    setIsPending(false);

    if (error) {
      toast.error('Error al registrar: ' + error.message);
      return;
    }

    const label = tipo === 'income' ? 'Ingreso' : 'Egreso';
    toast.success(`${label} registrado correctamente`);
    qc.invalidateQueries({ queryKey: ['secretaria-caja'] });
    qc.invalidateQueries({ queryKey: ['admin-payments'] });
    qc.invalidateQueries({ queryKey: ['payments'] });
    resetForm();
    onOpenChange(false);
  };

  const isIngreso = tipo === 'income';

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            {isIngreso
              ? <ArrowDownLeft className="w-5 h-5 text-success" />
              : <ArrowUpRight className="w-5 h-5 text-destructive" />}
            Registrar {isIngreso ? 'Ingreso' : 'Egreso'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Selector de tipo */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleTipoChange('income')}
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                isIngreso
                  ? 'border-success bg-success/10 text-success'
                  : 'border-border text-muted-foreground hover:bg-muted/60'
              }`}
            >
              <ArrowDownLeft className="w-4 h-4" />
              Ingreso
            </button>
            <button
              type="button"
              onClick={() => handleTipoChange('expense')}
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                !isIngreso
                  ? 'border-destructive bg-destructive/10 text-destructive'
                  : 'border-border text-muted-foreground hover:bg-muted/60'
              }`}
            >
              <ArrowUpRight className="w-4 h-4" />
              Egreso
            </button>
          </div>

          {/* Categoría */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Categoría *</label>
            <div className="grid grid-cols-2 gap-2 max-h-[180px] overflow-y-auto pr-1">
              {categorias.map(cat => {
                const Icon = cat.icon;
                const selected = form.category === cat.value;
                return (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, category: cat.value }))}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors text-left ${
                      selected
                        ? isIngreso
                          ? 'bg-success/10 border-success/30 text-success'
                          : 'bg-destructive/10 border-destructive/30 text-destructive'
                        : 'border-border text-muted-foreground hover:bg-muted/60'
                    }`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Concepto */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Concepto / Descripción *</label>
            <input
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="input-field"
              placeholder={isIngreso ? 'Ej: Cobro alquiler depto 3B' : 'Ej: Uber para visita propiedad Centro'}
              required
              maxLength={200}
            />
          </div>

          {/* Monto y Fecha */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Monto ₲ *</label>
              <input
                type="number"
                min={1}
                step={1}
                value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                className="input-field"
                placeholder="0"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Fecha</label>
              <input
                type="date"
                value={form.payment_date}
                onChange={e => setForm(f => ({ ...f, payment_date: e.target.value }))}
                className="input-field"
                max={today}
              />
            </div>
          </div>

          {/* Método de pago */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Método de pago</label>
            <select
              value={form.payment_method}
              onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}
              className="input-field"
            >
              <option value="efectivo">Efectivo</option>
              <option value="transferencia">Transferencia</option>
              <option value="cheque">Cheque</option>
              <option value="tarjeta">Tarjeta</option>
            </select>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Observación (opcional)</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="input-field min-h-[60px] resize-none"
              placeholder="Detalle adicional..."
              maxLength={400}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={() => { resetForm(); onOpenChange(false); }}
              className="px-4 py-2 rounded-lg bg-muted text-muted-foreground text-sm font-medium hover:bg-muted/80 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                isIngreso
                  ? 'bg-success text-white hover:bg-success/90'
                  : 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
              }`}
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Registrar {isIngreso ? 'Ingreso' : 'Egreso'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
