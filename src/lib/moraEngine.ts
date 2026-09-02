import { differenceInDays } from 'date-fns';

/**
 * MOTOR ÚNICO DE MORA
 * -------------------
 * Fuente única de verdad para:
 *  - fecha de vencimiento (día de pago del contrato > día de la propiedad > default)
 *  - criterio de "pagado" (alquiler_check / fecha de pago registrada, NO el status visual)
 *  - días de mora (recalculados siempre, salvo que el registro esté marcado como manual)
 *
 * Usado por Control de Cobros (CollectionControlTab) y por Morosos (useMorososGlobal),
 * para que ambos muestren exactamente lo mismo.
 */

export const DEFAULT_DUE_DAY = 5;

/** Estados de contrato que NO generan obligación de pago en ningún período. */
export const NON_BILLABLE_CONTRACT_STATUSES = ['draft', 'cancelled', 'expired', 'terminated'] as const;

export interface ContractLike {
  status?: string | null;
  start_date?: string | null;
  end_date?: string | null;
}

/** Primer y último día del período yyyy-MM en formato ISO (yyyy-MM-dd). */
export const getPeriodBounds = (period: string): { start: string; end: string } => {
  const [y, m] = period.split('-').map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  return { start: `${period}-01`, end: `${period}-${String(lastDay).padStart(2, '0')}` };
};

/**
 * FUENTE ÚNICA: ¿este contrato estaba genuinamente vigente durante el período?
 * Requiere estado facturable y que el período se solape con start_date - end_date.
 */
export const isContractActiveForPeriod = (
  contract: ContractLike | null | undefined,
  period: string,
): boolean => {
  if (!contract) return false;
  const status = (contract.status ?? '').toLowerCase();
  if ((NON_BILLABLE_CONTRACT_STATUSES as readonly string[]).includes(status)) return false;
  const { start, end } = getPeriodBounds(period);
  if (contract.start_date && contract.start_date > end) return false;
  if (contract.end_date && contract.end_date < start) return false;
  return true;
};


export interface MoraRecordLike {
  alquiler_check?: boolean | null;
  expensas_check?: boolean | null;
  energia_check?: boolean | null;
  iva_check?: boolean | null;
  alquiler_amount?: number | null;
  expensas_amount?: number | null;
  energia_amount?: number | null;
  iva_amount?: number | null;
  mora_amount?: number | null;
  mora_days?: number | null;
  mora_days_manual?: boolean | null;
  exonerado_mora_periodo?: boolean | null;
  fecha_pago_alquiler?: string | null;
  period?: string;
}

/** Día de vencimiento: contrato → propiedad → default (5). */
export const resolveDueDay = (
  contractDay?: number | null,
  propertyDay?: number | null,
): number => {
  const day = contractDay ?? propertyDay ?? DEFAULT_DUE_DAY;
  if (!Number.isFinite(day) || day < 1 || day > 31) return DEFAULT_DUE_DAY;
  return Number(day);
};

/** Fecha de vencimiento (fin del día) para un período yyyy-MM. */
export const getDueDate = (period: string, dueDay: number): Date => {
  const [y, m] = period.split('-').map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const day = Math.min(dueDay, lastDay);
  return new Date(y, m - 1, day, 23, 59, 59);
};

/** Criterio ÚNICO de alquiler cobrado. No usa el campo `status` visual. */
export const isRentPaid = (rec?: MoraRecordLike | null): boolean => {
  if (!rec) return false;
  return !!rec.alquiler_check || !!rec.fecha_pago_alquiler;
};

/** ¿Quedan otros conceptos cargados sin cobrar? (expensas / energía / IVA) */
export const hasOtherPending = (rec?: MoraRecordLike | null): boolean => {
  if (!rec) return false;
  return (
    (Number(rec.expensas_amount ?? 0) > 0 && !rec.expensas_check) ||
    (Number(rec.energia_amount ?? 0) > 0 && !rec.energia_check) ||
    (Number(rec.iva_amount ?? 0) > 0 && !rec.iva_check)
  );
};

export interface CalcMoraParams {
  period: string;
  dueDay: number;
  record?: MoraRecordLike | null;
  /** Override de "pagado" cuando la UI tiene ediciones sin guardar. */
  rentPaid?: boolean;
  /** Override de exoneración cuando la UI tiene ediciones sin guardar. */
  exonerado?: boolean;
  today?: Date;
}

/**
 * Días de mora. Siempre recalcula, EXCEPTO cuando el registro tiene
 * `mora_days_manual = true` (valor ajustado a mano por un usuario).
 */
export const calculateMoraDays = ({
  period,
  dueDay,
  record,
  rentPaid,
  exonerado,
  today = new Date(),
}: CalcMoraParams): number => {
  const isExonerado = exonerado ?? !!record?.exonerado_mora_periodo;
  if (isExonerado) return 0;

  const paid = rentPaid ?? isRentPaid(record);
  if (paid) return 0;

  if (record?.mora_days_manual) return Math.max(0, Number(record.mora_days ?? 0));

  const dueDate = getDueDate(period, dueDay);
  if (today <= dueDate) return 0;
  return Math.max(0, differenceInDays(today, dueDate));
};

