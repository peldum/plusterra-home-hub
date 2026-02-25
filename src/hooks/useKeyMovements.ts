import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type KeyMovementDirection = 'RETIRO' | 'DEVOLUCION';
export type KeyMovementType = 'AGENTE_INTERNO' | 'AGENTE_EXTERNO' | 'MANTENIMIENTO' | 'PROPIETARIO' | 'ENCARGADO';

export interface KeyMovement {
  id: string;
  property_id: string;
  direction: KeyMovementDirection;
  movement_type: KeyMovementType;
  agent_id: string | null;
  external_name: string | null;
  external_company: string | null;
  external_document: string | null;
  external_phone: string | null;
  work_type: string | null;
  motivo: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  // joined
  agent_name?: string;
  property_title?: string;
}

export type KeyStatus = 'EN_OFICINA' | 'EN_PODER_AGENTE' | 'EN_PODER_TERCERO' | 'EN_MANTENIMIENTO' | 'EN_PROPIETARIO' | 'EN_ENCARGADO';

export interface KeyCurrentStatus {
  status: KeyStatus;
  lastMovement: KeyMovement | null;
  responsibleName: string | null;
  since: string | null;
}

/** Compute the current key status from the latest movement */
export const computeKeyStatus = (lastMovement: KeyMovement | null): KeyCurrentStatus => {
  if (!lastMovement || lastMovement.direction === 'DEVOLUCION') {
    return { status: 'EN_OFICINA', lastMovement, responsibleName: null, since: null };
  }
  if (lastMovement.movement_type === 'AGENTE_INTERNO') {
    return {
      status: 'EN_PODER_AGENTE',
      lastMovement,
      responsibleName: lastMovement.agent_name || 'Agente',
      since: lastMovement.created_at,
    };
  }
  if (lastMovement.movement_type === 'AGENTE_EXTERNO') {
    return {
      status: 'EN_PODER_TERCERO',
      lastMovement,
      responsibleName: lastMovement.external_name || 'Tercero',
      since: lastMovement.created_at,
    };
  }
  if (lastMovement.movement_type === 'MANTENIMIENTO') {
    return {
      status: 'EN_MANTENIMIENTO',
      lastMovement,
      responsibleName: lastMovement.external_name || 'Mantenimiento',
      since: lastMovement.created_at,
    };
  }
  if (lastMovement.movement_type === 'PROPIETARIO') {
    return {
      status: 'EN_PROPIETARIO',
      lastMovement,
      responsibleName: lastMovement.external_name || 'Propietario',
      since: lastMovement.created_at,
    };
  }
  if (lastMovement.movement_type === 'ENCARGADO') {
    return {
      status: 'EN_ENCARGADO',
      lastMovement,
      responsibleName: lastMovement.external_name || 'Encargado',
      since: lastMovement.created_at,
    };
  }
  return { status: 'EN_OFICINA', lastMovement: null, responsibleName: null, since: null };
};

/** Fetch key movements history for a property */
export const useKeyHistory = (propertyId: string | null) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['key-movements', propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('key_movements' as any)
        .select('*, agent_profile:profiles!key_movements_agent_id_fkey(full_name)')
        .eq('property_id', propertyId!)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      // Flatten profile join
      return (data as any[]).map((m: any) => ({
        ...m,
        agent_name: m.agent_profile?.full_name ?? null,
      })) as KeyMovement[];
    },
    enabled: !!user && !!propertyId,
  });
};

/** Get the latest key status for a property */
export const useKeyStatus = (propertyId: string | null) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['key-status', propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('key_movements' as any)
        .select('*, agent_profile:profiles!key_movements_agent_id_fkey(full_name)')
        .eq('property_id', propertyId!)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      const movement = data
        ? { ...(data as any), agent_name: (data as any).agent_profile?.full_name ?? null }
        : null;
      return computeKeyStatus(movement as KeyMovement | null);
    },
    enabled: !!user && !!propertyId,
    staleTime: 10_000,
  });
};

/** Register a key RETIRO for internal agent */
export const useRegisterKeyRetiro = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ propertyId }: { propertyId: string }) => {
      const { data, error } = await supabase
        .from('key_movements' as any)
        .insert({
          property_id: propertyId,
          direction: 'RETIRO',
          movement_type: 'AGENTE_INTERNO',
          agent_id: user!.id,
          created_by: user!.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['key-movements', vars.propertyId] });
      qc.invalidateQueries({ queryKey: ['key-status', vars.propertyId] });
      toast.success('✅ Retiro de llave registrado');
    },
    onError: (err: Error) => {
      toast.error('Error al registrar retiro: ' + err.message);
    },
  });
};

/** Register an external key RETIRO (by Secretaría) */
export const useRegisterExternalKey = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      propertyId: string;
      movementType: 'AGENTE_EXTERNO' | 'MANTENIMIENTO' | 'PROPIETARIO' | 'ENCARGADO';
      externalName: string;
      externalCompany?: string;
      externalDocument: string;
      externalPhone?: string;
      workType?: string;
      motivo?: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('key_movements' as any)
        .insert({
          property_id: input.propertyId,
          direction: 'RETIRO',
          movement_type: input.movementType,
          external_name: input.externalName,
          external_company: input.externalCompany || null,
          external_document: input.externalDocument,
          external_phone: input.externalPhone || null,
          work_type: input.workType || null,
          motivo: input.motivo || null,
          notes: input.notes || null,
          created_by: user!.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['key-movements', vars.propertyId] });
      qc.invalidateQueries({ queryKey: ['key-status', vars.propertyId] });
      toast.success('✅ Entrega a tercero registrada');
    },
    onError: (err: Error) => {
      toast.error('Error al registrar entrega: ' + err.message);
    },
  });
};

/** Register DEVOLUCION (by Secretaría or Admin) */
export const useRegisterKeyReturn = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ propertyId, lastMovementType, notes }: {
      propertyId: string;
      lastMovementType: KeyMovementType;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('key_movements' as any)
        .insert({
          property_id: propertyId,
          direction: 'DEVOLUCION',
          movement_type: lastMovementType,
          notes: notes || null,
          created_by: user!.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['key-movements', vars.propertyId] });
      qc.invalidateQueries({ queryKey: ['key-status', vars.propertyId] });
      toast.success('✅ Devolución de llave registrada');
    },
    onError: (err: Error) => {
      toast.error('Error al registrar devolución: ' + err.message);
    },
  });
};

/** Fetch all active key withdrawals (for global view) */
export const useActiveKeyMovements = (enabled = true) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['active-key-movements'],
    queryFn: async () => {
      try {
        // Get all movements with property info
        const { data, error } = await supabase
          .from('key_movements' as any)
          .select('*, agent_profile:profiles!key_movements_agent_id_fkey(full_name), properties(title, property_code)')
          .order('created_at', { ascending: false });
        if (error) throw error;

        const movements = (data as any[]).map((m: any) => ({
          ...m,
          agent_name: m.agent_profile?.full_name ?? null,
          property_title: m.properties?.title ?? null,
        })) as KeyMovement[];

        // Deduplicate: get latest per property; keep only RETIRO as current "out"
        const seen = new Set<string>();
        const latest: KeyMovement[] = [];
        for (const m of movements) {
          if (!seen.has(m.property_id)) {
            seen.add(m.property_id);
            if (m.direction === 'RETIRO') latest.push(m);
          }
        }
        return latest;
      } catch (err) {
        console.error('Error fetching active key movements:', err);
        return [];
      }
    },
    enabled: !!user && enabled,
    staleTime: 15_000,
  });
};
