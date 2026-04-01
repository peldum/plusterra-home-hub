import { useAuth } from '@/contexts/AuthContext';
import { useAnnouncements, useMarkAnnouncementsRead, useCreateAnnouncement, useDeleteAnnouncement, type Announcement } from '@/hooks/useAnnouncements';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Rocket, Sparkles, Gift, Megaphone, Calendar, CheckCheck, Plus, Trash2, Send } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

const typeConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  general: { label: 'General', icon: Megaphone, color: 'bg-primary/10 text-primary border-primary/20' },
  felicitacion: { label: 'Felicitación', icon: Gift, color: 'bg-success/10 text-success border-success/20' },
  recomendacion: { label: 'Recomendación', icon: Sparkles, color: 'bg-info/10 text-info border-info/20' },
  evento: { label: 'Evento', icon: Calendar, color: 'bg-warning/10 text-warning border-warning/20' },
};

interface NovedadesPanelProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export const NovedadesPanel = ({ open, onOpenChange }: NovedadesPanelProps) => {
  const { role } = useAuth();
  const { data: announcements = [], isLoading } = useAnnouncements();
  const markRead = useMarkAnnouncementsRead();
  const createAnnouncement = useCreateAnnouncement();
  const deleteAnnouncement = useDeleteAnnouncement();
  const isSuperAdmin = role === 'superadmin';

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState('general');

  // Mark as read when panel opens
  useEffect(() => {
    if (open && announcements.length > 0) {
      markRead.mutate();
    }
  }, [open]);

  const handleSubmit = () => {
    if (!title.trim() || !message.trim()) {
      toast.error('Completá título y mensaje');
      return;
    }
    createAnnouncement.mutate(
      { title: title.trim(), message: message.trim(), announcement_type: type },
      {
        onSuccess: () => {
          toast.success('Novedad publicada');
          setTitle('');
          setMessage('');
          setType('general');
          setShowForm(false);
        },
        onError: () => toast.error('Error al publicar'),
      }
    );
  };

  const handleDelete = (id: string) => {
    deleteAnnouncement.mutate(id, {
      onSuccess: () => toast.success('Novedad eliminada'),
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="flex items-center gap-2">
            <Rocket className="w-5 h-5 text-primary" strokeWidth={1.5} />
            Novedades del Sistema
          </SheetTitle>
        </SheetHeader>

        <p className="text-xs text-muted-foreground mb-4 flex items-center gap-1.5">
          <CheckCheck className="w-3.5 h-3.5" />
          Las novedades se marcan como leídas al abrir este panel
        </p>

        {/* SuperAdmin: create new announcement */}
        {isSuperAdmin && (
          <div className="mb-4">
            {showForm ? (
              <div className="space-y-3 p-3 rounded-xl border border-border bg-muted/30">
                <Input placeholder="Título" value={title} onChange={e => setTitle(e.target.value)} />
                <Textarea placeholder="Mensaje..." value={message} onChange={e => setMessage(e.target.value)} rows={3} />
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">📢 General</SelectItem>
                    <SelectItem value="felicitacion">🎁 Felicitación</SelectItem>
                    <SelectItem value="recomendacion">✨ Recomendación</SelectItem>
                    <SelectItem value="evento">📅 Evento</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSubmit} disabled={createAnnouncement.isPending}>
                    <Send className="w-3.5 h-3.5 mr-1" /> Publicar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Button>
                </div>
              </div>
            ) : (
              <Button variant="outline" size="sm" className="w-full" onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4 mr-1" /> Nueva novedad
              </Button>
            )}
          </div>
        )}

        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-8">Cargando...</p>
        ) : announcements.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Sin novedades por ahora</p>
        ) : (
          <div className="space-y-3">
            {announcements.map(a => (
              <AnnouncementCard key={a.id} announcement={a} isSuperAdmin={isSuperAdmin} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

const AnnouncementCard = ({ announcement, isSuperAdmin, onDelete }: { announcement: Announcement; isSuperAdmin: boolean; onDelete: (id: string) => void }) => {
  const cfg = typeConfig[announcement.announcement_type] || typeConfig.general;
  const Icon = cfg.icon;

  return (
    <div className="p-4 rounded-xl border border-border bg-card">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className={`text-[10px] gap-1 ${cfg.color}`}>
            <Icon className="w-3 h-3" />
            {cfg.label}
          </Badge>
        </div>
        {isSuperAdmin && (
          <button onClick={() => onDelete(announcement.id)} className="text-muted-foreground hover:text-destructive transition-colors p-1">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <h4 className="text-sm font-semibold text-foreground mt-2">{announcement.title}</h4>
      <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{announcement.message}</p>
      <p className="text-[10px] text-muted-foreground mt-2">
        {formatDistanceToNow(new Date(announcement.created_at), { addSuffix: true, locale: es })}
      </p>
    </div>
  );
};