/** ¿El valor de días mostrado viene de un ajuste manual? */
export const isMoraManual = (rec?: MoraRecordLike | null): boolean =>
  !!rec?.mora_days_manual && !rec?.exonerado_mora_periodo && !isRentPaid(rec);

/** Monto pendiente de un registro (alquiler + conceptos no cobrados + mora). */
export const computePendingAmount = (
  rec: MoraRecordLike | null | undefined,
  expectedRent: number,
): number => {
  let total = 0;
  if (!isRentPaid(rec)) {
    const loaded = Number(rec?.alquiler_amount ?? 0);
    total += loaded > 0 ? loaded : Number(expectedRent || 0);
  }
  if (!rec?.expensas_check) total += Number(rec?.expensas_amount ?? 0);
  if (!rec?.energia_check) total += Number(rec?.energia_amount ?? 0);
  if (!rec?.iva_check) total += Number(rec?.iva_amount ?? 0);
  if (!rec?.exonerado_mora_periodo) total += Number(rec?.mora_amount ?? 0);
  return total;
};

/** Desglose de conceptos pendientes de un registro (para mostrar de qué es la deuda). */
export const describePendingConcepts = (
  rec: MoraRecordLike | null | undefined,
  expectedRent: number,
): { label: string; amount: number; estimated?: boolean }[] => {
  const out: { label: string; amount: number; estimated?: boolean }[] = [];
  if (!isRentPaid(rec)) {
    const loaded = Number(rec?.alquiler_amount ?? 0);
    out.push({
      label: 'Alquiler',
      amount: loaded > 0 ? loaded : Number(expectedRent || 0),
      estimated: !(loaded > 0),
    });
  }
  if (!rec?.expensas_check && Number(rec?.expensas_amount ?? 0) > 0)
    out.push({ label: 'Expensas', amount: Number(rec?.expensas_amount) });
  if (!rec?.energia_check && Number(rec?.energia_amount ?? 0) > 0)
    out.push({ label: 'Energía', amount: Number(rec?.energia_amount) });
  if (!rec?.iva_check && Number(rec?.iva_amount ?? 0) > 0)
    out.push({ label: 'IVA', amount: Number(rec?.iva_amount) });
  if (!rec?.exonerado_mora_periodo && Number(rec?.mora_amount ?? 0) > 0)
    out.push({ label: 'Mora', amount: Number(rec?.mora_amount) });
  return out;
};



/** ¿El registro de un período quedó impago? */
export const isPeriodUnpaid = (
  rec: MoraRecordLike | null | undefined,
  expectedRent = 0,
): boolean => {
  if (!rec) return false;
  if (isRentPaid(rec) && !hasOtherPending(rec)) return false;
  return computePendingAmount(rec, expectedRent) > 0 || !isRentPaid(rec);
};

/**
 * Registro LEGADO ya saldado: cargado antes de que existieran los flags nuevos
 * (`alquiler_check` / `fecha_pago_alquiler`). Se reconoce por: marcado como
 * 'paid' en el estado visual, sin flags de cobro y sin importe persistido.
 * Solo se usa para deuda ACUMULADA de meses anteriores — nunca para la mora
 * del mes en curso, que sigue rigiéndose por `isRentPaid`.
 */
export const isLegacySettledPeriod = (
  rec: (MoraRecordLike & { payment_status?: string | null }) | null | undefined,
): boolean => {
  if (!rec) return false;
  if (isRentPaid(rec)) return false;
  if ((rec.payment_status ?? '').toLowerCase() !== 'paid') return false;
  return Number(rec.alquiler_amount ?? 0) <= 0;
};

/** ¿El monto del período es estimado (no se persistió el importe real)? */
export const isEstimatedPeriodAmount = (rec: MoraRecordLike | null | undefined): boolean =>
  !isRentPaid(rec) && Number(rec?.alquiler_amount ?? 0) <= 0;

const MONTH_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

/** "2026-08" → "Ago" */
export const shortPeriodLabel = (period: string): string => {
  const [, m] = period.split('-').map(Number);
  return MONTH_SHORT[(m || 1) - 1] ?? period;
};

export interface DebtConcept { label: string; amount: number; estimated?: boolean }

export interface AccumulatedDebt {
  periods: { period: string; amount: number; estimated?: boolean; concepts?: DebtConcept[] }[];
  total: number;
  /** "Ago + Sep" */
  label: string;
  /** true si al menos un período usa monto estimado (alquiler no cargado). */
  hasEstimated: boolean;
}

export const buildAccumulatedDebt = (
  entries: { period: string; amount: number; estimated?: boolean; concepts?: DebtConcept[] }[],
): AccumulatedDebt => {
  const periods = [...entries].sort((a, b) => a.period.localeCompare(b.period));
  return {
    periods,
    total: periods.reduce((s, p) => s + p.amount, 0),
    label: periods.map(p => shortPeriodLabel(p.period)).join(' + '),
    hasEstimated: periods.some(p => !!p.estimated),
  };
};

