import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Sugerencia {
  id: string;
  autor_id: string;
  categoria: string;
  descripcion: string;
  prioridad: string;
  estado: string;
  respuesta_admin: string | null;
  created_at: string;
  autor_nombre?: string;
}

export const useSugerencias = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['sugerencias'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sugerencias')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      // Enrich with author names
      const authorIds = [...new Set((data || []).map(s => s.autor_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', authorIds);
      const nameMap = Object.fromEntries((profiles || []).map(p => [p.id, p.full_name]));
      return (data || []).map(s => ({ ...s, autor_nombre: nameMap[s.autor_id] || 'Usuario' })) as Sugerencia[];
    },
    enabled: !!user,
  });
};

export const useCreateSugerencia = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (data: { categoria: string; descripcion: string; prioridad: string }) => {
      const { error } = await supabase.from('sugerencias').insert({
        autor_id: user!.id,
        ...data,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sugerencias'] });
      toast.success('Sugerencia enviada correctamente');
    },
    onError: () => toast.error('Error al enviar sugerencia'),
  });
};

export const useUpdateSugerencia = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, estado, respuesta_admin }: { id: string; estado?: string; respuesta_admin?: string }) => {
      const update: Record<string, string> = {};
      if (estado) update.estado = estado;
      if (respuesta_admin !== undefined) update.respuesta_admin = respuesta_admin;
      const { error } = await supabase.from('sugerencias').update(update).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sugerencias'] });
      qc.invalidateQueries({ queryKey: ['sugerencias-pending-count'] });
      toast.success('Sugerencia actualizada');
    },
    onError: () => toast.error('Error al actualizar'),
  });
};

export const usePendingSugerenciasCount = () => {
  const { user, role } = useAuth();
  return useQuery({
    queryKey: ['sugerencias-pending-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('sugerencias')
        .select('*', { count: 'exact', head: true })
        .eq('estado', 'pendiente');
      if (error) return 0;
      return count || 0;
    },
    enabled: !!user && role === 'superadmin',
  });
};
