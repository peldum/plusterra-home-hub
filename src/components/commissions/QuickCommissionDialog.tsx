import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, ToggleLeft, ToggleRight } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const QuickCommissionDialog = ({ open, onOpenChange }: Props) => {
  const { user, role } = useAuth();
  const qc = useQueryClient();
  const [isPending, setIsPending] = useState(false);
  const isAdmin = role === 'admin' || role === 'superadmin';

  const today = new Date().toISOString().split('T')[0];
  const currentPeriod = new Date().toISOString().slice(0, 7);

  const [form, setForm] = useState({
    operation_type: 'rental' as 'rental' | 'sale',
    property_source: 'external' as 'internal' | 'external',
    property_id: '',
    property_address: '',
    gross_amount: 0,
    currency: 'PYG',
    operation_date: today,
    is_cobroker: false,
    cobroker_name: '',
    cobroker_company: '',
    is_recurring_rental: false,
    recurring_period: currentPeriod,
    notes: '',
    agent_id: '', // only for admin
  });

  // Internal properties list
  const { data: properties } = useQuery({
    queryKey: ['quick-comm-properties'],
    queryFn: async () => {
      const { data } = await supabase
        .from('properties')
        .select('id, title, property_code')
        .order('title');
      return data || [];
    },
    enabled: open && form.property_source === 'internal',
  });

  // Agents list (admin only)
  const { data: agentsList } = useQuery({
    queryKey: ['quick-comm-agents'],
    queryFn: async () => {
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'agent');
      if (!roles?.length) return [];
      const ids = roles.map(r => r.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', ids)
        .order('full_name');
      return profiles || [];
    },
    enabled: open && isAdmin,
  });

  // Split calculation
  const split = useMemo(() => {
    const gross = form.gross_amount || 0;
    const companyPct = 15;
    const companyAmt = Math.round(gross * companyPct / 100);
    const agentAmt = gross - companyAmt;
    return { companyPct, companyAmt, agentAmt, agentPct: 85 };
  }, [form.gross_amount]);

  const formatAmount = (n: number) => {
    if (form.currency === 'USD') {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n);
    }
    return new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', maximumFractionDigits: 0 }).format(n);
  };

  const resetForm = () => {
    setForm({
      operation_type: 'rental', property_source: 'external', property_id: '',
      property_address: '', gross_amount: 0, currency: 'PYG', operation_date: today,
      is_cobroker: false, cobroker_name: '', cobroker_company: '',
      is_recurring_rental: false, recurring_period: currentPeriod, notes: '', agent_id: '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.gross_amount <= 0) {
      toast.error('Ingresá un monto válido');
      return;
    }

    const agentId = isAdmin ? form.agent_id : user!.id;
    if (!agentId) {
      toast.error('Seleccioná un agente');
      return;
    }

    setIsPending(true);

    const { error } = await supabase.from('quick_commissions' as any).insert({
      agent_id: agentId,
      created_by: user!.id,
      operation_type: form.operation_type,
      property_source: form.property_source,
      property_id: form.property_source === 'internal' && form.property_id ? form.property_id : null,
      property_address: form.property_source === 'external' ? form.property_address : null,
      gross_amount: form.gross_amount,
      company_pct: split.companyPct,
      company_amount: split.companyAmt,
      net_amount: split.agentAmt,
      currency: form.currency,
      operation_date: form.operation_date,
      is_cobroker: form.is_cobroker,
      cobroker_name: form.is_cobroker ? form.cobroker_name : null,
      cobroker_company: form.is_cobroker ? form.cobroker_company : null,
      is_recurring_rental: form.is_recurring_rental,
      recurring_period: form.is_recurring_rental ? form.recurring_period : null,
      notes: form.notes || null,
    });

    setIsPending(false);
    if (error) {
      toast.error('Error al registrar comisión: ' + error.message);
      return;
    }

    toast.success('Comisión rápida registrada exitosamente');
    qc.invalidateQueries({ queryKey: ['quick-commissions'] });
    qc.invalidateQueries({ queryKey: ['agent-my-commissions'] });
    resetForm();
    onOpenChange(false);
  };

  const set = (patch: Partial<typeof form>) => setForm(f => ({ ...f, ...patch }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Registrar Comisión Rápida</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Admin: agent selector */}
          {isAdmin && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Agente *</label>
              <select value={form.agent_id} onChange={e => set({ agent_id: e.target.value })}
                className="input-field" required>
                <option value="">Seleccionar agente...</option>
                {(agentsList || []).map(a => (
                  <option key={a.id} value={a.id}>{a.full_name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Operation type + currency */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Tipo de operación</label>
              <select value={form.operation_type} onChange={e => set({ operation_type: e.target.value as any })}
                className="input-field">
                <option value="rental">Alquiler</option>
                <option value="sale">Venta</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Moneda</label>
              <select value={form.currency} onChange={e => set({ currency: e.target.value })}
                className="input-field">
                <option value="PYG">Guaraníes (₲)</option>
                <option value="USD">Dólares (USD)</option>
              </select>
            </div>
          </div>

          {/* Property source toggle */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Propiedad</label>
            <button type="button" onClick={() => set({ property_source: form.property_source === 'internal' ? 'external' : 'internal', property_id: '', property_address: '' })}
              className="flex items-center gap-2 text-sm text-primary hover:underline mb-2">
              {form.property_source === 'internal' ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
              {form.property_source === 'internal' ? 'Propiedad interna' : 'Propiedad externa (texto libre)'}
            </button>
            {form.property_source === 'internal' ? (
              <select value={form.property_id} onChange={e => set({ property_id: e.target.value })}
                className="input-field">
                <option value="">Seleccionar propiedad...</option>
                {(properties || []).map(p => (
                  <option key={p.id} value={p.id}>{p.property_code} — {p.title}</option>
                ))}
              </select>
            ) : (
              <input value={form.property_address} onChange={e => set({ property_address: e.target.value })}
                className="input-field" placeholder="Ej: Av. España 1234, Asunción" />
            )}
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Monto total de comisión *</label>
            <input type="number" min={1} value={form.gross_amount || ''} onChange={e => set({ gross_amount: +e.target.value })}
              className="input-field" placeholder="0" required />
          </div>

          {/* Split preview */}
          {form.gross_amount > 0 && (
            <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
              <p className="text-sm font-semibold text-foreground">Desglose automático</p>
              <div className="flex justify-between text-sm">
                <span className="text-success font-medium">Tu comisión ({split.agentPct}%)</span>
                <span className="font-bold text-success">{formatAmount(split.agentAmt)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Retención Plusterra ({split.companyPct}%)</span>
                <span className="font-semibold text-foreground">{formatAmount(split.companyAmt)}</span>
              </div>
            </div>
          )}

          {/* Operation date */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Fecha de operación</label>
            <input type="date" value={form.operation_date} onChange={e => set({ operation_date: e.target.value })}
              className="input-field" />
          </div>

          {/* Co-broker */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-foreground cursor-pointer">
              <input type="checkbox" checked={form.is_cobroker} onChange={e => set({ is_cobroker: e.target.checked })}
                className="rounded border-border" />
              Co-broker externo
            </label>
            {form.is_cobroker && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Nombre del colega</label>
                  <input value={form.cobroker_name} onChange={e => set({ cobroker_name: e.target.value })}
                    className="input-field" placeholder="Nombre" />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Inmobiliaria</label>
                  <input value={form.cobroker_company} onChange={e => set({ cobroker_company: e.target.value })}
                    className="input-field" placeholder="Nombre empresa" />
                </div>
              </div>
            )}
          </div>

          {/* Recurring rental */}
          {form.operation_type === 'rental' && (
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-foreground cursor-pointer">
                <input type="checkbox" checked={form.is_recurring_rental} onChange={e => set({ is_recurring_rental: e.target.checked })}
                  className="rounded border-border" />
                ¿Es un alquiler recurrente?
              </label>
              {form.is_recurring_rental && (
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Mes correspondiente</label>
                  <input type="month" value={form.recurring_period} onChange={e => set({ recurring_period: e.target.value })}
                    className="input-field" />
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Observaciones</label>
            <textarea value={form.notes} onChange={e => set({ notes: e.target.value })}
              className="input-field min-h-[60px] resize-y" placeholder="Detalles adicionales..." />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button type="button" onClick={() => onOpenChange(false)}
              className="px-4 py-2 rounded-lg bg-muted text-muted-foreground text-sm font-medium hover:bg-muted/80 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={isPending || form.gross_amount <= 0 || (isAdmin && !form.agent_id)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Registrar Comisión
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
