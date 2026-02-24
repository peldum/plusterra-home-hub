import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Receivable {
  id: string;
  client_id: string | null;
  agent_id: string | null;
  debtor_role: string;
  debtor_name: string | null;
  property_id: string | null;
  building_id: string | null;
  unit_code: string | null;
  concept: string;
  description: string | null;
  amount: number;
  currency: string;
  due_date: string;
  status: string;
  paid_date: string | null;
  paid_amount: number | null;
  payment_id: string | null;
  contract_id: string | null;
  source_type: string;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  // joined
  property_title?: string;
  building_name?: string;
  client_phone?: string;
}

export const useReceivables = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['receivables'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('receivables')
        .select(`
          *,
          properties:property_id(title, address),
          buildings:building_id(name),
          clients:client_id(phone, full_name)
        `)
        .order('due_date', { ascending: true })
        .limit(500);
      if (error) throw error;
      return (data || []).map((r: any) => ({
        ...r,
        property_title: r.properties?.title || r.properties?.address || null,
        building_name: r.buildings?.name || null,
        client_phone: r.clients?.phone || null,
        debtor_name: r.debtor_name || r.clients?.full_name || null,
      })) as Receivable[];
    },
    enabled: !!user,
  });
};

export const useGenerateReceivables = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (period?: string) => {
      const { data, error } = await supabase.rpc('generate_monthly_receivables', {
        target_period: period || null,
      });
      if (error) throw error;
      return data as number;
    },
    onSuccess: (count) => {
      qc.invalidateQueries({ queryKey: ['receivables'] });
      if (count > 0) toast.success(`${count} cobro(s) generado(s)`);
      else toast.info('No hay cobros nuevos para generar');
    },
    onError: (err: Error) => toast.error('Error: ' + err.message),
  });
};

export const useMarkReceivablePaid = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, paidAmount }: { id: string; paidAmount?: number }) => {
      const { data: rec } = await supabase
        .from('receivables')
        .select('amount')
        .eq('id', id)
        .single();

      const { error } = await supabase
        .from('receivables')
        .update({
          status: 'paid',
          paid_date: new Date().toISOString().split('T')[0],
          paid_amount: paidAmount || rec?.amount || 0,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['receivables'] });
      qc.invalidateQueries({ queryKey: ['receivable-counters'] });
      toast.success('Cobro marcado como pagado');
    },
    onError: (err: Error) => toast.error('Error: ' + err.message),
  });
};

export const useRevertReceivablePaid = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('receivables')
        .update({
          status: 'pending',
          paid_date: null,
          paid_amount: null,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['receivables'] });
      qc.invalidateQueries({ queryKey: ['receivable-counters'] });
      toast.success('Pago revertido a pendiente');
    },
    onError: (err: Error) => toast.error('Error: ' + err.message),
  });
};

export const useCreateReceivable = () => {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      client_id?: string;
      agent_id?: string;
      debtor_role: string;
      debtor_name: string;
      property_id?: string;
      building_id?: string;
      unit_code?: string;
      concept: string;
      description?: string;
      amount: number;
      currency?: string;
      due_date: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('receivables')
        .insert({
          ...input,
          currency: input.currency || 'PYG',
          source_type: 'manual',
          created_by: user!.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['receivables'] });
      toast.success('Cobro creado');
    },
    onError: (err: Error) => toast.error('Error: ' + err.message),
  });
};
