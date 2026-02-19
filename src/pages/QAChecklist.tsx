/**
 * QA – Validación por Rol
 * Módulo INTERNO exclusivo para SuperAdmin.
 * Solo lectura visual. No modifica permisos, roles ni autenticación.
 */
import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import {
  CheckCircle2, AlertTriangle, XCircle, ClipboardList, RefreshCw, Save,
} from 'lucide-react';

// ─── Tipos ────────────────────────────────────────────────────────────────────

type ItemStatus = 'ok' | 'review' | 'fail' | 'pending';

interface CheckItem {
  id: string;
  label: string;
  status: ItemStatus;
  notes: string;
}

interface RoleBlock {
  role: string;
  label: string;
  subtitle?: string;
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
      { id: 'sa-1', label: 'Login SuperAdmin funciona', status: 'pending', notes: '' },
      { id: 'sa-2', label: 'Ve módulo Agentes + estado canon + intereses', status: 'pending', notes: '' },
      { id: 'sa-3', label: 'Puede marcar agente como PAGADO y pasa a AL_DÍA', status: 'pending', notes: '' },
      { id: 'sa-4', label: 'Se registra el ingreso de canon en Finanzas (tipo: canon agente)', status: 'pending', notes: '' },
      { id: 'sa-5', label: 'Catálogo "Disponibles" se ve estable (no cambia layout)', status: 'pending', notes: '' },
      { id: 'sa-6', label: 'Botones Mapa / WhatsApp / Ver en web funcionan', status: 'pending', notes: '' },
      { id: 'sa-7', label: 'Contratos: generar + exportar PDF A4 OK', status: 'pending', notes: '' },
      { id: 'sa-8', label: 'Contratos: firmas alineadas simétricamente + footer fecha/hora OK', status: 'pending', notes: '' },
    ],
  },
  {
    role: 'admin',
    label: 'Admin',
    color: 'hsl(var(--secondary))',
    items: [
      { id: 'adm-1', label: 'Login Admin funciona', status: 'pending', notes: '' },
      { id: 'adm-2', label: 'NO ve QA checklist', status: 'pending', notes: '' },
      { id: 'adm-3', label: 'Puede ver/gestionar propiedades', status: 'pending', notes: '' },
      { id: 'adm-4', label: 'Puede generar/exportar contratos', status: 'pending', notes: '' },
      { id: 'adm-5', label: 'Ve agentes + estado canon y puede marcar pagado', status: 'pending', notes: '' },
      { id: 'adm-6', label: 'Catálogo Disponibles UI estable y botones OK', status: 'pending', notes: '' },
    ],
  },
  {
    role: 'agent_aldia',
    label: 'Agente — AL_DÍA',
    subtitle: 'Modo: agente con canon al día',
    color: 'hsl(var(--success))',
    items: [
      { id: 'agt-ad-1', label: 'Login funciona', status: 'pending', notes: '' },
      { id: 'agt-ad-2', label: 'Ve catálogo (disponibles y no disponibles)', status: 'pending', notes: '' },
      { id: 'agt-ad-3', label: 'Botón WhatsApp visible y funcional', status: 'pending', notes: '' },
      { id: 'agt-ad-4', label: 'Botón "Ver en web" (naranja) visible si hay URL y abre correcto', status: 'pending', notes: '' },
      { id: 'agt-ad-5', label: 'Botón Mapa abre ubicación', status: 'pending', notes: '' },
      { id: 'agt-ad-6', label: 'Puede crear contrato', status: 'pending', notes: '' },
      { id: 'agt-ad-7', label: 'Puede exportar contrato PDF A4 OK', status: 'pending', notes: '' },
    ],
  },
  {
    role: 'agent_moroso',
    label: 'Agente — MOROSO',
    subtitle: 'Modo: agente con canon vencido / moroso',
    color: 'hsl(var(--destructive))',
    items: [
      { id: 'agt-m-1', label: 'Login funciona (NO debe bloquearse)', status: 'pending', notes: '' },
      { id: 'agt-m-2', label: 'Ve catálogo normal', status: 'pending', notes: '' },
      { id: 'agt-m-3', label: 'WhatsApp sigue funcionando', status: 'pending', notes: '' },
      { id: 'agt-m-4', label: 'Crear contrato BLOQUEADO con mensaje claro', status: 'pending', notes: '' },
      { id: 'agt-m-5', label: 'Exportar contrato BLOQUEADO con mensaje claro', status: 'pending', notes: '' },
      { id: 'agt-m-6', label: 'Crear cliente BLOQUEADO con mensaje claro', status: 'pending', notes: '' },
      { id: 'agt-m-7', label: 'Confirmar operaciones BLOQUEADO con mensaje claro', status: 'pending', notes: '' },
    ],
  },
];

