/**
 * QA – Validación por Rol
 * Módulo INTERNO exclusivo para SuperAdmin.
 * Solo lectura visual. No modifica permisos, roles ni autenticación.
 */
import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { CheckCircle2, AlertTriangle, XCircle, ClipboardList, RefreshCw } from 'lucide-react';

// ─── Tipos ────────────────────────────────────────────────────────────────────

type ItemStatus = 'ok' | 'review' | 'fail' | 'pending';

interface CheckItem {
  id: string;
  label: string;
  status: ItemStatus;
}

interface RoleBlock {
  role: string;
  label: string;
  color: string;
  items: CheckItem[];
}

// ─── Datos iniciales ──────────────────────────────────────────────────────────

const buildInitialBlocks = (): RoleBlock[] => [
  {
    role: 'superadmin',
    label: 'SuperAdmin',
    color: 'hsl(var(--primary))',
    items: [
      { id: 'sa-login', label: 'Puede iniciar sesión', status: 'pending' },
      { id: 'sa-dashboard', label: 'Puede ver Dashboard completo', status: 'pending' },
      { id: 'sa-finanzas', label: 'Puede ver Finanzas globales', status: 'pending' },
      { id: 'sa-agentes', label: 'Puede ver y editar todos los agentes', status: 'pending' },
      { id: 'sa-canon', label: 'Puede marcar agentes como AL_DÍA / MOROSO', status: 'pending' },
      { id: 'sa-contratos', label: 'Puede generar contratos', status: 'pending' },
      { id: 'sa-export', label: 'Puede exportar contratos en A4 correctamente', status: 'pending' },
      { id: 'sa-metricas', label: 'Puede ver métricas generales (KPI Ejecutivo)', status: 'pending' },
      { id: 'sa-clientes', label: 'Puede ver clientes globales', status: 'pending' },
    ],
  },
  {
    role: 'admin',
    label: 'Admin',
    color: 'hsl(var(--secondary))',
    items: [
      { id: 'adm-login', label: 'Puede iniciar sesión', status: 'pending' },
      { id: 'adm-props', label: 'Puede ver propiedades', status: 'pending' },
      { id: 'adm-props-edit', label: 'Puede crear/editar propiedades', status: 'pending' },
      { id: 'adm-contratos', label: 'Puede generar contratos', status: 'pending' },
      { id: 'adm-export', label: 'Puede exportar contratos', status: 'pending' },
      { id: 'adm-no-superadmin', label: 'No puede modificar roles SuperAdmin', status: 'pending' },
      { id: 'adm-no-permisos', label: 'No puede alterar permisos globales', status: 'pending' },
    ],
  },
  {
    role: 'agent',
    label: 'Agente',
    color: 'hsl(var(--accent))',
    items: [
      { id: 'agt-login', label: 'Puede iniciar sesión', status: 'pending' },
      { id: 'agt-catalogo', label: 'Puede ver catálogo interno de propiedades', status: 'pending' },
      { id: 'agt-disponibles', label: 'Puede ver propiedades disponibles y no disponibles', status: 'pending' },
      { id: 'agt-web', label: 'Puede usar botón "Ver en web"', status: 'pending' },
      { id: 'agt-mapa', label: 'Puede usar botón "Mapa"', status: 'pending' },
      { id: 'agt-wa-aldia', label: 'WhatsApp habilitado si está AL_DÍA', status: 'pending' },
      { id: 'agt-login-moroso', label: 'Login funciona aunque esté MOROSO', status: 'pending' },
      { id: 'agt-wa-moroso', label: 'WhatsApp deshabilitado si está MOROSO', status: 'pending' },
      { id: 'agt-contrato-moroso', label: 'Crear contrato deshabilitado si está MOROSO', status: 'pending' },
      { id: 'agt-no-finanzas', label: 'No puede ver finanzas globales', status: 'pending' },
      { id: 'agt-no-clientes', label: 'No puede ver clientes de otros agentes', status: 'pending' },
    ],
  },
];

// ─── Helpers visuales ─────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<ItemStatus, { label: string; icon: React.FC<{ className?: string }>; classes: string }> = {
  ok: { label: 'OK', icon: CheckCircle2, classes: 'text-success bg-success/10 border-success/30' },
  review: { label: 'Revisar', icon: AlertTriangle, classes: 'text-warning bg-warning/10 border-warning/30' },
  fail: { label: 'Fallo', icon: XCircle, classes: 'text-destructive bg-destructive/10 border-destructive/30' },
  pending: { label: 'Pendiente', icon: ClipboardList, classes: 'text-muted-foreground bg-muted border-border' },
};

const STORAGE_KEY = 'qa_checklist_v1';

