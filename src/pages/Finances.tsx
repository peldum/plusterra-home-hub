import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MainLayout } from '@/components/layout/MainLayout';
import { ModuleGuide } from '@/components/layout/ModuleGuide';
import { CollectionControlTab } from '@/components/finances/CollectionControlTab';
import { FinanceStatsHeader } from '@/components/finances/FinanceStatsHeader';
import { CanonAgentesTab } from '@/components/finances/CanonAgentesTab';
import { ComisionesTab } from '@/components/finances/ComisionesTab';
import { AlquileresTab } from '@/components/finances/AlquileresTab';
import { EgresosTab } from '@/components/finances/EgresosTab';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOwners } from '@/hooks/useOwners';
import { OwnerStatementDialog } from '@/components/owners/OwnerStatementDialog';
import type { Owner } from '@/hooks/useOwners';
import {
  ArrowUpRight, ArrowDownLeft, TrendingUp,
  Loader2, DollarSign, Clock, Coins, Wallet,
  ReceiptText, UserCheck, Plus, Download, FileText,
} from 'lucide-react';
import { filterByRange, exportPaymentsPDF, exportPaymentsCSV } from '@/lib/paymentsExport';
import { ExpenseFormDialog } from '@/components/finances/ExpenseFormDialog';
import { IncomeFormDialog } from '@/components/dashboard/IncomeFormDialog';
import { QuickCommissionDialog } from '@/components/commissions/QuickCommissionDialog';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount);

