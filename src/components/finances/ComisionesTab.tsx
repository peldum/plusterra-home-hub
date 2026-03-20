/**
 * ComisionesTab — Comisiones generadas por operaciones con split visible.
 * Incluye comisiones de deals + comisiones rápidas, con subtotales por tipo.
 */
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, TrendingUp, Coins, Plus, Download } from 'lucide-react';
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
  const [filterType, setFilterType] = useState('all');
  const [quickCommOpen, setQuickCommOpen] = useState(false);

  const { data: commissions, isLoading } = useQuery({
    queryKey: ['all-commissions-finance'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('commissions')
        .select('*, deal:deal_id(deal_type, properties(title))')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const { data: quickComms } = useQuickCommissions();

  const { data: agents } = useQuery({
    queryKey: ['agents-for-commissions'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('profiles')
        .select('id, full_name')
        .order('full_name');
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const agentName = (id: string) => (agents || []).find((a: any) => a.id === id)?.full_name || '—';

  // Derive months from BOTH sources
  const months = useMemo(() => {
    const set = new Set<string>();
    (commissions || []).forEach((c: any) => { if (c.created_at) set.add(c.created_at.slice(0, 7)); });
    (quickComms || []).forEach((q: any) => { if (q.created_at) set.add((q.created_at as string).slice(0, 7)); });
    return Array.from(set).sort().reverse();
  }, [commissions, quickComms]);

  // Filter commissions from deals
  const filtered = useMemo(() => {
    return (commissions || []).filter((c: any) => {
      if (filterAgent !== 'all' && c.agent_id !== filterAgent) return false;
      if (filterMonth !== 'all' && !c.created_at?.startsWith(filterMonth)) return false;
      if (filterType !== 'all' && c.deal?.deal_type !== filterType) return false;
      return true;
    });
  }, [commissions, filterAgent, filterMonth, filterType]);

  // Filter quick commissions
  const filteredQuick = useMemo(() => {
    return (quickComms || []).filter((q: any) => {
      if (filterAgent !== 'all' && q.agent_id !== filterAgent) return false;
      if (filterMonth !== 'all' && !(q.created_at as string)?.startsWith(filterMonth)) return false;
      if (filterType !== 'all' && q.operation_type !== filterType) return false;
      return true;
    });
  }, [quickComms, filterAgent, filterMonth, filterType]);

  // Combined totals (deals + quick)
  const totalGross = filtered.reduce((s: number, c: any) => s + Number(c.gross_amount || 0), 0)
    + filteredQuick.reduce((s: number, q: any) => s + Number(q.gross_amount || 0), 0);
  const totalNet = filtered.reduce((s: number, c: any) => s + Number(c.net_amount || 0), 0)
    + filteredQuick.reduce((s: number, q: any) => s + Number(q.net_amount || 0), 0);
  const totalCompany = filtered.reduce((s: number, c: any) => s + Number(c.company_amount || 0), 0)
    + filteredQuick.reduce((s: number, q: any) => s + Number(q.company_amount || 0), 0);
  const totalPending = filtered.filter((c: any) => c.status === 'pending').reduce((s: number, c: any) => s + Number(c.net_amount || 0), 0)
    + filteredQuick.filter((q: any) => q.status === 'pending').reduce((s: number, q: any) => s + Number(q.net_amount || 0), 0);

  // Subtotals by type
  const rentalGross = filtered.filter((c: any) => c.deal?.deal_type === 'rental').reduce((s: number, c: any) => s + Number(c.gross_amount || 0), 0)
    + filteredQuick.filter((q: any) => q.operation_type === 'rental').reduce((s: number, q: any) => s + Number(q.gross_amount || 0), 0);
  const saleGross = filtered.filter((c: any) => c.deal?.deal_type === 'sale').reduce((s: number, c: any) => s + Number(c.gross_amount || 0), 0)
    + filteredQuick.filter((q: any) => q.operation_type === 'sale').reduce((s: number, q: any) => s + Number(q.gross_amount || 0), 0);

  // Build unified rows for table
  const allRows = useMemo(() => {
    const rows: any[] = [];
    filtered.forEach((c: any) => rows.push({
      id: c.id, source: 'deal',
      agentId: c.agent_id,
      type: c.deal?.deal_type || '—',
      property: c.deal?.properties?.title || '—',
      gross: Number(c.gross_amount || 0),
      net: Number(c.net_amount || 0),
      company: Number(c.company_amount || 0),
      currency: c.currency || 'PYG',
      status: c.status,
      date: c.created_at,
    }));
    filteredQuick.forEach((q: any) => rows.push({
      id: `qc-${q.id}`, source: 'quick',
      agentId: q.agent_id,
      type: q.operation_type,
      property: q.property_address || 'Rápida',
      gross: Number(q.gross_amount || 0),
      net: Number(q.net_amount || 0),
      company: Number(q.company_amount || 0),
      currency: q.currency || 'PYG',
      status: q.status,
      date: q.created_at,
    }));
    rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return rows;
  }, [filtered, filteredQuick]);

  const activeFilterCls = 'border-warning bg-warning/10';

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Bruto Total</p>
          <p className="text-lg font-bold text-foreground font-display">{fmtPYG(totalGross)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Neto Agentes (85%)</p>
          <p className="text-lg font-bold text-success font-display">{fmtPYG(totalNet)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Retención Plusterra (15%)</p>
          <p className="text-lg font-bold text-primary font-display">{fmtPYG(totalCompany)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">🔑 Alquileres</p>
          <p className="text-lg font-bold text-foreground font-display">{fmtPYG(rentalGross)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">🏷️ Ventas</p>
          <p className="text-lg font-bold text-foreground font-display">{fmtPYG(saleGross)}</p>
        </div>
      </div>

      {/* Pending highlight */}
      {totalPending > 0 && (
        <div className="bg-warning/10 border border-warning/30 rounded-xl px-4 py-2.5 flex items-center justify-between">
          <span className="text-sm text-warning font-medium">Comisiones pendientes de cobro</span>
          <span className="text-sm font-bold text-warning">{fmtPYG(totalPending)}</span>
        </div>
      )}

      {/* Actions & Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={() => setQuickCommOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" />
          Comisión Rápida
        </button>
        <select value={filterAgent} onChange={e => setFilterAgent(e.target.value)}
          className={`px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring ${filterAgent !== 'all' ? activeFilterCls : 'border-input'}`}>
          <option value="all">Todos los agentes</option>
          {(agents || []).map((a: any) => (
            <option key={a.id} value={a.id}>{a.full_name}</option>
          ))}
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          className={`px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring ${filterType !== 'all' ? activeFilterCls : 'border-input'}`}>
          <option value="all">Todos los tipos</option>
          <option value="rental">🔑 Alquiler</option>
          <option value="sale">🏷️ Venta</option>
        </select>
        <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
          className={`px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring ${filterMonth !== 'all' ? activeFilterCls : 'border-input'}`}>
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
        ) : !allRows.length ? (
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
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tipo</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Propiedad</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Bruto</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Agente (85%)</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Plusterra (15%)</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">Estado</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {allRows.map((r: any) => {
                  const st = statusLabels[r.status] || statusLabels.pending;
                  const typeLabel = dealLabels[r.type] || r.type || '—';
                  return (
                    <tr key={r.id} className={`border-b border-border last:border-0 hover:bg-muted/30 transition-colors ${r.source === 'quick' ? 'bg-primary/5' : ''}`}>
                      <td className="px-4 py-3 font-medium text-foreground">
                        <div className="flex items-center gap-1.5">
                          {r.source === 'quick' && <Coins className="w-3.5 h-3.5 text-primary shrink-0" />}
                          {agentName(r.agentId)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-foreground">{typeLabel}</td>
                      <td className="px-4 py-3 text-foreground truncate max-w-[180px]">{r.property}</td>
                      <td className="px-4 py-3 text-right text-foreground">{fmtCur(r.gross, r.currency)}</td>
                      <td className="px-4 py-3 text-right text-success font-medium">{fmtCur(r.net, r.currency)}</td>
                      <td className="px-4 py-3 text-right text-primary font-medium">{fmtCur(r.company, r.currency)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{new Date(r.date).toLocaleDateString('es-PY')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Count */}
      <p className="text-xs text-muted-foreground text-right">
        {allRows.length} comisión{allRows.length !== 1 ? 'es' : ''} · {filtered.length} de contratos · {filteredQuick.length} rápidas
      </p>

      <QuickCommissionDialog open={quickCommOpen} onOpenChange={setQuickCommOpen} />
    </div>
  );
};
