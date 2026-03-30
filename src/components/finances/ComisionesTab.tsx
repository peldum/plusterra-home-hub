/**
 * ComisionesTab — Comisiones generadas por operaciones con split visible.
 * Vista agrupada por operación mostrando: propiedad, cliente, agentes y desglose.
 */
import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, TrendingUp, Coins, Plus, ChevronDown, ChevronUp, Users, User, Building2, CheckCircle2, FileText, Download } from 'lucide-react';
import { QuickCommissionDialog } from '@/components/commissions/QuickCommissionDialog';
import { useQuickCommissions } from '@/hooks/useQuickCommissions';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { exportCommissionReportPDF, exportCommissionReportExcel, type CommissionReportRow } from '@/lib/commissionReportExport';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

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
  pending: { label: 'Pendiente', cls: 'bg-warning/10 text-warning border-warning/30' },
  paid: { label: 'Cobrada', cls: 'bg-success/10 text-success border-success/30' },
  disputed: { label: 'En disputa', cls: 'bg-destructive/10 text-destructive border-destructive/30' },
};

const roleLabels: Record<string, string> = {
  captor: 'Captador',
  closer: 'Cerrador',
  solo: 'Solo',
};

export const ComisionesTab = () => {
  const { role } = useAuth();
  const qc = useQueryClient();
  const isAdmin = role === 'admin' || role === 'superadmin' || role === 'accounting' || role === 'secretaria';

  const [filterAgent, setFilterAgent] = useState('all');
  const [filterMonth, setFilterMonth] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [quickCommOpen, setQuickCommOpen] = useState(false);
  const [expandedDeal, setExpandedDeal] = useState<string | null>(null);

  const markQuickAsPaid = async (id: string) => {
    const { error } = await supabase
      .from('quick_commissions' as any)
      .update({ status: 'paid', updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) { toast.error('Error: ' + error.message); return; }
    toast.success('✅ Comisión marcada como cobrada');
    qc.invalidateQueries({ queryKey: ['quick-commissions'] });
  };

  // Fetch commissions with full deal details including client
  const { data: commissions, isLoading } = useQuery({
    queryKey: ['all-commissions-finance'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('commissions')
        .select('*, deal:deal_id(deal_type, amount, deposit_amount, currency, start_date, notes, properties(title), clients(full_name, phone))')
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

  // Derive months
  const months = useMemo(() => {
    const set = new Set<string>();
    (commissions || []).forEach((c: any) => { if (c.created_at) set.add(c.created_at.slice(0, 7)); });
    (quickComms || []).forEach((q: any) => { if (q.created_at) set.add((q.created_at as string).slice(0, 7)); });
    return Array.from(set).sort().reverse();
  }, [commissions, quickComms]);

  // Filter commissions
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

  // Group commissions by deal_id to show co-broker operations together
  const dealGroups = useMemo(() => {
    const groups = new Map<string, any[]>();
    filtered.forEach((c: any) => {
      const key = c.deal_id || c.id;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(c);
    });
    // Sort by most recent
    return Array.from(groups.entries())
      .map(([dealId, comms]) => ({
        dealId,
        comms: comms.sort((a: any, b: any) => (a.agent_role === 'captor' ? -1 : 1)),
        deal: comms[0]?.deal,
        date: comms[0]?.created_at,
        currency: comms[0]?.currency || 'PYG',
        totalGross: comms.reduce((s: number, c: any) => s + Number(c.gross_amount || 0), 0),
        totalNet: comms.reduce((s: number, c: any) => s + Number(c.net_amount || 0), 0),
        totalCompany: comms.reduce((s: number, c: any) => s + Number(c.company_amount || 0), 0),
        isCoBroker: comms.length > 1,
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [filtered]);

  // Combined totals
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

  const activeFilterCls = 'border-warning bg-warning/10';

  // Build rows for PDF/Excel export
  const buildReportRows = (): CommissionReportRow[] => {
    const rows: CommissionReportRow[] = [];

    // From deal-based commissions
    dealGroups.forEach(group => {
      const deal = group.deal;
      const dealType = deal?.deal_type || '—';
      const propertyName = deal?.properties?.title || 'Propiedad';
      const clientName = deal?.clients?.full_name || '—';
      const captorComm = group.comms.find((c: any) => c.agent_role === 'captor') || group.comms[0];
      const closerComm = group.comms.find((c: any) => c.agent_role === 'closer');

      rows.push({
        agentCaptador: agentName(captorComm?.agent_id),
        agentCerrador: closerComm ? agentName(closerComm.agent_id) : '',
        referencia: propertyName,
        inmueble: clientName,
        tipoGanancia: dealLabels[dealType] || dealType,
        precioOperacion: group.totalGross,
        pct50: group.totalNet,
        gananciaCaptador: Number(captorComm?.net_amount || 0),
        gananciaCerrador: closerComm ? Number(closerComm.net_amount || 0) : 0,
        retencionPlusterra: group.totalCompany,
        moneda: group.currency || 'PYG',
        observaciones: captorComm?.notes || '',
        fecha: new Date(group.date).toLocaleDateString('es-PY'),
        estado: (statusLabels[captorComm?.status] || statusLabels.pending).label,
        operationType: dealType,
      });
    });

    // From quick commissions
    filteredQuick.forEach((q: any) => {
      const propName = q._property_title || q.property_address || 'Comisión Rápida';
      rows.push({
        agentCaptador: agentName(q.agent_id),
        agentCerrador: q.is_co_agent && q.co_agent_id ? agentName(q.co_agent_id) : '',
        referencia: propName,
        inmueble: q._property_code || '',
        tipoGanancia: dealLabels[q.operation_type] || q.operation_type,
        precioOperacion: Number(q.gross_amount || 0),
        pct50: Number(q.net_amount || 0) + Number(q.co_agent_net_amount || 0),
        gananciaCaptador: Number(q.agent_net_amount || q.net_amount || 0),
        gananciaCerrador: Number(q.co_agent_net_amount || 0),
        retencionPlusterra: Number(q.company_amount || 0),
        moneda: q.currency || 'PYG',
        observaciones: q.notes || '',
        fecha: new Date(q.created_at).toLocaleDateString('es-PY'),
        estado: (statusLabels[q.status] || statusLabels.pending).label,
        operationType: q.operation_type,
      });
    });

    return rows;
  };

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

        {/* Export buttons */}
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={() => {
              const reportRows = buildReportRows();
              if (!reportRows.length) { toast.error('No hay datos para exportar'); return; }
              const period = filterMonth !== 'all' ? filterMonth : 'Todos';
              const agName = filterAgent !== 'all' ? agentName(filterAgent) : 'all';
              exportCommissionReportPDF(reportRows, period, agName);
              toast.success('PDF generado');
            }}
            disabled={!dealGroups.length && !filteredQuick.length}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-input bg-background text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
          >
            <FileText className="w-4 h-4 text-destructive" /> PDF
          </button>
          <button
            onClick={() => {
              const reportRows = buildReportRows();
              if (!reportRows.length) { toast.error('No hay datos para exportar'); return; }
              const period = filterMonth !== 'all' ? filterMonth : 'Todos';
              const agName = filterAgent !== 'all' ? agentName(filterAgent) : 'all';
              exportCommissionReportExcel(reportRows, period, agName);
              toast.success('Excel generado');
            }}
            disabled={!dealGroups.length && !filteredQuick.length}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-input bg-background text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4 text-success" /> Excel
          </button>
        </div>
      </div>

      {/* Operations list - grouped by deal */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : (!dealGroups.length && !filteredQuick.length) ? (
          <div className="text-center py-12 bg-card border border-border rounded-xl">
            <TrendingUp className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Sin comisiones registradas</p>
          </div>
        ) : (
          <>
            {/* Deal-based commissions */}
            {dealGroups.map((group) => {
              const isExpanded = expandedDeal === group.dealId;
              const st = statusLabels[group.comms[0]?.status] || statusLabels.pending;
              const dealType = group.deal?.deal_type || '—';
              const typeLabel = dealLabels[dealType] || dealType;
              const propertyName = group.deal?.properties?.title || 'Propiedad';
              const clientName = group.deal?.clients?.full_name || '—';

              return (
                <div key={group.dealId} className="bg-card border border-border rounded-xl overflow-hidden">
                  {/* Header row - clickable */}
                  <button
                    onClick={() => setExpandedDeal(isExpanded ? null : group.dealId)}
                    className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-muted/30 transition-colors"
                  >
                    <div className={`p-2 rounded-lg shrink-0 ${group.isCoBroker ? 'bg-primary/10' : 'bg-muted'}`}>
                      {group.isCoBroker ? <Users className="w-4 h-4 text-primary" /> : <User className="w-4 h-4 text-muted-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-foreground truncate">{propertyName}</p>
                        <Badge variant="outline" className="text-[10px] shrink-0">{typeLabel}</Badge>
                        {group.isCoBroker && <Badge className="text-[10px] bg-primary/10 text-primary border-primary/30 shrink-0">Co-broker</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Cliente: {clientName} · {new Date(group.date).toLocaleDateString('es-PY')}
                      </p>
                    </div>
                    <div className="text-right shrink-0 mr-2">
                      <p className="text-sm font-bold text-foreground">{fmtCur(group.totalGross, group.currency)}</p>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${st.cls}`}>{st.label}</span>
                    </div>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-border space-y-3 pt-3">
                      {/* Operation summary */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                        <div className="bg-muted/50 rounded-lg p-2">
                          <span className="text-muted-foreground">Propiedad</span>
                          <p className="font-medium text-foreground truncate">{propertyName}</p>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-2">
                          <span className="text-muted-foreground">Cliente</span>
                          <p className="font-medium text-foreground">{clientName}</p>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-2">
                          <span className="text-muted-foreground">Tipo</span>
                          <p className="font-medium text-foreground">{typeLabel}</p>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-2">
                          <span className="text-muted-foreground">Fecha</span>
                          <p className="font-medium text-foreground">{new Date(group.date).toLocaleDateString('es-PY')}</p>
                        </div>
                      </div>

                      {/* Agent breakdown */}
                      <div className="space-y-2">
                        {group.comms.map((c: any) => (
                          <div key={c.id} className="rounded-lg border border-border bg-background p-3">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-[10px]">
                                  {roleLabels[c.agent_role] || c.agent_role}
                                </Badge>
                                <span className="text-sm font-medium text-foreground">{agentName(c.agent_id)}</span>
                              </div>
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${(statusLabels[c.status] || statusLabels.pending).cls}`}>
                                {(statusLabels[c.status] || statusLabels.pending).label}
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-3 text-xs">
                              <div>
                                <span className="text-muted-foreground">Bruto</span>
                                <p className="font-semibold text-foreground">{fmtCur(c.gross_amount, c.currency)}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Retención 15%</span>
                                <p className="font-semibold text-destructive">-{fmtCur(c.company_amount, c.currency)}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Neto agente</span>
                                <p className="font-bold text-success">{fmtCur(c.net_amount, c.currency)}</p>
                              </div>
                            </div>
                            {c.notes && (
                              <p className="text-[10px] text-muted-foreground mt-2 italic">{c.notes}</p>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Totals */}
                      <div className="flex items-center justify-between pt-2 border-t border-border text-sm">
                        <span className="text-muted-foreground font-medium">Total retención empresa</span>
                        <span className="font-bold text-primary">{fmtCur(group.totalCompany, group.currency)}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Quick commissions section */}
            {filteredQuick.length > 0 && (
              <>
                <div className="flex items-center gap-2 pt-2">
                  <Coins className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Comisiones Rápidas</h3>
                  <Badge variant="outline" className="text-[10px]">{filteredQuick.length}</Badge>
                </div>
                {filteredQuick.map((q: any) => {
                  const st = statusLabels[q.status] || statusLabels.pending;
                  const displayName = q._property_title || q.property_address || 'Comisión Rápida';
                  const displayCode = q._property_code;
                  return (
                    <div key={`qc-${q.id}`} className="bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-3">
                      <div className={`p-2 rounded-lg shrink-0 ${q.is_co_agent ? 'bg-primary/10' : 'bg-muted'}`}>
                        {q.is_co_agent ? <Users className="w-4 h-4 text-primary" /> : <Coins className="w-4 h-4 text-primary" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {displayCode && (
                            <Badge variant="outline" className="text-[10px] font-mono shrink-0">{displayCode}</Badge>
                          )}
                          <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
                          <Badge variant="outline" className="text-[10px] shrink-0">
                            {dealLabels[q.operation_type] || q.operation_type}
                          </Badge>
                          {q.is_co_agent && <Badge className="text-[10px] bg-primary/10 text-primary border-primary/30 shrink-0">Co-agente</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {agentName(q.agent_id)}
                          {q.is_co_agent && q.co_agent_id && ` + ${agentName(q.co_agent_id)}`}
                          {' · '}{new Date(q.created_at).toLocaleDateString('es-PY')}
                        </p>
                        {q.is_co_agent && q.agent_net_amount != null && (
                          <div className="flex gap-3 mt-1 text-[10px]">
                            <span className="text-success">{agentName(q.agent_id)}: {fmtCur(q.agent_net_amount, q.currency)}</span>
                            <span className="text-success">{agentName(q.co_agent_id)}: {fmtCur(q.co_agent_net_amount, q.currency)}</span>
                          </div>
                        )}
                      </div>
                      <div className="text-right shrink-0 flex flex-col items-end gap-1">
                        <p className="text-xs text-muted-foreground">Bruto: {fmtCur(q.gross_amount, q.currency)}</p>
                        <p className="text-sm font-bold text-success">
                          {fmtCur(q.is_co_agent ? (Number(q.agent_net_amount || 0) + Number(q.co_agent_net_amount || 0)) : q.net_amount, q.currency)}
                        </p>
                        <p className="text-[10px] text-primary">Ret: {fmtCur(q.company_amount, q.currency)}</p>
                        {q.status === 'pending' && isAdmin ? (
                          <button
                            onClick={() => markQuickAsPaid(q.id)}
                            className="flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full border border-success/30 bg-success/10 text-success hover:bg-success/20 transition-colors"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            Marcar Cobrada
                          </button>
                        ) : (
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${st.cls}`}>{st.label}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </>
        )}
      </div>

      {/* Count */}
      <p className="text-xs text-muted-foreground text-right">
        {dealGroups.length} operación{dealGroups.length !== 1 ? 'es' : ''} de contrato · {filteredQuick.length} rápida{filteredQuick.length !== 1 ? 's' : ''}
      </p>

      <QuickCommissionDialog open={quickCommOpen} onOpenChange={setQuickCommOpen} />
    </div>
  );
};
