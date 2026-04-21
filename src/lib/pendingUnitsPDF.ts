/**
 * Helper to render a "Unidades pendientes en este período" section at the
 * bottom of any building liquidation PDF. A unit is considered pending when
 * its overall payment_status is NOT 'paid' (so its rental did NOT contribute
 * to totals or to the owner payment).
 *
 * The section lists: unit code, tenant, status, and the EXPECTED rental
 * amount (the amount that would have been counted if it had been paid).
 */
import type { jsPDF } from 'jspdf';
import type { LiquidationLine } from '@/hooks/useBuildingLiquidation';
import { PDF_FONT } from '@/lib/pdfFontHelper';

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendiente',
  overdue: 'Vencido',
  partial: 'Parcial',
  paid: 'Pagado',
};

const STATUS_COLOR: Record<string, [number, number, number]> = {
  pending: [217, 167, 32],   // amarillo
  overdue: [180, 40, 40],    // rojo
  partial: [42, 92, 170],    // azul
  paid: [22, 128, 57],       // verde (no debería aparecer)
};

const fmt = (n: number, currency: string = 'PYG') => {
  if (currency === 'USD') return `US$ ${n.toLocaleString('es-PY', { minimumFractionDigits: 2 })}`;
  return `Gs. ${n.toLocaleString('es-PY')}`;
};

export interface PendingUnitsOptions {
  ML?: number;
  contentW: number;
  pageH: number;
  marginBottom?: number;
  /** y position to start drawing. Returns the new y. */
  startY: number;
}

/**
 * Renders the pending-units footnote section. Returns the updated y position.
 * If there are no pending units, returns startY unchanged.
 */
export function renderPendingUnitsSection(
  pdf: jsPDF,
  lines: LiquidationLine[],
  opts: PendingUnitsOptions,
): number {
  const ML = opts.ML ?? 14;
  const MB = opts.marginBottom ?? 18;
  let y = opts.startY;

  const pending = lines.filter(l => !l.is_collected);
  if (pending.length === 0) return y;

  const ensureSpace = (needed: number) => {
    if (y + needed > opts.pageH - MB) {
      pdf.addPage();
      y = 18;
    }
  };

  y += 6;
  ensureSpace(20);

  // Section header — amber band
  pdf.setFillColor(217, 167, 32);
  pdf.rect(ML, y, opts.contentW, 8, 'F');
  pdf.setFont(PDF_FONT, 'bold');
  pdf.setFontSize(7);
  pdf.setTextColor(255, 255, 255);
  pdf.text('UNIDADES PENDIENTES EN ESTE PERÍODO', ML + opts.contentW / 2, y + 5.5, { align: 'center' });
  y += 8;

  // Explanatory note
  pdf.setFillColor(255, 248, 230);
  pdf.rect(ML, y, opts.contentW, 6, 'F');
  pdf.setFont(PDF_FONT, 'normal');
  pdf.setFontSize(5.8);
  pdf.setTextColor(120, 80, 0);
  pdf.text(
    'Estas unidades NO se incluyeron en los totales del reporte ni en el pago al propietario porque su estado no es "Pagado". El monto mostrado es el alquiler esperado.',
    ML + 2, y + 4,
  );
  y += 6;

  // Table header
  const colUnit = 28;
  const colTenant = opts.contentW - colUnit - 32 - 36;
  const colStatus = 32;
  const colAmount = 36;

  pdf.setFillColor(245, 240, 220);
  pdf.rect(ML, y, opts.contentW, 7, 'F');
  pdf.setFont(PDF_FONT, 'bold');
  pdf.setFontSize(6);
  pdf.setTextColor(120, 80, 0);
  pdf.text('UNIDAD', ML + 2, y + 5);
  pdf.text('INQUILINO', ML + colUnit + 2, y + 5);
  pdf.text('ESTADO', ML + colUnit + colTenant + colStatus / 2, y + 5, { align: 'center' });
  pdf.text('ALQUILER ESPERADO', ML + opts.contentW - 2, y + 5, { align: 'right' });
  y += 7;

  // Rows
  let totalPending = 0;
  pending.forEach((l, i) => {
    ensureSpace(7);

    if (i % 2 === 0) {
      pdf.setFillColor(252, 250, 245);
      pdf.rect(ML, y, opts.contentW, 7, 'F');
    }
    pdf.setDrawColor(230, 220, 195);
    pdf.line(ML, y + 7, ML + opts.contentW, y + 7);

    pdf.setFont(PDF_FONT, 'normal');
    pdf.setFontSize(6);
    pdf.setTextColor(40);
    pdf.text(l.unit_code, ML + 2, y + 4.7);
    const tenant = (l.tenant_name || '—').substring(0, 30);
    pdf.text(tenant, ML + colUnit + 2, y + 4.7);

    const status = l.collection_payment_status || 'pending';
    const [r, g, b] = STATUS_COLOR[status] ?? STATUS_COLOR.pending;
    pdf.setFont(PDF_FONT, 'bold');
    pdf.setTextColor(r, g, b);
    pdf.text(STATUS_LABEL[status] ?? status, ML + colUnit + colTenant + colStatus / 2, y + 4.7, { align: 'center' });

    pdf.setTextColor(80);
    pdf.text(fmt(l.rental_price_expected, l.currency), ML + opts.contentW - 2, y + 4.7, { align: 'right' });

    totalPending += l.rental_price_expected;
    y += 7;
  });

  // Totals row
  ensureSpace(8);
  pdf.setFillColor(217, 167, 32);
  pdf.rect(ML, y, opts.contentW, 7, 'F');
  pdf.setFont(PDF_FONT, 'bold');
  pdf.setFontSize(6.5);
  pdf.setTextColor(255, 255, 255);
  pdf.text(`TOTAL NO COBRADO (${pending.length} unidad${pending.length === 1 ? '' : 'es'})`, ML + 2, y + 4.8);
  pdf.text(fmt(totalPending), ML + opts.contentW - 2, y + 4.8, { align: 'right' });
  y += 7;

  pdf.setTextColor(0);
  return y;
}