import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useRef } from 'react';

export interface Notification {
  id: string;
  user_id: string;
  tipo: string;
  referencia_id: string | null;
  leida: boolean;
  titulo: string | null;
  mensaje: string | null;
  created_at: string;
  enviado_at: string | null;
  visto_at: string | null;
  archived: boolean;
  resolved_at: string | null;
  related_url: string | null;
  notification_category: string;
}

const PAGE_SIZE = 20;

/* ── Active notifications for bell panel ── */
export const useActiveNotifications = (filter: 'all' | 'unread' = 'all') => {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['notifications_active', user?.id, filter],
    queryFn: async () => {
      if (!user) return [];
      let q = supabase
        .from('notificaciones_internas' as any)
        .select('*')
        .eq('user_id', user.id)
        .eq('archived', false)
        .order('created_at', { ascending: false })
        .limit(50);

      if (filter === 'unread') {
        q = q.eq('leida', false);
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data as any[]) as Notification[];
    },
    enabled: !!user,
    staleTime: 30_000,
    refetchInterval: 180_000,
  });

  // Realtime
  const qcRef = useRef(qc);
  qcRef.current = qc;
  useEffect(() => {
    if (!user) return;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const channelName = `notif-bell-realtime-${user.id}-${Math.random().toString(36).slice(2, 8)}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notificaciones_internas',
        filter: `user_id=eq.${user.id}`,
      }, () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          qcRef.current.invalidateQueries({ queryKey: ['notifications_active', user.id] });
          qcRef.current.invalidateQueries({ queryKey: ['notifications_unread_count', user.id] });
        }, 500);
      })
      .subscribe();
    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  return query;
};

/* ── Unread count for badge ── */
export const useUnreadNotificationCount = () => {
  const { user } = useAuth();

  // Realtime is already handled by useActiveNotifications — no duplicate channel here

  return useQuery({
    queryKey: ['notifications_unread_count', user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count, error } = await supabase
        .from('notificaciones_internas' as any)
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('leida', false)
        .eq('archived', false)
        .is('resolved_at', null);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!user,
    staleTime: 30_000,
    refetchInterval: 180_000,
  });
};

/* ── Infinite scroll for history page ── */
export const useNotificationHistory = (filters: {
  category?: string;
  status?: string;
  search?: string;
}) => {
  const { user } = useAuth();

  return useInfiniteQuery({
    queryKey: ['notifications_history', user?.id, filters],
    queryFn: async ({ pageParam = 0 }) => {
      if (!user) return { data: [], nextPage: null };

      let q = supabase
        .from('notificaciones_internas' as any)
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(pageParam, pageParam + PAGE_SIZE - 1);

      if (filters.category && filters.category !== 'all') {
        q = q.eq('notification_category', filters.category);
      }
      if (filters.status === 'unread') {
        q = q.eq('leida', false);
      } else if (filters.status === 'resolved') {
        q = q.not('resolved_at', 'is', null);
      }
      if (filters.search) {
        q = q.or(`titulo.ilike.%${filters.search}%,mensaje.ilike.%${filters.search}%`);
      }

      const { data, error } = await q;
      if (error) throw error;
      const items = (data as any[]) as Notification[];
      return {
        data: items,
        nextPage: items.length === PAGE_SIZE ? pageParam + PAGE_SIZE : null,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0,
    enabled: !!user,
  });
};

/* ── Mutations ── */
export const useMarkNotificationRead = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (id: string) => {
      await supabase
        .from('notificaciones_internas' as any)
        .update({ leida: true, visto_at: new Date().toISOString() } as any)
        .eq('id', id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications_active', user?.id] });
      qc.invalidateQueries({ queryKey: ['notifications_unread_count', user?.id] });
    },
  });
};

export const useMarkAllNotificationsRead = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async () => {
      if (!user) return;
      await supabase
        .from('notificaciones_internas' as any)
        .update({ leida: true, visto_at: new Date().toISOString() } as any)
        .eq('user_id', user.id)
        .eq('leida', false);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications_active', user?.id] });
      qc.invalidateQueries({ queryKey: ['notifications_unread_count', user?.id] });
    },
  });
};

export const useDeleteNotification = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (id: string) => {
      await supabase
        .from('notificaciones_internas' as any)
        .update({ archived: true } as any)
        .eq('id', id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications_active', user?.id] });
      qc.invalidateQueries({ queryKey: ['notifications_unread_count', user?.id] });
    },
  });
};

export const useClearAllNotifications = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      // SuperAdmin only - archive all
      await supabase
        .from('notificaciones_internas' as any)
        .update({ archived: true } as any)
        .eq('archived', false);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications_active'] });
      qc.invalidateQueries({ queryKey: ['notifications_unread_count'] });
      qc.invalidateQueries({ queryKey: ['notifications_history'] });
    },
  });
};

/* ── Aviso read tracking ── */
export const useMarkAvisoRead = () => {
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (avisoId: string) => {
      if (!user) return;
      await supabase
        .from('aviso_lecturas' as any)
        .upsert({ aviso_id: avisoId, user_id: user.id } as any, { onConflict: 'aviso_id,user_id' });
    },
  });
};

export const useAvisoLecturas = (avisoId: string | null) => {
  return useQuery({
    queryKey: ['aviso_lecturas', avisoId],
    queryFn: async () => {
      if (!avisoId) return [];
      const { data, error } = await supabase
        .from('aviso_lecturas' as any)
        .select('*')
        .eq('aviso_id', avisoId);
      if (error) throw error;

      // Get profile names
      const userIds = (data as any[]).map((d: any) => d.user_id);
      if (userIds.length === 0) return [];
      
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);

      const nameMap: Record<string, string> = {};
      profiles?.forEach((p: any) => { nameMap[p.id] = p.full_name; });

      return (data as any[]).map((d: any) => ({
        ...d,
        user_name: nameMap[d.user_id] || 'Usuario',
      }));
    },
    enabled: !!avisoId,
  });
};

/* ── Date grouping helper ── */
export const groupNotificationsByDate = (notifications: Notification[]) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const weekAgo = new Date(today.getTime() - 7 * 86400000);

  const groups: { label: string; items: Notification[] }[] = [
    { label: 'Hoy', items: [] },
    { label: 'Ayer', items: [] },
    { label: 'Esta semana', items: [] },
    { label: 'Anteriores', items: [] },
  ];

  notifications.forEach(n => {
    const d = new Date(n.created_at);
    if (d >= today) groups[0].items.push(n);
    else if (d >= yesterday) groups[1].items.push(n);
    else if (d >= weekAgo) groups[2].items.push(n);
    else groups[3].items.push(n);
  });

  return groups.filter(g => g.items.length > 0);
};
