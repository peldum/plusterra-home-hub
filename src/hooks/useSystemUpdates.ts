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

export const useSystemUpdates = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['system_updates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_updates' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as SystemUpdate[];
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('system-updates-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'system_updates' }, () => {
        qc.invalidateQueries({ queryKey: ['system_updates'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, qc]);

  return query;
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
      toast.success('Novedad eliminada');
    },
  });
};

export const useUnreadSystemUpdates = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['system_update_unread', user?.id],
    queryFn: async () => {
      if (!user) return 0;
      // Get last read timestamp
      const { data: readData } = await supabase
        .from('system_update_reads' as any)
        .select('last_read_at')
        .eq('user_id', user.id)
        .single();

      const lastRead = readData?.last_read_at ? new Date(readData.last_read_at as string) : new Date(0);

      // Count updates after last read
      const { count, error } = await supabase
        .from('system_updates' as any)
        .select('*', { count: 'exact', head: true })
        .gt('created_at', lastRead.toISOString());
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!user,
    refetchInterval: 60_000,
  });
};

export const useMarkSystemUpdatesRead = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!user) return;
      // Upsert the read record
      const { data: existing } = await supabase
        .from('system_update_reads' as any)
        .select('id')
        .eq('user_id', user.id)
        .single();

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
