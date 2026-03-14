import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface AuditFinancieroRecord {
  id: string;
  fecha_hora: string;
  usuario_id: string | null;
  usuario_nombre: string;
  usuario_rol: string;
  tipo_accion: string;
  entidad_tipo: string;
  entidad_id: string | null;
  descripcion: string;
  valor_anterior: any;
  valor_nuevo: any;
  ip_address: string | null;
}

interface AuditFilters {
  dateFrom?: string;
  dateTo?: string;
  userId?: string;
  tipoAccion?: string;
  search?: string;
  montoMin?: number;
  montoMax?: number;
}

export const useAuditFinanciero = (filters: AuditFilters) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['audit_financiero', filters],
    queryFn: async () => {
      let q = supabase
        .from('audit_financiero' as any)
        .select('*')
        .order('fecha_hora', { ascending: false })
        .limit(500);

      if (filters.dateFrom) {
        q = q.gte('fecha_hora', filters.dateFrom + 'T00:00:00');
      }
      if (filters.dateTo) {
        q = q.lte('fecha_hora', filters.dateTo + 'T23:59:59');
      }
      if (filters.userId) {
        q = q.eq('usuario_id', filters.userId);
      }
      if (filters.tipoAccion && filters.tipoAccion !== 'all') {
        q = q.eq('tipo_accion', filters.tipoAccion);
      }
      if (filters.search) {
        q = q.or(`descripcion.ilike.%${filters.search}%,usuario_nombre.ilike.%${filters.search}%`);
      }

      const { data, error } = await q;
      if (error) throw error;

      let results = (data as any[]) as AuditFinancieroRecord[];

      // Client-side monto filter (amount is inside valor_nuevo JSON)
      if (filters.montoMin !== undefined || filters.montoMax !== undefined) {
        results = results.filter(r => {
          const amount = r.valor_nuevo?.amount || r.valor_nuevo?.monthly_rent || 0;
          if (filters.montoMin && amount < filters.montoMin) return false;
          if (filters.montoMax && amount > filters.montoMax) return false;
          return true;
        });
      }

      return results;
    },
    enabled: !!user,
  });
};

/* ── Helpers ── */
export const ACCION_LABELS: Record<string, string> = {
  PAGO_REGISTRADO: 'Pago registrado',
  PAGO_EDITADO: 'Pago editado',
  PAGO_ELIMINADO: 'Pago eliminado',
  EGRESO_REGISTRADO: 'Egreso registrado',
  EGRESO_EDITADO: 'Egreso editado',
  EGRESO_ELIMINADO: 'Egreso eliminado',
  INGRESO_REGISTRADO: 'Ingreso registrado',
  INGRESO_EDITADO: 'Ingreso editado',
  INGRESO_ELIMINADO: 'Ingreso eliminado',
  ESTADO_CAMBIADO: 'Estado cambiado',
  CONTRATO_CREADO: 'Contrato creado',
  CONTRATO_EDITADO: 'Contrato editado',
  CONTRATO_ELIMINADO: 'Contrato eliminado',
};

export const ACCION_COLORS: Record<string, string> = {
  PAGO_REGISTRADO: 'bg-emerald-50 dark:bg-emerald-950/30 border-l-emerald-500',
  INGRESO_REGISTRADO: 'bg-emerald-50 dark:bg-emerald-950/30 border-l-emerald-500',
  EGRESO_REGISTRADO: 'bg-red-50 dark:bg-red-950/30 border-l-red-500',
  PAGO_ELIMINADO: 'bg-red-50 dark:bg-red-950/30 border-l-red-500',
  INGRESO_ELIMINADO: 'bg-red-50 dark:bg-red-950/30 border-l-red-500',
  EGRESO_ELIMINADO: 'bg-red-50 dark:bg-red-950/30 border-l-red-500',
  CONTRATO_ELIMINADO: 'bg-red-50 dark:bg-red-950/30 border-l-red-500',
  PAGO_EDITADO: 'bg-blue-50 dark:bg-blue-950/30 border-l-blue-500',
  INGRESO_EDITADO: 'bg-blue-50 dark:bg-blue-950/30 border-l-blue-500',
  EGRESO_EDITADO: 'bg-blue-50 dark:bg-blue-950/30 border-l-blue-500',
  ESTADO_CAMBIADO: 'bg-blue-50 dark:bg-blue-950/30 border-l-blue-500',
  CONTRATO_CREADO: 'bg-emerald-50 dark:bg-emerald-950/30 border-l-emerald-500',
  CONTRATO_EDITADO: 'bg-blue-50 dark:bg-blue-950/30 border-l-blue-500',
};

export const ROL_LABELS: Record<string, string> = {
  superadmin: 'SuperAdmin',
  admin: 'Admin',
  accounting: 'Gerente',
  secretaria: 'Secretaría',
  agent: 'Agente',
  system: 'Sistema',
};
