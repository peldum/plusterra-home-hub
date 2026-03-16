/**
 * EgresosTab — Solo egresos registrados con categoría, monto, fecha.
 */
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, ArrowUpRight, Plus } from 'lucide-react';
import { ExpenseFormDialog } from '@/components/finances/ExpenseFormDialog';

const fmtPYG = (n: number) =>
  new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', minimumFractionDigits: 0 }).format(n);

const categoryLabels: Record<string, string> = {
  mantenimiento: 'Mantenimiento', impuesto: 'Impuesto', alquiler_oficina: 'Alquiler oficina',
  internet: 'Internet', servicios: 'Servicios', salarios: 'Salarios',
  insumos: 'Insumos', marketing: 'Marketing', otro: 'Otro',
};

export const EgresosTab = () => {
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterMonth, setFilterMonth] = useState('all');
  const [expenseOpen, setExpenseOpen] = useState(false);

  const { data: expenses, isLoading } = useQuery({
    queryKey: ['expenses-finance'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('id, description, category, amount, currency, payment_date, status, created_by')
        .eq('payment_type', 'expense')
        .order('payment_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const months = useMemo(() => {
    const set = new Set((expenses || []).map(e => e.payment_date?.slice(0, 7)));
    return Array.from(set).filter(Boolean).sort().reverse();
  }, [expenses]);

  const categories = useMemo(() => {
    const set = new Set((expenses || []).map(e => e.category));
    return Array.from(set).sort();
  }, [expenses]);

  const filtered = useMemo(() => {
    return (expenses || []).filter(e => {
      if (filterCategory !== 'all' && e.category !== filterCategory) return false;
      if (filterMonth !== 'all' && !e.payment_date?.startsWith(filterMonth)) return false;
      return true;
    });
  }, [expenses, filterCategory, filterMonth]);

  const totalEgresos = filtered.reduce((s, e) => s + Number(e.amount), 0);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-1 gap-4 max-w-sm">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Total Egresos (filtrado)</p>
          <p className="text-lg font-bold text-destructive font-display">{fmtPYG(totalEgresos)}</p>
          <p className="text-xs text-muted-foreground mt-1">{filtered.length} registro(s)</p>
        </div>
      </div>

      {/* Actions & Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={() => setExpenseOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 transition-colors">
          <Plus className="w-4 h-4" />
          Registrar Egreso
        </button>
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
          className="px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="all">Todas las categorías</option>
          {categories.map(c => (
            <option key={c} value={c}>{categoryLabels[c] || c}</option>
          ))}
        </select>
        <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
          className="px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="all">Todos los meses</option>
          {months.map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : !filtered.length ? (
          <div className="text-center py-12">
            <ArrowUpRight className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Sin egresos registrados</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Descripción</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Categoría</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Monto</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">Estado</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(e => (
                  <tr key={e.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{e.description}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {categoryLabels[e.category] || e.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-destructive">{fmtPYG(Number(e.amount))}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${e.status === 'paid' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                        {e.status === 'paid' ? 'Pagado' : 'Pendiente'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{e.payment_date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ExpenseFormDialog open={expenseOpen} onOpenChange={setExpenseOpen} />
    </div>
  );
};
