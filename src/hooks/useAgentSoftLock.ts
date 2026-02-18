/**
 * useAgentSoftLock — Hook centralizado para el sistema de soft-lock de agentes morosos.
 *
 * Regla de negocio:
 *   - Los agentes deben pagar del día 1 al 5 de cada mes.
 *   - Si no pagaron, están MOROSOS (isLocked = true).
 *   - Solo aplica a usuarios con rol 'agent'. Admins/SuperAdmins nunca se bloquean.
 *
 * Este hook es la ÚNICA fuente de verdad para el estado de acceso del agente.
 * No duplicar esta lógica en otros módulos.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type FeeStatus = 'up_to_date' | 'due' | 'overdue' | 'unknown';

const computeFeeStatus = (lastPaidMonth: string | null, now: Date): FeeStatus => {
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  if (lastPaidMonth === currentMonth) return 'up_to_date';
  const day = now.getDate();
  if (day <= 5) return 'due';
  return 'overdue';
};

interface AgentSoftLockResult {
  /** true si el agente está moroso y debe tener funciones restringidas */
  isLocked: boolean;
  feeStatus: FeeStatus;
  /** true si tiene canon mensual configurado */
  hasFee: boolean;
  isLoading: boolean;
}

export const useAgentSoftLock = (): AgentSoftLockResult => {
  const { user, role } = useAuth();

  // Solo aplica a agentes
  const isAgent = role === 'agent';

  const { data: feeData, isLoading } = useQuery({
    queryKey: ['agent-soft-lock', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('monthly_fee, last_paid_month, payment_status')
        .eq('id', user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user && isAgent,
    staleTime: 30_000, // revalidar cada 30 segundos
  });

  if (!isAgent) {
    // Admins/SuperAdmins/Accounting nunca tienen restricciones
    return { isLocked: false, feeStatus: 'up_to_date', hasFee: false, isLoading: false };
  }

  if (isLoading || !feeData) {
    return { isLocked: false, feeStatus: 'unknown', hasFee: false, isLoading };
  }

  // 1. Si admin puso payment_status = 'MOROSO' manualmente → lock inmediato
  if ((feeData as any).payment_status === 'MOROSO') {
    return { isLocked: true, feeStatus: 'overdue', hasFee: true, isLoading: false };
  }

  const hasFee = Number(feeData.monthly_fee) > 0;

  if (!hasFee) {
    // Sin canon configurado → sin restricción
    return { isLocked: false, feeStatus: 'up_to_date', hasFee: false, isLoading: false };
  }

  const feeStatus = computeFeeStatus(feeData.last_paid_month, new Date());
  const isLocked = feeStatus === 'overdue';

  return { isLocked, feeStatus, hasFee, isLoading: false };
};
