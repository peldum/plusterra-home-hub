import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ContractWithRelations } from './useContracts';

export const useContractHistory = (contractId: string | null) => {
  return useQuery({
    queryKey: ['contract-history', contractId],
    queryFn: async () => {
      if (!contractId) return [];

      // Fetch all contracts for the same property+client chain
      // First get the current contract to know property_id and client_id
      const { data: current, error: currentError } = await supabase
        .from('contracts')
        .select('*, properties(title, address), clients(full_name)')
        .eq('id', contractId)
        .single();

      if (currentError || !current) return [];

      // Walk backwards through previous_contract_id chain
      const chain: ContractWithRelations[] = [];
      let cursor: string | null = (current as any).previous_contract_id;

      // Add current contract
      chain.push(current as ContractWithRelations);

      // Walk backwards (max 20 to avoid infinite loops)
      let iterations = 0;
      while (cursor && iterations < 20) {
        iterations++;
        const { data, error } = await supabase
          .from('contracts')
          .select('*, properties(title, address), clients(full_name)')
          .eq('id', cursor)
          .single();

        if (error || !data) break;
        chain.push(data as ContractWithRelations);
        cursor = (data as any).previous_contract_id;
      }

      // Also walk forward: find contracts that have this contract as previous
      let forwardCursor: string | null = contractId;
      let forwardIterations = 0;
      const forwardChain: ContractWithRelations[] = [];

      while (forwardCursor && forwardIterations < 20) {
        forwardIterations++;
        const { data, error } = await supabase
          .from('contracts')
          .select('*, properties(title, address), clients(full_name)')
          .eq('previous_contract_id', forwardCursor)
          .maybeSingle();

        if (error || !data) break;
        forwardChain.push(data as ContractWithRelations);
        forwardCursor = data.id;
      }

      // Combine: oldest first
      const fullChain = [...chain.reverse(), ...forwardChain];

      // Deduplicate by id
      const seen = new Set<string>();
      return fullChain.filter((c) => {
        if (seen.has(c.id)) return false;
        seen.add(c.id);
        return true;
      });
    },
    enabled: !!contractId,
  });
};
