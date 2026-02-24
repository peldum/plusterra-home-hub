import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface PipelineDeal {
  id: string;
  pipeline_type: 'ALQUILER' | 'VENTA';
  stage: string;
  agent_id: string;
  client_id: string | null;
  client_name: string | null;
  client_phone: string | null;
  property_id: string | null;
  property_title_snap: string | null;
  next_action_date: string | null;
  reservation_deadline: string | null;
  contract_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
  opportunity_type: string;
  service_reason: string | null;
  next_step: string | null;
  follow_up_date: string | null;
  estimated_commission: number | null;
  // joined
  agent_name?: string;
  property_code?: string;
}

export type PipelineType = 'ALQUILER' | 'VENTA';

export const STAGES_ALQUILER = [
  { key: 'nuevo_lead', label: 'Nuevo lead' },
  { key: 'contactado', label: 'Contactado' },
  { key: 'visita_agendada', label: 'Visita agendada' },
  { key: 'en_negociacion', label: 'En negociación' },
  { key: 'reservado', label: 'Reservado' },
  { key: 'contrato_preparacion', label: 'Contrato en preparación' },
  { key: 'cerrado', label: 'Cerrado / Contrato firmado' },
  { key: 'caido', label: 'Caído' },
];

export const STAGES_VENTA = [
  { key: 'nuevo_lead', label: 'Nuevo lead' },
  { key: 'contactado', label: 'Contactado' },
  { key: 'visita_agendada', label: 'Visita agendada' },
  { key: 'oferta_negociacion', label: 'Oferta / Negociación' },
  { key: 'sena_reserva', label: 'Seña / Reserva' },
  { key: 'documentacion_credito', label: 'Documentación / Crédito' },
  { key: 'cerrado', label: 'Cerrado / Escritura' },
  { key: 'caido', label: 'Caído' },
];

export const getStages = (type: PipelineType) =>
  type === 'ALQUILER' ? STAGES_ALQUILER : STAGES_VENTA;

export const getStageLabel = (type: PipelineType, key: string) =>
  getStages(type).find((s) => s.key === key)?.label ?? key;

export const usePipelineDeals = (pipelineType: PipelineType) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['pipeline-deals', pipelineType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pipeline_deals')
        .select('*')
        .eq('pipeline_type', pipelineType)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      const deals = (data ?? []) as PipelineDeal[];

      // Fetch agent names in bulk
      const agentIds = [...new Set(deals.map(d => d.agent_id))];
      if (agentIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', agentIds);
        const nameMap = new Map((profiles ?? []).map(p => [p.id, p.full_name]));
        deals.forEach(d => { d.agent_name = nameMap.get(d.agent_id) ?? undefined; });
      }

      return deals;
    },
    enabled: !!user,
  });
};

export const useCreatePipelineDeal = () => {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (deal: Partial<PipelineDeal>) => {
      const { data, error } = await supabase
        .from('pipeline_deals')
        .insert({
          pipeline_type: deal.pipeline_type ?? 'ALQUILER',
          stage: deal.stage ?? 'nuevo_lead',
          agent_id: deal.agent_id ?? user!.id,
          client_id: deal.client_id ?? null,
          client_name: deal.client_name ?? null,
          client_phone: deal.client_phone ?? null,
          property_id: deal.property_id ?? null,
          property_title_snap: deal.property_title_snap ?? null,
          next_action_date: deal.next_action_date ?? null,
          notes: deal.notes ?? null,
          created_by: user!.id,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['pipeline-deals', vars.pipeline_type] });
      toast.success('Deal creado correctamente');
    },
    onError: (err: any) => toast.error(err.message),
  });
};

export const useUpdatePipelineDeal = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PipelineDeal> & { id: string }) => {
      const { data, error } = await supabase
        .from('pipeline_deals')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ['pipeline-deals', data.pipeline_type] });
      toast.success('Deal actualizado');
    },
    onError: (err: any) => toast.error(err.message),
  });
};

export const useStageCounts = (pipelineType: PipelineType, deals: PipelineDeal[] | undefined) => {
  const stages = getStages(pipelineType);
  return stages.map((s) => ({
    ...s,
    count: deals?.filter((d) => d.stage === s.key).length ?? 0,
  }));
};
