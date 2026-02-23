import { useState } from 'react';
import { Bell } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

export const NotificationBell = ({ className = '' }: { className?: string }) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: alerts = [] } = useQuery({
    queryKey: ['alerts', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    refetchInterval: 30_000,
  });

  const unreadCount = alerts.filter((a) => !a.is_read).length;

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('alerts').update({ is_read: true }).eq('id', id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts', user?.id] }),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      if (!user) return;
      await supabase.from('alerts').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts', user?.id] }),
  });

  const typeIcon: Record<string, string> = {
    contract_expiring: '📋',
    contract_expired: '⚠️',
    payment_due: '💰',
    maintenance: '🔧',
    key_movement: '🔑',
    general: '🔔',
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className={`relative p-2 rounded-lg hover:bg-muted transition-colors ${className}`}>
          <Bell className="w-5 h-5 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-secondary text-secondary-foreground text-[10px] font-bold leading-none px-1">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 max-h-[420px] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="font-semibold text-sm text-foreground">Notificaciones</h3>
          {unreadCount > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                markAllRead.mutate();
              }}
              className="text-xs text-primary hover:underline"
            >
              Marcar todas leídas
            </button>
          )}
        </div>
        <div className="overflow-y-auto flex-1">
          {alerts.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Sin notificaciones
            </div>
          ) : (
            alerts.map((alert) => (
              <button
                key={alert.id}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!alert.is_read) markRead.mutate(alert.id);
                }}
                className={`w-full text-left px-4 py-3 border-b border-border last:border-0 hover:bg-muted/50 transition-colors ${
                  !alert.is_read ? 'bg-primary/5' : ''
                }`}
              >
                <div className="flex gap-2">
                  <span className="text-base leading-none mt-0.5">
                    {typeIcon[alert.alert_type] || '🔔'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm truncate ${!alert.is_read ? 'font-semibold text-foreground' : 'text-foreground'}`}>
                      {alert.title}
                    </p>
                    {alert.message && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{alert.message}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true, locale: es })}
                    </p>
                  </div>
                  {!alert.is_read && (
                    <span className="w-2 h-2 rounded-full bg-secondary flex-shrink-0 mt-1.5" />
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
