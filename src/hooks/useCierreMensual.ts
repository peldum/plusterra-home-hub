import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CierreComisionRow {
  id: string;
  agentName: string;
  coAgentName: string | null;
  propertyLabel: string;
  grossAmount: number;
  companyAmount: number;
  agentRetention: number;
  coAgentRetention: number;
  paymentMethod: string;
  montoBanco: number;
  montoEfectivo: number;
  montoPendiente: number;
  operationDate: string;
  operationType: string;
}

export interface CierreCanonRow {
  id: string;
  agentName: string;
  agentId: string;
  period: string;
  totalAmount: number;
  paymentMethod: string;
  montoBanco: number;
  montoEfectivo: number;
  paymentDate: string;
}

export interface CierreAgentSummary {
  agentId: string;
  agentName: string;
  totalRetencion: number;
  totalCanon: number;
  grandTotal: number;
}

export const useCierreMensual = (month: string) => {
  // month format: "2025-03"
  const [year, mon] = month.split('-').map(Number);

  // 1. Quick commissions cobradas in this month
  const comisiones = useQuery({
    queryKey: ['cierre-comisiones', month],
    queryFn: async () => {
      const { data: agents } = await (supabase as any)
        .from('profiles')
        .select('id, full_name');
      const agentMap = new Map<string, string>((agents || []).map((a: any) => [a.id, a.full_name]));

      const { data, error } = await (supabase as any)
        .from('quick_commissions')
        .select('*')
        .is('deleted_at', null)
        .eq('status', 'cobrado')
        .eq('periodo_mes', mon)
        .eq('periodo_anio', year);
      if (error) throw error;

      // Enrich with property info
      const propIds = (data || []).filter((r: any) => r.property_id && r.property_source === 'internal').map((r: any) => r.property_id);
      let propMap = new Map<string, string>();
      if (propIds.length > 0) {
        const { data: props } = await supabase.from('properties').select('id, title, property_code').in('id', propIds);
        propMap = new Map((props || []).map(p => [p.id, `${p.property_code || ''} ${p.title || ''}`.trim()]));
      }

      return (data || []).map((r: any): CierreComisionRow => ({
        id: r.id,
        agentName: agentMap.get(r.agent_id) || 'Agente',
        coAgentName: r.co_agent_id ? (agentMap.get(r.co_agent_id) || null) : null,
        propertyLabel: r.property_id && propMap.has(r.property_id) ? propMap.get(r.property_id)! : (r.property_address || '—'),
        grossAmount: Number(r.gross_amount || 0),
        companyAmount: Number(r.company_amount || 0),
        agentRetention: Number(r.agent_retention || 0),
        coAgentRetention: Number(r.co_agent_retention || 0),
        paymentMethod: r.payment_method || 'efectivo',
        montoBanco: Number(r.monto_banco || 0),
        montoEfectivo: Number(r.monto_efectivo || 0),
        montoPendiente: Number(r.monto_pendiente || 0),
        operationDate: r.operation_date || '',
        operationType: r.operation_type || '',
      }));
    },
  });

  // 2. Canon payments for this month
  const canones = useQuery({
    queryKey: ['cierre-canones', month],
    queryFn: async () => {
      const { data: agents } = await (supabase as any)
        .from('profiles')
        .select('id, full_name, aplica_canon');
      const agentMap = new Map<string, { full_name: string; aplica_canon: boolean }>((agents || []).map((a: any) => [a.id, a]));

      const { data, error } = await supabase
        .from('canon_payments')
        .select('*')
        .eq('period', month);
      if (error) throw error;

      return (data || [])
        .filter((r) => {
          const agent = agentMap.get(r.agent_id);
          return agent?.aplica_canon !== false;
        })
        .map((r): CierreCanonRow => ({
          id: r.id,
          agentName: agentMap.get(r.agent_id)?.full_name || 'Agente',
          agentId: r.agent_id,
          period: r.period,
          totalAmount: Number(r.total_amount || 0),
          paymentMethod: r.payment_method || 'efectivo',
          montoBanco: Number(r.monto_banco || 0),
          montoEfectivo: Number(r.monto_efectivo || 0),
          paymentDate: r.payment_date ? new Date(r.payment_date).toLocaleDateString('es-PY') : '',
        }));
    },
  });

  const comisionRows = comisiones.data || [];
  const canonRows = canones.data || [];

  const totalRetencion = comisionRows.reduce((s, r) => s + r.companyAmount, 0);
  const totalCanon = canonRows.reduce((s, r) => s + r.totalAmount, 0);
  const granTotal = totalRetencion + totalCanon;

  const retencionEfectivo = comisionRows.reduce((s, r) => s + r.montoEfectivo, 0);
  const retencionBanco = comisionRows.reduce((s, r) => s + r.montoBanco, 0);
  const canonEfectivo = canonRows.reduce((s, r) => s + r.montoEfectivo, 0);
  const canonBanco = canonRows.reduce((s, r) => s + r.montoBanco, 0);

  // Agent summary
  const agentSummary: CierreAgentSummary[] = (() => {
    const map = new Map<string, CierreAgentSummary>();
    comisionRows.forEach(r => {
      // Main agent retention
      const retAmt = r.agentRetention || r.companyAmount;
      if (!map.has(r.agentName)) map.set(r.agentName, { agentId: '', agentName: r.agentName, totalRetencion: 0, totalCanon: 0, grandTotal: 0 });
      map.get(r.agentName)!.totalRetencion += retAmt;
      // Co-agent retention
      if (r.coAgentName && r.coAgentRetention > 0) {
        if (!map.has(r.coAgentName)) map.set(r.coAgentName, { agentId: '', agentName: r.coAgentName, totalRetencion: 0, totalCanon: 0, grandTotal: 0 });
        map.get(r.coAgentName)!.totalRetencion += r.coAgentRetention;
      }
    });
    canonRows.forEach(r => {
      if (!map.has(r.agentName)) map.set(r.agentName, { agentId: r.agentId, agentName: r.agentName, totalRetencion: 0, totalCanon: 0, grandTotal: 0 });
      map.get(r.agentName)!.totalCanon += r.totalAmount;
    });
    const arr = Array.from(map.values());
    arr.forEach(a => { a.grandTotal = a.totalRetencion + a.totalCanon; });
    arr.sort((a, b) => b.grandTotal - a.grandTotal);
    return arr;
  })();

  return {
    comisionRows,
    canonRows,
    totalRetencion,
    totalCanon,
    granTotal,
    retencionEfectivo,
    retencionBanco,
    canonEfectivo,
    canonBanco,
    agentSummary,
    isLoading: comisiones.isLoading || canones.isLoading,
  };
};
