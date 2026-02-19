import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { DailyVerseBanner } from '@/components/dashboard/DailyVerseBanner';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import {
  Wallet, Plus, ArrowDownLeft, Loader2, Receipt, CalendarDays,
  ClipboardList, Coins, PackageOpen, Car, Building2, FileText,
  Wrench, Users, AlertTriangle, Clock, FileWarning,
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useDashboardStats } from '@/hooks/useDashboardStats';

// ─── Formato PYG ─────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', minimumFractionDigits: 0 }).format(n);

// ─── Categorías operativas de Secretaría ─────────────────────────────────────
const CATEGORIAS_SECRETARIA = [
  { value: 'uber_movilidad', label: 'Uber / Movilidad', icon: Car },
  { value: 'envio_encomienda', label: 'Envío / Encomienda', icon: PackageOpen },
  { value: 'insumos_oficina', label: 'Insumos de oficina', icon: ClipboardList },
  { value: 'canon_agente_cobro', label: 'Cobro de canon agente', icon: Coins },
  { value: 'otro_operativo', label: 'Otro gasto operativo', icon: Receipt },
];

const categoryLabel: Record<string, string> = {
  uber_movilidad: 'Uber / Movilidad',
  envio_encomienda: 'Envío / Encomienda',
  insumos_oficina: 'Insumos de oficina',
  canon_agente_cobro: 'Cobro canon agente',
  otro_operativo: 'Otro operativo',
};

// ─── Accesos rápidos para Secretaría ─────────────────────────────────────────
const ACCESOS_RAPIDOS = [
  { label: 'Propiedades', icon: Building2, path: '/propiedades', color: 'bg-primary/10 text-primary hover:bg-primary/20' },
  { label: 'Disponibles', icon: Users, path: '/disponibles', color: 'bg-info/10 text-info hover:bg-info/20' },
  { label: 'Contratos', icon: FileText, path: '/contratos', color: 'bg-success/10 text-success hover:bg-success/20' },
  { label: 'Mantenimiento', icon: Wrench, path: '/mantenimiento', color: 'bg-warning/10 text-warning hover:bg-warning/20' },
];

