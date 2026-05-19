// ---------------------------------------------------------------------------
// Cálculo unificado del split de comisión rápida.
// Regla de negocio Plusterra (mayo 2026):
//  - Operación normal: 15% retención sobre el bruto.
//  - Co-agente interno (otro Plusterra): split 50/50, cada uno deja 15% sobre
//    su mitad. company_amount = retención total (suma de ambos).
//  - Co-broker EXTERNO: split 50/50. Plusterra solo factura su mitad y deja
//    15% sobre ESA mitad. La mitad del externo NO genera retención.
//    `gross_amount` sigue siendo el bruto total de la operación (trazabilidad),
//    pero `company_amount` y `net_amount` representan la parte de Plusterra.
// ---------------------------------------------------------------------------

export type SplitMode =
  | { type: 'solo' }
  | { type: 'internal_coagent' }
  | { type: 'external_cobroker' };

export interface CommissionSplit {
  companyPct: number;
  /** Retención total que se queda Plusterra. */
  companyAmt: number;
  /** Neto para el agente principal (Sandra). */
  agentAmt: number;
  /** Neto para el co-agente interno (si aplica). */
  coAgentAmt: number;
  /** Mitad bruta usada en cálculos con segundo agente. */
  halfGross: number;
  /** Retención que se imputa al agente principal. */
  agentRetention: number;
  /** Retención del co-agente interno (null si no aplica). */
  coAgentRetention: number | null;
  isCoAgent: boolean;
  isExternalCobroker: boolean;
}

export const computeCommissionSplit = (
  gross: number,
  mode: SplitMode,
  companyPct = 15
): CommissionSplit => {
  const g = Math.max(0, Math.round(gross || 0));

  if (mode.type === 'internal_coagent') {
    const halfGross = Math.round(g / 2);
    const companyPerAgent = Math.round((halfGross * companyPct) / 100);
    const netPerAgent = halfGross - companyPerAgent;
    const totalCompany = companyPerAgent * 2;
    return {
      companyPct,
      companyAmt: totalCompany,
      agentAmt: netPerAgent,
      coAgentAmt: netPerAgent,
      halfGross,
      agentRetention: companyPerAgent,
      coAgentRetention: companyPerAgent,
      isCoAgent: true,
      isExternalCobroker: false,
    };
  }

  if (mode.type === 'external_cobroker') {
    // 50/50 con externo: Plusterra solo factura su mitad.
    const halfGross = Math.round(g / 2);
    const companyAmt = Math.round((halfGross * companyPct) / 100);
    const agentAmt = halfGross - companyAmt;
    return {
      companyPct,
      companyAmt,
      agentAmt,
      coAgentAmt: 0,
      halfGross,
      agentRetention: companyAmt,
      coAgentRetention: null,
      isCoAgent: false,
      isExternalCobroker: true,
    };
  }

  // Solo (sin segundo agente)
  const companyAmt = Math.round((g * companyPct) / 100);
  const agentAmt = g - companyAmt;
  return {
    companyPct,
    companyAmt,
    agentAmt,
    coAgentAmt: 0,
    halfGross: 0,
    agentRetention: companyAmt,
    coAgentRetention: null,
    isCoAgent: false,
    isExternalCobroker: false,
  };
};
