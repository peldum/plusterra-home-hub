/**
 * ComisionesTab — Comisiones generadas por operaciones con split visible.
 * Vista agrupada por operación mostrando: propiedad, cliente, agentes y desglose.
 */
import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, TrendingUp, Coins, Plus, ChevronDown, ChevronUp, Users, User, Building2, CheckCircle2, FileText, Download, Trash2, Pencil, Undo2, CalendarDays, Search, X, AlertTriangle } from 'lucide-react';
import { QuickCommissionDialog } from '@/components/commissions/QuickCommissionDialog';
import { PendingCommissionsDialog } from '@/components/finances/PendingCommissionsDialog';
import { useQuickCommissions } from '@/hooks/useQuickCommissions';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { exportCommissionReportPDF, exportCommissionReportExcel, type CommissionReportRow } from '@/lib/commissionReportExport';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

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
  const { role, user } = useAuth();
  const qc = useQueryClient();
  const isAdmin = role === 'admin' || role === 'superadmin' || role === 'accounting' || role === 'secretaria';
  const canManageComm = role === 'superadmin' || role === 'admin' || role === 'accounting';

  const [filterAgent, setFilterAgent] = useState('all');
  const [filterMonth, setFilterMonth] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [quickCommOpen, setQuickCommOpen] = useState(false);
  const [pendingCommOpen, setPendingCommOpen] = useState(false);
  const [expandedDeal, setExpandedDeal] = useState<string | null>(null);

  const [paymentModal, setPaymentModal] = useState<{ id: string; companyAmount: number; grossAmount: number; currency: string } | null>(null);
  const [paymentMode, setPaymentMode] = useState<'efectivo' | 'transferencia' | 'mixto'>('efectivo');
  const [montoEfectivo, setMontoEfectivo] = useState(0);
  const [montoBanco, setMontoBanco] = useState(0);
  const [markingPaid, setMarkingPaid] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [revertingId, setRevertingId] = useState<string | null>(null);
  const [editModal, setEditModal] = useState<{ id: string; periodo_mes: number; periodo_anio: number; notes: string } | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  // ===== Search helpers (tolerant: accents, case, partial, multi-word, amounts) =====
  const normalizeText = (s: any): string =>
    String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const parseAmountToken = (token: string): number | null => {
    let t = token.toLowerCase().replace(/gs\.?|\$|usd|₲/g, '').trim();
    if (!t) return null;
    let mult = 1;
    if (/[mM]$/.test(token) && /[\d.,]m$/i.test(token)) { mult = 1_000_000; t = t.replace(/m$/i, ''); }
    else if (/(mil|k)$/i.test(token)) { mult = 1_000; t = t.replace(/(mil|k)$/i, ''); }
    // remove thousand separators (.,)
    t = t.replace(/[.,\s]/g, '');
    if (!/^\d+$/.test(t)) return null;
    const n = Number(t) * mult;
    return isFinite(n) && n > 0 ? n : null;
  };

  const amountMatches = (target: number, query: number): boolean => {
    if (!target || !query) return false;
    const tolerance = Math.max(query * 0.05, 1);
    return Math.abs(target - query) <= tolerance;
  };

  const matchesSearch = (textFields: (string | null | undefined)[], amountFields: number[], query: string): boolean => {
    const q = query.trim();
    if (!q) return true;
    const haystack = ' ' + textFields.map(normalizeText).join(' ') + ' ';
    const words = q.split(/\s+/).filter(Boolean);
    return words.every(word => {
      const amt = parseAmountToken(word);
      if (amt !== null && amountFields.some(a => amountMatches(Number(a || 0), amt))) return true;
      return haystack.includes(normalizeText(word));
    });
  };

  const saveEdit = async () => {
    if (!editModal) return;
    setEditSaving(true);
    const { error } = await supabase
      .from('quick_commissions' as any)
      .update({
        periodo_mes: editModal.periodo_mes,
        periodo_anio: editModal.periodo_anio,
        notes: editModal.notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', editModal.id);
    if (!error) {
      await supabase.from('audit_logs').insert({
        user_id: user?.id,
        action: 'edit_quick_commission_period',
        target_table: 'quick_commissions',
        target_id: editModal.id,
        new_data: { periodo_mes: editModal.periodo_mes, periodo_anio: editModal.periodo_anio, notes: editModal.notes },
      });
    }
    setEditSaving(false);
    if (error) { toast.error('Error: ' + error.message); return; }
    toast.success('✅ Comisión actualizada');
    setEditModal(null);
    qc.invalidateQueries({ queryKey: ['quick-commissions'] });
  };

  const markQuickAsPaid = async () => {
    if (!paymentModal) return;
    setMarkingPaid(true);
    const retAmount = paymentModal.companyAmount;
    let effEfectivo = 0, effBanco = 0;
    if (paymentMode === 'efectivo') { effEfectivo = retAmount; }
    else if (paymentMode === 'transferencia') { effBanco = retAmount; }
    else { effEfectivo = montoEfectivo; effBanco = montoBanco; }

    const method = paymentMode === 'mixto' ? 'mixto' : paymentMode;
    const { error } = await supabase
      .from('quick_commissions' as any)
      .update({
        status: 'paid',
        payment_method: method,
        monto_efectivo: effEfectivo,
        monto_banco: effBanco,
        monto_pendiente: 0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', paymentModal.id);
    setMarkingPaid(false);
    if (error) { toast.error('Error: ' + error.message); return; }
    toast.success('✅ Comisión marcada como cobrada');
    setPaymentModal(null);
    setPaymentMode('efectivo');
    setMontoEfectivo(0);
    setMontoBanco(0);
    qc.invalidateQueries({ queryKey: ['quick-commissions'] });
  };

  const softDeleteQuickComm = async () => {
    if (!deleteModal) return;
    setDeleting(true);
    const { error } = await supabase
      .from('quick_commissions' as any)
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', deleteModal.id);
    if (!error) {
      await supabase.from('audit_logs').insert({
        user_id: user?.id,
        action: 'delete_quick_commission',
        target_table: 'quick_commissions',
        target_id: deleteModal.id,
        old_data: { name: deleteModal.name },
        new_data: { deleted_at: new Date().toISOString() },
      });
    }
    setDeleting(false);
    if (error) { toast.error('Error: ' + error.message); return; }
    toast.success('✅ Comisión eliminada correctamente');
    setDeleteModal(null);
    qc.invalidateQueries({ queryKey: ['quick-commissions'] });
  };

  const revertToPending = async (id: string) => {
    setRevertingId(id);
    const { error } = await supabase
      .from('quick_commissions' as any)
      .update({ status: 'pending', payment_method: null, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (!error) {
      await supabase.from('audit_logs').insert({
        user_id: user?.id,
        action: 'revert_quick_commission',
        target_table: 'quick_commissions',
        target_id: id,
        old_data: { status: 'paid' },
        new_data: { status: 'pending' },
      });
    }
    setRevertingId(null);
    if (error) { toast.error('Error: ' + error.message); return; }
    toast.success('Comisión revertida a pendiente');
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
  // Derive months from periodo_mes/periodo_anio fields (accounting period)
  const months = useMemo(() => {
    const set = new Set<string>();
    (commissions || []).forEach((c: any) => {
      const d = c.deal?.deal_date || c.created_at;
      if (d) set.add(d.slice(0, 7));
    });
    (quickComms || []).forEach((q: any) => {
      if (q.periodo_mes && q.periodo_anio) {
        set.add(`${q.periodo_anio}-${String(q.periodo_mes).padStart(2, '0')}`);
      } else {
        const d = q.operation_date || (q.created_at as string);
        if (d) set.add(d.slice(0, 7));
      }
    });
    return Array.from(set).sort().reverse();
  }, [commissions, quickComms]);

  // Filter commissions by deal_date (accounting date), not created_at
  const filtered = useMemo(() => {
    return (commissions || []).filter((c: any) => {
      if (filterAgent !== 'all' && c.agent_id !== filterAgent) return false;
      if (filterMonth !== 'all') {
        const accountingDate = c.deal?.deal_date || c.created_at;
        if (!accountingDate?.startsWith(filterMonth)) return false;
      }
      if (filterType !== 'all' && c.deal?.deal_type !== filterType) return false;
      if (searchQuery.trim()) {
        const ok = matchesSearch(
          [
            c.deal?.properties?.title,
            c.deal?.clients?.full_name,
            c.notes,
            c.property_address,
          ],
          [Number(c.gross_amount || 0), Number(c.net_amount || 0), Number(c.deal?.amount || 0), Number(c.company_amount || 0)],
          searchQuery
        );
        if (!ok) return false;
      }
      return true;
    });
  }, [commissions, filterAgent, filterMonth, filterType, searchQuery]);

  // Filter quick commissions by periodo_mes/periodo_anio
  const filteredQuick = useMemo(() => {
    return (quickComms || []).filter((q: any) => {
      if (filterAgent !== 'all' && q.agent_id !== filterAgent) return false;
      if (filterMonth !== 'all') {
        if (q.periodo_mes && q.periodo_anio) {
          const qPeriod = `${q.periodo_anio}-${String(q.periodo_mes).padStart(2, '0')}`;
          if (qPeriod !== filterMonth) return false;
        } else {
          const d = q.operation_date || (q.created_at as string);
          if (!d?.startsWith(filterMonth)) return false;
        }
      }
      if (filterType !== 'all' && q.operation_type !== filterType) return false;
      if (searchQuery.trim()) {
        const ok = matchesSearch(
          [q._property_title, q._property_code, q.property_address, q.notes],
          [Number(q.gross_amount || 0), Number(q.net_amount || 0), Number(q.company_amount || 0)],
          searchQuery
        );
        if (!ok) return false;
      }
      return true;
    });
  }, [quickComms, filterAgent, filterMonth, filterType, searchQuery]);

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

  // Combined totals — only PAID commissions for KPIs
  const paidFiltered = filtered.filter((c: any) => c.status === 'paid');
  const paidQuick = filteredQuick.filter((q: any) => q.status === 'paid');
  const pendingFiltered = filtered.filter((c: any) => c.status === 'pending');
  const pendingQuick = filteredQuick.filter((q: any) => q.status === 'pending');

  const totalGross = paidFiltered.reduce((s: number, c: any) => s + Number(c.gross_amount || 0), 0)
    + paidQuick.reduce((s: number, q: any) => s + Number(q.gross_amount || 0), 0);
  const totalNet = paidFiltered.reduce((s: number, c: any) => s + Number(c.net_amount || 0), 0)
    + paidQuick.reduce((s: number, q: any) => s + Number(q.net_amount || 0), 0);
  const totalCompany = paidFiltered.reduce((s: number, c: any) => s + Number(c.company_amount || 0), 0)
    + paidQuick.reduce((s: number, q: any) => s + Number(q.company_amount || 0), 0);

  // Pending totals (shown separately)
  const pendingGross = pendingFiltered.reduce((s: number, c: any) => s + Number(c.gross_amount || 0), 0)
    + pendingQuick.reduce((s: number, q: any) => s + Number(q.gross_amount || 0), 0);
  const pendingCompany = pendingFiltered.reduce((s: number, c: any) => s + Number(c.company_amount || 0), 0)
    + pendingQuick.reduce((s: number, q: any) => s + Number(q.company_amount || 0), 0);
  const totalPending = pendingFiltered.reduce((s: number, c: any) => s + Number(c.net_amount || 0), 0)
    + pendingQuick.reduce((s: number, q: any) => s + Number(q.net_amount || 0), 0);

  // Subtotals by type (all statuses for reference)
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
        metodoPago: '',
        montoUeno: 0,
        montoEfectivo: 0,
        montoTotal: group.totalCompany,
      });
    });

    // From quick commissions
    filteredQuick.forEach((q: any) => {
      const propName = q._property_title || q.property_address || 'Comisión Rápida';
      const isPaid = q.status === 'paid';
      // Only use monto_banco/monto_efectivo for PAID commissions (they store retention amounts)
      // For pending, these fields may contain gross amounts — show 0 instead
      const qUeno = isPaid ? Number(q.monto_banco || 0) : 0;
      const qEfectivo = isPaid ? Number(q.monto_efectivo || 0) : 0;
      const retention = Number(q.company_amount || 0);
      const qTotal = isPaid ? (qUeno + qEfectivo || retention) : retention;
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
        retencionPlusterra: retention,
        moneda: q.currency || 'PYG',
        observaciones: q.notes || '',
        fecha: new Date(q.created_at).toLocaleDateString('es-PY'),
        estado: (statusLabels[q.status] || statusLabels.pending).label,
        operationType: q.operation_type,
        metodoPago: isPaid ? (q.payment_method === 'mixto' ? `Efectivo: ${fmtCur(Number(q.monto_efectivo || 0), q.currency)} / Ueno Bank: ${fmtCur(Number(q.monto_banco || 0), q.currency)}` : q.payment_method === 'transferencia' ? 'Ueno Bank' : q.payment_method === 'efectivo' ? 'Efectivo' : '') : '',
        montoUeno: qUeno,
        montoEfectivo: qEfectivo,
        montoTotal: qTotal,
      });
    });

    return rows;
  };

  const periodLabel = useMemo(() => {
    if (filterMonth === 'all') return 'Todos los meses';
    const [y, m] = filterMonth.split('-');
    return `${MONTH_NAMES[Number(m) - 1]} ${y}`;
  }, [filterMonth]);

  return (
    <div className="space-y-4">
      {/* Period indicator */}
      {filterMonth !== 'all' && (
        <div className="text-xs text-muted-foreground">Mostrando datos de: <span className="font-semibold text-foreground">{periodLabel}</span></div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Bruto Cobrado</p>
          <p className="text-lg font-bold text-foreground font-display">{fmtPYG(totalGross)}</p>
          {pendingGross > 0 && <p className="text-[10px] text-warning mt-0.5">Pendiente: {fmtPYG(pendingGross)}</p>}
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Neto Agentes (85%) Cobrado</p>
          <p className="text-lg font-bold text-success font-display">{fmtPYG(totalNet)}</p>
        </div>
        <div className="bg-primary/5 border-2 border-primary rounded-xl p-4">
          <p className="text-xs text-primary font-semibold mb-1">💰 Retención Plusterra (15%)</p>
          <p className="text-xl font-bold text-primary font-display">{fmtPYG(totalCompany)}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Solo comisiones cobradas</p>
          {pendingCompany > 0 && <p className="text-[10px] text-warning mt-0.5">Por cobrar: {fmtPYG(pendingCompany)}</p>}
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
          <span className="text-sm text-warning font-medium">Comisiones pendientes de cobro — {periodLabel}</span>
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
        {isAdmin && (
          <button
            onClick={() => setPendingCommOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-warning/40 bg-warning/10 text-warning text-sm font-medium hover:bg-warning/20 transition-colors"
            title="Propiedades alquiladas o vendidas sin comisión registrada"
          >
            <AlertTriangle className="w-4 h-4" />
            Pendientes de registrar
          </button>
        )}
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
          {months.map(m => {
            const [y, mo] = m.split('-');
            return <option key={m} value={m}>{MONTH_NAMES[Number(mo) - 1]} {y}</option>;
          })}
        </select>

        {/* Smart search */}
        <div className={`relative w-full md:w-80 ${searchQuery.trim() ? 'ring-1 ring-warning/50 rounded-lg' : ''}`}>
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Escape') setSearchQuery(''); }}
            placeholder="Buscar propiedad, código, cliente o monto…"
            className="pl-8 pr-8 h-10 text-sm"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-muted text-muted-foreground"
              aria-label="Limpiar búsqueda"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Export buttons */}
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={() => {
              const reportRows = buildReportRows();
              if (!reportRows.length) { toast.error('No hay datos para exportar'); return; }
              const period = filterMonth !== 'all' ? periodLabel : 'Todos los meses';
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
              const period = filterMonth !== 'all' ? periodLabel : 'Todos los meses';
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
            <p className="text-sm text-muted-foreground">
              {searchQuery.trim()
                ? <>Sin coincidencias para «<span className="font-semibold text-foreground">{searchQuery}</span>». Probá con menos palabras o revisá el monto.</>
                : 'Sin comisiones registradas'}
            </p>
          </div>
        ) : (
          <>
            {searchQuery.trim() && (dealGroups.length > 0) && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Operaciones encontradas:</span>
                <Badge variant="outline" className="text-[10px]">{dealGroups.length}</Badge>
              </div>
            )}
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
                          {q.periodo_mes && q.periodo_anio && (
                            <span className="inline-flex items-center gap-0.5 ml-1.5 text-primary font-medium">
                              <CalendarDays className="w-3 h-3 inline" />
                              {MONTH_NAMES[q.periodo_mes - 1]} {q.periodo_anio}
                            </span>
                          )}
                        </p>
                        {q.is_co_agent && q.agent_net_amount != null && (
                          <div className="flex flex-col gap-0.5 mt-1 text-[10px]">
                            <div className="flex gap-3">
                              <span className="text-success">{agentName(q.agent_id)}: {fmtCur(q.agent_net_amount, q.currency)}</span>
                              <span className="text-success">{agentName(q.co_agent_id)}: {fmtCur(q.co_agent_net_amount, q.currency)}</span>
                            </div>
                            <div className="flex gap-3 text-primary">
                              <span>Ret. {agentName(q.agent_id)}: {fmtCur(q.agent_retention ?? Math.round(Number(q.company_amount || 0) / 2), q.currency)}</span>
                              <span>Ret. {agentName(q.co_agent_id)}: {fmtCur(q.co_agent_retention ?? (Number(q.company_amount || 0) - Math.round(Number(q.company_amount || 0) / 2)), q.currency)}</span>
                            </div>
                          </div>
                        )}
                        {!q.is_co_agent && (
                          <div className="mt-1 text-[10px] text-primary">
                            Ret. {agentName(q.agent_id)}: {fmtCur(q.agent_retention ?? q.company_amount, q.currency)}
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
                            onClick={() => {
                              const gross = Number(q.gross_amount || 0);
                              const company = Number(q.company_amount || 0);
                              setPaymentModal({ id: q.id, companyAmount: company, grossAmount: gross, currency: q.currency || 'PYG' });
                              setPaymentMode('efectivo');
                              setMontoEfectivo(0);
                              setMontoBanco(0);
                            }}
                            className="flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full border border-success/30 bg-success/10 text-success hover:bg-success/20 transition-colors"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            Marcar Cobrada
                          </button>
                        ) : (
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${st.cls}`}>{st.label}</span>
                        )}
                        {/* Admin actions: Revert to pending & Delete */}
                        {canManageComm && q.status === 'paid' && (
                          <button
                            onClick={() => revertToPending(q.id)}
                            disabled={revertingId === q.id}
                            className="flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full border border-warning/30 bg-warning/10 text-warning hover:bg-warning/20 transition-colors"
                            title="Revertir a pendiente"
                          >
                            {revertingId === q.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Undo2 className="w-3 h-3" />}
                            Revertir
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            onClick={() => setEditModal({
                              id: q.id,
                              periodo_mes: q.periodo_mes || new Date(q.created_at).getMonth() + 1,
                              periodo_anio: q.periodo_anio || new Date(q.created_at).getFullYear(),
                              notes: q.notes || '',
                            })}
                            className="flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                            title="Editar período y observaciones"
                          >
                            <Pencil className="w-3 h-3" />
                            Editar
                          </button>
                        )}
                        {canManageComm && (
                          <button
                            onClick={() => setDeleteModal({ id: q.id, name: displayName })}
                            className="flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                            title="Eliminar comisión"
                          >
                            <Trash2 className="w-3 h-3" />
                            Eliminar
                          </button>
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
      <PendingCommissionsDialog open={pendingCommOpen} onOpenChange={setPendingCommOpen} />

      {/* Payment method confirmation modal */}
      <Dialog open={!!paymentModal} onOpenChange={(open) => { if (!open) { setPaymentModal(null); setPaymentMode('efectivo'); setMontoEfectivo(0); setMontoBanco(0); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar cobro de comisión</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-foreground">
              Confirmar método de pago de la retención (15%) para Plusterra.
            </p>
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Comisión bruta:</span>
                <span className="text-sm text-muted-foreground">{paymentModal ? fmtCur(paymentModal.grossAmount, paymentModal.currency) : ''}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Retención 15% (Plusterra):</span>
                <span className="text-lg font-bold text-primary">{paymentModal ? fmtCur(paymentModal.companyAmount, paymentModal.currency) : ''}</span>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground mb-2">Método de Pago *</p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setPaymentMode('efectivo')}
                  className={`px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${paymentMode === 'efectivo' ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background text-foreground hover:border-primary/50'}`}
                >
                  💵 Efectivo
                </button>
                <button
                  onClick={() => setPaymentMode('transferencia')}
                  className={`px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${paymentMode === 'transferencia' ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background text-foreground hover:border-primary/50'}`}
                >
                  🏦 Ueno Bank
                </button>
                <button
                  onClick={() => {
                    setPaymentMode('mixto');
                    if (paymentModal) {
                      setMontoEfectivo(0);
                      setMontoBanco(0);
                    }
                  }}
                  className={`px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${paymentMode === 'mixto' ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background text-foreground hover:border-primary/50'}`}
                >
                  🔀 Mixto
                </button>
              </div>
            </div>

            {/* Split amounts for mixto */}
            {paymentMode === 'mixto' && paymentModal && (
              <div className="space-y-3 border border-border rounded-xl p-3 bg-muted/30">
                <div className="space-y-1">
                  <Label className="text-xs">💵 Monto en Efectivo</Label>
                  <Input
                    type="number"
                    min={0}
                    max={paymentModal.companyAmount}
                    value={montoEfectivo || ''}
                    onChange={e => {
                      const v = +e.target.value;
                      setMontoEfectivo(v);
                      setMontoBanco(Math.max(0, paymentModal.companyAmount - v));
                    }}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">🏦 Monto por Ueno Bank</Label>
                  <Input
                    type="number"
                    min={0}
                    max={paymentModal.companyAmount}
                    value={montoBanco || ''}
                    onChange={e => {
                      const v = +e.target.value;
                      setMontoBanco(v);
                      setMontoEfectivo(Math.max(0, paymentModal.companyAmount - v));
                    }}
                    placeholder="0"
                  />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Total retención:</span>
                  <span className={`font-bold ${(montoEfectivo + montoBanco) === paymentModal.companyAmount ? 'text-success' : 'text-destructive'}`}>
                    {fmtCur(montoEfectivo + montoBanco, paymentModal.currency)} / {fmtCur(paymentModal.companyAmount, paymentModal.currency)}
                  </span>
                </div>
              </div>
            )}

            <p className="text-xs text-muted-foreground italic">
              Esta acción registra el pago de forma definitiva.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setPaymentModal(null); setPaymentMode('efectivo'); setMontoEfectivo(0); setMontoBanco(0); }}>Cancelar</Button>
            <Button
              onClick={markQuickAsPaid}
              disabled={markingPaid || (paymentMode === 'mixto' && paymentModal != null && (montoEfectivo + montoBanco) !== paymentModal.companyAmount)}
            >
              {markingPaid ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
              Confirmar y Marcar como Cobrada
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation modal - SuperAdmin only */}
      <Dialog open={!!deleteModal} onOpenChange={(open) => { if (!open) setDeleteModal(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">⚠️ Eliminar comisión</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-foreground">
              ¿Estás seguro de eliminar esta comisión?
            </p>
            <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3">
              <p className="text-sm font-medium text-foreground">{deleteModal?.name}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Esta acción no se puede deshacer fácilmente. El registro será archivado pero no aparecerá en listados ni reportes.
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteModal(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={softDeleteQuickComm} disabled={deleting}>
              {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Trash2 className="w-4 h-4 mr-1" />}
              Confirmar Eliminación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit period/notes modal */}
      <Dialog open={!!editModal} onOpenChange={(open) => { if (!open) setEditModal(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-4 h-4 text-primary" />
              Editar Comisión
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Período contable</Label>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={editModal?.periodo_mes || 1}
                  onChange={e => setEditModal(prev => prev ? { ...prev, periodo_mes: +e.target.value } : null)}
                  className="flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  {MONTH_NAMES.map((m, i) => (
                    <option key={i+1} value={i+1}>{m}</option>
                  ))}
                </select>
                <Input
                  type="number"
                  min={2024}
                  max={2030}
                  value={editModal?.periodo_anio || 2026}
                  onChange={e => setEditModal(prev => prev ? { ...prev, periodo_anio: +e.target.value } : null)}
                />
              </div>
              <p className="text-xs text-muted-foreground">Cambiá el período si la comisión fue registrada fuera de término.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Observaciones</Label>
              <Textarea
                value={editModal?.notes || ''}
                onChange={e => setEditModal(prev => prev ? { ...prev, notes: e.target.value } : null)}
                placeholder="Detalles adicionales..."
                className="min-h-[60px] resize-y"
              />
            </div>
            <p className="text-xs text-muted-foreground italic">
              Solo se puede editar período y observaciones. Montos y split no son modificables.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditModal(null)}>Cancelar</Button>
            <Button onClick={saveEdit} disabled={editSaving}>
              {editSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Pencil className="w-4 h-4 mr-1" />}
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
