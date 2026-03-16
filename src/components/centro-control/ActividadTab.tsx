import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAgents } from '@/hooks/useAgents';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Activity, Search, Download, Plus, Pencil, Trash2, DollarSign, LogIn,
  FileDown, Filter, ChevronDown, TrendingUp, User, LayoutGrid, X,
} from 'lucide-react';
import { format, formatDistanceToNow, isToday, isYesterday, startOfDay, subDays, startOfMonth, subMonths, startOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';

/* ── Constants ── */
const ACTION_TYPES = [
  { value: 'all', label: 'Todas las acciones' },
  { value: 'create', label: '➕ Creó' },
  { value: 'update', label: '✏️ Actualizó' },
  { value: 'delete', label: '🗑️ Eliminó' },
  { value: 'push_notification_sent', label: '🔔 Notificación' },
  { value: 'update_agent_plan', label: '📋 Plan agente' },
  { value: 'open_whatsapp', label: '💬 WhatsApp' },
];

const MODULE_TYPES = [
  { value: 'all', label: 'Todos los módulos' },
  { value: 'properties', label: '🏠 Propiedades' },
  { value: 'clients', label: '👥 Clientes' },
  { value: 'payments', label: '💰 Finanzas' },
  { value: 'contracts', label: '📄 Contratos' },
  { value: 'pipeline_deals', label: '📊 Pipeline' },
  { value: 'portal_leads', label: '🌐 Leads Portal' },
  { value: 'owners', label: '🏢 Propietarios' },
  { value: 'profiles', label: '👤 Usuarios' },
  { value: 'key_movements', label: '🔑 Llaves' },
];

const DATE_SHORTCUTS = [
  { value: 'all', label: 'Todo el tiempo' },
  { value: 'today', label: 'Hoy' },
  { value: 'week', label: 'Esta semana' },
  { value: 'month', label: 'Este mes' },
  { value: 'last_month', label: 'Mes anterior' },
  { value: 'custom', label: 'Personalizado' },
];

const PAGE_SIZE = 50;

const actionConfig: Record<string, { icon: typeof Plus; color: string; label: string }> = {
  create: { icon: Plus, color: 'text-emerald-500 bg-emerald-500/10', label: 'Creó' },
  update: { icon: Pencil, color: 'text-blue-500 bg-blue-500/10', label: 'Actualizó' },
  delete: { icon: Trash2, color: 'text-red-500 bg-red-500/10', label: 'Eliminó' },
  push_notification_sent: { icon: Activity, color: 'text-violet-500 bg-violet-500/10', label: 'Envió notificación' },
  update_agent_plan: { icon: TrendingUp, color: 'text-amber-500 bg-amber-500/10', label: 'Cambió plan' },
  open_whatsapp: { icon: Activity, color: 'text-green-500 bg-green-500/10', label: 'Abrió WhatsApp' },
};

const tableLabels: Record<string, string> = {
  properties: 'propiedad', contracts: 'contrato', clients: 'cliente',
  owners: 'propietario', deals: 'operación', payments: 'pago',
  pipeline_deals: 'lead pipeline', portal_leads: 'lead portal',
  key_movements: 'movimiento de llave', propietario_documentos: 'documento',
  profiles: 'usuario', onesignal: 'push',
};

/* ── Helper: extract searchable text from JSON data ── */
const extractSearchableText = (data: any): string => {
  if (!data) return '';
  const fields = ['title', 'full_name', 'tenant_name', 'landlord_name', 'client_name',
    'visitor_name', 'document_number', 'description', 'property_code', 'email', 'phone',
    'amount', 'total_amount', 'monthly_rent', 'address'];
  return fields.map(f => data[f] || '').filter(Boolean).join(' ').toLowerCase();
};

/* ── Helper: extract entity name from log ── */
const extractEntityName = (log: any): string | null => {
  const d = log.new_data || log.old_data;
  if (!d) return null;
  return d.title || d.full_name || d.tenant_name || d.client_name || d.visitor_name || d.item_name || d.property_code || null;
};

/* ── Date range helper ── */
const getDateRange = (shortcut: string): { from: Date | null; to: Date | null } => {
  const now = new Date();
  switch (shortcut) {
    case 'today': return { from: startOfDay(now), to: now };
    case 'week': return { from: startOfWeek(now, { weekStartsOn: 1 }), to: now };
    case 'month': return { from: startOfMonth(now), to: now };
    case 'last_month': {
      const prev = subMonths(now, 1);
      return { from: startOfMonth(prev), to: startOfMonth(now) };
    }
    default: return { from: null, to: null };
  }
};

/* ── Group logs by day ── */
const groupByDay = (logs: any[]) => {
  const groups: { label: string; date: string; items: any[] }[] = [];
  let currentKey = '';
  logs.forEach(log => {
    const d = new Date(log.created_at);
    const key = format(d, 'yyyy-MM-dd');
    if (key !== currentKey) {
      currentKey = key;
      let label: string;
      if (isToday(d)) label = 'Hoy';
      else if (isYesterday(d)) label = 'Ayer';
      else label = format(d, "EEEE d 'de' MMMM yyyy", { locale: es });
      groups.push({ label, date: key, items: [] });
    }
    groups[groups.length - 1].items.push(log);
  });
  return groups;
};

/* ── Main Component ── */
export const ActividadTab = () => {
  const { role } = useAuth();
  const canExport = role === 'superadmin' || role === 'admin';
  const { data: agents = [] } = useAgents();

  // Filters
  const [actionFilter, setActionFilter] = useState('all');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('all');
  const [dateShortcut, setDateShortcut] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchText, setSearchText] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Pagination
  const [limit, setLimit] = useState(PAGE_SIZE);

  // Detail dialog
  const [detailLog, setDetailLog] = useState<any | null>(null);

  // Fetch all logs (we filter client-side for flexibility with search)
  const { data: allLogs = [], isLoading } = useQuery({
    queryKey: ['audit-activity-log-full'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000);
      if (error) throw error;
      const userIds = [...new Set((data || []).filter(l => l.user_id).map(l => l.user_id!))];
      let nameMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', userIds);
        nameMap = Object.fromEntries((profiles || []).map(p => [p.id, p.full_name]));
      }
      return (data || []).map(l => ({
        ...l,
        user_name: l.user_id ? nameMap[l.user_id] || 'Sistema' : 'Sistema',
        _searchText: [
          nameMap[l.user_id!] || '',
          extractSearchableText(l.new_data),
          extractSearchableText(l.old_data),
        ].join(' ').toLowerCase(),
      }));
    },
  });

  // Apply filters
  const filtered = useMemo(() => {
    let result = allLogs;

    if (actionFilter !== 'all') {
      result = result.filter(l => l.action === actionFilter);
    }
    if (moduleFilter !== 'all') {
      result = result.filter(l => l.target_table === moduleFilter);
    }
    if (userFilter !== 'all') {
      result = result.filter(l => l.user_id === userFilter);
    }

    // Date filter
    if (dateShortcut !== 'all' && dateShortcut !== 'custom') {
      const range = getDateRange(dateShortcut);
      if (range.from) result = result.filter(l => new Date(l.created_at) >= range.from!);
      if (range.to) result = result.filter(l => new Date(l.created_at) <= range.to!);
    } else if (dateShortcut === 'custom') {
      if (dateFrom) result = result.filter(l => new Date(l.created_at) >= new Date(dateFrom));
      if (dateTo) result = result.filter(l => new Date(l.created_at) <= new Date(dateTo + 'T23:59:59'));
    }

    // Full-text search
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      result = result.filter(l => l._searchText.includes(q));
    }

    return result;
  }, [allLogs, actionFilter, moduleFilter, userFilter, dateShortcut, dateFrom, dateTo, searchText]);

  const paginated = filtered.slice(0, limit);
  const hasMore = filtered.length > limit;
  const grouped = groupByDay(paginated);

  // Stats
  const stats = useMemo(() => {
    const userCounts: Record<string, { name: string; count: number }> = {};
    const moduleCounts: Record<string, number> = {};
    filtered.forEach(l => {
      const uid = l.user_id || 'sistema';
      if (!userCounts[uid]) userCounts[uid] = { name: l.user_name, count: 0 };
      userCounts[uid].count++;
      const mod = l.target_table || 'otro';
      moduleCounts[mod] = (moduleCounts[mod] || 0) + 1;
    });
    const topUser = Object.values(userCounts).sort((a, b) => b.count - a.count)[0];
    const topModule = Object.entries(moduleCounts).sort((a, b) => b[1] - a[1])[0];
    return {
      total: filtered.length,
      topUser: topUser?.name || '-',
      topUserCount: topUser?.count || 0,
      topModule: topModule ? (tableLabels[topModule[0]] || topModule[0]) : '-',
      topModuleCount: topModule?.[1] || 0,
    };
  }, [filtered]);

  const activeFilters = [actionFilter, moduleFilter, userFilter, dateShortcut, searchText].filter(f => f !== 'all' && f !== '').length;

  const clearFilters = () => {
    setActionFilter('all'); setModuleFilter('all'); setUserFilter('all');
    setDateShortcut('all'); setDateFrom(''); setDateTo(''); setSearchText('');
  };

  // CSV export
  const exportCSV = useCallback(() => {
    const headers = ['Fecha', 'Hora', 'Usuario', 'Acción', 'Módulo', 'Detalle'];
    const rows = filtered.map(l => [
      format(new Date(l.created_at), 'dd/MM/yyyy'),
      format(new Date(l.created_at), 'HH:mm:ss'),
      l.user_name,
      actionConfig[l.action]?.label || l.action,
      tableLabels[l.target_table] || l.target_table || '',
      extractEntityName(l) || '',
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `actividad-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filtered]);

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="flex items-center gap-3 bg-muted/50 rounded-xl px-4 py-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Activity className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground leading-none">{stats.total}</p>
            <p className="text-[11px] text-muted-foreground">Acciones totales</p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-muted/50 rounded-xl px-4 py-3">
          <div className="w-9 h-9 rounded-lg bg-secondary/10 flex items-center justify-center">
            <User className="w-4 h-4 text-secondary" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground leading-tight">{stats.topUser}</p>
            <p className="text-[11px] text-muted-foreground">{stats.topUserCount} acciones · Más activo</p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-muted/50 rounded-xl px-4 py-3">
          <div className="w-9 h-9 rounded-lg bg-info/10 flex items-center justify-center">
            <LayoutGrid className="w-4 h-4 text-info" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground leading-tight capitalize">{stats.topModule}</p>
            <p className="text-[11px] text-muted-foreground">{stats.topModuleCount} acciones · Módulo top</p>
          </div>
        </div>
      </div>

      {/* Search + filter toggle + export */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, cédula, código, monto..."
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant={activeFilters > 0 ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="gap-1.5 flex-shrink-0"
        >
          <Filter className="w-4 h-4" />
          Filtros
          {activeFilters > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{activeFilters}</Badge>
          )}
        </Button>
        {canExport && (
          <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1.5 flex-shrink-0">
            <Download className="w-4 h-4" /> CSV
          </Button>
        )}
      </div>

      {/* Collapsible filters */}
      {showFilters && (
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Acción</label>
                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ACTION_TYPES.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Módulo</label>
                <Select value={moduleFilter} onValueChange={setModuleFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MODULE_TYPES.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Usuario</label>
                <Select value={userFilter} onValueChange={setUserFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los usuarios</SelectItem>
                    {agents.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Período</label>
                <Select value={dateShortcut} onValueChange={setDateShortcut}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DATE_SHORTCUTS.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {dateShortcut === 'custom' && (
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Desde</label>
                  <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Hasta</label>
                  <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
                </div>
              </div>
            )}
            {activeFilters > 0 && (
              <Button variant="ghost" size="sm" className="mt-3 text-xs gap-1" onClick={clearFilters}>
                <X className="w-3 h-3" /> Limpiar filtros
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Timeline */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground text-center py-8">Cargando actividad...</p>
      ) : grouped.length === 0 ? (
        <p className="text-center text-muted-foreground py-12 text-sm">
          {activeFilters > 0 ? 'No se encontraron resultados con los filtros aplicados' : 'Sin actividad reciente'}
        </p>
      ) : (
        <div className="space-y-1">
          {grouped.map(group => (
            <div key={group.date}>
              <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm py-2 px-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider capitalize">{group.label}</p>
              </div>
              <div className="space-y-0.5">
                {group.items.map(log => {
                  const cfg = actionConfig[log.action] || actionConfig.update;
                  const Icon = cfg.icon;
                  const entityName = extractEntityName(log);
                  return (
                    <button
                      key={log.id}
                      onClick={() => setDetailLog(log)}
                      className="w-full flex items-start gap-3 py-2.5 px-3 rounded-lg hover:bg-muted/50 transition-colors text-left"
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${cfg.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">
                          <span className="font-medium">{log.user_name}</span>{' '}
                          <span className="text-muted-foreground">{cfg.label.toLowerCase()}</span>{' '}
                          <span className="font-medium">{tableLabels[log.target_table] || log.target_table}</span>
                          {entityName && (
                            <span className="text-muted-foreground"> · {entityName}</span>
                          )}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {format(new Date(log.created_at), 'HH:mm:ss')}
                        </p>
                      </div>
                      <ChevronDown className="w-4 h-4 text-muted-foreground/40 flex-shrink-0 mt-1 -rotate-90" />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Load more */}
      {hasMore && (
        <div className="text-center pt-2">
          <Button variant="outline" size="sm" onClick={() => setLimit(l => l + PAGE_SIZE)} className="gap-1.5">
            <ChevronDown className="w-4 h-4" />
            Cargar más ({filtered.length - limit} restantes)
          </Button>
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={!!detailLog} onOpenChange={v => !v && setDetailLog(null)}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {detailLog && (() => {
                const cfg = actionConfig[detailLog.action] || actionConfig.update;
                const Icon = cfg.icon;
                return <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${cfg.color}`}><Icon className="w-3.5 h-3.5" /></div>;
              })()}
              Detalle de actividad
            </DialogTitle>
          </DialogHeader>
          {detailLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Usuario</p>
                  <p className="font-medium">{detailLog.user_name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Acción</p>
                  <p className="font-medium capitalize">{(actionConfig[detailLog.action] || actionConfig.update).label}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Módulo</p>
                  <p className="font-medium capitalize">{tableLabels[detailLog.target_table] || detailLog.target_table}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Fecha y hora</p>
                  <p className="font-medium">{format(new Date(detailLog.created_at), "dd/MM/yyyy HH:mm:ss")}</p>
                </div>
              </div>
              {detailLog.new_data && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    {detailLog.action === 'delete' ? 'Datos eliminados' : detailLog.action === 'create' ? 'Datos creados' : 'Datos nuevos'}
                  </p>
                  <pre className="text-xs bg-muted/50 rounded-lg p-3 overflow-x-auto max-h-48 whitespace-pre-wrap break-all">
                    {JSON.stringify(detailLog.new_data, null, 2)}
                  </pre>
                </div>
              )}
              {detailLog.old_data && detailLog.action === 'update' && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Datos anteriores</p>
                  <pre className="text-xs bg-muted/50 rounded-lg p-3 overflow-x-auto max-h-48 whitespace-pre-wrap break-all">
                    {JSON.stringify(detailLog.old_data, null, 2)}
                  </pre>
                </div>
              )}
              {detailLog.old_data && detailLog.action === 'delete' && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Datos eliminados</p>
                  <pre className="text-xs bg-muted/50 rounded-lg p-3 overflow-x-auto max-h-48 whitespace-pre-wrap break-all">
                    {JSON.stringify(detailLog.old_data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};