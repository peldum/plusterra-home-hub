import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MainLayout } from '@/components/layout/MainLayout';
import { ModuleGuide } from '@/components/layout/ModuleGuide';
import { FinanceStatsHeader } from '@/components/finances/FinanceStatsHeader';
import { CanonAgentesTab } from '@/components/finances/CanonAgentesTab';
import { ComisionesTab } from '@/components/finances/ComisionesTab';
import { AdminCommissionsTab } from '@/components/finances/AdminCommissionsTab';
import { EgresosTab } from '@/components/finances/EgresosTab';
import { ConsolidadoComercialTab } from '@/components/finances/ConsolidadoComercialTab';
import { CierreMensualTab } from '@/components/finances/CierreMensualTab';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  ArrowUpRight, ArrowDownLeft,
  Loader2, DollarSign, Clock, Coins, Wallet,
  Plus, Download, FileText, Building2, ShoppingCart, Briefcase,
} from 'lucide-react';
import { filterByRange, exportPaymentsPDF, exportPaymentsCSV } from '@/lib/paymentsExport';
import { ExpenseFormDialog } from '@/components/finances/ExpenseFormDialog';
import { IncomeFormDialog } from '@/components/dashboard/IncomeFormDialog';
import { QuickCommissionDialog } from '@/components/commissions/QuickCommissionDialog';

const fmtPYG = (n: number) =>
  new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', minimumFractionDigits: 0 }).format(n);

/**
 * Categorías de pagos (payments table) que son ingresos PROPIOS de Plusterra.
 * EXCLUYE: 'alquiler' (fondos de inquilinos/terceros), 'venta' (fondos de comprador).
 */
const PLUSTERRA_PAYMENT_CATEGORIES = ['canon_mensual_agente'];

const categoryLabels: Record<string, string> = {
  canon_mensual_agente: 'Ingreso canon',
  mantenimiento: 'Mantenimiento', impuesto: 'Impuesto',
  alquiler_oficina: 'Alquiler oficina', internet: 'Internet', servicios: 'Servicios',
  salarios: 'Salarios', insumos: 'Insumos', marketing: 'Marketing', otro: 'Otro',
};

