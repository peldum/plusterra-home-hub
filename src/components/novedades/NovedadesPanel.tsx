import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSystemUpdates, useCreateSystemUpdate, useDeleteSystemUpdate, useMarkSystemUpdatesRead, type SystemUpdate } from '@/hooks/useSystemUpdates';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Rocket, Plus, Trash2, Sparkles, Wrench, Zap, Settings } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useEffect } from 'react';

const typeConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  mejora: { label: 'Mejora', icon: Sparkles, color: 'bg-info/10 text-info border-info/20' },
  correccion: { label: 'Corrección', icon: Wrench, color: 'bg-warning/10 text-warning border-warning/20' },
  nueva_funcion: { label: 'Nueva función', icon: Zap, color: 'bg-success/10 text-success border-success/20' },
  mantenimiento: { label: 'Mantenimiento', icon: Settings, color: 'bg-muted text-muted-foreground border-border' },
};

interface NovedadesPanelProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export const NovedadesPanel = ({ open, onOpenChange }: NovedadesPanelProps) => {
  const { role } = useAuth();
  const isSuperAdmin = role === 'superadmin';
  const { data: updates = [], isLoading } = useSystemUpdates();
  const markRead = useMarkSystemUpdatesRead();
  const deleteUpdate = useDeleteSystemUpdate();
  const [showForm, setShowForm] = useState(false);

  // Mark as read when panel opens
  useEffect(() => {
    if (open) {
      markRead.mutate();
    }
  }, [open]);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle className="flex items-center gap-2">
              <Rocket className="w-5 h-5 text-primary" strokeWidth={1.5} />
              Novedades del Sistema
            </SheetTitle>
          </SheetHeader>

          {isSuperAdmin && (
            <Button size="sm" onClick={() => setShowForm(true)} className="mb-4 w-full gap-2">
              <Plus className="w-4 h-4" /> Publicar novedad
            </Button>
          )}

          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Cargando...</p>
          ) : updates.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Sin novedades por ahora</p>
          ) : (
            <div className="space-y-3">
              {updates.map(u => (
                <UpdateCard key={u.id} update={u} canDelete={isSuperAdmin} onDelete={() => deleteUpdate.mutate(u.id)} />
              ))}
            </div>
          )}
        </SheetContent>
      </Sheet>

      <NovedadFormDialog open={showForm} onClose={() => setShowForm(false)} />
    </>
  );
};

/* ── Update Card ── */
const UpdateCard = ({ update, canDelete, onDelete }: { update: SystemUpdate; canDelete: boolean; onDelete: () => void }) => {
  const cfg = typeConfig[update.update_type] || typeConfig.mejora;
  const Icon = cfg.icon;

  return (
    <div className="p-4 rounded-xl border border-border bg-card">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className={`text-[10px] gap-1 ${cfg.color}`}>
            <Icon className="w-3 h-3" />
            {cfg.label}
          </Badge>
          {update.version && (
            <Badge variant="outline" className="text-[10px] text-muted-foreground">
              v{update.version}
            </Badge>
          )}
        </div>
        {canDelete && (
          <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={onDelete}>
            <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
          </Button>
        )}
      </div>
      <h4 className="text-sm font-semibold text-foreground mt-2">{update.title}</h4>
      <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{update.description}</p>
      <p className="text-[10px] text-muted-foreground mt-2">
        {formatDistanceToNow(new Date(update.created_at), { addSuffix: true, locale: es })}
      </p>
    </div>
  );
};

/* ── Form Dialog ── */
const NovedadFormDialog = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const createUpdate = useCreateSystemUpdate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [updateType, setUpdateType] = useState('mejora');
  const [version, setVersion] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) return;
    setSaving(true);
    await createUpdate.mutateAsync({ title, description, update_type: updateType, version: version || undefined });
    setSaving(false);
    setTitle(''); setDescription(''); setUpdateType('mejora'); setVersion('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Publicar novedad</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Título *</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Título de la novedad" />
          </div>
          <div>
            <Label>Descripción *</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} placeholder="Describe los cambios..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Tipo</Label>
              <Select value={updateType} onValueChange={setUpdateType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mejora">✨ Mejora</SelectItem>
                  <SelectItem value="correccion">🔧 Corrección</SelectItem>
                  <SelectItem value="nueva_funcion">🚀 Nueva función</SelectItem>
                  <SelectItem value="mantenimiento">⚙️ Mantenimiento</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Versión (opcional)</Label>
              <Input value={version} onChange={e => setVersion(e.target.value)} placeholder="ej. 2.5.0" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving || !title.trim() || !description.trim()}>
            Publicar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
