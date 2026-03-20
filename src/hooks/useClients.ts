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

      // Fetch property titles for contracts
      const propertyIds = (contractRows || []).map(c => c.property_id).filter(Boolean) as string[];
      let propertyMap = new Map<string, string>();
      if (propertyIds.length > 0) {
        const { data: props } = await supabase
          .from('properties')
          .select('id, title')
          .in('id', [...new Set(propertyIds)]);
        for (const p of props || []) {
          propertyMap.set(p.id, p.title);
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
        // Skip if this contract is linked to an existing client
        if (ct.client_id && clientIds.has(ct.client_id)) continue;

        unified.push({
          id: ct.id, // use contract id as identifier
          full_name: ct.tenant_name || '',
          email: null,
          phone: ct.tenant_phone,
          client_type: 'inquilino',
          address: ct.property_id ? (propertyMap.get(ct.property_id) || null) : null,
          document_number: ct.tenant_document,
          source: 'contract',
          contract_id: ct.id,
          monthly_rent: ct.monthly_rent,
          currency: ct.currency,
          contract_status: ct.status,
          start_date: ct.start_date,
          end_date: ct.end_date,
          property_title: ct.property_id ? (propertyMap.get(ct.property_id) || null) : null,
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
