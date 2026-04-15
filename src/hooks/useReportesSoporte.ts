import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ReporteSoporte {
  id: string;
  autor_id: string;
  seccion: string;
  descripcion: string;
  urgencia: string;
  estado: string;
  respuesta_admin: string | null;
  created_at: string;
  autor_nombre?: string;
}

export const useReportesSoporte = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['reportes-soporte'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reportes_soporte')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      const authorIds = [...new Set((data || []).map(r => r.autor_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', authorIds);
      const nameMap = Object.fromEntries((profiles || []).map(p => [p.id, p.full_name]));
      return (data || []).map(r => ({ ...r, autor_nombre: nameMap[r.autor_id] || 'Usuario' })) as ReporteSoporte[];
    },
    enabled: !!user,
  });
};

export const useCreateReporte = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (data: { seccion: string; descripcion: string; urgencia: string }) => {
      const { error } = await supabase.from('reportes_soporte').insert({
        autor_id: user!.id,
        ...data,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reportes-soporte'] });
      toast.success('Reporte enviado correctamente');
    },
    onError: () => toast.error('Error al enviar reporte'),
  });
};

export const useUpdateReporte = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, estado, respuesta_admin }: { id: string; estado?: string; respuesta_admin?: string }) => {
      const update: Record<string, string> = {};
      if (estado) update.estado = estado;
      if (respuesta_admin !== undefined) update.respuesta_admin = respuesta_admin;
      const { error } = await supabase.from('reportes_soporte').update(update).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reportes-soporte'] });
      qc.invalidateQueries({ queryKey: ['reportes-open-count'] });
      toast.success('Reporte actualizado');
    },
    onError: () => toast.error('Error al actualizar'),
  });
};

export const useOpenReportesCount = () => {
  const { user, role } = useAuth();
  return useQuery({
    queryKey: ['reportes-open-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('reportes_soporte')
        .select('*', { count: 'exact', head: true })
        .eq('estado', 'abierto');
      if (error) return 0;
      return count || 0;
    },
    enabled: !!user && role === 'superadmin',
  });
};
