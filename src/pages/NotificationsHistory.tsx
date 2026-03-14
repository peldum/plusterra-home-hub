import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Bell, Search, CheckCheck, Check, Trash2, ExternalLink, Filter, Download,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  useNotificationHistory,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDeleteNotification,
  useClearAllNotifications,
  groupNotificationsByDate,
  type Notification,
} from '@/hooks/useNotifications';
import { useNavigate } from 'react-router-dom';

const typeConfig: Record<string, { icon: string; label: string }> = {
  canon_due_soon: { icon: '💰', label: 'Pago' },
  payment_due: { icon: '💰', label: 'Pago' },
  contract_expiration_30: { icon: '📋', label: 'Contrato' },
  contract_expiration_15: { icon: '📋', label: 'Contrato' },
  contract_expiration_7: { icon: '📋', label: 'Contrato' },
  lead: { icon: '🧲', label: 'Lead' },
  reservation: { icon: '🏠', label: 'Reserva' },
  aviso: { icon: '📢', label: 'Aviso' },
  maintenance: { icon: '🔧', label: 'Mantenim.' },
  key_movement: { icon: '🔑', label: 'Llave' },
  general: { icon: '🔔', label: 'General' },
};

const NotificationsHistory = () => {
  const { role } = useAuth();
  const navigate = useNavigate();
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const observerRef = useRef<HTMLDivElement>(null);

  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const deleteNotif = useDeleteNotification();
  const clearAll = useClearAllNotifications();

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useNotificationHistory({
    category,
    status,
    search: debouncedSearch,
  });

  const allNotifs = data?.pages.flatMap(p => p.data) ?? [];

  // Infinite scroll
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage]
  );

  useEffect(() => {
    const el = observerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(handleObserver, { threshold: 0.1 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [handleObserver]);

  const groups = groupNotificationsByDate(allNotifs);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Bell className="w-7 h-7 text-primary" /> Historial de Notificaciones
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Todas tus notificaciones y alertas del sistema
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => markAllRead.mutate()}>
            <CheckCheck className="w-4 h-4 mr-1" /> Marcar todas leídas
          </Button>
          {role === 'superadmin' && (
            <Button variant="destructive" size="sm" onClick={() => clearAll.mutate()}>
              <Trash2 className="w-4 h-4 mr-1" /> Limpiar todo
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar notificaciones..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-[160px]">
                <Filter className="w-4 h-4 mr-1 text-muted-foreground" />
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                <SelectItem value="payment">💰 Pagos</SelectItem>
                <SelectItem value="contract">📋 Contratos</SelectItem>
                <SelectItem value="lead">🧲 Leads</SelectItem>
                <SelectItem value="aviso">📢 Avisos</SelectItem>
                <SelectItem value="general">🔔 Sistema</SelectItem>
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="unread">No leídas</SelectItem>
                <SelectItem value="resolved">Resueltas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Notifications list */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Cargando...</div>
          ) : allNotifs.length === 0 ? (
            <div className="p-12 text-center">
              <Bell className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No se encontraron notificaciones</p>
            </div>
          ) : (
            groups.map((group) => (
              <div key={group.label}>
                <div className="px-4 py-2 bg-muted/50 border-b border-border sticky top-0 z-10">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {group.label}
                  </span>
                </div>
                {group.items.map((notif) => {
                  const cfg = typeConfig[notif.tipo] || typeConfig.general;
                  const isResolved = !!notif.resolved_at;

                  return (
                    <div
                      key={notif.id}
                      className={`flex items-start gap-3 px-4 py-3 border-b border-border last:border-0 transition-colors cursor-pointer group ${
                        !notif.leida
                          ? 'bg-primary/5 hover:bg-primary/10'
                          : isResolved
                          ? 'opacity-50 hover:opacity-70'
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => {
                        if (!notif.leida) markRead.mutate(notif.id);
                        if (notif.related_url) navigate(notif.related_url);
                      }}
                    >
                      {/* Unread dot */}
                      <div className="w-2 pt-2 flex-shrink-0">
                        {!notif.leida && <span className="block w-2 h-2 rounded-full bg-primary" />}
                      </div>

                      <span className="text-xl flex-shrink-0">{cfg.icon}</span>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`text-sm truncate ${!notif.leida ? 'font-semibold' : ''} text-foreground`}>
                            {notif.titulo}
                          </p>
                          <Badge variant="outline" className="text-[10px] flex-shrink-0">
                            {cfg.label}
                          </Badge>
                          {isResolved && (
                            <Badge className="text-[10px] bg-green-100 text-green-700 border-0">
                              <CheckCheck className="w-3 h-3 mr-0.5" /> Resuelta
                            </Badge>
                          )}
                        </div>
                        {notif.mensaje && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.mensaje}</p>
                        )}
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[10px] text-muted-foreground">
                            {format(new Date(notif.created_at), "d MMM yyyy · HH:mm", { locale: es })}
                          </span>
                          {notif.visto_at && (
                            <span className="text-[10px] text-muted-foreground">
                              Visto: {format(new Date(notif.visto_at), "d MMM · HH:mm", { locale: es })}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        {!notif.leida && (
                          <button
                            onClick={(e) => { e.stopPropagation(); markRead.mutate(notif.id); }}
                            className="p-1.5 rounded hover:bg-muted"
                            title="Marcar como leída"
                          >
                            <Check className="w-3.5 h-3.5 text-muted-foreground" />
                          </button>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteNotif.mutate(notif.id); }}
                          className="p-1.5 rounded hover:bg-destructive/10"
                          title="Archivar"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                        {notif.related_url && (
                          <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}

          {/* Infinite scroll sentinel */}
          <div ref={observerRef} className="h-4" />
          {isFetchingNextPage && (
            <div className="p-4 text-center text-sm text-muted-foreground">Cargando más...</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationsHistory;
