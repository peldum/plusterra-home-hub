import { useState, useMemo } from 'react';
import { useInternalTasks, useCreateInternalTask, useUpdateInternalTask, useDeleteInternalTask, type InternalTask } from '@/hooks/useInternalTasks';
import { useAuth } from '@/contexts/AuthContext';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Edit, Calendar, AlertTriangle, Loader2, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { format, isPast, isToday } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

const COLUMNS = [
  { key: 'pendiente', label: 'Pendientes', color: 'bg-yellow-500' },
  { key: 'en_proceso', label: 'En proceso', color: 'bg-blue-500' },
  { key: 'revision', label: 'Revisión', color: 'bg-purple-500' },
  { key: 'terminada', label: 'Terminadas', color: 'bg-green-500' },
] as const;

const PRIORITY_COLORS: Record<string, string> = {
  alta: 'bg-destructive text-destructive-foreground',
  media: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  baja: 'bg-muted text-muted-foreground',
};

const NEXT_STATUS: Record<string, string> = {
  pendiente: 'en_proceso',
  en_proceso: 'revision',
  revision: 'terminada',
};

const useAdminProfiles = () =>
  useQuery({
    queryKey: ['admin-profiles-for-tasks'],
    queryFn: async () => {
      const { data } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('role', ['superadmin', 'admin', 'accounting', 'secretaria']);
      if (!data?.length) return [];
      const ids = data.map((r) => r.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', ids);
      return profiles || [];
    },
    staleTime: 5 * 60_000,
  });

export default function TareasInternas() {
  const { data: tasks = [], isLoading } = useInternalTasks();
  const { data: admins = [] } = useAdminProfiles();
  const createTask = useCreateInternalTask();
  const updateTask = useUpdateInternalTask();
  const deleteTask = useDeleteInternalTask();
  const { user } = useAuth();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<InternalTask | null>(null);
  const [form, setForm] = useState({ title: '', description: '', assigned_to: '', priority: 'media', due_date: '' });

  // Mobile: show list view
  const [mobileCol, setMobileCol] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const g: Record<string, InternalTask[]> = { pendiente: [], en_proceso: [], revision: [], terminada: [] };
    tasks.forEach((t) => {
      if (g[t.status]) g[t.status].push(t);
      else g.pendiente.push(t);
    });
    return g;
  }, [tasks]);

  const openNew = () => {
    setEditing(null);
    setForm({ title: '', description: '', assigned_to: user?.id || '', priority: 'media', due_date: '' });
    setDialogOpen(true);
  };

  const openEdit = (t: InternalTask) => {
    setEditing(t);
    setForm({
      title: t.title,
      description: t.description || '',
      assigned_to: t.assigned_to,
      priority: t.priority,
      due_date: t.due_date || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) return toast.error('El título es obligatorio');
    try {
      if (editing) {
        await updateTask.mutateAsync({ id: editing.id, ...form, due_date: form.due_date || null });
        toast.success('Tarea actualizada');
      } else {
        await createTask.mutateAsync({ ...form, due_date: form.due_date || undefined });
        toast.success('Tarea creada');
      }
      setDialogOpen(false);
    } catch {
      toast.error('Error al guardar');
    }
  };

  const moveNext = (t: InternalTask) => {
    const next = NEXT_STATUS[t.status];
    if (!next) return;
    updateTask.mutate({ id: t.id, status: next });
  };

  const handleDelete = (id: string, title: string) => {
    setDeleteConfirm({ id, title });
  };

  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; title: string } | null>(null);

  const confirmDelete = () => {
    if (!deleteConfirm) return;
    deleteTask.mutate(deleteConfirm.id);
    setDeleteConfirm(null);
  };

  const getAssigneeName = (id: string) => admins.find((a) => a.id === id)?.full_name || 'Sin asignar';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const TaskCard = ({ t }: { t: InternalTask }) => {
    const overdue = t.due_date && isPast(new Date(t.due_date)) && !isToday(new Date(t.due_date)) && t.status !== 'terminada';
    return (
      <Card className={`mb-3 ${overdue ? 'border-destructive' : ''}`}>
        <CardContent className="p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-medium text-sm leading-tight flex-1">{t.title}</h4>
            <Badge className={`text-[10px] shrink-0 ${PRIORITY_COLORS[t.priority]}`}>{t.priority}</Badge>
          </div>
          {t.description && <p className="text-xs text-muted-foreground line-clamp-2">{t.description}</p>}
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span>{getAssigneeName(t.assigned_to)}</span>
          </div>
          {t.due_date && (
            <div className={`flex items-center gap-1 text-xs ${overdue ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
              {overdue && <AlertTriangle className="w-3 h-3" />}
              <Calendar className="w-3 h-3" />
              {format(new Date(t.due_date), 'dd MMM', { locale: es })}
            </div>
          )}
          <div className="flex gap-1 pt-1">
            {NEXT_STATUS[t.status] && (
              <Button size="sm" variant="outline" className="text-xs h-7 flex-1" onClick={() => moveNext(t)}>
                Avanzar <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
            )}
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(t)}>
              <Edit className="w-3 h-3" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(t.id, t.title)}>
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const totalTasks = tasks.length;

  return (
    <MainLayout
      title="Tareas Internas"
      subtitle={`${totalTasks} tareas`}
      action={{ label: 'Nueva tarea', onClick: openNew }}
    >
      {/* Desktop: Kanban columns */}
      <div className="hidden md:grid grid-cols-4 gap-4">
        {COLUMNS.map((col) => (
          <div key={col.key} className="space-y-2">
            <div className="flex items-center gap-2 pb-2 border-b border-border">
              <div className={`w-3 h-3 rounded-full ${col.color}`} />
              <span className="font-semibold text-sm text-foreground">{col.label}</span>
              <Badge variant="secondary" className="ml-auto text-xs">{grouped[col.key]?.length || 0}</Badge>
            </div>
            <div className="min-h-[200px]">
              {grouped[col.key]?.map((t) => <TaskCard key={t.id} t={t} />)}
            </div>
          </div>
        ))}
      </div>

      {/* Mobile: column selector + list */}
      <div className="md:hidden space-y-3">
        <div className="grid grid-cols-2 gap-2">
          {COLUMNS.map((col) => (
            <Button
              key={col.key}
              size="sm"
              variant={mobileCol === col.key || (!mobileCol && col.key === 'pendiente') ? 'default' : 'outline'}
              className="text-xs px-2 h-10"
              onClick={() => setMobileCol(col.key)}
            >
              <span className={`w-2 h-2 rounded-full ${col.color} mr-1.5`} />
              {col.label} ({grouped[col.key]?.length || 0})
            </Button>
          ))}
        </div>
        <div>
          {(grouped[mobileCol || 'pendiente'] || []).map((t) => (
            <TaskCard key={t.id} t={t} />
          ))}
          {(grouped[mobileCol || 'pendiente'] || []).length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-8">Sin tareas en esta columna</p>
          )}
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Tarea' : 'Nueva Tarea'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Título *</label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ej: Revisar documentos" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Descripción</label>
              <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descripción opcional..." />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Responsable *</label>
              <Select value={form.assigned_to} onValueChange={(v) => setForm({ ...form, assigned_to: v })}>
                <SelectTrigger><SelectValue placeholder="Seleccionar responsable" /></SelectTrigger>
                <SelectContent>
                  {admins.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Prioridad</label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="alta">🔴 Alta</SelectItem>
                  <SelectItem value="media">🟡 Media</SelectItem>
                  <SelectItem value="baja">⚪ Baja</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Fecha límite</label>
              <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={createTask.isPending || updateTask.isPending}>
              {(createTask.isPending || updateTask.isPending) && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {editing ? 'Guardar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Eliminar tarea
            </DialogTitle>
            <DialogDescription>
              ¿Eliminar la tarea <strong>"{deleteConfirm?.title}"</strong>? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleteTask.isPending}>
              {deleteTask.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
