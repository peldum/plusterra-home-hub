import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type AdminCashMovement = {
  id: string;
  movement_type: 'ingreso' | 'egreso';
  amount: number;
  description: string;
  category: string;
  building_id: string | null;
  property_id: string | null;
  movement_date: string;
  period: string;
  payment_method: string;
  source: string;
  source_ref: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  buildings?: { name: string } | null;
};

export type AdminCashMovementInput = {
  movement_type: 'ingreso' | 'egreso';
  amount: number;
  description: string;
  category: string;
  building_id?: string | null;
  property_id?: string | null;
  movement_date: string;
  payment_method: string;
  notes?: string | null;
  source?: string;
  source_ref?: string | null;
};

export const ADMIN_CASH_CATEGORIES = [
  { value: 'movilidad', label: 'Movilidad (Uber/Bolt/Taxi)' },
  { value: 'viaticos', label: 'Viáticos' },
  { value: 'materiales', label: 'Materiales / Insumos' },
  { value: 'mantenimiento', label: 'Mantenimiento de edificio' },
  { value: 'servicios', label: 'Servicios' },
  { value: 'ingreso_vario', label: 'Ingreso vario' },
  { value: 'reembolso', label: 'Reembolso' },
  { value: 'otro', label: 'Otro' },
];

export const useAdminCashMovements = (period: string) => {
  return useQuery({
    queryKey: ['admin-cash-movements', period],
    queryFn: async (): Promise<AdminCashMovement[]> => {
      const { data, error } = await (supabase as any)
        .from('admin_cash_movements')
        .select('*, buildings:building_id(name)')
        .eq('period', period)
        .order('movement_date', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as AdminCashMovement[];
    },
    staleTime: 30_000,
  });
};

export const useCreateAdminCashMovement = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: AdminCashMovementInput) => {
      const { data, error } = await (supabase as any)
        .from('admin_cash_movements')
        .insert({ ...input, created_by: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-cash-movements'] });
      qc.invalidateQueries({ queryKey: ['admin-summary-cash-movements'] });
      toast.success('Movimiento registrado en caja Administración');
    },
    onError: (e: Error) => toast.error('Error: ' + e.message),
  });
};

export const useUpdateAdminCashMovement = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Partial<AdminCashMovementInput>) => {
      const { error } = await (supabase as any)
        .from('admin_cash_movements')
        .update(patch)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-cash-movements'] });
      qc.invalidateQueries({ queryKey: ['admin-summary-cash-movements'] });
      toast.success('Movimiento actualizado');
    },
    onError: (e: Error) => toast.error('Error: ' + e.message),
  });
};

export const useDeleteAdminCashMovement = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('admin_cash_movements')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-cash-movements'] });
      qc.invalidateQueries({ queryKey: ['admin-summary-cash-movements'] });
      toast.success('Movimiento eliminado');
    },
    onError: (e: Error) => toast.error('Error: ' + e.message),
  });
};