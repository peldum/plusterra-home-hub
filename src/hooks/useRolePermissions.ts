/**
 * useRolePermissions — Hook para leer y actualizar la matriz de permisos por rol.
 * Solo SuperAdmin puede actualizar.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface RolePermission {
  id: string;
  role: string;
  module: string;
  module_label: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  updated_at: string;
  updated_by: string | null;
}

export const useRolePermissions = () => {
  return useQuery({
    queryKey: ['role-permissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('role_permissions' as any)
        .select('*')
        .order('module', { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as RolePermission[];
    },
    staleTime: 60_000,
  });
};

export const useUpdateRolePermission = () => {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      id: string;
      field: 'can_view' | 'can_create' | 'can_edit' | 'can_delete';
      value: boolean;
    }) => {
      const { error } = await supabase
        .from('role_permissions' as any)
        .update({
          [input.field]: input.value,
          updated_by: user?.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['role-permissions'] });
    },
    onError: (err: Error) => toast.error('Error: ' + err.message),
  });
};