// ── Agent Finance View ──
const AgentFinanceView = () => {
  const { user } = useAuth();

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount);

  const { data: commissions, isLoading } = useQuery({
    queryKey: ['agent-commissions', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('commissions')
        .select('id, net_amount, gross_amount, status, currency, paid_date, created_at, agent_role')
        .eq('agent_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: feeData } = useQuery({
    queryKey: ['agent-fee-data', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('monthly_fee, last_paid_month')
        .eq('id', user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: feePayments } = useQuery({
    queryKey: ['agent-fee-payments', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_fee_payments')
        .select('id, amount, paid_month, paid_at')
        .eq('agent_id', user!.id)
        .order('paid_at', { ascending: false })
        .limit(12);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const pending = commissions?.filter(c => c.status === 'pending') || [];
  const paid = commissions?.filter(c => c.status === 'paid') || [];
  const totalPending = pending.reduce((s, c) => s + Number(c.net_amount), 0);
  const totalPaid = paid.reduce((s, c) => s + Number(c.net_amount), 0);

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const feeIsPaid = feeData?.last_paid_month === currentMonth;

  return (
    <MainLayout title="Mis Finanzas" subtitle="Comisiones y estado de canon">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-muted-foreground">Comisiones Pendientes</p>
            <div className="p-2 rounded-lg bg-warning/10"><Clock className="w-5 h-5 text-warning" /></div>
          </div>
          <p className="text-2xl font-bold text-foreground font-display">{formatCurrency(totalPending)}</p>
          <p className="text-xs text-muted-foreground mt-1">{pending.length} pendiente{pending.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-muted-foreground">Comisiones Cobradas</p>
            <div className="p-2 rounded-lg bg-success/10"><DollarSign className="w-5 h-5 text-success" /></div>
          </div>
          <p className="text-2xl font-bold text-foreground font-display">{formatCurrency(totalPaid)}</p>
          <p className="text-xs text-muted-foreground mt-1">{paid.length} pago{paid.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-muted-foreground">Canon Mensual</p>
            <div className={`p-2 rounded-lg ${feeIsPaid ? 'bg-success/10' : 'bg-destructive/10'}`}>
              <Wallet className={`w-5 h-5 ${feeIsPaid ? 'text-success' : 'text-destructive'}`} />
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground font-display">{formatCurrency(Number(feeData?.monthly_fee || 0))}</p>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${feeIsPaid ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
            {feeIsPaid ? 'Al día' : 'Pendiente'}
          </span>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 mb-8">
        <h3 className="font-display text-lg font-semibold text-foreground mb-6">Mis Comisiones</h3>
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : !commissions?.length ? (
          <p className="text-sm text-muted-foreground text-center py-8">Sin comisiones registradas.</p>
        ) : (
          <div className="space-y-3">
            {commissions.map(c => (
              <div key={c.id} className="flex items-center gap-4 p-4 rounded-lg hover:bg-muted/50 transition-colors">
                <div className={`p-2 rounded-lg ${c.status === 'paid' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                  {c.status === 'paid' ? <DollarSign className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground">Comisión – {c.agent_role}</p>
                  <p className="text-sm text-muted-foreground">{new Date(c.created_at).toLocaleDateString('es-AR')}</p>
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${c.status === 'paid' ? 'text-success' : 'text-foreground'}`}>
                    {formatCurrency(Number(c.net_amount))}
                  </p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${c.status === 'paid' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                    {c.status === 'paid' ? 'Pagada' : 'Pendiente'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {feePayments && feePayments.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="font-display text-lg font-semibold text-foreground mb-4">Historial de Canon</h3>
          <div className="space-y-2">
            {feePayments.map(fp => (
              <div key={fp.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <span className="text-sm text-foreground">Mes: {fp.paid_month}</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-foreground">{formatCurrency(Number(fp.amount))}</span>
                  <span className="text-xs text-muted-foreground">{new Date(fp.paid_at).toLocaleDateString('es-AR')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </MainLayout>
  );
};

// ── Hook: Ingresos reales de Plusterra ──
const usePlusterraIncome = () => {
  // 1. Ingresos por administración: Comisión interna (5%) + IVA 5%
  const adminIncome = useQuery({
    queryKey: ['plusterra-admin-income-totals'],
    queryFn: async () => {
      const { data: recvs, error: e1 } = await supabase
        .from('receivables')
        .select('building_id, total_cobrado, paid_amount, amount')
        .eq('concept', 'alquiler')
        .eq('status', 'paid')
        .not('building_id', 'is', null);
      if (e1) throw e1;

      const buildingIds = [...new Set((recvs || []).map(r => r.building_id).filter(Boolean))];
      if (!buildingIds.length) return { plusterraFee: 0, iva: 0, total: 0 };

      const { data: buildings, error: e2 } = await supabase
        .from('buildings')
        .select('id, admin_fee_total_pct, admin_fee_internal_pct, is_third_party_admin')
        .in('id', buildingIds);
      if (e2) throw e2;

      const bMap = new Map((buildings || []).map(b => [b.id, b]));
      let plusterraFee = 0;
      let adminTotal = 0;

      (recvs || []).forEach(r => {
        const b = bMap.get(r.building_id);
        if (!b) return;
        const paid = Number(r.total_cobrado || r.paid_amount || r.amount || 0);
        // Plusterra keeps internal pct (5% if third-party admin, full 8% otherwise)
        const pctPlusterra = b.is_third_party_admin ? (b.admin_fee_internal_pct || 5) : (b.admin_fee_total_pct || 8);
        plusterraFee += paid * pctPlusterra / 100;
        adminTotal += paid * (b.admin_fee_total_pct || 8) / 100;
      });

      const iva = Math.round(adminTotal * 0.05);
      return {
        plusterraFee: Math.round(plusterraFee),
        iva,
        total: Math.round(plusterraFee) + iva,
      };
    },
  });

  // 2. Ingresos comerciales: 15% retención de comisiones (alquileres + ventas)
  const commercialIncome = useQuery({
    queryKey: ['plusterra-commercial-income-totals'],
    queryFn: async () => {
      // From deals-based commissions
      const { data: comms, error: e1 } = await supabase
        .from('commissions')
        .select('company_amount, deal:deal_id(deal_type)');
      if (e1) throw e1;

      // From quick commissions
      const { data: quicks, error: e2 } = await (supabase as any)
        .from('quick_commissions')
        .select('company_amount, operation_type');
      if (e2) throw e2;

      let rental = 0, sale = 0;
      ((comms || []) as any[]).forEach(c => {
        const amt = Number(c.company_amount || 0);
        const dt = c.deal?.deal_type;
        if (dt === 'rental' || dt === 'temporary_rental') rental += amt;
        else if (dt === 'sale') sale += amt;
      });
      ((quicks || []) as any[]).forEach(q => {
        const amt = Number(q.company_amount || 0);
        if (q.operation_type === 'rental' || q.operation_type === 'temporary_rental') rental += amt;
        else if (q.operation_type === 'sale') sale += amt;
      });

      return { rental: Math.round(rental), sale: Math.round(sale), total: Math.round(rental + sale) };
    },
  });

  // 3. Canon de agentes
  const canonIncome = useQuery({
    queryKey: ['plusterra-canon-income-totals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('amount')
        .eq('payment_type', 'income')
        .eq('category', 'canon_mensual_agente');
      if (error) throw error;
      return Math.round((data || []).reduce((s, p) => s + Number(p.amount), 0));
    },
  });

  // 4. Egresos operativos
  const expenses = useQuery({
    queryKey: ['plusterra-expenses-totals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('amount')
        .eq('payment_type', 'expense');
      if (error) throw error;
      return Math.round((data || []).reduce((s, p) => s + Number(p.amount), 0));
    },
  });

  const admin = adminIncome.data || { plusterraFee: 0, iva: 0, total: 0 };
  const commercial = commercialIncome.data || { rental: 0, sale: 0, total: 0 };
  const canon = canonIncome.data || 0;
  const totalExpense = expenses.data || 0;
  const totalIncome = admin.total + commercial.total + canon;

  return {
    admin,
    commercial,
    canon,
    totalIncome,
    totalExpense,
    isLoading: adminIncome.isLoading || commercialIncome.isLoading || canonIncome.isLoading || expenses.isLoading,
  };
};

// ── Resumen General Tab — Solo caja real Plusterra ──
const ResumenGeneralTab = () => {
  const [transactionType, setTransactionType] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'all' | 'day' | 'week' | 'month'>('all');
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [incomeOpen, setIncomeOpen] = useState(false);
  const [quickCommOpen, setQuickCommOpen] = useState(false);

  const { admin, commercial, canon, totalIncome } = usePlusterraIncome();

  // Payments for movements list — solo propios
  const { data: payments, isLoading } = useQuery({
    queryKey: ['admin-payments-movements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('id, description, category, amount, currency, payment_type, payment_date, status, created_at')
        .order('payment_date', { ascending: false })
        .limit(500);
      if (error) throw error;
      return data || [];
    },
  });

  // Filtrar SOLO movimientos propios de Plusterra
  const plusterraPayments = (payments || []).filter(p => {
    if (p.payment_type === 'income') {
      return PLUSTERRA_PAYMENT_CATEGORIES.includes(p.category);
    }
    // Todos los egresos son operativos de la empresa
    return p.payment_type === 'expense';
  });

  const dateFiltered = filterByRange(plusterraPayments, dateRange);

  const filtered = dateFiltered.filter(p => {
    if (transactionType !== 'all' && p.payment_type !== transactionType) return false;
    return true;
  });

  // Categorías de ingresos propios para barras de progreso
  const catTotals = [
    { key: 'admin', label: 'Ingresos por administración', icon: Building2, color: 'bg-primary', total: admin.total },
    { key: 'rental', label: 'Ingresos por alquileres (15%)', icon: Briefcase, color: 'bg-info', total: commercial.rental },
    { key: 'sale', label: 'Ingresos por ventas (15%)', icon: ShoppingCart, color: 'bg-success', total: commercial.sale },
    { key: 'canon', label: 'Ingresos por canon de agentes', icon: Coins, color: 'bg-warning', total: canon },
  ];

  const totalCatIncome = totalIncome;

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <h3 className="font-display text-lg font-semibold text-foreground">Movimientos Propios</h3>
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={() => setIncomeOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-success text-success-foreground text-sm font-medium hover:bg-success/90 transition-colors">
                <Plus className="w-4 h-4" /> Ingreso
              </button>
              <button onClick={() => setExpenseOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 transition-colors">
                <Plus className="w-4 h-4" /> Egreso
              </button>
              <button onClick={() => setQuickCommOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
                <Coins className="w-4 h-4" /> Comisión Rápida
              </button>
              <select value={transactionType} onChange={(e) => setTransactionType(e.target.value)}
                className="px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="all">Todos</option>
                <option value="income">Ingresos</option>
                <option value="expense">Egresos</option>
              </select>
              <select value={dateRange} onChange={(e) => setDateRange(e.target.value as any)}
                className={`px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-ring ${dateRange !== 'all' ? 'border-primary bg-primary/5 text-primary font-semibold' : 'border-input bg-background'}`}>
                <option value="all">Todo el período</option>
                <option value="day">Hoy</option>
                <option value="week">Última semana</option>
                <option value="month">Mes actual</option>
              </select>
              <button onClick={() => exportPaymentsPDF(filtered, dateRange)}
                disabled={!filtered.length}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-input bg-background text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
                title="Exportar PDF">
                <FileText className="w-4 h-4 text-destructive" /> PDF
              </button>
              <button onClick={() => exportPaymentsCSV(filtered, dateRange)}
                disabled={!filtered.length}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-input bg-background text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
                title="Exportar CSV">
                <Download className="w-4 h-4 text-success" /> CSV
              </button>
            </div>
          </div>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : !filtered.length ? (
            <p className="text-sm text-muted-foreground text-center py-8">Sin movimientos propios registrados.</p>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {filtered.map((p) => (
                <div key={p.id} className="flex items-center gap-4 py-3 px-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className={`p-2 rounded-lg flex-shrink-0 ${p.payment_type === 'income' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                    {p.category === 'canon_mensual_agente'
                      ? <Coins className="w-5 h-5" />
                      : p.payment_type === 'income'
                        ? <ArrowDownLeft className="w-5 h-5" />
                        : <ArrowUpRight className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-foreground text-sm truncate">{p.description}</p>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground flex-shrink-0">
                        {categoryLabels[p.category] || p.category}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{p.payment_date}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`font-semibold text-sm ${p.payment_type === 'income' ? 'text-success' : 'text-destructive'}`}>
                      {p.payment_type === 'income' ? '+' : '-'}{fmtPYG(Number(p.amount))}
                    </p>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${p.status === 'paid' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                      {p.status === 'paid' ? 'Pagado' : 'Pendiente'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Ingresos por Categoría — Solo propios de Plusterra */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="font-display text-lg font-semibold text-foreground mb-2">Ingresos por Categoría</h3>
          <p className="text-xs text-muted-foreground mb-6">Solo ingresos propios de Plusterra</p>
          {!totalCatIncome ? (
            <p className="text-sm text-muted-foreground text-center py-8">Sin datos.</p>
          ) : (
            <div className="space-y-5">
              {catTotals.map(({ key, label, icon: Icon, color, total }) => {
                const pct = totalCatIncome > 0 ? Math.round((total / totalCatIncome) * 100) : 0;
                return (
                  <div key={key}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm font-medium text-foreground flex-1">{label}</span>
                      <span className="text-xs font-semibold text-muted-foreground">{pct}%</span>
                    </div>
                    <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 font-medium">{fmtPYG(total)}</p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Total */}
          <div className="mt-6 pt-4 border-t border-border">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">Total Ingresos Propios</span>
              <span className="text-sm font-bold text-success">{fmtPYG(totalCatIncome)}</span>
            </div>
          </div>
        </div>
      </div>

      <ExpenseFormDialog open={expenseOpen} onOpenChange={setExpenseOpen} />
      <IncomeFormDialog open={incomeOpen} onOpenChange={setIncomeOpen} />
      <QuickCommissionDialog open={quickCommOpen} onOpenChange={setQuickCommOpen} />
    </>
  );
};

// ── Admin Finance View ──
const AdminFinanceView = () => {
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const initialTab = tabParam === 'canones' ? 'canones' : 'resumen';
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    if (tabParam === 'canones') setActiveTab('canones');
  }, [tabParam]);

  const { totalIncome, totalExpense } = usePlusterraIncome();

  return (
    <MainLayout title="Finanzas" subtitle="Caja real de Plusterra">
      <ModuleGuide
        moduleKey="finances"
        tips={[
          'El Resumen General muestra únicamente la caja real de Plusterra: ingresos propios y egresos operativos.',
          'Ingresos = Comisiones de administración (5% + IVA) + Retención comercial (15%) + Cánones de agentes.',
          'Comisiones Administración muestra el desglose de ingresos por administración de edificios.',
          'Comisiones Alq. y Ventas muestra la retención del 15% por operaciones cerradas.',
        ]}
      />
      {/* Global stats — caja real */}
      <FinanceStatsHeader totalIncome={totalIncome} totalExpense={totalExpense} />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="mb-6 overflow-x-auto -mx-3 px-3 md:mx-0 md:px-0">
          <TabsList className="inline-flex w-auto min-w-max h-auto gap-1 whitespace-nowrap">
            <TabsTrigger value="resumen">Resumen General</TabsTrigger>
            <TabsTrigger value="canones">Canon Agentes</TabsTrigger>
            <TabsTrigger value="com-admin">Com. Administración</TabsTrigger>
            <TabsTrigger value="com-comercial">Com. Alq. y Ventas</TabsTrigger>
            <TabsTrigger value="consolidado">Consolidado Comercial</TabsTrigger>
            <TabsTrigger value="egresos">Egresos</TabsTrigger>
            {(role === 'superadmin' || role === 'admin' || role === 'gerente') && (
              <TabsTrigger value="cierre">Cierre Mensual</TabsTrigger>
            )}
          </TabsList>
        </div>

        <TabsContent value="resumen">
          <ResumenGeneralTab />
        </TabsContent>
        <TabsContent value="canones">
          <CanonAgentesTab />
        </TabsContent>
        <TabsContent value="com-admin">
          <AdminCommissionsTab />
        </TabsContent>
        <TabsContent value="com-comercial">
          <ComisionesTab />
        </TabsContent>
        <TabsContent value="consolidado">
          <ConsolidadoComercialTab />
        </TabsContent>
        <TabsContent value="egresos">
          <EgresosTab />
        </TabsContent>
        {(role === 'superadmin' || role === 'admin' || role === 'gerente') && (
          <TabsContent value="cierre">
            <CierreMensualTab />
          </TabsContent>
        )}
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
};

const Finances = () => {
  const { role } = useAuth();
  if (role === 'agent') return <AgentFinanceView />;
  return <AdminFinanceView />;
};

export default Finances;
