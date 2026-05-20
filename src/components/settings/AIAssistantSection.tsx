import { useEffect, useState } from 'react';
import { Sparkles, Plus, Trash2, Edit2, Save, X, Power, ShieldAlert, BarChart3, Users, DollarSign, Eye, EyeOff, Gift, Ban, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type ManualSection = {
  id: string;
  title: string;
  category: string;
  content: string;
  display_order: number;
  is_active: boolean;
};

type LimitRow = {
  user_id: string;
  daily_limit: number;
  is_enabled: boolean;
  bonus_today: number;
  bonus_date: string | null;
  profile?: { full_name: string; email: string };
  role?: string;
  used_today?: number;
};

type Settings = {
  kill_switch_enabled: boolean;
  model: string;
  monthly_budget_usd: number;
  system_prompt_extra: string | null;
};

const MODELS = [
  { value: 'google/gemini-3.1-flash-lite-preview', label: 'Económico (más barato)' },
  { value: 'google/gemini-3-flash-preview', label: 'Equilibrado (recomendado)' },
  { value: 'google/gemini-2.5-pro', label: 'Calidad máxima (más caro)' },
];

const ALLOWED_ROLES = ['superadmin', 'admin', 'accounting', 'secretaria'];

export const AIAssistantSection = () => {
  const [sections, setSections] = useState<ManualSection[]>([]);
  const [editing, setEditing] = useState<ManualSection | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [limits, setLimits] = useState<LimitRow[]>([]);
  const [stats, setStats] = useState<{ monthCount: number; monthCost: number; todayCount: number }>({ monthCount: 0, monthCost: 0, todayCount: 0 });
  const [topQuestions, setTopQuestions] = useState<{ question: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [{ data: sec }, { data: cfg }, { data: profs }, { data: logs }] = await Promise.all([
      supabase.from('ai_manual_sections').select('*').order('display_order'),
      supabase.from('ai_chat_settings').select('*').eq('id', 1).maybeSingle(),
      supabase.from('profiles')
        .select('id, full_name, email, user_roles(role)')
        .in('status', ['active', 'blocked', 'suspended']),
      supabase.from('ai_chat_logs').select('user_id, question, cost_usd, created_at, error'),
    ]);
    setSections(sec ?? []);
    if (cfg) setSettings(cfg as any);

    // Build limits combined with profiles
    const { data: limRows } = await supabase.from('ai_chat_limits').select('*');
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const profById = new Map<string, any>();
    (profs ?? []).forEach((p: any) => {
      const r = Array.isArray(p.user_roles) ? p.user_roles[0]?.role : p.user_roles?.role;
      if (r && ALLOWED_ROLES.includes(r)) profById.set(p.id, { ...p, role: r });
    });

    const usedToday = new Map<string, number>();
    (logs ?? []).forEach((l: any) => {
      if (l.error) return;
      if (new Date(l.created_at) >= today) {
        usedToday.set(l.user_id, (usedToday.get(l.user_id) ?? 0) + 1);
      }
    });

    const limByUser = new Map<string, any>();
    (limRows ?? []).forEach((l: any) => limByUser.set(l.user_id, l));

    const rows: LimitRow[] = [];
    profById.forEach((p, id) => {
      const lim = limByUser.get(id);
      const defaultLimit = p.role === 'superadmin' ? 999 : p.role === 'admin' || p.role === 'accounting' ? 25 : p.role === 'secretaria' ? 15 : 0;
      rows.push({
        user_id: id,
        daily_limit: lim?.daily_limit ?? defaultLimit,
        is_enabled: lim?.is_enabled ?? true,
        bonus_today: lim?.bonus_date === todayStr() ? (lim?.bonus_today ?? 0) : 0,
        bonus_date: lim?.bonus_date ?? null,
        profile: { full_name: p.full_name, email: p.email },
        role: p.role,
        used_today: usedToday.get(id) ?? 0,
      });
    });
    rows.sort((a, b) => (b.used_today ?? 0) - (a.used_today ?? 0));
    setLimits(rows);

    // Stats
    let monthCount = 0, monthCost = 0, todayCount = 0;
    const qCounts = new Map<string, number>();
    (logs ?? []).forEach((l: any) => {
      const d = new Date(l.created_at);
      if (d >= monthStart && !l.error) {
        monthCount++;
        monthCost += Number(l.cost_usd ?? 0);
        const key = (l.question ?? '').toLowerCase().slice(0, 60);
        if (key) qCounts.set(key, (qCounts.get(key) ?? 0) + 1);
      }
      if (d >= today && !l.error) todayCount++;
    });
    setStats({ monthCount, monthCost, todayCount });
    setTopQuestions(
      [...qCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([question, count]) => ({ question, count }))
    );
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const saveSettings = async (patch: Partial<Settings>) => {
    if (!settings) return;
    const next = { ...settings, ...patch };
    setSettings(next);
    const { error } = await supabase.from('ai_chat_settings').update(patch).eq('id', 1);
    if (error) toast.error('Error guardando');
    else toast.success('Guardado');
  };

  const saveSection = async (s: ManualSection) => {
    const payload = {
      title: s.title,
      category: s.category,
      content: s.content,
      display_order: s.display_order,
      is_active: s.is_active,
    };
    if (s.id.startsWith('new-')) {
      const { error } = await supabase.from('ai_manual_sections').insert(payload);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from('ai_manual_sections').update(payload).eq('id', s.id);
      if (error) return toast.error(error.message);
    }
    toast.success('Sección guardada');
    setEditing(null);
    load();
  };

  const removeSection = async (id: string) => {
    if (!confirm('¿Eliminar esta sección del manual?')) return;
    await supabase.from('ai_manual_sections').delete().eq('id', id);
    load();
  };

  const toggleActive = async (s: ManualSection) => {
    await supabase.from('ai_manual_sections').update({ is_active: !s.is_active }).eq('id', s.id);
    load();
  };

  const updateLimit = async (userId: string, newLimit: number) => {
    const { error } = await supabase
      .from('ai_chat_limits')
      .upsert({ user_id: userId, daily_limit: newLimit }, { onConflict: 'user_id' });
    if (error) return toast.error(error.message);
    toast.success('Límite actualizado');
    load();
  };

  const toggleEnabled = async (row: LimitRow) => {
    const { error } = await supabase
      .from('ai_chat_limits')
      .upsert({ user_id: row.user_id, daily_limit: row.daily_limit, is_enabled: !row.is_enabled }, { onConflict: 'user_id' });
    if (error) return toast.error(error.message);
    toast.success(row.is_enabled ? 'Usuario bloqueado' : 'Usuario habilitado');
    load();
  };

  const addBonus = async (row: LimitRow, n = 10) => {
    const newBonus = (row.bonus_today ?? 0) + n;
    const { error } = await supabase
      .from('ai_chat_limits')
      .upsert(
        {
          user_id: row.user_id,
          daily_limit: row.daily_limit,
          bonus_today: newBonus,
          bonus_date: todayStr(),
        },
        { onConflict: 'user_id' }
      );
    if (error) return toast.error(error.message);
    toast.success(`+${n} consultas extra hoy`);
    load();
  };

  const totalManualChars = sections.filter(s => s.is_active).reduce((acc, s) => acc + s.content.length, 0);
  const budgetPct = settings ? Math.min(100, (stats.monthCost / Number(settings.monthly_budget_usd || 1)) * 100) : 0;

  if (loading) return <div className="bg-card border border-border rounded-xl p-6">Cargando…</div>;

  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-8">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-display text-lg font-semibold text-foreground">Asistente IA Interno</h3>
          <p className="text-sm text-muted-foreground">Chat de ayuda para el equipo + control de uso y costos</p>
        </div>
      </div>

      {/* Global state */}
      {settings && (
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Power className="w-4 h-4" /> Estado global
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-muted/40 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">Kill-switch (apagar para todos)</span>
                <button
                  onClick={() => saveSettings({ kill_switch_enabled: !settings.kill_switch_enabled })}
                  className={`w-11 h-6 rounded-full transition-colors ${settings.kill_switch_enabled ? 'bg-destructive' : 'bg-success'}`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${settings.kill_switch_enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                {settings.kill_switch_enabled
                  ? '🔴 Chat APAGADO para todos los usuarios.'
                  : '🟢 Chat activo y disponible.'}
              </p>
            </div>

            <div className="bg-muted/40 rounded-lg p-4">
              <label className="block text-sm font-medium text-foreground mb-2">Modelo IA</label>
              <select
                value={settings.model}
                onChange={(e) => saveSettings({ model: e.target.value })}
                className="w-full input-field"
              >
                {MODELS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>

            <div className="bg-muted/40 rounded-lg p-4">
              <label className="block text-sm font-medium text-foreground mb-2">Presupuesto mensual (USD)</label>
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-muted-foreground" />
                <input
                  type="number"
                  step="0.5"
                  value={settings.monthly_budget_usd}
                  onChange={(e) => setSettings({ ...settings, monthly_budget_usd: Number(e.target.value) })}
                  onBlur={() => saveSettings({ monthly_budget_usd: settings.monthly_budget_usd })}
                  className="input-field"
                />
              </div>
            </div>

            <div className="bg-muted/40 rounded-lg p-4">
              <div className="text-xs text-muted-foreground mb-1">Gasto del mes</div>
              <div className="text-2xl font-bold text-foreground">${stats.monthCost.toFixed(4)}</div>
              <div className="text-xs text-muted-foreground mt-1">{stats.monthCount} consultas · {stats.todayCount} hoy</div>
              <div className="w-full bg-background rounded-full h-1.5 mt-2 overflow-hidden">
                <div
                  className={`h-full transition-all ${budgetPct > 80 ? 'bg-destructive' : budgetPct > 50 ? 'bg-warning' : 'bg-success'}`}
                  style={{ width: `${budgetPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Users / Limits */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Users className="w-4 h-4" /> Cuotas por usuario
        </h4>
        <div className="overflow-x-auto border border-border rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2">Usuario</th>
                <th className="text-left px-3 py-2">Rol</th>
                <th className="text-center px-3 py-2">Límite/día</th>
                <th className="text-center px-3 py-2">Usadas hoy</th>
                <th className="text-center px-3 py-2">Bonus</th>
                <th className="text-center px-3 py-2">Estado</th>
                <th className="text-center px-3 py-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {limits.map((r) => (
                <tr key={r.user_id} className="border-t border-border">
                  <td className="px-3 py-2">
                    <div className="font-medium text-foreground">{r.profile?.full_name}</div>
                    <div className="text-xs text-muted-foreground">{r.profile?.email}</div>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{r.role}</td>
                  <td className="px-3 py-2 text-center">
                    <input
                      type="number"
                      defaultValue={r.daily_limit}
                      min={0}
                      max={999}
                      onBlur={(e) => {
                        const v = Number(e.target.value);
                        if (v !== r.daily_limit) updateLimit(r.user_id, v);
                      }}
                      className="w-20 text-center input-field"
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className={(r.used_today ?? 0) >= r.daily_limit ? 'text-destructive font-semibold' : 'text-foreground'}>
                      {r.used_today ?? 0}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center text-muted-foreground">
                    {r.bonus_today > 0 ? `+${r.bonus_today}` : '—'}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {r.is_enabled
                      ? <span className="inline-flex items-center gap-1 text-xs text-success"><Check className="w-3 h-3" /> Activo</span>
                      : <span className="inline-flex items-center gap-1 text-xs text-destructive"><Ban className="w-3 h-3" /> Bloqueado</span>}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => addBonus(r, 10)}
                        className="p-1.5 rounded hover:bg-muted text-muted-foreground"
                        title="+10 consultas extra hoy"
                      >
                        <Gift className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => toggleEnabled(r)}
                        className="p-1.5 rounded hover:bg-muted text-muted-foreground"
                        title={r.is_enabled ? 'Bloquear' : 'Desbloquear'}
                      >
                        {r.is_enabled ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {limits.length === 0 && (
                <tr><td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">No hay usuarios con acceso al chat</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual editor */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <ShieldAlert className="w-4 h-4" /> Manual del sistema
            <span className="text-xs text-muted-foreground font-normal">({totalManualChars.toLocaleString()} caracteres activos)</span>
          </h4>
          <button
            onClick={() => setEditing({
              id: `new-${Date.now()}`,
              title: '',
              category: 'general',
              content: '',
              display_order: sections.length,
              is_active: true,
            })}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="w-4 h-4" /> Nueva sección
          </button>
        </div>

        <div className="space-y-2">
          {sections.map((s) => (
            <div key={s.id} className="border border-border rounded-lg p-3 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded ${s.is_active ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                    {s.category}
                  </span>
                  <span className="font-medium text-foreground truncate">{s.title}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">{s.content.length} caracteres</div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => toggleActive(s)} className="p-1.5 rounded hover:bg-muted text-muted-foreground" title={s.is_active ? 'Desactivar' : 'Activar'}>
                  {s.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <button onClick={() => setEditing(s)} className="p-1.5 rounded hover:bg-muted text-muted-foreground">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => removeSection(s.id)} className="p-1.5 rounded hover:bg-muted text-destructive">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top questions */}
      {topQuestions.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <BarChart3 className="w-4 h-4" /> Preguntas más frecuentes del mes
          </h4>
          <div className="space-y-1">
            {topQuestions.map((q, i) => (
              <div key={i} className="flex items-center justify-between text-sm border border-border rounded px-3 py-2">
                <span className="truncate flex-1 text-foreground">{q.question}</span>
                <span className="text-xs font-semibold text-muted-foreground ml-3">{q.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="bg-card border border-border rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-semibold text-foreground">{editing.id.startsWith('new-') ? 'Nueva sección' : 'Editar sección'}</h3>
              <button onClick={() => setEditing(null)} className="p-1.5 rounded hover:bg-muted"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4 space-y-3 overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Título</label>
                <input type="text" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} className="input-field w-full" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Categoría</label>
                  <input type="text" value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value })} className="input-field w-full" placeholder="ej: garantias, finanzas, propiedades" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Orden</label>
                  <input type="number" value={editing.display_order} onChange={(e) => setEditing({ ...editing, display_order: Number(e.target.value) })} className="input-field w-full" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Contenido (Markdown)</label>
                <textarea
                  value={editing.content}
                  onChange={(e) => setEditing({ ...editing, content: e.target.value })}
                  className="input-field w-full font-mono text-xs"
                  rows={14}
                  placeholder={'## Cómo hacer X\n\n1. Paso uno\n2. Paso dos\n3. Paso tres'}
                />
                <div className="text-xs text-muted-foreground mt-1">{editing.content.length} caracteres</div>
              </div>
            </div>
            <div className="p-4 border-t border-border flex justify-end gap-2">
              <button onClick={() => setEditing(null)} className="px-3 py-2 rounded-lg border border-border text-sm">Cancelar</button>
              <button
                onClick={() => saveSection(editing)}
                disabled={!editing.title.trim() || !editing.content.trim()}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm disabled:opacity-40"
              >
                <Save className="w-4 h-4" /> Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}