// ─── Formulario de registro de ingreso operativo ─────────────────────────────
interface NuevoIngresoDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const NuevoIngresoDialog = ({ open, onOpenChange }: NuevoIngresoDialogProps) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const today = new Date().toISOString().split('T')[0];

  const [form, setForm] = useState({
    description: '',
    amount: '',
    category: 'otro_operativo',
    payment_date: today,
    payment_method: 'efectivo',
    notes: '',
  });
  const [isPending, setIsPending] = useState(false);

  const resetForm = () => {
    setForm({ description: '', amount: '', category: 'otro_operativo', payment_date: today, payment_method: 'efectivo', notes: '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const monto = parseFloat(form.amount);
    if (!form.description.trim() || isNaN(monto) || monto <= 0) {
      toast.error('Completá la descripción y un monto válido.');
      return;
    }
    if (form.description.trim().length > 200) {
      toast.error('La descripción no puede superar los 200 caracteres.');
      return;
    }

    setIsPending(true);
    const { error } = await supabase.from('payments').insert({
      description: form.description.trim(),
      amount: monto,
      category: form.category,
      payment_type: 'income' as const,
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

    toast.success('Ingreso registrado correctamente');
    qc.invalidateQueries({ queryKey: ['secretaria-caja'] });
    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" /> Registrar Ingreso Operativo
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Categoría *</label>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIAS_SECRETARIA.map(cat => {
                const Icon = cat.icon;
                const selected = form.category === cat.value;
                return (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, category: cat.value }))}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors text-left ${
                      selected
                        ? 'bg-primary/10 border-primary/30 text-primary'
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

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Concepto / Descripción *</label>
            <input
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="input-field"
              placeholder="Ej: Uber para visita propiedad Centro"
              required
              maxLength={200}
            />
          </div>

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
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>

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
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Observación corta</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="input-field min-h-[60px] resize-none"
              placeholder="Detalle adicional opcional..."
              maxLength={400}
            />
          </div>

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
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Registrar
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// ─── Panel de Alertas Operativas ──────────────────────────────────────────────
const AlertasOperativas = () => {
  const { alerts } = useDashboardStats();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      {/* Contratos por vencer */}
      <div className="border border-warning/30 bg-warning/5 rounded-xl p-5 animate-slide-up opacity-0" style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <FileWarning className="w-4 h-4 text-warning" />
            Contratos por vencer
          </h3>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-warning/10 text-warning">
            {alerts.expiringContracts.length}
          </span>
        </div>
        {alerts.expiringContracts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Sin contratos próximos a vencer</p>
        ) : (
          <div className="space-y-0 max-h-48 overflow-y-auto">
            {alerts.expiringContracts.map((c) => {
              const isUrgent = c.days_left <= 7;
              const bgClass = isUrgent ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning';
              return (
                <div key={c.id} className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0">
                  <div className="flex-1 min-w-0 mr-3">
                    <p className="text-sm font-medium text-foreground truncate">{c.tenant_name || 'Sin inquilino'}</p>
                    <p className="text-xs text-muted-foreground truncate">{c.property_address || '—'}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${bgClass}`}>{c.days_left}d</span>
                    <span className="text-xs text-muted-foreground">{c.end_date}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagos vencidos / pendientes */}
      <div className="border border-destructive/30 bg-destructive/5 rounded-xl p-5 animate-slide-up opacity-0" style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Clock className="w-4 h-4 text-destructive" />
            Pagos pendientes / vencidos
          </h3>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">
            {alerts.overdue.length + alerts.dueSoon.length}
          </span>
        </div>
        {(alerts.overdue.length + alerts.dueSoon.length) === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Sin pagos pendientes</p>
        ) : (
          <div className="space-y-0 max-h-48 overflow-y-auto">
            {[...alerts.overdue, ...alerts.dueSoon].map((p) => (
              <div key={p.id} className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0">
                <span className="text-sm text-foreground truncate flex-1 mr-3">{p.description}</span>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold text-destructive">
                    {new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', minimumFractionDigits: 0 }).format(Number(p.amount))}
                  </p>
                  <p className="text-xs text-muted-foreground">{p.due_date}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Vista principal Secretaría Dashboard ─────────────────────────────────────
const SecretariaDashboard = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [ingresoOpen, setIngresoOpen] = useState(false);

  const today = new Date().toLocaleDateString('es-PY', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  // Movimientos propios de esta sesión
  const { data: movimientos, isLoading } = useQuery({
    queryKey: ['secretaria-caja'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from('payments')
        .select('id, description, category, amount, currency, payment_type, payment_date, payment_method, notes, created_at')
        .eq('created_by', user.id)
        .order('payment_date', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    staleTime: 30_000,
  });

  const now = new Date();
  const mesActual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const movimientosMes = (movimientos || []).filter(m => m.payment_date?.startsWith(mesActual));
  const totalMes = movimientosMes.reduce((s, m) => s + Number(m.amount), 0);
  const cantidadMes = movimientosMes.length;

  return (
    <MainLayout
      title="Panel Operativo"
      subtitle={`${profile?.full_name || 'Secretaría'} · ${today}`}
      action={{ label: '+ Registrar Ingreso', onClick: () => setIngresoOpen(true) }}
    >
      {/* Banner diario */}
      <div className="mb-8"><DailyVerseBanner /></div>

      {/* ── SECCIÓN 1: Alertas Operativas ── */}
      <div className="animate-slide-up opacity-0 mb-2" style={{ animationDelay: '50ms', animationFillMode: 'forwards' }}>
        <h2 className="font-display text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-warning" />
          Alertas Operativas
        </h2>
      </div>
      <AlertasOperativas />

      {/* ── SECCIÓN 2: Accesos Rápidos ── */}
      <div className="animate-slide-up opacity-0 mb-4" style={{ animationDelay: '300ms', animationFillMode: 'forwards' }}>
        <h2 className="font-display text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-primary" />
          Accesos Rápidos
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {ACCESOS_RAPIDOS.map((acc) => (
            <button
              key={acc.label}
              onClick={() => navigate(acc.path)}
              className={`flex flex-col items-center gap-3 p-5 rounded-xl border border-border transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${acc.color}`}
            >
              <acc.icon className="w-7 h-7" />
              <span className="text-sm font-semibold">{acc.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── SECCIÓN 3: Caja Operativa (mis registros) ── */}
      <div className="animate-slide-up opacity-0" style={{ animationDelay: '400ms', animationFillMode: 'forwards' }}>
        <h2 className="font-display text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Wallet className="w-5 h-5 text-primary" />
          Caja Operativa
        </h2>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-muted-foreground">Total registrado este mes</p>
              <div className="p-1.5 rounded-lg bg-success/10"><ArrowDownLeft className="w-4 h-4 text-success" /></div>
            </div>
            <p className="text-xl font-bold text-foreground font-display">{fmt(totalMes)}</p>
            <p className="text-xs text-muted-foreground mt-1">{cantidadMes} movimiento{cantidadMes !== 1 ? 's' : ''} en {mesActual}</p>
          </div>

          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-muted-foreground">Registros totales</p>
              <div className="p-1.5 rounded-lg bg-primary/10"><Receipt className="w-4 h-4 text-primary" /></div>
            </div>
            <p className="text-xl font-bold text-foreground font-display">{(movimientos || []).length}</p>
            <p className="text-xs text-muted-foreground mt-1">Desde el inicio de actividad</p>
          </div>

          <div
            onClick={() => setIngresoOpen(true)}
            className="bg-primary/5 border border-primary/20 rounded-xl p-5 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-primary/10 transition-colors group"
          >
            <div className="p-2.5 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
              <Plus className="w-5 h-5 text-primary" />
            </div>
            <p className="text-sm font-semibold text-primary">Registrar Ingreso</p>
            <p className="text-xs text-muted-foreground text-center">Uber, envíos, insumos u otros en ₲</p>
          </div>
        </div>

        {/* Historial */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-display text-base font-semibold text-foreground">Mis Movimientos</h3>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">Últimos 50 registros</span>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : !(movimientos || []).length ? (
            <div className="text-center py-10">
              <Wallet className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm font-medium text-foreground mb-1">Sin movimientos registrados</p>
              <p className="text-xs text-muted-foreground">Hacé clic en "+ Registrar Ingreso" para comenzar.</p>
            </div>
          ) : (
            <div className="space-y-1 max-h-[400px] overflow-y-auto pr-1">
              <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide px-3 pb-2 border-b border-border">
                <span className="col-span-1"></span>
                <span className="col-span-4">Concepto</span>
                <span className="col-span-2">Categoría</span>
                <span className="col-span-2 text-center">Fecha</span>
                <span className="col-span-1 text-center">Método</span>
                <span className="col-span-2 text-right">Monto ₲</span>
              </div>
              {(movimientos || []).map((m) => {
                const CatCfg = CATEGORIAS_SECRETARIA.find(c => c.value === m.category);
                const CatIcon = CatCfg?.icon || Receipt;
                const isCanon = m.category === 'canon_agente_cobro';
                return (
                  <div key={m.id} className="grid grid-cols-12 gap-2 items-center px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="col-span-1 flex justify-center">
                      <div className={`p-1.5 rounded-lg ${isCanon ? 'bg-info/10 text-info' : 'bg-success/10 text-success'}`}>
                        <CatIcon className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <div className="col-span-4 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{m.description}</p>
                      {m.notes && <p className="text-xs text-muted-foreground truncate">{m.notes}</p>}
                    </div>
                    <div className="col-span-2">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {categoryLabel[m.category] || m.category}
                      </span>
                    </div>
                    <div className="col-span-2 text-center">
                      <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                        <CalendarDays className="w-3 h-3" />
                        {m.payment_date}
                      </div>
                    </div>
                    <div className="col-span-1 text-center">
                      <span className="text-xs text-muted-foreground capitalize">{m.payment_method || '—'}</span>
                    </div>
                    <div className="col-span-2 text-right">
                      <p className="text-sm font-semibold text-success">+{fmt(Number(m.amount))}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <NuevoIngresoDialog open={ingresoOpen} onOpenChange={setIngresoOpen} />
    </MainLayout>
  );
};

export default SecretariaDashboard;
