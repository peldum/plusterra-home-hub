import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { TablesInsert } from '@/integrations/supabase/types';

export interface UnifiedClient {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  client_type: string | null;
  address: string | null;
  document_number: string | null;
  source: 'clients' | 'contract';
  contract_id?: string;
  monthly_rent?: number | null;
  currency?: string | null;
  contract_status?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  property_title?: string | null;
  building_id?: string | null;
  building_name?: string | null;
}

export const useClients = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      // Fetch from clients table
      const { data: clientRows, error: cErr } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });
      if (cErr) throw cErr;

      // Fetch tenants from contracts (active tenants not in clients table)
      const { data: contractRows, error: ctErr } = await supabase
        .from('contracts')
        .select('id, tenant_name, tenant_phone, tenant_document, monthly_rent, currency, status, start_date, end_date, property_id, client_id, contract_type')
        .not('tenant_name', 'is', null)
        .in('status', ['active', 'near_expiration'])
        .order('created_at', { ascending: false });
      if (ctErr) throw ctErr;

      // Fetch property info including unit → building
      const propertyIds = (contractRows || []).map(c => c.property_id).filter(Boolean) as string[];
      let propertyMap = new Map<string, { title: string; building_id: string | null; building_name: string | null }>();
      if (propertyIds.length > 0) {
        const { data: props } = await supabase
          .from('properties')
          .select('id, title, unit_id')
          .in('id', [...new Set(propertyIds)]);

        // Get unit → building mapping
        const unitIds = (props || []).map(p => p.unit_id).filter(Boolean) as string[];
        let unitBuildingMap = new Map<string, { building_id: string; building_name: string }>();
        if (unitIds.length > 0) {
          const { data: units } = await supabase
            .from('units')
            .select('id, building_id')
            .in('id', [...new Set(unitIds)]);
          const buildingIds = (units || []).map(u => u.building_id).filter(Boolean) as string[];
          let buildingMap = new Map<string, string>();
          if (buildingIds.length > 0) {
            const { data: buildings } = await supabase
              .from('buildings')
              .select('id, name')
              .in('id', [...new Set(buildingIds)]);
            for (const b of buildings || []) {
              buildingMap.set(b.id, b.name);
            }
          }
          for (const u of units || []) {
            if (u.building_id) {
              unitBuildingMap.set(u.id, {
                building_id: u.building_id,
                building_name: buildingMap.get(u.building_id) || '',
              });
            }
          }
        }

        for (const p of props || []) {
          const bInfo = p.unit_id ? unitBuildingMap.get(p.unit_id) : null;
          propertyMap.set(p.id, {
            title: p.title,
            building_id: bInfo?.building_id || null,
            building_name: bInfo?.building_name || null,
          });
        }
      }

      const unified: UnifiedClient[] = [];

      // Add clients table entries
      for (const c of clientRows || []) {
        unified.push({
          id: c.id,
          full_name: c.full_name,
          email: c.email,
          phone: c.phone,
          client_type: c.client_type,
          address: c.address,
          document_number: c.document_number,
          source: 'clients',
        });
      }

      // Add contract tenants that aren't already linked to a client
      const clientIds = new Set((clientRows || []).map(c => c.id));
      for (const ct of contractRows || []) {
        if (ct.client_id && clientIds.has(ct.client_id)) continue;

        const pInfo = ct.property_id ? propertyMap.get(ct.property_id) : null;
        unified.push({
          id: ct.id,
          full_name: ct.tenant_name || '',
          email: null,
          phone: ct.tenant_phone,
          client_type: 'inquilino',
          address: pInfo?.title || null,
          document_number: ct.tenant_document,
          source: 'contract',
          contract_id: ct.id,
          monthly_rent: ct.monthly_rent,
          currency: ct.currency,
          contract_status: ct.status,
          start_date: ct.start_date,
          end_date: ct.end_date,
          property_title: pInfo?.title || null,
          building_id: pInfo?.building_id || null,
          building_name: pInfo?.building_name || null,
        });
      }

      return unified;
    },
    enabled: !!user,
  });
};

export const useCreateClient = () => {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: Omit<TablesInsert<'clients'>, 'created_by'>) => {
      const { data, error } = await supabase
        .from('clients')
        .insert({ ...input, created_by: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Cliente creado exitosamente');
    },
    onError: (err: Error) => {
      toast.error('Error al crear cliente: ' + err.message);
    },
  });
};

export const useUpdateClient = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; full_name?: string; email?: string | null; phone?: string | null; birth_date?: string | null; client_type?: string; notes?: string | null }) => {
      const { error } = await supabase
        .from('clients')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Cliente actualizado');
    },
    onError: (err: Error) => {
      toast.error('Error al actualizar: ' + err.message);
    },
  });
};

export const useDeleteClient = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('clients').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Cliente eliminado');
    },
    onError: (err: Error) => {
      toast.error('Error al eliminar: ' + err.message);
    },
  });
};
