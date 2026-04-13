import { useState, useMemo, useEffect, useRef } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import {
  Plus, CalendarDays, ChevronLeft, ChevronRight, Clock, Trash2,
  CheckCircle2, Circle, AlertTriangle, Loader2, CalendarIcon,
} from 'lucide-react';
import {
  useAgentTasks, useCreateAgentTask, useUpdateAgentTask, useDeleteAgentTask,
  AgentTask, TASK_TYPES, getTaskTypeLabel,
} from '@/hooks/useAgentTasks';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, isToday, isPast, addMonths, subMonths, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const STATUS_CONFIG: Record<string, { label: string; icon: any; className: string }> = {
  pending: { label: 'Sin iniciar', icon: Circle, className: 'text-muted-foreground' },
  in_progress: { label: 'En proceso', icon: Clock, className: 'text-warning' },
  done: { label: 'Terminada', icon: CheckCircle2, className: 'text-success' },
};

const AgendaPage = () => {
  const { user } = useAuth();
  const { data: tasks, isLoading } = useAgentTasks();
  const [showForm, setShowForm] = useState(false);
  const [editTask, setEditTask] = useState<AgentTask | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [tab, setTab] = useState('proximas');

  const createTask = useCreateAgentTask();
  const updateTask = useUpdateAgentTask();
  const deleteTask = useDeleteAgentTask();

  const now = new Date();

  const filteredTasks = useMemo(() => {
    if (!tasks) return [];
    const today = format(now, 'yyyy-MM-dd');

    if (selectedDate) {
      return tasks.filter(t => format(parseISO(t.scheduled_at), 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd'));
    }

    switch (tab) {
      case 'hoy':
        return tasks.filter(t => format(parseISO(t.scheduled_at), 'yyyy-MM-dd') === today);
      case 'vencidas':
        return tasks.filter(t => t.status !== 'done' && parseISO(t.scheduled_at) < now && format(parseISO(t.scheduled_at), 'yyyy-MM-dd') !== today);
      case 'todas':
        return tasks;
      case 'proximas':
      default:
        return tasks.filter(t => t.status !== 'done' && parseISO(t.scheduled_at) >= new Date(today));
    }
  }, [tasks, tab, selectedDate, now]);

  // Calendar days with events
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const tasksPerDay = useMemo(() => {
    if (!tasks) return new Map<string, number>();
    const map = new Map<string, number>();
    tasks.forEach(t => {
      const key = format(parseISO(t.scheduled_at), 'yyyy-MM-dd');
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }, [tasks]);

  const handleStatusToggle = (task: AgentTask) => {
    const nextStatus = task.status === 'pending' ? 'in_progress' : task.status === 'in_progress' ? 'done' : 'pending';
    updateTask.mutate({ id: task.id, status: nextStatus });
  };

  const overdueTasks = tasks?.filter(t => t.status !== 'done' && isPast(parseISO(t.scheduled_at)) && !isToday(parseISO(t.scheduled_at))).length || 0;

  return (
    <MainLayout title="Mi Agenda" subtitle={`${tasks?.length || 0} tareas · ${overdueTasks} vencidas`}
      actionNode={
        <Button size="sm" onClick={() => { setEditTask(null); setShowForm(true); }} className="gap-1">
          <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Nueva tarea</span>
        </Button>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-1">
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <h3 className="text-sm font-semibold capitalize">
                {format(currentMonth, 'MMMM yyyy', { locale: es })}
              </h3>
              <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 mb-1">
              {['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'].map(d => (
                <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-1">{d}</div>
              ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 gap-px">
              {/* Padding for first day */}
              {Array.from({ length: (monthStart.getDay() + 6) % 7 }).map((_, i) => (
                <div key={`pad-${i}`} />
              ))}
              {daysInMonth.map(day => {
                const dayKey = format(day, 'yyyy-MM-dd');
                const count = tasksPerDay.get(dayKey) || 0;
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                const today = isToday(day);

                return (
                  <button
                    key={dayKey}
                    onClick={() => {
                      setSelectedDate(isSelected ? null : day);
                      setTab('proximas');
                    }}
                    className={cn(
                      'relative w-full aspect-square flex flex-col items-center justify-center rounded-md text-xs transition-colors',
                      isSelected ? 'bg-primary text-primary-foreground' :
                      today ? 'bg-primary/10 text-primary font-bold' :
                      'hover:bg-muted/60'
                    )}
                  >
                    {day.getDate()}
                    {count > 0 && (
                      <span className={cn(
                        'absolute bottom-0.5 w-1.5 h-1.5 rounded-full',
                        isSelected ? 'bg-primary-foreground' : 'bg-primary'
                      )} />
                    )}
                  </button>
                );
              })}
            </div>

            {selectedDate && (
              <div className="mt-3 text-center">
                <Button variant="ghost" size="sm" onClick={() => setSelectedDate(null)} className="text-xs">
                  ✕ Quitar filtro de día
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Task list */}
        <div className="lg:col-span-2">
          {!selectedDate && (
            <Tabs value={tab} onValueChange={(v) => { setTab(v); setSelectedDate(null); }} className="mb-4">
              <TabsList>
                <TabsTrigger value="proximas">Próximas</TabsTrigger>
                <TabsTrigger value="hoy">Hoy</TabsTrigger>
                <TabsTrigger value="vencidas">
                  Vencidas {overdueTasks > 0 && <Badge variant="destructive" className="ml-1 text-[10px] h-4 px-1">{overdueTasks}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="todas">Todas</TabsTrigger>
              </TabsList>
            </Tabs>
          )}

          {selectedDate && (
            <div className="mb-4">
              <Badge variant="secondary" className="text-xs">
                📅 {format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}
              </Badge>
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : filteredTasks.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CalendarDays className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No hay tareas {tab === 'hoy' ? 'para hoy' : tab === 'vencidas' ? 'vencidas' : ''}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTasks.map(task => {
                const statusConf = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending;
                const StatusIcon = statusConf.icon;
                const isOverdue = task.status !== 'done' && isPast(parseISO(task.scheduled_at)) && !isToday(parseISO(task.scheduled_at));

                return (
                  <div
                    key={task.id}
                    className={cn(
                      'bg-card border rounded-lg p-4 flex items-start gap-3 transition-all hover:shadow-sm',
                      isOverdue ? 'border-destructive/40' : 'border-border'
                    )}
                  >
                    <button onClick={() => handleStatusToggle(task)} className={cn('mt-0.5 shrink-0', statusConf.className)}>
                      <StatusIcon className="w-5 h-5" />
                    </button>

                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => { setEditTask(task); setShowForm(true); }}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-foreground">{task.title}</span>
                        <Badge variant="outline" className="text-[10px] h-4">{getTaskTypeLabel(task.task_type)}</Badge>
                        {isOverdue && <Badge variant="destructive" className="text-[10px] h-4">Vencida</Badge>}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(parseISO(task.scheduled_at), "d MMM HH:mm", { locale: es })}
                        </span>
                        {task.client_name && <span>👤 {task.client_name}</span>}
                        {task.property_title && <span>🏠 {task.property_title}</span>}
                      </div>
                      {task.description && <p className="text-xs text-muted-foreground mt-1 truncate">{task.description}</p>}
                    </div>

                    <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteTask.mutate(task.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit modal */}
      <TaskFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        task={editTask}
        onSave={(data) => {
          if (editTask) {
            updateTask.mutate({ id: editTask.id, ...data }, { onSuccess: () => setShowForm(false) });
          } else {
            createTask.mutate(data, { onSuccess: () => setShowForm(false) });
          }
        }}
        isLoading={createTask.isPending || updateTask.isPending}
      />
    </MainLayout>
  );
};

/* ------------------------------------------------------------------ */
/* Task Form Dialog                                                    */
/* ------------------------------------------------------------------ */

interface TaskFormDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  task: AgentTask | null;
  onSave: (data: Partial<AgentTask>) => void;
  isLoading: boolean;
}

const TaskFormDialog = ({ open, onOpenChange, task, onSave, isLoading }: TaskFormDialogProps) => {
  const { user } = useAuth();
  const [form, setForm] = useState<Partial<AgentTask>>({});
  const [dateOpen, setDateOpen] = useState(false);

  // Initialize form when dialog opens
  useEffect(() => {
    if (open) {
      setForm(task ? {
        task_type: task.task_type,
        title: task.title,
        description: task.description,
        client_id: task.client_id,
        client_name: task.client_name,
        property_id: task.property_id,
        property_title: task.property_title,
        scheduled_at: task.scheduled_at,
        status: task.status,
      } : { task_type: 'llamada', status: 'pending' });
    }
  }, [open, task]);

  const handleOpenChange = (v: boolean) => {
    onOpenChange(v);
  };

  // Search clients
  const { data: clients } = useQuery({
    queryKey: ['agenda-clients-search'],
    queryFn: async () => {
      const { data } = await supabase.from('clients').select('id, full_name').order('full_name').limit(100);
      return data ?? [];
    },
    enabled: open,
  });

  // Search properties
  const { data: properties } = useQuery({
    queryKey: ['agenda-properties-search'],
    queryFn: async () => {
      const { data } = await supabase.from('properties').select('id, title, property_code').eq('captor_agent_id', user!.id).order('title').limit(100);
      return data ?? [];
    },
    enabled: open && !!user,
  });

  const set = (updates: Partial<AgentTask>) => setForm(prev => ({ ...prev, ...updates }));

  const scheduledDate = form.scheduled_at ? parseISO(form.scheduled_at) : undefined;
  const timeValue = scheduledDate ? format(scheduledDate, 'HH:mm') : '09:00';

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    const [hours, minutes] = timeValue.split(':').map(Number);
    date.setHours(hours, minutes, 0, 0);
    set({ scheduled_at: date.toISOString() });
    setDateOpen(false);
  };

  const handleTimeChange = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    const base = scheduledDate ? new Date(scheduledDate) : new Date();
    base.setHours(h, m, 0, 0);
    set({ scheduled_at: base.toISOString() });
  };

  const canSubmit = form.title && form.scheduled_at && form.task_type;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{task ? 'Editar tarea' : 'Nueva tarea'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Type */}
          <div>
            <label className="text-xs font-medium text-muted-foreground">Tipo de acción *</label>
            <Select value={form.task_type || 'llamada'} onValueChange={v => set({ task_type: v })}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TASK_TYPES.map(t => <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div>
            <label className="text-xs font-medium text-muted-foreground">Título *</label>
            <Input className="mt-1" value={form.title || ''} onChange={e => set({ title: e.target.value })} placeholder="Ej: Llamar a cliente por depto" />
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Fecha *</label>
              <Popover open={dateOpen} onOpenChange={setDateOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full mt-1 justify-start text-left font-normal", !scheduledDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {scheduledDate ? format(scheduledDate, 'dd/MM/yyyy') : 'Elegir fecha'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={scheduledDate} onSelect={handleDateSelect} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Hora</label>
              <Input type="time" className="mt-1" value={timeValue} onChange={e => handleTimeChange(e.target.value)} />
            </div>
          </div>

          {/* Client */}
          <div>
            <label className="text-xs font-medium text-muted-foreground">Cliente (opcional)</label>
            <Select value={form.client_id || '_none'} onValueChange={v => {
              if (v === '_none') { set({ client_id: null, client_name: null }); return; }
              const c = clients?.find(c => c.id === v);
              set({ client_id: v, client_name: c?.full_name || null });
            }}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Sin cliente" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">Sin cliente</SelectItem>
                {clients?.map(c => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Property */}
          <div>
            <label className="text-xs font-medium text-muted-foreground">Propiedad (opcional)</label>
            <Select value={form.property_id || '_none'} onValueChange={v => {
              if (v === '_none') { set({ property_id: null, property_title: null }); return; }
              const p = properties?.find(p => p.id === v);
              set({ property_id: v, property_title: p?.title || null });
            }}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Sin propiedad" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">Sin propiedad</SelectItem>
                {properties?.map(p => <SelectItem key={p.id} value={p.id}>{p.property_code} — {p.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Status (only when editing) */}
          {task && (
            <div>
              <label className="text-xs font-medium text-muted-foreground">Estado</label>
              <Select value={form.status || 'pending'} onValueChange={v => set({ status: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">⬜ Sin iniciar</SelectItem>
                  <SelectItem value="in_progress">🟡 En proceso</SelectItem>
                  <SelectItem value="done">✅ Terminada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="text-xs font-medium text-muted-foreground">Nota breve</label>
            <Textarea className="mt-1" rows={2} value={form.description || ''} onChange={e => set({ description: e.target.value })} placeholder="Observaciones..." />
          </div>

          <Button className="w-full" onClick={() => onSave(form)} disabled={!canSubmit || isLoading}>
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {task ? 'Guardar cambios' : 'Crear tarea'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AgendaPage;
