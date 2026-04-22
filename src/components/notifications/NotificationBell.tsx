import { useState, useEffect, useRef } from 'react';
import { Bell, Check, CheckCheck, Trash2, ExternalLink } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  useActiveNotifications,
  useUnreadNotificationCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDeleteNotification,
  groupNotificationsByDate,
  type Notification,
} from '@/hooks/useNotifications';

const typeConfig: Record<string, { icon: string; color: string }> = {
  canon_due_soon: { icon: '💰', color: 'bg-amber-500' },
  payment_due: { icon: '💰', color: 'bg-amber-500' },
  contract_expiration_30: { icon: '📋', color: 'bg-blue-500' },
  contract_expiration_15: { icon: '📋', color: 'bg-orange-500' },
  contract_expiration_7: { icon: '📋', color: 'bg-destructive' },
  lead: { icon: '🧲', color: 'bg-green-500' },
  reservation: { icon: '🏠', color: 'bg-purple-500' },
  aviso: { icon: '📢', color: 'bg-primary' },
  maintenance: { icon: '🔧', color: 'bg-slate-500' },
  key_movement: { icon: '🔑', color: 'bg-yellow-500' },
  general: { icon: '🔔', color: 'bg-muted' },
};

const getConfig = (tipo: string) => typeConfig[tipo] || typeConfig.general;

const formatTime = (dateStr: string) => {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'ahora';
  if (diffMins < 60) return `hace ${diffMins} min`;
  if (diffMins < 1440) return formatDistanceToNow(d, { addSuffix: true, locale: es });
  // More than a day
  const diffDays = Math.floor(diffMins / 1440);
  if (diffDays === 1) return 'ayer';
  if (diffDays < 7) return formatDistanceToNow(d, { addSuffix: true, locale: es });
  return format(d, 'd MMM', { locale: es });
};

export const NotificationBell = ({ className = '' }: { className?: string }) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'all' | 'unread'>('all');
  const [swipedId, setSwipedId] = useState<string | null>(null);
  const touchStartX = useRef(0);

  const { data: allNotifs = [] } = useActiveNotifications('all');
  const { data: unreadCount = 0 } = useUnreadNotificationCount();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const deleteNotif = useDeleteNotification();

  const unreadNotifs = allNotifs.filter((notif) => !notif.leida);
  const notifications = tab === 'unread' ? unreadNotifs : allNotifs;
  const groups = groupNotificationsByDate(notifications);

  // Auto-mark visible as read when panel opens
  useEffect(() => {
    if (open && unreadCount > 0) {
      // Mark visible notifications as "seen" (visto_at) after 2s
      const timeout = setTimeout(() => {
        // We don't mark all as read automatically, just track visto_at
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [open, unreadCount]);

  const handleClick = (notif: Notification) => {
    if (!notif.leida) markRead.mutate(notif.id);
    if (notif.related_url) {
      setOpen(false);
      navigate(notif.related_url);
    }
  };

  const handleTouchStart = (e: React.TouchEvent, id: string) => {
    touchStartX.current = e.touches[0].clientX;
    setSwipedId(null);
  };

  const handleTouchEnd = (e: React.TouchEvent, id: string) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (diff > 60) setSwipedId(id);
    else setSwipedId(null);
  };

  const badgeText = unreadCount > 99 ? '99+' : unreadCount > 0 ? String(unreadCount) : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className={`relative flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground active:scale-95 transition-all touch-manipulation md:h-auto md:w-auto md:p-2 ${className}`}>
          <Bell className="w-5 h-5 text-muted-foreground" />
          {badgeText && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold leading-none px-1 animate-in fade-in zoom-in">
              {badgeText}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0 max-h-[520px] flex flex-col" sideOffset={8}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="font-semibold text-sm text-foreground">Notificaciones</h3>
          {unreadCount > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                markAllRead.mutate();
              }}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <CheckCheck className="w-3 h-3" />
              Marcar todas leídas
            </button>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={(v) => setTab(v as 'all' | 'unread')} className="flex flex-col flex-1 min-h-0">
          <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent px-4 h-auto py-0">
            <TabsTrigger
              value="all"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 py-2 text-xs"
            >
              Todo
            </TabsTrigger>
            <TabsTrigger
              value="unread"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 py-2 text-xs"
            >
              No leídas
              {unreadCount > 0 && (
                <span className="ml-1.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value={tab} className="flex-1 overflow-y-auto m-0 mt-0">
            {groups.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  {tab === 'unread' ? 'No hay notificaciones sin leer' : 'Sin notificaciones'}
                </p>
              </div>
            ) : (
              groups.map((group) => (
                <div key={group.label}>
                  <div className="px-4 py-1.5 bg-muted/50 sticky top-0 z-10">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      {group.label}
                    </span>
                  </div>
                  {group.items.map((notif) => {
                    const cfg = getConfig(notif.tipo);
                    const isSwiped = swipedId === notif.id;
                    const isResolved = !!notif.resolved_at;

                    return (
                      <div
                        key={notif.id}
                        className="relative overflow-hidden"
                        onTouchStart={(e) => handleTouchStart(e, notif.id)}
                        onTouchEnd={(e) => handleTouchEnd(e, notif.id)}
                      >
                        {/* Swipe actions */}
                        <div className={`absolute right-0 top-0 bottom-0 flex items-stretch transition-transform duration-200 ${isSwiped ? 'translate-x-0' : 'translate-x-full'}`}>
                          <button
                            onClick={() => { markRead.mutate(notif.id); setSwipedId(null); }}
                            className="px-3 bg-primary text-primary-foreground flex items-center text-xs gap-1"
                          >
                            <Check className="w-3.5 h-3.5" /> Leída
                          </button>
                          <button
                            onClick={() => { deleteNotif.mutate(notif.id); setSwipedId(null); }}
                            className="px-3 bg-destructive text-destructive-foreground flex items-center text-xs gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Notification item */}
                        <button
                          onClick={() => handleClick(notif)}
                          className={`w-full text-left px-4 py-3 border-b border-border last:border-0 transition-colors group flex gap-3 ${
                            !notif.leida ? 'bg-primary/5 hover:bg-primary/10' : isResolved ? 'opacity-60 hover:opacity-80' : 'hover:bg-muted/50'
                          }`}
                        >
                          {/* Unread dot */}
                          <div className="flex-shrink-0 w-2 pt-2">
                            {!notif.leida && (
                              <span className="block w-2 h-2 rounded-full bg-primary" />
                            )}
                          </div>

                          {/* Icon */}
                          <span className="text-lg leading-none mt-0.5 flex-shrink-0">
                            {cfg.icon}
                          </span>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm truncate ${!notif.leida ? 'font-semibold text-foreground' : 'text-foreground'}`}>
                              {notif.titulo}
                            </p>
                            {notif.mensaje && (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                {notif.mensaje}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] text-muted-foreground">
                                {formatTime(notif.created_at)}
                              </span>
                              {isResolved && (
                                <span className="text-[10px] text-primary font-medium flex items-center gap-0.5">
                                  <CheckCheck className="w-3 h-3" /> Resuelta
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Navigate arrow */}
                          {notif.related_url && (
                            <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1" />
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="border-t border-border px-4 py-2.5">
          <button
            onClick={() => { setOpen(false); navigate('/notificaciones'); }}
            className="w-full text-center text-xs text-primary hover:underline font-medium"
          >
            Ver todo el historial
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
