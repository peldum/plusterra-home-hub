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

// Unified stages for the new "Seguimiento de Clientes" design
export const UNIFIED_STAGES = [
  { key: 'nuevo_lead', label: 'Nuevo cliente' },
  { key: 'contactado', label: 'Contactado / Recontactado' },
  { key: 'visita_agendada', label: 'Visita agendada' },
  { key: 'en_negociacion', label: 'En negociación' },
  { key: 'cerrado', label: 'Cerrado' },
  { key: 'caido', label: 'Caído' },
];

// Legacy stage mappings (map old stages to new unified ones)
const LEGACY_STAGE_MAP: Record<string, string> = {
  'reservado': 'en_negociacion',
  'contrato_preparacion': 'en_negociacion',
  'oferta_negociacion': 'en_negociacion',
  'sena_reserva': 'en_negociacion',
  'documentacion_credito': 'en_negociacion',
};

export const mapToUnifiedStage = (stage: string): string => {
  return LEGACY_STAGE_MAP[stage] || stage;
};

// Keep old exports for backward compatibility
export const STAGES_ALQUILER = UNIFIED_STAGES;
export const STAGES_VENTA = UNIFIED_STAGES;

export const getStages = (_type?: PipelineType) => UNIFIED_STAGES;

export const getStageLabel = (_type: PipelineType | undefined, key: string) =>
  UNIFIED_STAGES.find((s) => s.key === key)?.label ?? key;

/** Check if a deal has no follow-up for 3+ days */
export const isStale = (deal: PipelineDeal, days = 3): boolean => {
  if (deal.stage === 'cerrado' || deal.stage === 'caido') return false;
  const now = new Date();
  const updated = new Date(deal.updated_at);
  const diffDays = (now.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays >= days;
};

export const usePipelineDeals = (pipelineType?: PipelineType) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['pipeline-deals', pipelineType ?? 'ALL'],
    queryFn: async () => {
      let query = supabase
        .from('pipeline_deals')
        .select('*')
        .order('updated_at', { ascending: false });

      if (pipelineType) {
        query = query.eq('pipeline_type', pipelineType);
      }

      const { data, error } = await query;
      if (error) throw error;
      const deals = (data ?? []) as PipelineDeal[];

      // Map legacy stages to unified
      deals.forEach(d => {
        d.stage = mapToUnifiedStage(d.stage);
      });

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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pipeline-deals'] });
      toast.success('Cliente registrado correctamente');
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pipeline-deals'] });
      toast.success('Cliente actualizado');
    },
    onError: (err: any) => toast.error(err.message),
  });
};

export const useDeletePipelineDeal = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, pipelineType }: { id: string; pipelineType: PipelineType }) => {
      const { error } = await supabase
        .from('pipeline_deals')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return { pipelineType };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pipeline-deals'] });
      toast.success('Registro eliminado correctamente');
    },
    onError: (err: any) => toast.error('Error al eliminar: ' + err.message),
  });
};

export const useStageCounts = (_pipelineType: PipelineType | undefined, deals: PipelineDeal[] | undefined) => {
  const stages = UNIFIED_STAGES;
  return stages.map((s) => ({
    ...s,
    count: deals?.filter((d) => d.stage === s.key).length ?? 0,
  }));
};
