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

/** ¿El registro de un período quedó impago? */
export const isPeriodUnpaid = (
  rec: MoraRecordLike | null | undefined,
  expectedRent = 0,
): boolean => {
  if (!rec) return false;
  if (isRentPaid(rec) && !hasOtherPending(rec)) return false;
  return computePendingAmount(rec, expectedRent) > 0 || !isRentPaid(rec);
};

const MONTH_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

/** "2026-08" → "Ago" */
export const shortPeriodLabel = (period: string): string => {
  const [, m] = period.split('-').map(Number);
  return MONTH_SHORT[(m || 1) - 1] ?? period;
};

export interface AccumulatedDebt {
  periods: { period: string; amount: number }[];
  total: number;
  /** "Ago + Sep" */
  label: string;
}

export const buildAccumulatedDebt = (
  entries: { period: string; amount: number }[],
): AccumulatedDebt => {
  const periods = [...entries].filter(e => e.amount > 0 || true).sort((a, b) => a.period.localeCompare(b.period));
  return {
    periods,
    total: periods.reduce((s, p) => s + p.amount, 0),
    label: periods.map(p => shortPeriodLabel(p.period)).join(' + '),
  };
};