const formatDate = (d: Date) =>
  d.toLocaleString('es-PY', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

// ─── Componente principal ─────────────────────────────────────────────────────

const QAChecklist = () => {
  const [blocks, setBlocks] = useState<RoleBlock[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved) as RoleBlock[];
    } catch { /* ignore */ }
    return buildInitialBlocks();
  });

  const [lastValidated, setLastValidated] = useState<Date | null>(() => {
    try {
      const ts = localStorage.getItem(`${STORAGE_KEY}_ts`);
      return ts ? new Date(ts) : null;
    } catch { return null; }
  });

  // Persist on every change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(blocks));
  }, [blocks]);

  const cycleStatus = (roleIdx: number, itemId: string) => {
    const order: ItemStatus[] = ['pending', 'ok', 'review', 'fail'];
    setBlocks(prev =>
      prev.map((block, bi) => {
        if (bi !== roleIdx) return block;
        return {
          ...block,
          items: block.items.map(item => {
            if (item.id !== itemId) return item;
            const next = order[(order.indexOf(item.status) + 1) % order.length];
            return { ...item, status: next };
          }),
        };
      })
    );
  };

  const markAllOk = (roleIdx: number) => {
    setBlocks(prev =>
      prev.map((block, bi) =>
        bi !== roleIdx ? block : { ...block, items: block.items.map(i => ({ ...i, status: 'ok' as ItemStatus })) }
      )
    );
  };

  const resetBlock = (roleIdx: number) => {
    setBlocks(prev =>
      prev.map((block, bi) =>
        bi !== roleIdx ? block : { ...block, items: block.items.map(i => ({ ...i, status: 'pending' as ItemStatus })) }
      )
    );
  };

  const resetAll = () => {
    setBlocks(buildInitialBlocks());
    setLastValidated(null);
    localStorage.removeItem(`${STORAGE_KEY}_ts`);
  };

  const saveValidation = () => {
    const now = new Date();
    setLastValidated(now);
    localStorage.setItem(`${STORAGE_KEY}_ts`, now.toISOString());
  };

  // Summary counts
  const summary = blocks.map(block => ({
    label: block.label,
    ok: block.items.filter(i => i.status === 'ok').length,
    review: block.items.filter(i => i.status === 'review').length,
    fail: block.items.filter(i => i.status === 'fail').length,
    pending: block.items.filter(i => i.status === 'pending').length,
    total: block.items.length,
  }));

  return (
    <MainLayout
      title="QA – Validación por Rol"
      subtitle="Herramienta interna · Solo SuperAdmin · No modifica permisos"
    >
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 p-4 rounded-xl bg-muted/50 border border-border">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ClipboardList className="w-4 h-4" />
          {lastValidated
            ? <span>Última validación guardada: <strong className="text-foreground">{formatDate(lastValidated)}</strong></span>
            : <span>Sin validación guardada aún</span>}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={resetAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-muted-foreground text-xs hover:bg-muted transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Reiniciar todo
          </button>
          <button
            onClick={saveValidation}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> Guardar fecha de validación
          </button>
        </div>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {summary.map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4">
            <p className="text-sm font-semibold text-foreground mb-3">{s.label}</p>
            <div className="flex gap-3 flex-wrap">
              <Pill count={s.ok} status="ok" />
              <Pill count={s.review} status="review" />
              <Pill count={s.fail} status="fail" />
              <Pill count={s.pending} status="pending" />
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-success rounded-full transition-all duration-500"
                style={{ width: `${s.total > 0 ? (s.ok / s.total) * 100 : 0}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">{s.ok} / {s.total} verificados</p>
          </div>
        ))}
      </div>

      {/* Checklist blocks */}
      <div className="space-y-6">
        {blocks.map((block, roleIdx) => (
          <div key={block.role} className="bg-card border border-border rounded-xl overflow-hidden">
            {/* Block header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: block.color }} />
                <h2 className="font-semibold text-foreground">{block.label}</h2>
                <span className="text-xs text-muted-foreground">
                  ({block.items.filter(i => i.status === 'ok').length}/{block.items.length} OK)
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => markAllOk(roleIdx)}
                  className="text-xs px-2.5 py-1 rounded-md border border-success/30 text-success hover:bg-success/10 transition-colors"
                >
                  ✓ Todo OK
                </button>
                <button
                  onClick={() => resetBlock(roleIdx)}
                  className="text-xs px-2.5 py-1 rounded-md border border-border text-muted-foreground hover:bg-muted transition-colors"
                >
                  Reiniciar
                </button>
              </div>
            </div>

            {/* Items */}
            <div className="divide-y divide-border">
              {block.items.map((item) => {
                const cfg = STATUS_CONFIG[item.status];
                const Icon = cfg.icon;
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between px-6 py-3.5 hover:bg-muted/30 transition-colors"
                  >
                    <span className="text-sm text-foreground">{item.label}</span>
                    <button
                      onClick={() => cycleStatus(roleIdx, item.id)}
                      title="Clic para cambiar estado"
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-medium transition-all hover:opacity-80 ${cfg.classes}`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {cfg.label}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Instructions */}
      <div className="mt-8 p-4 rounded-xl bg-muted/30 border border-border text-xs text-muted-foreground">
        <p className="font-medium text-foreground mb-1">Instrucciones de uso</p>
        <p>• Hacé clic en cada badge de estado para ciclar: <strong>Pendiente → OK → Revisar → Fallo → Pendiente</strong></p>
        <p>• Los cambios se guardan automáticamente en este navegador.</p>
        <p>• Usá "Guardar fecha de validación" para registrar cuándo se realizó la última revisión completa.</p>
        <p>• Este módulo es solo visual: <strong>no modifica permisos, roles ni ninguna funcionalidad del sistema.</strong></p>
      </div>
    </MainLayout>
  );
};

// ─── Sub-componentes ──────────────────────────────────────────────────────────

const Pill = ({ count, status }: { count: number; status: ItemStatus }) => {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium ${cfg.classes}`}>
      <Icon className="w-3 h-3" />{count}
    </span>
  );
};

export default QAChecklist;
