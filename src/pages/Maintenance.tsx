import { useState, useRef, useEffect } from 'react';
import { MoneyInput } from '@/components/ui/money-input';
import { MainLayout } from '@/components/layout/MainLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ClipboardList, Loader2, AlertTriangle, CheckCircle, Clock, MoreVertical, Pencil, Trash2, Filter, X, Search, ChevronDown, FileDown, FileSpreadsheet } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import type { Database } from '@/integrations/supabase/types';
import { exportMaintenanceReportPDF, type MaintenancePDFTicket } from '@/lib/maintenanceReportPDF';
import { exportMaintenanceCSV, type MaintenanceCSVRow } from '@/lib/maintenanceReportExport';
import { CompleteTicketDialog } from '@/components/maintenance/CompleteTicketDialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';

/* ── Searchable Property Selector ── */
const PropertySearchSelect = ({
  value,
  onChange,
  properties,
  placeholder = 'Buscar por código o nombre...',
  required = false,
}: {
  value: string;
  onChange: (id: string) => void;
  properties: { id: string; title: string | null; property_code: string | null }[];
  placeholder?: string;
  required?: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selected = properties.find(p => p.id === value);
  const filtered = properties.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (p.property_code || '').toLowerCase().includes(q) || (p.title || '').toLowerCase().includes(q);
  });

  return (
    <div ref={ref} className="relative">
      <div
        onClick={() => setOpen(!open)}
        className="input-field flex items-center justify-between cursor-pointer gap-2"
      >
        <span className={selected ? 'text-foreground truncate' : 'text-muted-foreground truncate'}>
          {selected ? `${selected.property_code} - ${selected.title || 'Sin título'}` : placeholder}
        </span>
        <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
      </div>
      {required && !value && (
        <input tabIndex={-1} className="opacity-0 absolute inset-0 pointer-events-none" required value="" onChange={() => {}} />
      )}
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-popover border border-border rounded-lg shadow-lg max-h-64 overflow-hidden">
          <div className="p-2 border-b border-border">
            <div className="flex items-center gap-2 px-2">
              <Search className="w-4 h-4 text-muted-foreground shrink-0" />
              <input
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar..."
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>
          <div className="overflow-y-auto max-h-48">
            {value && (
              <button
                type="button"
                onClick={() => { onChange(''); setSearch(''); setOpen(false); }}
                className="w-full text-left px-3 py-2 text-sm text-muted-foreground hover:bg-muted/60 transition-colors"
              >
                — Quitar selección —
              </button>
            )}
            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-sm text-muted-foreground text-center">Sin resultados</p>
            ) : (
              filtered.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => { onChange(p.id); setSearch(''); setOpen(false); }}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                    p.id === value ? 'bg-primary/10 text-primary font-medium' : 'text-foreground hover:bg-muted/60'
                  }`}
                >
                  <span className="font-mono text-xs text-muted-foreground mr-1.5">{p.property_code}</span>
                  {p.title || 'Sin título'}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

type MaintenanceStatus = Database['public']['Enums']['maintenance_status'];

const statusConfig: Record<MaintenanceStatus, { label: string; icon: any; class: string }> = {
  open: { label: 'Pendiente', icon: AlertTriangle, class: 'bg-warning/10 text-warning border-warning/20' },
  in_progress: { label: 'En Progreso', icon: Clock, class: 'bg-info/10 text-info border-info/20' },
  completed: { label: 'Completado', icon: CheckCircle, class: 'bg-success/10 text-success border-success/20' },
  cancelled: { label: 'Cancelado', icon: AlertTriangle, class: 'bg-destructive/10 text-destructive border-destructive/20' },
};

const priorityConfig: Record<string, { label: string; class: string }> = {
  low: { label: 'Baja', class: 'bg-muted text-muted-foreground' },
  medium: { label: 'Media', class: 'bg-warning/10 text-warning' },
  high: { label: 'Alta', class: 'bg-destructive/10 text-destructive' },
};

const Maintenance = () => {
  const { user, role, isAdmin } = useAuth();
  const isAgent = role === 'agent';
  const canEdit = isAdmin || role === 'secretaria' || role === 'accounting';
  const qc = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editTicket, setEditTicket] = useState<any>(null);
  const [completingTicket, setCompletingTicket] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterProperty, setFilterProperty] = useState<string>('all');
  const [filterOwner, setFilterOwner] = useState<string>('all');
  const [filterBuilding, setFilterBuilding] = useState<string>('all');
  const [filterFrom, setFilterFrom] = useState<string>(''); // YYYY-MM-DD
  const [filterTo, setFilterTo] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  const { data: tickets, isLoading } = useQuery({
    queryKey: ['maintenance_tickets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('maintenance_tickets')
        .select('*, properties(title, property_code, owner_id, unit_id), providers(name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: properties } = useQuery({
    queryKey: ['properties_list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('properties').select('id, title, property_code, owner_id, unit_id').order('title');
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: owners } = useQuery({
    queryKey: ['owners_list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('owners').select('id, full_name').order('full_name');
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: buildings } = useQuery({
    queryKey: ['buildings_list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('buildings').select('id, name').order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: units } = useQuery({
    queryKey: ['units_list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('units').select('id, building_id').order('unit_code');
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: providers } = useQuery({
    queryKey: ['providers_list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('providers').select('id, name').order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Set de IDs de tickets que ya tienen un egreso vinculado en Finanzas (para mostrar/ocultar badge y acciones)
  const { data: ticketsWithExpense } = useQuery({
    queryKey: ['maintenance_tickets_with_expense'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('notes')
        .like('notes', 'Ticket de mantenimiento ID:%');
      if (error) throw error;
      const ids = new Set<string>();
      (data || []).forEach((p: any) => {
        const m = (p.notes || '').match(/Ticket de mantenimiento ID:\s*([0-9a-f-]+)/i);
        if (m) ids.add(m[1]);
      });
      return ids;
    },
    enabled: !!user,
  });

  const [form, setForm] = useState({ description: '', property_id: '', provider_id: '', priority: 'medium', estimated_cost: 0, actual_cost: 0, scheduled_date: '', completed_date: '', notes: '' });
  const [formOwnerFilter, setFormOwnerFilter] = useState<string>('all');

  const createMutation = useMutation({
    mutationFn: async (input: typeof form) => {
      // Campo unificado "Costo": guardamos en actual_cost si está completado, sino estimated_cost.
      // Internamente seguimos manteniendo ambas columnas por compatibilidad con tickets viejos.
      const isCompleted = !!input.completed_date;
      const costValue = input.actual_cost || input.estimated_cost || 0;
      const { error } = await supabase.from('maintenance_tickets').insert({
        ...input,
        provider_id: input.provider_id || null,
        estimated_cost: !isCompleted && costValue > 0 ? costValue : (input.estimated_cost || null),
        actual_cost: isCompleted && costValue > 0 ? costValue : (input.actual_cost || null),
        created_by: user!.id,
        requested_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['maintenance_tickets'] }); toast.success('Ticket creado'); setFormOpen(false); },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: MaintenanceStatus }) => {
      const updates: any = { status };
      if (status === 'completed') updates.completed_date = new Date().toISOString().split('T')[0];
      const { error } = await supabase.from('maintenance_tickets').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['maintenance_tickets'] }); toast.success('Estado actualizado'); },
  });

  const editMutation = useMutation({
    mutationFn: async (input: { id: string; description: string; property_id: string; provider_id: string; priority: string; estimated_cost: number; actual_cost: number; scheduled_date: string; completed_date: string; notes: string }) => {
      const { id, ...updates } = input;
      // Campo unificado "Costo": el valor único que escribe el usuario va a actual_cost si el ticket
      // tiene fecha de realización; si es un ticket pendiente, va a estimated_cost.
      const isCompleted = !!updates.completed_date;
      const costValue = updates.actual_cost || updates.estimated_cost || 0;
      const { error } = await supabase.from('maintenance_tickets').update({
        ...updates,
        provider_id: updates.provider_id || null,
        estimated_cost: !isCompleted && costValue > 0 ? costValue : (updates.estimated_cost || null),
        actual_cost: isCompleted && costValue > 0 ? costValue : (updates.actual_cost || null),
        scheduled_date: updates.scheduled_date || null,
        completed_date: updates.completed_date || null,
        updated_at: new Date().toISOString(),
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['maintenance_tickets'] }); toast.success('Ticket actualizado'); setEditTicket(null); },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('maintenance_tickets').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['maintenance_tickets'] }); toast.success('Ticket eliminado'); },
    onError: (err: Error) => toast.error(err.message),
  });

  // Build a set of unit IDs belonging to selected building
  const buildingUnitIds = new Set(
    filterBuilding !== 'all' ? (units || []).filter(u => u.building_id === filterBuilding).map(u => u.id) : []
  );

  const filtered = (tickets || []).filter(t => {
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
    if (filterProperty !== 'all' && t.property_id !== filterProperty) return false;
    if (filterOwner !== 'all') {
      const prop = (t as any).properties;
      if (!prop || prop.owner_id !== filterOwner) return false;
    }
    if (filterBuilding !== 'all') {
      const prop = (t as any).properties;
      if (!prop || !prop.unit_id || !buildingUnitIds.has(prop.unit_id)) return false;
    }
    if (filterFrom || filterTo) {
      // Reference date = completed_date (preferred) → scheduled_date → created_at
      const refRaw: string | null = (t as any).completed_date || (t as any).scheduled_date || t.created_at;
      if (!refRaw) return false;
      const refDate = refRaw.substring(0, 10); // YYYY-MM-DD
      if (filterFrom && refDate < filterFrom) return false;
      if (filterTo && refDate > filterTo) return false;
    }
    return true;
  });

  const totalAmount = filtered.reduce((s, t: any) => s + Number(t.actual_cost ?? t.estimated_cost ?? 0), 0);

  const activeFilterCount =
    [filterPriority, filterProperty, filterOwner, filterBuilding].filter(v => v !== 'all').length +
    (filterFrom ? 1 : 0) + (filterTo ? 1 : 0);

  const clearAllFilters = () => {
    setFilterPriority('all');
    setFilterProperty('all');
    setFilterOwner('all');
    setFilterBuilding('all');
    setFilterFrom('');
    setFilterTo('');
  };

  // Date range shortcuts
  const fmtIso = (d: Date) => d.toISOString().split('T')[0];
  const applyShortcut = (key: 'this_month' | 'last_month' | 'last_90' | 'this_year') => {
    const now = new Date();
    if (key === 'this_month') {
      setFilterFrom(fmtIso(new Date(now.getFullYear(), now.getMonth(), 1)));
      setFilterTo(fmtIso(new Date(now.getFullYear(), now.getMonth() + 1, 0)));
    } else if (key === 'last_month') {
      setFilterFrom(fmtIso(new Date(now.getFullYear(), now.getMonth() - 1, 1)));
      setFilterTo(fmtIso(new Date(now.getFullYear(), now.getMonth(), 0)));
    } else if (key === 'last_90') {
      const from = new Date(); from.setDate(from.getDate() - 90);
      setFilterFrom(fmtIso(from));
      setFilterTo(fmtIso(now));
    } else if (key === 'this_year') {
      setFilterFrom(fmtIso(new Date(now.getFullYear(), 0, 1)));
      setFilterTo(fmtIso(new Date(now.getFullYear(), 11, 31)));
    }
  };

  const fmtMoney = (n: number, currency?: string | null) => {
    const c = currency || 'PYG';
    if (c === 'USD') return `USD ${n.toLocaleString('es-PY', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
    return `Gs. ${Math.round(n).toLocaleString('es-PY')}`;
  };

  const fmtDateLabel = (iso: string | null | undefined) => {
    if (!iso) return '-';
    const s = iso.substring(0, 10);
    const [y, m, d] = s.split('-');
    if (y && m && d) return `${d}/${m}/${y}`;
    return s;
  };

  const buildPdfRows = (): MaintenancePDFTicket[] => {
    return filtered.map((t: any) => {
      const realDate = t.completed_date || t.scheduled_date || t.created_at;
      const ownerId = t.properties?.owner_id;
      const ownerObj = owners?.find(o => o.id === ownerId);
      const sc = statusConfig[t.status as MaintenanceStatus] || statusConfig.open;
      const cost = Number(t.actual_cost ?? t.estimated_cost ?? 0);
      const isEst = t.actual_cost == null && t.estimated_cost != null;
      return {
        realizado: fmtDateLabel(realDate),
        propiedad: t.properties?.title || '-',
        descripcion: t.description || '-',
        proveedor: t.providers?.name || '-',
        estado: sc.label,
        costo: cost,
        costoLabel: cost > 0 ? fmtMoney(cost, t.currency) : '-',
        esEstimado: isEst && cost > 0,
        ownerName: ownerObj?.full_name || 'Sin propietario',
      };
    });
  };

  const handleExportPDF = async () => {
    if (filtered.length === 0) { toast.error('No hay tickets para exportar'); return; }
    try {
      const ownerName = filterOwner !== 'all' ? owners?.find(o => o.id === filterOwner)?.full_name ?? null : null;
      await exportMaintenanceReportPDF(buildPdfRows(), {
        rangeFrom: filterFrom || null,
        rangeTo: filterTo || null,
        ownerFilterName: ownerName,
      });
      toast.success('PDF generado');
    } catch (e: any) {
      toast.error('Error al generar PDF: ' + (e?.message || ''));
    }
  };

  const handleExportCSV = () => {
    if (filtered.length === 0) { toast.error('No hay tickets para exportar'); return; }
    const rows: MaintenanceCSVRow[] = filtered.map((t: any) => {
      const ownerId = t.properties?.owner_id;
      const ownerObj = owners?.find(o => o.id === ownerId);
      const sc = statusConfig[t.status as MaintenanceStatus] || statusConfig.open;
      const pc = priorityConfig[t.priority || 'medium'];
      return {
        realizado: fmtDateLabel(t.completed_date),
        programado: fmtDateLabel(t.scheduled_date),
        creado: fmtDateLabel(t.created_at),
        propietario: ownerObj?.full_name || 'Sin propietario',
        propiedad: t.properties?.title || '-',
        descripcion: t.description || '',
        proveedor: t.providers?.name || '',
        prioridad: pc.label,
        estado: sc.label,
        costo_estimado: t.estimated_cost ?? null,
        costo_real: t.actual_cost ?? null,
        moneda: t.currency || 'PYG',
      };
    });
    exportMaintenanceCSV(rows, `mantenimientos_${new Date().toISOString().split('T')[0]}.csv`);
    toast.success('CSV exportado');
  };

  return (
    <MainLayout title="Mantenimiento" subtitle={`${filtered.length} tickets · Total: ${fmtMoney(totalAmount)}`}
      action={!isAgent ? { label: 'Nuevo Ticket', onClick: () => { setForm({ description: '', property_id: '', provider_id: '', priority: 'medium', estimated_cost: 0, actual_cost: 0, scheduled_date: '', completed_date: '', notes: '' }); setFormOwnerFilter('all'); setFormOpen(true); } } : undefined}>

      {!isAgent && (
        <div className="mb-4 px-3 py-2 rounded-lg bg-info/5 border border-info/15 text-[11px] text-muted-foreground flex items-start gap-2">
          <Wallet className="w-3.5 h-3.5 text-info shrink-0 mt-0.5" />
          <span>
            <strong className="text-foreground">Total operativo de Mantenimiento.</strong> Los tickets con badge{' '}
            <span className="inline-flex items-center gap-0.5 px-1 rounded bg-success/10 text-success text-[10px] font-medium">En Finanzas</span>{' '}
            ya están reflejados como egresos en el módulo Finanzas — <strong>no se suman dos veces</strong> en los reportes financieros.
          </span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 mb-4">
        {[
          { key: 'all', label: 'Todos' },
          { key: 'open', label: 'Pendientes' },
          { key: 'in_progress', label: 'En Progreso' },
          { key: 'completed', label: 'Completados' },
        ].map(f => (
          <button key={f.key} onClick={() => setFilterStatus(f.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterStatus === f.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}>{f.label}</button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          {!isAgent && (
            <>
              <button
                onClick={handleExportPDF}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-muted text-foreground hover:bg-muted/80 transition-colors"
                title="Exportar reporte por propietario en PDF"
              >
                <FileDown className="w-4 h-4" />
                PDF
              </button>
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-muted text-foreground hover:bg-muted/80 transition-colors"
                title="Exportar a Excel/CSV"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Excel
              </button>
            </>
          )}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              showFilters || activeFilterCount > 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filtros
            {activeFilterCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-primary-foreground/20">{activeFilterCount}</span>
            )}
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="bg-card border border-border rounded-xl p-4 mb-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-foreground">Filtros avanzados</span>
            {activeFilterCount > 0 && (
              <button onClick={clearAllFilters} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-3 h-3" /> Limpiar
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Prioridad</label>
              <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                <option value="all">Todas</option>
                <option value="low">Baja</option>
                <option value="medium">Media</option>
                <option value="high">Alta</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Propiedad</label>
              <PropertySearchSelect
                value={filterProperty === 'all' ? '' : filterProperty}
                onChange={id => setFilterProperty(id || 'all')}
                properties={properties || []}
                placeholder="Todas"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Propietario</label>
              <select value={filterOwner} onChange={e => setFilterOwner(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                <option value="all">Todos</option>
                {owners?.map(o => <option key={o.id} value={o.id}>{o.full_name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Edificio</label>
              <select value={filterBuilding} onChange={e => setFilterBuilding(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                <option value="all">Todos</option>
                {buildings?.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Desde</label>
              <input
                type="date"
                value={filterFrom}
                onChange={e => setFilterFrom(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Hasta</label>
              <input
                type="date"
                value={filterTo}
                onChange={e => setFilterTo(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border">
            <span className="text-xs text-muted-foreground self-center mr-1">Atajos:</span>
            <button onClick={() => applyShortcut('this_month')} className="px-2.5 py-1 text-xs rounded-md bg-muted hover:bg-muted/80 text-foreground">Este mes</button>
            <button onClick={() => applyShortcut('last_month')} className="px-2.5 py-1 text-xs rounded-md bg-muted hover:bg-muted/80 text-foreground">Mes pasado</button>
            <button onClick={() => applyShortcut('last_90')} className="px-2.5 py-1 text-xs rounded-md bg-muted hover:bg-muted/80 text-foreground">Últimos 90 días</button>
            <button onClick={() => applyShortcut('this_year')} className="px-2.5 py-1 text-xs rounded-md bg-muted hover:bg-muted/80 text-foreground">Este año</button>
            <button onClick={() => { setFilterFrom(''); setFilterTo(''); }} className="px-2.5 py-1 text-xs rounded-md bg-muted hover:bg-muted/80 text-muted-foreground">Limpiar fechas</button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <ClipboardList className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Sin tickets</h3>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase px-6 py-4">Descripción</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase px-6 py-4">Propiedad</th>
                {!isAgent && <th className="text-left text-xs font-medium text-muted-foreground uppercase px-6 py-4">Proveedor</th>}
                <th className="text-left text-xs font-medium text-muted-foreground uppercase px-6 py-4">Prioridad</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase px-6 py-4">Estado</th>
                {!isAgent && <th className="text-left text-xs font-medium text-muted-foreground uppercase px-6 py-4">Realizado</th>}
                {!isAgent && (
                  <th className="text-right text-xs font-medium text-muted-foreground uppercase px-6 py-4">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-help border-b border-dotted border-muted-foreground/40">Monto</span>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <p className="text-xs max-w-[220px]">Muestra el costo real si está cargado; si no, el estimado (etiqueta "est.").</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </th>
                )}
                {!isAgent && <th className="text-right text-xs font-medium text-muted-foreground uppercase px-6 py-4">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(ticket => {
                const sc = statusConfig[ticket.status as MaintenanceStatus] || statusConfig.open;
                const pc = priorityConfig[ticket.priority || 'medium'];
                const amount = Number((ticket as any).actual_cost ?? (ticket as any).estimated_cost ?? 0);
                const isEstimated = (ticket as any).actual_cost == null && (ticket as any).estimated_cost != null;
                const hasExpense = !!ticketsWithExpense?.has(ticket.id);
                const canRegisterExpense =
                  !isAgent &&
                  ticket.status === 'completed' &&
                  amount > 0 &&
                  !hasExpense;
                return (
                  <tr key={ticket.id} className="table-row-hover">
                    <td className="px-6 py-4"><p className="font-medium text-foreground">{ticket.description}</p></td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{(ticket as any).properties?.title || '-'}</td>
                    {!isAgent && <td className="px-6 py-4 text-sm text-muted-foreground">{(ticket as any).providers?.name || '-'}</td>}
                    <td className="px-6 py-4"><span className={`badge-status text-xs ${pc.class}`}>{pc.label}</span></td>
                    <td className="px-6 py-4"><span className={`badge-status text-xs border ${sc.class}`}>{sc.label}</span></td>
                    {!isAgent && (
                      <td className="px-6 py-4 text-sm text-muted-foreground whitespace-nowrap">
                        {(ticket as any).completed_date
                          ? fmtDateLabel((ticket as any).completed_date)
                          : (ticket as any).scheduled_date
                            ? <span className="italic">prog. {fmtDateLabel((ticket as any).scheduled_date)}</span>
                            : '-'}
                      </td>
                    )}
                    {!isAgent && (
                      <td className="px-6 py-4 text-right text-sm">
                        {amount > 0 ? (
                          <div className="flex flex-col items-end gap-1">
                            <span className={isEstimated ? 'text-muted-foreground italic' : 'text-foreground font-medium'}>
                              {fmtMoney(amount, (ticket as any).currency)}
                              {isEstimated && <span className="ml-1 text-[10px] uppercase">(est.)</span>}
                            </span>
                            {hasExpense && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Link
                                      to="/finances?tab=egresos"
                                      className="inline-flex items-center gap-1 text-[10px] font-medium text-success bg-success/10 border border-success/20 rounded-full px-1.5 py-0.5 hover:bg-success/20 transition-colors"
                                    >
                                      <Wallet className="w-2.5 h-2.5" />
                                      En Finanzas
                                    </Link>
                                  </TooltipTrigger>
                                  <TooltipContent side="left">
                                    <p className="text-xs max-w-[240px]">Este monto ya figura en Finanzas → Egresos. <strong>No se duplica</strong> al sumar reportes.</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                    )}
                    {!isAgent && (
                    <td className="px-6 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><button className="p-2 hover:bg-muted rounded-lg"><MoreVertical className="w-4 h-4 text-muted-foreground" /></button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {canEdit && (
                            <DropdownMenuItem onClick={() => setEditTicket({
                              id: ticket.id,
                              description: ticket.description,
                              property_id: ticket.property_id,
                              provider_id: ticket.provider_id || '',
                              priority: ticket.priority || 'medium',
                              estimated_cost: ticket.estimated_cost || 0,
                              actual_cost: (ticket as any).actual_cost || 0,
                              scheduled_date: (ticket as any).scheduled_date || '',
                              completed_date: (ticket as any).completed_date || '',
                              notes: ticket.notes || '',
                            })}>
                              <Pencil className="w-4 h-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                          )}
                          {ticket.status === 'open' && <DropdownMenuItem onClick={() => updateStatus.mutate({ id: ticket.id, status: 'in_progress' })}>Marcar En Progreso</DropdownMenuItem>}
                          {(ticket.status === 'open' || ticket.status === 'in_progress') && (
                            <DropdownMenuItem onClick={() => setCompletingTicket(ticket)}>
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Marcar Completado
                            </DropdownMenuItem>
                          )}
                          {canRegisterExpense && (
                            <DropdownMenuItem onClick={() => setCompletingTicket(ticket)}>
                              <Wallet className="w-4 h-4 mr-2 text-success" />
                              Registrar egreso en Finanzas
                            </DropdownMenuItem>
                          )}
                          {(ticket.status === 'cancelled' || ticket.status === 'completed') && <DropdownMenuItem onClick={() => updateStatus.mutate({ id: ticket.id, status: 'open' })}>Reabrir</DropdownMenuItem>}
                          {ticket.status !== 'cancelled' && ticket.status !== 'completed' && <DropdownMenuItem onClick={() => updateStatus.mutate({ id: ticket.id, status: 'cancelled' })} className="text-destructive">Cancelar</DropdownMenuItem>}
                          {canEdit && (
                            <DropdownMenuItem
                              onClick={() => { if (window.confirm('¿Estás seguro de eliminar este ticket?')) deleteMutation.mutate(ticket.id); }}
                              className="text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Eliminar
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display">Nuevo Ticket</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); createMutation.mutate(form); }} className="space-y-4">
            <div><label className="block text-sm font-medium mb-1">Descripción *</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="input-field min-h-[80px]" required /></div>
            <div><label className="block text-sm font-medium mb-1">Filtrar por Propietario</label>
              <select value={formOwnerFilter} onChange={e => { setFormOwnerFilter(e.target.value); setForm(f => ({ ...f, property_id: '' })); }} className="input-field">
                <option value="all">Todos los propietarios</option>
                {owners?.map(o => <option key={o.id} value={o.id}>{o.full_name}</option>)}
              </select></div>
            <div><label className="block text-sm font-medium mb-1">Propiedad *</label>
              {(() => {
                const filteredProps = (properties || []).filter(p => formOwnerFilter === 'all' || p.owner_id === formOwnerFilter);
                return (
                  <>
                    <PropertySearchSelect
                      value={form.property_id}
                      onChange={id => setForm(f => ({ ...f, property_id: id }))}
                      properties={filteredProps}
                      required
                    />
                    {formOwnerFilter !== 'all' && filteredProps.length === 0 && (
                      <p className="text-xs text-warning mt-1.5 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Este propietario no tiene propiedades vinculadas. Asigná el propietario en la ficha de cada propiedad.
                      </p>
                    )}
                  </>
                );
              })()}</div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium mb-1">Proveedor</label>
                <select value={form.provider_id} onChange={e => setForm(f => ({ ...f, provider_id: e.target.value }))} className="input-field">
                  <option value="">Sin asignar</option>
                  {providers?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select></div>
              <div><label className="block text-sm font-medium mb-1">Prioridad</label>
                <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} className="input-field">
                  <option value="low">Baja</option><option value="medium">Media</option><option value="high">Alta</option>
                </select></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium mb-1">Fecha programada</label>
                <input type="date" value={form.scheduled_date} onChange={e => setForm(f => ({ ...f, scheduled_date: e.target.value }))} className="input-field" /></div>
              <div><label className="block text-sm font-medium mb-1">Fecha de realización</label>
                <input type="date" value={form.completed_date} onChange={e => setForm(f => ({ ...f, completed_date: e.target.value }))} className="input-field" /></div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Costo {form.completed_date ? '(real)' : '(estimado)'}</label>
              <MoneyInput
                value={(form.completed_date ? form.actual_cost : form.estimated_cost) || ''}
                onChange={v => {
                  const num = v === '' ? 0 : v;
                  if (form.completed_date) setForm(f => ({ ...f, actual_cost: num }));
                  else setForm(f => ({ ...f, estimated_cost: num }));
                }}
                currency="Gs."
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                {form.completed_date
                  ? 'Para registrar como egreso en Finanzas, completá el ticket desde "Marcar Completado".'
                  : 'Si todavía no se realizó el trabajo, este monto queda como presupuesto.'}
              </p>
            </div>
            <div><label className="block text-sm font-medium mb-1">Notas</label>
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="input-field min-h-[60px]" /></div>
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button type="button" onClick={() => setFormOpen(false)} className="px-4 py-2 rounded-lg bg-muted text-muted-foreground text-sm font-medium">Cancelar</button>
              <button type="submit" disabled={createMutation.isPending} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">
                {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}Crear Ticket
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      {/* Edit ticket dialog */}
      <Dialog open={!!editTicket} onOpenChange={(open) => { if (!open) setEditTicket(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display">Editar Ticket</DialogTitle></DialogHeader>
          {editTicket && (
            <form onSubmit={e => { e.preventDefault(); editMutation.mutate(editTicket); }} className="space-y-4">
              <div><label className="block text-sm font-medium mb-1">Descripción *</label>
                <textarea value={editTicket.description} onChange={e => setEditTicket((t: any) => ({ ...t, description: e.target.value }))} className="input-field min-h-[80px]" required /></div>
              <div><label className="block text-sm font-medium mb-1">Propiedad *</label>
                <PropertySearchSelect
                  value={editTicket.property_id}
                  onChange={id => setEditTicket((t: any) => ({ ...t, property_id: id }))}
                  properties={properties || []}
                  required
                /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">Proveedor</label>
                  <select value={editTicket.provider_id} onChange={e => setEditTicket((t: any) => ({ ...t, provider_id: e.target.value }))} className="input-field">
                    <option value="">Sin asignar</option>
                    {providers?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select></div>
                <div><label className="block text-sm font-medium mb-1">Prioridad</label>
                  <select value={editTicket.priority} onChange={e => setEditTicket((t: any) => ({ ...t, priority: e.target.value }))} className="input-field">
                    <option value="low">Baja</option><option value="medium">Media</option><option value="high">Alta</option>
                  </select></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">Fecha programada</label>
                  <input type="date" value={editTicket.scheduled_date} onChange={e => setEditTicket((t: any) => ({ ...t, scheduled_date: e.target.value }))} className="input-field" /></div>
                <div><label className="block text-sm font-medium mb-1">Fecha de realización</label>
                  <input type="date" value={editTicket.completed_date} onChange={e => setEditTicket((t: any) => ({ ...t, completed_date: e.target.value }))} className="input-field" /></div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Costo {editTicket.completed_date ? '(real)' : '(estimado)'}
                </label>
                <MoneyInput
                  value={(editTicket.completed_date ? editTicket.actual_cost : editTicket.estimated_cost) || ''}
                  onChange={v => {
                    const num = v === '' ? 0 : v;
                    if (editTicket.completed_date) {
                      setEditTicket((t: any) => ({ ...t, actual_cost: num }));
                    } else {
                      setEditTicket((t: any) => ({ ...t, estimated_cost: num }));
                    }
                  }}
                  currency="Gs."
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  {editTicket.completed_date
                    ? 'Costo definitivo del trabajo. Para registrarlo como egreso en Finanzas, usá la opción "Registrar en Finanzas" del menú.'
                    : 'Presupuesto inicial. Cuando completes el ticket podrás cargar el costo real.'}
                </p>
              </div>
              <div><label className="block text-sm font-medium mb-1">Notas</label>
                <textarea value={editTicket.notes} onChange={e => setEditTicket((t: any) => ({ ...t, notes: e.target.value }))} className="input-field min-h-[60px]" /></div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setEditTicket(null)} className="px-4 py-2 rounded-lg bg-muted text-muted-foreground text-sm font-medium">Cancelar</button>
                <button type="submit" disabled={editMutation.isPending} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">
                  {editMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}Guardar
                </button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
      <CompleteTicketDialog
        ticket={completingTicket}
        providers={providers || []}
        onClose={() => setCompletingTicket(null)}
      />
    </MainLayout>
  );
};

export default Maintenance;
