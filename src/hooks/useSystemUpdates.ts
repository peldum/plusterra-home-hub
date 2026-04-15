import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useEffect } from 'react';

export interface SystemUpdate {
  id: string;
  title: string;
  description: string;
  update_type: string;
  version: string | null;
  created_by: string;
  created_at: string;
}

/** SuperAdmin only — used in Historial de Actualizaciones page */
export const useSystemUpdates = () => {
  const { user, role } = useAuth();
  const qc = useQueryClient();
  const isSuperAdmin = role === 'superadmin';

  const query = useQuery({
    queryKey: ['system_updates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_updates' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as unknown as SystemUpdate[];
    },
    enabled: !!user && isSuperAdmin,
  });

  useEffect(() => {
    if (!user || !isSuperAdmin) return;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const channel = supabase
      .channel('system-updates-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'system_updates' }, () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          qc.invalidateQueries({ queryKey: ['system_updates'] });
          qc.invalidateQueries({ queryKey: ['system_updates_all'] });
        }, 500);
      })
      .subscribe();
    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [user, isSuperAdmin, qc]);

  return query;
};

/** All roles — used in Novedades panel (read-only, last 30) */
export const useAllSystemUpdates = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['system_updates_all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_updates' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data || []) as unknown as SystemUpdate[];
    },
    enabled: !!user,
    staleTime: 60_000,
  });
};

export const useCreateSystemUpdate = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (update: { title: string; description: string; update_type: string; version?: string }) => {
      const { error } = await supabase.from('system_updates' as any).insert({
        ...update,
        created_by: user!.id,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['system_updates'] });
      qc.invalidateQueries({ queryKey: ['system_updates_all'] });
      toast.success('Novedad publicada');
    },
    onError: () => toast.error('Error al publicar novedad'),
  });
};

export const useDeleteSystemUpdate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('system_updates' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['system_updates'] });
      qc.invalidateQueries({ queryKey: ['system_updates_all'] });
      toast.success('Entrada eliminada del historial');
    },
  });
};

/** Unread count — available for ALL roles */
export const useUnreadSystemUpdates = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['system_update_unread', user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { data: readData } = await supabase
        .from('system_update_reads' as any)
        .select('last_read_at')
        .eq('user_id', user.id)
        .maybeSingle();

      const rd = readData as any;
      const lastRead = rd?.last_read_at ? new Date(rd.last_read_at as string) : new Date(0);

      const { count, error } = await supabase
        .from('system_updates' as any)
        .select('*', { count: 'exact', head: true })
        .gt('created_at', lastRead.toISOString());
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!user,
    staleTime: 60_000,
  });
};

export const useMarkSystemUpdatesRead = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { data: existing } = await supabase
        .from('system_update_reads' as any)
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('system_update_reads' as any)
          .update({ last_read_at: new Date().toISOString() } as any)
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('system_update_reads' as any)
          .insert({ user_id: user.id, last_read_at: new Date().toISOString() } as any);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['system_update_unread', user?.id] });
    },
  });
};
