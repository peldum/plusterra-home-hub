import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Announcement {
  id: string;
  title: string;
  message: string;
  announcement_type: string;
  created_by: string;
  created_at: string;
}

/** All roles — read announcements for Novedades panel */
export const useAnnouncements = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['announcements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_announcements' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data || []) as unknown as Announcement[];
    },
    enabled: !!user,
    staleTime: 60_000,
  });
};

/** Unread announcement count */
export const useUnreadAnnouncements = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['announcement_unread', user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { data: readData } = await supabase
        .from('system_announcement_reads' as any)
        .select('last_read_at')
        .eq('user_id', user.id)
        .single();

      const rd = readData as any;
      const lastRead = rd?.last_read_at ? new Date(rd.last_read_at as string) : new Date(0);

      const { count, error } = await supabase
        .from('system_announcements' as any)
        .select('*', { count: 'exact', head: true })
        .gt('created_at', lastRead.toISOString());
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!user,
    refetchInterval: 60_000,
  });
};

/** Mark announcements as read */
export const useMarkAnnouncementsRead = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { data: existing } = await supabase
        .from('system_announcement_reads' as any)
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (existing) {
        await supabase
          .from('system_announcement_reads' as any)
          .update({ last_read_at: new Date().toISOString() } as any)
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('system_announcement_reads' as any)
          .insert({ user_id: user.id, last_read_at: new Date().toISOString() } as any);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['announcement_unread', user?.id] });
    },
  });
};

/** SuperAdmin — create announcement */
export const useCreateAnnouncement = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { title: string; message: string; announcement_type: string }) => {
      const { error } = await supabase.from('system_announcements' as any).insert({
        ...input,
        created_by: user!.id,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['announcements'] });
    },
  });
};

/** SuperAdmin — delete announcement */
export const useDeleteAnnouncement = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('system_announcements' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['announcements'] });
    },
  });
};
