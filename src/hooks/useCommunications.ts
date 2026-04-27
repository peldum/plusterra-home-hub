import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useEffect, useRef } from 'react';

/* ── Types ── */
export interface Aviso {
  id: string;
  titulo: string;
  contenido: string;
  autor_id: string;
  fijado: boolean;
  prioridad: string;
  created_at: string;
  expires_at: string | null;
  autor_nombre?: string;
}

export interface EventoInterno {
  id: string;
  titulo: string;
  descripcion: string | null;
  fecha_inicio: string;
  fecha_fin: string | null;
  autor_id: string;
  destinatarios: string[];
  recordatorio_24h: boolean;
  recordatorio_1h: boolean;
  created_at: string;
  autor_nombre?: string;
  aviso_id?: string | null;
  lugar?: string | null;
}

export interface NotificacionInterna {
  id: string;
  user_id: string;
  tipo: string;
  referencia_id: string | null;
  leida: boolean;
  titulo: string | null;
  mensaje: string | null;
  created_at: string;
}

/* ── Avisos ── */
export const useAvisos = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['avisos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('avisos' as any)
        .select('*')
        .order('fijado', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      // enrich with author names and roles
      const ids = [...new Set((data as any[]).map((a: any) => a.autor_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', ids);
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', ids);
      const nameMap: Record<string, string> = {};
      const roleMap: Record<string, string> = {};
      profiles?.forEach((p: any) => { nameMap[p.id] = p.full_name; });
      roles?.forEach((r: any) => { roleMap[r.user_id] = r.role; });
      return (data as any[]).map((a: any) => ({ ...a, autor_nombre: nameMap[a.autor_id] || 'Sistema', autor_rol: roleMap[a.autor_id] || '' })) as Aviso[];
    },
    enabled: !!user,
  });

  // Realtime subscription
  const qcRefAvisos = useRef(qc);
  qcRefAvisos.current = qc;
  useEffect(() => {
    if (!user) return;
    const channelName = `avisos-realtime-${user.id}-${Math.random().toString(36).slice(2, 8)}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'avisos' }, () => {
        qcRefAvisos.current.invalidateQueries({ queryKey: ['avisos'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  return query;
};

export const useCreateAviso = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (aviso: { titulo: string; contenido: string; fijado?: boolean; prioridad?: string; expires_at?: string | null }) => {
      const { error } = await supabase.from('avisos' as any).insert({
        ...aviso,
        autor_id: user!.id,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['avisos'] });
      toast.success('Aviso publicado');
    },
    onError: () => toast.error('Error al publicar aviso'),
  });
};

export const useUpdateAviso = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; titulo?: string; contenido?: string; fijado?: boolean; prioridad?: string; expires_at?: string | null }) => {
      const { error } = await supabase.from('avisos' as any).update(data as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['avisos'] });
      toast.success('Aviso actualizado');
    },
    onError: () => toast.error('Error al actualizar aviso'),
  });
};

export const useDeleteAviso = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('avisos' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['avisos'] });
      toast.success('Aviso eliminado');
    },
  });
};

/* ── Eventos ── */
export const useEventos = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['eventos_internos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('eventos_internos' as any)
        .select('*')
        .order('fecha_inicio', { ascending: true });
      if (error) throw error;
      const ids = [...new Set((data as any[]).map((e: any) => e.autor_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', ids);
      const nameMap: Record<string, string> = {};
      profiles?.forEach((p: any) => { nameMap[p.id] = p.full_name; });
      return (data as any[]).map((e: any) => ({ ...e, autor_nombre: nameMap[e.autor_id] || 'Sistema' })) as EventoInterno[];
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (!user) return;
    const channelName = `eventos-realtime-${user.id}-${Math.random().toString(36).slice(2, 8)}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'eventos_internos' }, () => {
        qcRefEventos.current.invalidateQueries({ queryKey: ['eventos_internos'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  return query;
};

export const useCreateEvento = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (evento: {
      titulo: string;
      descripcion?: string;
      fecha_inicio: string;
      fecha_fin?: string;
      destinatarios?: string[];
      recordatorio_24h?: boolean;
      recordatorio_1h?: boolean;
    }) => {
      const { error } = await supabase.from('eventos_internos' as any).insert({
        ...evento,
        autor_id: user!.id,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['eventos_internos'] });
      toast.success('Evento creado');
    },
    onError: () => toast.error('Error al crear evento'),
  });
};

/* ── Notificaciones internas (unread count) ── */
export const useUnreadNotifications = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['notificaciones_internas_unread', user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count, error } = await supabase
        .from('notificaciones_internas' as any)
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('leida', false);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!user,
    refetchInterval: 120_000,
  });

  useEffect(() => {
    if (!user) return;
    const channelName = `notif-realtime-${user.id}-${Math.random().toString(36).slice(2, 8)}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notificaciones_internas', filter: `user_id=eq.${user.id}` }, () => {
        qcRefNotif.current.invalidateQueries({ queryKey: ['notificaciones_internas_unread', user.id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  return query;
};

export const useMarkAllNotificationsRead = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!user) return;
      await supabase
        .from('notificaciones_internas' as any)
        .update({ leida: true } as any)
        .eq('user_id', user.id)
        .eq('leida', false);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notificaciones_internas_unread', user?.id] });
    },
  });
};