// ─── Helpers visuales ─────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<ItemStatus, { label: string; icon: React.FC<{ className?: string }>; classes: string; dot: string }> = {
  ok:      { label: 'OK ✅',      icon: CheckCircle2,  classes: 'text-success bg-success/10 border-success/30',         dot: 'bg-success' },
  review:  { label: 'Revisar ⚠️', icon: AlertTriangle, classes: 'text-warning bg-warning/10 border-warning/30',         dot: 'bg-warning' },
  fail:    { label: 'Falló ❌',   icon: XCircle,       classes: 'text-destructive bg-destructive/10 border-destructive/30', dot: 'bg-destructive' },
  pending: { label: 'Pendiente',  icon: ClipboardList, classes: 'text-muted-foreground bg-muted/60 border-border',       dot: 'bg-muted-foreground/30' },
};

const STORAGE_KEY = 'qa_checklist_v2';

const formatDate = (d: Date) =>
  d.toLocaleString('es-PY', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

// ─── Componente principal ─────────────────────────────────────────────────────

const QAChecklist = () => {
  const { user } = useAuth();

  const [blocks, setBlocks] = useState<RoleBlock[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as RoleBlock[];
        // Ensure notes field exists on all items (migration from older storage)
        return parsed.map(b => ({ ...b, items: b.items.map(i => ({ notes: '', ...i })) }));
      }
    } catch { /* ignore */ }
    return buildInitialBlocks();
  });

  const [lastValidated, setLastValidated] = useState<{ date: Date; by: string } | null>(() => {
    try {
      const raw = localStorage.getItem(`${STORAGE_KEY}_ts`);
      if (raw) {
        const { date, by } = JSON.parse(raw);
        return { date: new Date(date), by };
      }
    } catch { return null; }
    return null;
  });

  const [editingNote, setEditingNote] = useState<{ roleIdx: number; itemId: string } | null>(null);

  // Auto-persist on every change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(blocks));
  }, [blocks]);

  // ── Handlers ──────────────────────────────────────────────────────────────

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

  const updateNote = (roleIdx: number, itemId: string, notes: string) => {
    setBlocks(prev =>
      prev.map((block, bi) =>
        bi !== roleIdx ? block : {
          ...block,
          items: block.items.map(item => item.id !== itemId ? item : { ...item, notes }),
        }
      )
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
        bi !== roleIdx ? block : { ...block, items: block.items.map(i => ({ ...i, status: 'pending' as ItemStatus, notes: '' })) }
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
    const by = user?.email || 'SuperAdmin';
    const payload = { date: now.toISOString(), by };
    setLastValidated({ date: now, by });
    localStorage.setItem(`${STORAGE_KEY}_ts`, JSON.stringify(payload));
  };

  // ── Summary ───────────────────────────────────────────────────────────────

  const summary = blocks.map(block => ({
    label: block.label,
    ok:      block.items.filter(i => i.status === 'ok').length,
    review:  block.items.filter(i => i.status === 'review').length,
    fail:    block.items.filter(i => i.status === 'fail').length,
    pending: block.items.filter(i => i.status === 'pending').length,
    total:   block.items.length,
    color:   block.color,
  }));

  const globalOk      = blocks.flatMap(b => b.items).filter(i => i.status === 'ok').length;
  const globalTotal   = blocks.flatMap(b => b.items).length;
  const globalFail    = blocks.flatMap(b => b.items).filter(i => i.status === 'fail').length;
  const globalReview  = blocks.flatMap(b => b.items).filter(i => i.status === 'review').length;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <MainLayout
      title="QA — Checklist por Rol"
      subtitle="Herramienta interna · Solo SuperAdmin · No modifica permisos ni funcionalidades"
    >
      {/* ── Header bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 p-4 rounded-xl bg-muted/40 border border-border">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <ClipboardList className="w-4 h-4 flex-shrink-0" />
          {lastValidated ? (
            <span>
              Última validación: <strong className="text-foreground">{formatDate(lastValidated.date)}</strong>
              {' '}&mdash; por <strong className="text-foreground">{lastValidated.by}</strong>
            </span>
          ) : (
            <span>Sin validación guardada aún</span>
          )}
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
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
          >
            <Save className="w-3.5 h-3.5" /> Guardar validación
          </button>
        </div>
      </div>

      {/* ── Global progress bar ── */}
      <div className="mb-6 p-4 rounded-xl bg-card border border-border">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-foreground">Progreso global</p>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-success font-medium">{globalOk} OK</span>
            {globalReview > 0 && <span className="text-warning font-medium">{globalReview} Revisar</span>}
            {globalFail   > 0 && <span className="text-destructive font-medium">{globalFail} Fallaron</span>}
            <span className="text-muted-foreground">{globalOk}/{globalTotal} verificados</span>
          </div>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${globalFail > 0 ? 'bg-destructive' : globalReview > 0 ? 'bg-warning' : 'bg-success'}`}
            style={{ width: `${globalTotal > 0 ? (globalOk / globalTotal) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {summary.map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
              <p className="text-xs font-semibold text-foreground truncate">{s.label}</p>
            </div>
            <div className="flex gap-2 flex-wrap mb-2">
              <Pill count={s.ok}      status="ok" />
              <Pill count={s.review}  status="review" />
              <Pill count={s.fail}    status="fail" />
              <Pill count={s.pending} status="pending" />
            </div>
            <div className="h-1 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-success rounded-full transition-all duration-500"
                style={{ width: `${s.total > 0 ? (s.ok / s.total) * 100 : 0}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* ── Checklist blocks ── */}
      <div className="space-y-5">
        {blocks.map((block, roleIdx) => (
          <div key={block.role} className="bg-card border border-border rounded-xl overflow-hidden">
            {/* Block header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-muted/20">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: block.color }} />
                <div>
                  <h2 className="font-semibold text-foreground text-sm">{block.label}</h2>
                  {block.subtitle && (
                    <p className="text-xs text-muted-foreground">{block.subtitle}</p>
                  )}
                </div>
                <span className="text-xs text-muted-foreground ml-1">
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
              {block.items.map((item, itemIdx) => {
                const cfg = STATUS_CONFIG[item.status];
                const Icon = cfg.icon;
                const isEditingNote = editingNote?.roleIdx === roleIdx && editingNote?.itemId === item.id;

                return (
                  <div key={item.id} className="px-5 py-3 hover:bg-muted/20 transition-colors">
                    <div className="flex items-center justify-between gap-4">
                      {/* Number + label */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="text-xs text-muted-foreground font-mono w-5 flex-shrink-0">{itemIdx + 1}.</span>
                        <span className="text-sm text-foreground">{item.label}</span>
                      </div>

                      {/* Controls */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Note toggle */}
                        <button
                          onClick={() => setEditingNote(isEditingNote ? null : { roleIdx, itemId: item.id })}
                          className={`text-xs px-2 py-1 rounded-md border transition-colors ${
                            item.notes
                              ? 'border-primary/30 text-primary bg-primary/5'
                              : 'border-border text-muted-foreground hover:bg-muted'
                          }`}
                          title="Agregar nota"
                        >
                          {item.notes ? '📝' : '+ nota'}
                        </button>

                        {/* Status cycle button */}
                        <button
                          onClick={() => cycleStatus(roleIdx, item.id)}
                          title="Clic para cambiar estado"
                          className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-medium transition-all hover:opacity-75 min-w-[100px] justify-center ${cfg.classes}`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          {cfg.label}
                        </button>
                      </div>
                    </div>

                    {/* Inline note editor */}
                    {isEditingNote && (
                      <div className="mt-2 ml-8">
                        <textarea
                          autoFocus
                          value={item.notes}
                          onChange={e => updateNote(roleIdx, item.id, e.target.value)}
                          placeholder="Notas cortas sobre este ítem..."
                          rows={2}
                          className="w-full text-xs rounded-lg border border-border bg-background text-foreground px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"
                        />
                      </div>
                    )}

                    {/* Note preview (when not editing) */}
                    {!isEditingNote && item.notes && (
                      <div className="mt-1.5 ml-8">
                        <p className="text-xs text-muted-foreground italic bg-muted/40 rounded px-2 py-1">{item.notes}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* ── Save button (bottom) ── */}
      <div className="mt-8 flex items-center justify-between gap-4 p-4 rounded-xl bg-muted/30 border border-border">
        <p className="text-xs text-muted-foreground">
          Los cambios se guardan automáticamente en este navegador. El botón <strong>"Guardar validación"</strong> registra la fecha y hora de la revisión completa junto con el usuario que la realizó.
        </p>
        <button
          onClick={saveValidation}
          className="flex items-center gap-2 px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors whitespace-nowrap"
        >
          <Save className="w-4 h-4" /> Guardar validación
        </button>
      </div>

      {/* ── Instructions ── */}
      <div className="mt-4 p-4 rounded-xl bg-muted/20 border border-border text-xs text-muted-foreground space-y-1">
        <p className="font-semibold text-foreground">Instrucciones</p>
        <p>• Hacé clic en el badge de estado para ciclar: <strong>Pendiente → OK ✅ → Revisar ⚠️ → Falló ❌ → Pendiente</strong></p>
        <p>• Usá <strong>"+ nota"</strong> para agregar observaciones cortas por ítem (se guardan automáticamente).</p>
        <p>• <strong>Este módulo no modifica permisos, roles ni ninguna funcionalidad del sistema.</strong></p>
      </div>
    </MainLayout>
  );
};

// ─── Pill ──────────────────────────────────────────────────────────────────────

const Pill = ({ count, status }: { count: number; status: ItemStatus }) => {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-xs font-medium ${cfg.classes}`}>
      <Icon className="w-3 h-3" />{count}
    </span>
  );
};

export default QAChecklist;
