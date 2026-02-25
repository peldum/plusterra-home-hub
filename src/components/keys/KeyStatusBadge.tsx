import { KeyStatus } from '@/hooks/useKeyMovements';
import { Key, Building2, User, Wrench, Users, Home, UserCog } from 'lucide-react';

const statusConfig: Record<KeyStatus, { label: string; icon: React.ElementType; className: string }> = {
  EN_OFICINA: { label: 'En Oficina', icon: Building2, className: 'bg-success/10 text-success border-success/20' },
  EN_PODER_AGENTE: { label: 'En poder de Agente', icon: User, className: 'bg-warning/10 text-warning border-warning/20' },
  EN_PODER_TERCERO: { label: 'En poder de Tercero', icon: Users, className: 'bg-destructive/10 text-destructive border-destructive/20' },
  EN_MANTENIMIENTO: { label: 'En Mantenimiento', icon: Wrench, className: 'bg-info/10 text-info border-info/20' },
  EN_PROPIETARIO: { label: 'En poder del Propietario', icon: Home, className: 'bg-primary/10 text-primary border-primary/20' },
  EN_ENCARGADO: { label: 'En poder del Encargado', icon: UserCog, className: 'bg-accent/10 text-accent-foreground border-accent/20' },
};

interface KeyStatusBadgeProps {
  status: KeyStatus;
  responsibleName?: string | null;
  since?: string | null;
  phone?: string | null;
  showWhatsApp?: boolean;
  size?: 'sm' | 'md';
}

export const KeyStatusBadge = ({ status, responsibleName, since, phone, showWhatsApp, size = 'md' }: KeyStatusBadgeProps) => {
  const config = statusConfig[status];
  const Icon = config.icon;

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString('es-PY', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  if (size === 'sm') {
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${config.className}`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    );
  }

  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl border ${config.className}`}>
      <div className="p-2 rounded-lg bg-current/10">
        <Key className="w-4 h-4" />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <Icon className="w-3.5 h-3.5" />
          <span className="font-semibold text-sm">{config.label}</span>
        </div>
        {responsibleName && (
          <p className="text-xs mt-0.5 opacity-80">{responsibleName}</p>
        )}
        {phone && (
          <p className="text-xs mt-0.5 opacity-70">📞 {phone}</p>
        )}
        {since && (
          <p className="text-xs mt-0.5 opacity-60">Desde: {formatTime(since)}</p>
        )}
        {showWhatsApp && phone && (
          <a
            href={`https://wa.me/${phone.replace(/\D/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 mt-1.5 px-2.5 py-1 rounded-lg bg-[hsl(142,70%,45%)] text-white text-xs font-medium hover:bg-[hsl(142,70%,40%)] transition-colors"
          >
            💬 WhatsApp
          </a>
        )}
      </div>
    </div>
  );
};