// ── Agent Finance View (unchanged) ──
const AgentFinanceView = () => {
  const { user } = useAuth();

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

// ── Resumen General Tab (former MovimientosTab) ──
const fmtPYG = (n: number) =>
  new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', minimumFractionDigits: 0 }).format(n);

const categoryLabels: Record<string, string> = {
  canon_mensual_agente: 'Canon Agente', alquiler: 'Alquiler', venta: 'Venta',
  comision: 'Comisión', mantenimiento: 'Mantenimiento', impuesto: 'Impuesto',
  alquiler_oficina: 'Alquiler oficina', internet: 'Internet', servicios: 'Servicios',
  salarios: 'Salarios', insumos: 'Insumos', marketing: 'Marketing', otro: 'Otro',
};

const ResumenGeneralTab = () => {
  const [transactionType, setTransactionType] = useState<string>('all');
  const [filterOwnerId, setFilterOwnerId] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'all' | 'day' | 'week' | 'month'>('all');
  const [statementOwner, setStatementOwner] = useState<Owner | null>(null);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [incomeOpen, setIncomeOpen] = useState(false);
  const [quickCommOpen, setQuickCommOpen] = useState(false);
  const { data: owners } = useOwners();

  const { data: payments, isLoading } = useQuery({
    queryKey: ['admin-payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('id, description, category, amount, currency, payment_type, payment_date, status, created_at, property_id, owner_id')
        .order('payment_date', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: properties } = useQuery({
    queryKey: ['properties-owner-map'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('properties')
        .select('id, owner_id')
        .not('owner_id', 'is', null);
      if (error) throw error;
      return data || [];
    },
  });

  const ownerPropertyIds = new Set(
    (properties || [])
      .filter(p => filterOwnerId === 'all' || p.owner_id === filterOwnerId)
      .map(p => p.id)
  );

  const filtered = (payments || []).filter(p => {
    if (transactionType !== 'all' && p.payment_type !== transactionType) return false;
    if (filterOwnerId !== 'all') {
      const matchesDirect = p.owner_id === filterOwnerId;
      const matchesProperty = p.property_id && ownerPropertyIds.has(p.property_id);
      if (!matchesDirect && !matchesProperty) return false;
    }
    return true;
  });

  const catTotals: Record<string, number> = {};
  (payments || []).filter(p => p.payment_type === 'income').forEach(p => {
    const cat = categoryLabels[p.category] || p.category;
    catTotals[cat] = (catTotals[cat] || 0) + Number(p.amount);
  });
  const catEntries = Object.entries(catTotals).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const catMax = catEntries[0]?.[1] || 1;

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <h3 className="font-display text-lg font-semibold text-foreground">Movimientos Recientes</h3>
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
              <div className="flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-muted-foreground" />
                <select value={filterOwnerId} onChange={(e) => setFilterOwnerId(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="all">Todos los propietarios</option>
                  {(owners || []).map(o => (
                    <option key={o.id} value={o.id}>{o.full_name}</option>
                  ))}
                </select>
                {filterOwnerId !== 'all' && (
                  <button
                    onClick={() => {
                      const owner = (owners || []).find(o => o.id === filterOwnerId);
                      if (owner) setStatementOwner(owner);
                    }}
                    className="flex items-center gap-1 px-2.5 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
                    title="Ver Estado de Cuenta">
                    <ReceiptText className="w-3.5 h-3.5" /> Estado de Cuenta
                  </button>
                )}
              </div>
              <select value={transactionType} onChange={(e) => setTransactionType(e.target.value)}
                className="px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="all">Todos</option>
                <option value="income">Ingresos</option>
                <option value="expense">Egresos</option>
              </select>
            </div>
          </div>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : !filtered.length ? (
            <p className="text-sm text-muted-foreground text-center py-8">Sin movimientos registrados.</p>
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

        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="font-display text-lg font-semibold text-foreground mb-6">Ingresos por Categoría</h3>
          {!catEntries.length ? (
            <p className="text-sm text-muted-foreground text-center py-8">Sin datos.</p>
          ) : (
            <div className="space-y-4">
              {catEntries.map(([name, value]) => {
                const pct = Math.round((value / catMax) * 100);
                return (
                  <div key={name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-foreground">{name}</span>
                      <span className="text-xs text-muted-foreground">{pct}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{fmtPYG(value)}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <OwnerStatementDialog
        open={!!statementOwner}
        onOpenChange={v => { if (!v) setStatementOwner(null); }}
        owner={statementOwner}
      />
      <ExpenseFormDialog open={expenseOpen} onOpenChange={setExpenseOpen} />
      <IncomeFormDialog open={incomeOpen} onOpenChange={setIncomeOpen} />
      <QuickCommissionDialog open={quickCommOpen} onOpenChange={setQuickCommOpen} />
    </>
  );
};

// ── Admin Finance View (with 6 tabs) ──
const AdminFinanceView = () => {
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const initialTab = tabParam === 'control-cobros' ? 'cobros' : tabParam === 'canones' ? 'canones' : 'resumen';
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    if (tabParam === 'control-cobros') setActiveTab('cobros');
    else if (tabParam === 'canones') setActiveTab('canones');
  }, [tabParam]);

  // Global stats query (always visible)
  const { data: payments } = useQuery({
    queryKey: ['admin-payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('id, amount, payment_type, category')
        .order('payment_date', { ascending: false })
        .limit(1000);
      if (error) throw error;
      return data || [];
    },
  });

  const totalIncome = (payments || [])
    .filter(p => p.payment_type === 'income')
    .reduce((s, p) => s + Number(p.amount), 0);
  const totalExpense = (payments || [])
    .filter(p => p.payment_type === 'expense')
    .reduce((s, p) => s + Number(p.amount), 0);
  const canonTotal = (payments || [])
    .filter(p => p.category === 'canon_mensual_agente')
    .reduce((s, p) => s + Number(p.amount), 0);

  return (
    <MainLayout title="Finanzas" subtitle="Control financiero integral">
      <ModuleGuide
        moduleKey="finances"
        tips={[
          'El Resumen General muestra todos los ingresos y egresos con filtros por propietario.',
          'Control de Cobros te permite gestionar cuentas por cobrar de inquilinos y propietarios.',
          'En Cánones Agentes ves el estado de pago mensual de cada agente.',
          'Registrá egresos, ingresos y comisiones rápidas desde los botones de cada pestaña.',
        ]}
      />
      {/* Global stats — always visible */}
      <FinanceStatsHeader totalIncome={totalIncome} totalExpense={totalExpense} canonTotal={canonTotal} />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="mb-6 overflow-x-auto -mx-3 px-3 md:mx-0 md:px-0">
          <TabsList className="inline-flex w-auto min-w-max h-auto gap-1 whitespace-nowrap">
            <TabsTrigger value="resumen">Resumen General</TabsTrigger>
            <TabsTrigger value="cobros">Control de Cobros</TabsTrigger>
            <TabsTrigger value="canones">Cánones Agentes</TabsTrigger>
            <TabsTrigger value="comisiones">Comisiones</TabsTrigger>
            <TabsTrigger value="alquileres">Alquileres</TabsTrigger>
            <TabsTrigger value="egresos">Egresos</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="resumen">
          <ResumenGeneralTab />
        </TabsContent>
        <TabsContent value="cobros">
          <CollectionControlTab />
        </TabsContent>
        <TabsContent value="canones">
          <CanonAgentesTab />
        </TabsContent>
        <TabsContent value="comisiones">
          <ComisionesTab />
        </TabsContent>
        <TabsContent value="alquileres">
          <AlquileresTab />
        </TabsContent>
        <TabsContent value="egresos">
          <EgresosTab />
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
