/**
 * CanonAgentesTab — Cánones cobrados a agentes, con filtro por agente y mes.
 */
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Coins, User } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const fmtPYG = (n: number) =>
  new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', minimumFractionDigits: 0 }).format(n);

export const CanonAgentesTab = () => {
  const [filterAgent, setFilterAgent] = useState('all');
  const [filterMonth, setFilterMonth] = useState('all');

  const { data: canonPayments, isLoading } = useQuery({
    queryKey: ['canon-payments-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('canon_payments')
        .select('*, agent:agent_id(id, full_name)')
        .order('payment_date', { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const { data: agents } = useQuery({
    queryKey: ['agents-for-canon'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'agent')
        .order('full_name');
      if (error) throw error;
      return data || [];
    },
  });

  // Unique months from payments
  const months = useMemo(() => {
    const set = new Set((canonPayments || []).map(p => p.period));
    return Array.from(set).sort().reverse();
  }, [canonPayments]);

  const filtered = useMemo(() => {
    return (canonPayments || []).filter(p => {
      if (filterAgent !== 'all' && p.agent_id !== filterAgent) return false;
      if (filterMonth !== 'all' && p.period !== filterMonth) return false;
      return true;
    });
  }, [canonPayments, filterAgent, filterMonth]);

  const totalCobrado = filtered.reduce((s, p) => s + Number(p.total_amount || 0), 0);
  const totalBase = filtered.reduce((s, p) => s + Number(p.base_amount || 0), 0);
  const totalInteres = filtered.reduce((s, p) => s + Number(p.interest_amount || 0), 0);

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Total Cobrado</p>
          <p className="text-lg font-bold text-success font-display">{fmtPYG(totalCobrado)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Base Total</p>
          <p className="text-lg font-bold text-foreground font-display">{fmtPYG(totalBase)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Intereses Acumulados</p>
          <p className="text-lg font-bold text-warning font-display">{fmtPYG(totalInteres)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <select value={filterAgent} onChange={e => setFilterAgent(e.target.value)}
          className="px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="all">Todos los agentes</option>
          {(agents || []).map(a => (
            <option key={a.id} value={a.id}>{a.full_name}</option>
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
            <Coins className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Sin pagos de canon registrados</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Agente</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Periodo</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Base</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Interés</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Total</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Fecha Pago</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium text-foreground">{p.agent?.full_name || 'Agente'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-foreground">{p.period}</td>
                    <td className="px-4 py-3 text-right text-foreground">{fmtPYG(Number(p.base_amount || 0))}</td>
                    <td className="px-4 py-3 text-right text-warning">{fmtPYG(Number(p.interest_amount || 0))}</td>
                    <td className="px-4 py-3 text-right font-semibold text-success">{fmtPYG(Number(p.total_amount || 0))}</td>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(p.payment_date).toLocaleDateString('es-PY')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
