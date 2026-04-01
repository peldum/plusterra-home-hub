import { useAuth } from '@/contexts/AuthContext';
import { useAllSystemUpdates, useMarkSystemUpdatesRead, type SystemUpdate } from '@/hooks/useSystemUpdates';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Rocket, Sparkles, Wrench, Zap, Settings, CheckCheck } from 'lucide-react';
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
  const { data: updates = [], isLoading } = useAllSystemUpdates();
  const markRead = useMarkSystemUpdatesRead();

  // Mark as read when panel opens
  useEffect(() => {
    if (open && updates.length > 0) {
      markRead.mutate();
    }
  }, [open]);

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

        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-8">Cargando...</p>
        ) : updates.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Sin novedades por ahora</p>
        ) : (
          <div className="space-y-3">
            {updates.map(u => (
              <UpdateCard key={u.id} update={u} />
            ))}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

/* ── Update Card (read-only, no delete) ── */
const UpdateCard = ({ update }: { update: SystemUpdate }) => {
  const cfg = typeConfig[update.update_type] || typeConfig.mejora;
  const Icon = cfg.icon;

  return (
    <div className="p-4 rounded-xl border border-border bg-card">
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
      <h4 className="text-sm font-semibold text-foreground mt-2">{update.title}</h4>
      <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{update.description}</p>
      <p className="text-[10px] text-muted-foreground mt-2">
        {formatDistanceToNow(new Date(update.created_at), { addSuffix: true, locale: es })}
      </p>
    </div>
  );
};
