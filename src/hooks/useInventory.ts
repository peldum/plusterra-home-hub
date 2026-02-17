import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface InventoryItem {
  id: string;
  property_id: string;
  contract_id: string | null;
  item_name: string;
  category: string;
  condition_delivery: string | null;
  condition_return: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  properties?: { title: string; address: string | null } | null;
  contracts?: { tenant_name: string | null; start_date: string; end_date: string | null } | null;
}

export const useInventory = (propertyId?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['inventory', propertyId],
    queryFn: async () => {
      let query = supabase
        .from('inventory_items')
        .select('*, properties(title, address), contracts(tenant_name, start_date, end_date)')
        .order('created_at', { ascending: false });

      if (propertyId) {
        query = query.eq('property_id', propertyId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as InventoryItem[];
    },
    enabled: !!user,
  });
};

export const useCreateInventoryItem = () => {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      property_id: string;
      contract_id?: string | null;
      item_name: string;
      category: string;
      condition_delivery?: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('inventory_items')
        .insert({ ...input, created_by: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory'] });
      toast.success('Ítem de inventario agregado');
    },
    onError: (err: Error) => {
      toast.error('Error: ' + err.message);
    },
  });
};

export const useUpdateInventoryItem = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<{
      item_name: string;
      category: string;
      condition_delivery: string;
      condition_return: string;
      notes: string;
    }>) => {
      const { data, error } = await supabase
        .from('inventory_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory'] });
      toast.success('Ítem actualizado');
    },
    onError: (err: Error) => {
      toast.error('Error: ' + err.message);
    },
  });
};

export const useDeleteInventoryItem = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('inventory_items').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory'] });
      toast.success('Ítem eliminado');
    },
    onError: (err: Error) => {
      toast.error('Error: ' + err.message);
    },
  });
};