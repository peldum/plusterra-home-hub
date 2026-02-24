import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface DiffusionData {
  portales: { active: boolean; url: string };
  web_propia: { active: boolean; url: string };
  facebook: { active: boolean; url: string };
  instagram: { active: boolean; url: string };
  whatsapp: boolean;
  carteleria: { active: boolean; observacion: string };
}

export interface AdjustmentsData {
  precio: boolean;
  condiciones: boolean;
  presentacion: boolean;
}

export interface PropertyReport {
  id: string;
  property_id: string;
  agent_id: string;
  period: string;
  diffusion: DiffusionData;
  adjustments: AdjustmentsData;
  agent_recommendation: string | null;
  final_comment: string | null;
  created_at: string;
  updated_at: string;
  // joined
  property_title?: string;
  property_code?: string;
  agent_name?: string;
}

export interface ReportComment {
  id: string;
  report_id: string;
  comment_text: string;
  comment_date: string;
  agent_id: string;
  agent_name: string | null;
  created_at: string;
}

export const DEFAULT_DIFFUSION: DiffusionData = {
  portales: { active: false, url: '' },
  web_propia: { active: false, url: '' },
  facebook: { active: false, url: '' },
  instagram: { active: false, url: '' },
  whatsapp: false,
  carteleria: { active: false, observacion: '' },
};

export const DEFAULT_ADJUSTMENTS: AdjustmentsData = {
  precio: false,
  condiciones: false,
  presentacion: false,
};

export const usePropertyReports = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['property-reports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('property_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      const reports = (data ?? []) as any[];

      // Enrich with property + agent info
      const propertyIds = [...new Set(reports.map(r => r.property_id))];
      const agentIds = [...new Set(reports.map(r => r.agent_id))];

      const [propsRes, agentsRes] = await Promise.all([
        propertyIds.length > 0
          ? supabase.from('properties').select('id, title, property_code').in('id', propertyIds)
          : { data: [] },
        agentIds.length > 0
          ? supabase.from('profiles').select('id, full_name').in('id', agentIds)
          : { data: [] },
      ]);

      const propMap = new Map((propsRes.data ?? []).map(p => [p.id, p]));
      const agentMap = new Map((agentsRes.data ?? []).map(a => [a.id, a.full_name]));

      return reports.map(r => ({
        ...r,
        diffusion: r.diffusion ?? DEFAULT_DIFFUSION,
        adjustments: r.adjustments ?? DEFAULT_ADJUSTMENTS,
        property_title: propMap.get(r.property_id)?.title,
        property_code: propMap.get(r.property_id)?.property_code,
        agent_name: agentMap.get(r.agent_id),
      })) as PropertyReport[];
    },
    enabled: !!user,
  });
};

export const useCreatePropertyReport = () => {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (report: Partial<PropertyReport>) => {
      const { data, error } = await supabase
        .from('property_reports')
        .insert({
          property_id: report.property_id!,
          agent_id: report.agent_id ?? user!.id,
          period: report.period!,
          diffusion: report.diffusion ?? DEFAULT_DIFFUSION,
          adjustments: report.adjustments ?? DEFAULT_ADJUSTMENTS,
          agent_recommendation: report.agent_recommendation ?? null,
          final_comment: report.final_comment ?? null,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['property-reports'] });
      toast.success('Reporte creado correctamente');
    },
    onError: (err: any) => toast.error(err.message),
  });
};

export const useUpdatePropertyReport = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PropertyReport> & { id: string }) => {
      const { error } = await supabase
        .from('property_reports')
        .update(updates as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['property-reports'] });
      toast.success('Reporte actualizado');
    },
    onError: (err: any) => toast.error(err.message),
  });
};

// Comments
export const useReportComments = (reportId: string | null) => {
  return useQuery({
    queryKey: ['report-comments', reportId],
    queryFn: async () => {
      if (!reportId) return [];
      const { data, error } = await supabase
        .from('property_report_comments')
        .select('*')
        .eq('report_id', reportId)
        .order('comment_date', { ascending: false });
      if (error) throw error;
      return (data ?? []) as ReportComment[];
    },
    enabled: !!reportId,
  });
};

export const useAddReportComment = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (comment: { report_id: string; comment_text: string; agent_id: string; agent_name: string }) => {
      const { error } = await supabase
        .from('property_report_comments')
        .insert(comment as any);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['report-comments', vars.report_id] });
      toast.success('Comentario agregado');
    },
    onError: (err: any) => toast.error(err.message),
  });
};

export const useDeleteReportComment = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reportId }: { id: string; reportId: string }) => {
      const { error } = await supabase
        .from('property_report_comments')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return reportId;
    },
    onSuccess: (reportId) => {
      qc.invalidateQueries({ queryKey: ['report-comments', reportId] });
      toast.success('Comentario eliminado');
    },
    onError: (err: any) => toast.error(err.message),
  });
};
