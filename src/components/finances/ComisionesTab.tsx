/**
 * ComisionesTab — Comisiones generadas por operaciones con split visible.
 */
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, TrendingUp, Coins, Plus } from 'lucide-react';
import { QuickCommissionDialog } from '@/components/commissions/QuickCommissionDialog';
import { useQuickCommissions } from '@/hooks/useQuickCommissions';

const fmtPYG = (n: number) =>
  new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', minimumFractionDigits: 0 }).format(n);

const fmtUSD = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n);

const fmtCur = (n: number, cur: string = 'PYG') => cur === 'USD' ? fmtUSD(n) : fmtPYG(n);

const dealLabels: Record<string, string> = {
  rental: 'Alquiler', sale: 'Venta', temporary_rental: 'Alq. temporal',
  property_management: 'Administración', exclusivity: 'Exclusividad',
};

const statusLabels: Record<string, { label: string; cls: string }> = {
  pending: { label: 'Pendiente', cls: 'bg-warning/10 text-warning' },
  paid: { label: 'Cobrada', cls: 'bg-success/10 text-success' },
  disputed: { label: 'En disputa', cls: 'bg-destructive/10 text-destructive' },
};

export const ComisionesTab = () => {
  const [filterAgent, setFilterAgent] = useState('all');
  const [filterMonth, setFilterMonth] = useState('all');
  const [quickCommOpen, setQuickCommOpen] = useState(false);

  const { data: commissions, isLoading } = useQuery({
    queryKey: ['all-commissions-finance'],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('commissions')
        .select('*, deal:deal_id(deal_type, properties(title))')
        .order('created_at', { ascending: false }) as any);
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const { data: quickComms } = useQuickCommissions();

  const { data: agents } = useQuery({
    queryKey: ['agents-for-commissions'],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'agent')
        .order('full_name') as any);
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const months = useMemo(() => {
    const set = new Set((commissions || []).map((c: any) => c.created_at?.slice(0, 7)));
    return Array.from(set).sort().reverse();
  }, [commissions]);

  const filtered = useMemo(() => {
    return (commissions || []).filter((c: any) => {
      if (filterAgent !== 'all' && c.agent_id !== filterAgent) return false;
      if (filterMonth !== 'all' && !c.created_at?.startsWith(filterMonth)) return false;
      return true;
    });
  }, [commissions, filterAgent, filterMonth]);

  const filteredQuick = useMemo(() => {
    return (quickComms || []).filter((q: any) => {
      if (filterAgent !== 'all' && q.agent_id !== filterAgent) return false;
      if (filterMonth !== 'all' && !(q.created_at as string)?.startsWith(filterMonth)) return false;
      return true;
    });
  }, [quickComms, filterAgent, filterMonth]);

  const totalNet = filtered.reduce((s: number, c: any) => s + Number(c.net_amount || 0), 0);
  const totalCompany = filtered.reduce((s: number, c: any) => s + Number(c.company_amount || 0), 0);
  const totalPending = filtered.filter((c: any) => c.status === 'pending').reduce((s: number, c: any) => s + Number(c.net_amount || 0), 0);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Neto Agentes</p>
          <p className="text-lg font-bold text-foreground font-display">{fmtPYG(totalNet)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Retención Plusterra</p>
          <p className="text-lg font-bold text-primary font-display">{fmtPYG(totalCompany)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Pendientes de Cobro</p>
          <p className="text-lg font-bold text-warning font-display">{fmtPYG(totalPending)}</p>
        </div>
      </div>

      {/* Actions & Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={() => setQuickCommOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" />
          Comisión Rápida
        </button>
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

      {/* Commissions table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : !filtered.length && !filteredQuick.length ? (
          <div className="text-center py-12">
            <TrendingUp className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Sin comisiones registradas</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Agente</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Operación</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Propiedad</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Bruto</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Agente (85%)</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Plusterra (15%)</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">Estado</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c: any) => {
                  const st = statusLabels[c.status] || statusLabels.pending;
                  return (
                    <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">{c.agent?.full_name || '—'}</td>
                      <td className="px-4 py-3 text-foreground">{dealLabels[c.deal?.deal_type] || c.deal?.deal_type || '—'}</td>
                      <td className="px-4 py-3 text-foreground truncate max-w-[180px]">{c.deal?.properties?.title || '—'}</td>
                      <td className="px-4 py-3 text-right text-foreground">{fmtCur(Number(c.gross_amount || 0), c.currency)}</td>
                      <td className="px-4 py-3 text-right text-success font-medium">{fmtCur(Number(c.net_amount || 0), c.currency)}</td>
                      <td className="px-4 py-3 text-right text-primary font-medium">{fmtCur(Number(c.company_amount || 0), c.currency)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{new Date(c.created_at).toLocaleDateString('es-PY')}</td>
                    </tr>
                  );
                })}
                {/* Quick commissions */}
                {filteredQuick.map((q: any) => {
                  const st = statusLabels[q.status] || statusLabels.pending;
                  return (
                    <tr key={`qc-${q.id}`} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors bg-primary/5">
                      <td className="px-4 py-3 font-medium text-foreground">
                        <div className="flex items-center gap-1.5">
                          <Coins className="w-3.5 h-3.5 text-primary" />
                          {q.agent_name || '—'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-foreground">{q.operation_type === 'rental' ? 'Alquiler' : q.operation_type === 'sale' ? 'Venta' : q.operation_type}</td>
                      <td className="px-4 py-3 text-foreground truncate max-w-[180px]">{q.property_address || 'Rápida'}</td>
                      <td className="px-4 py-3 text-right text-foreground">{fmtCur(Number(q.gross_amount || 0), q.currency)}</td>
                      <td className="px-4 py-3 text-right text-success font-medium">{fmtCur(Number(q.net_amount || 0), q.currency)}</td>
                      <td className="px-4 py-3 text-right text-primary font-medium">{fmtCur(Number(q.company_amount || 0), q.currency)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{new Date(q.created_at).toLocaleDateString('es-PY')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <QuickCommissionDialog open={quickCommOpen} onOpenChange={setQuickCommOpen} />
    </div>
  );
};
