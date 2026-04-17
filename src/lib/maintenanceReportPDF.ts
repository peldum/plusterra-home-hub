import jsPDF from 'jspdf';
import { registerPdfFont, PDF_FONT } from '@/lib/pdfFontHelper';

const BLUE: [number, number, number] = [0, 68, 124];
const ORANGE: [number, number, number] = [252, 81, 0];
const DARK: [number, number, number] = [30, 30, 30];
const GRAY: [number, number, number] = [100, 100, 100];
const LIGHT_GRAY: [number, number, number] = [220, 220, 220];
const WHITE: [number, number, number] = [255, 255, 255];
const BG_LIGHT: [number, number, number] = [245, 247, 250];

export interface MaintenancePDFTicket {
  realizado: string;        // dd/mm/yyyy or '-'
  propiedad: string;
  descripcion: string;
  proveedor: string;
  estado: string;
  costo: number;            // numeric
  costoLabel: string;       // formatted "Gs. 1.500.000" or "USD 200"
  esEstimado: boolean;
  ownerName: string;
}

export interface MaintenancePDFOptions {
  rangeFrom?: string | null;   // 'YYYY-MM-DD'
  rangeTo?: string | null;
  ownerFilterName?: string | null;  // when filtered by owner
}

const loadLogoBase64 = async (path: string): Promise<string | null> => {
  try {
    const res = await fetch(path);
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

const fmtDate = (iso: string | null | undefined) => {
  if (!iso) return '-';
  const [y, m, d] = iso.split('-');
  if (y && m && d) return `${d}/${m}/${y}`;
  return new Date(iso).toLocaleDateString('es-PY');
};

export async function exportMaintenanceReportPDF(
  tickets: MaintenancePDFTicket[],
  options: MaintenancePDFOptions = {},
) {
  const logoWhite = await loadLogoBase64('/logo-plusterra-white.png');
  const logoContract = await loadLogoBase64('/logo-plusterra-contract.png');

  const doc = new jsPDF('l', 'mm', 'a4');
  registerPdfFont(doc);
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginL = 14;
  const marginR = 14;
  const contentW = pageW - marginL - marginR;
  let y = 0;

  const now = new Date();
  const dateStr = now.toLocaleDateString('es-PY', { day: '2-digit', month: 'long', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' });

  const periodo =
    options.rangeFrom && options.rangeTo
      ? `${fmtDate(options.rangeFrom)} a ${fmtDate(options.rangeTo)}`
      : options.rangeFrom
      ? `Desde ${fmtDate(options.rangeFrom)}`
      : options.rangeTo
      ? `Hasta ${fmtDate(options.rangeTo)}`
      : 'Todos los registros';

  // ── Header ──
  const headerH = 30;
  doc.setFillColor(...BLUE);
  doc.rect(0, 0, pageW, headerH, 'F');
  doc.setFillColor(...ORANGE);
  doc.rect(0, headerH, pageW, 2, 'F');

  if (logoWhite) {
    try {
      doc.addImage(logoWhite, 'PNG', marginL, 7, 42, 14);
    } catch { /* ignore */ }
  }

  doc.setFontSize(16);
  doc.setFont(PDF_FONT, 'bold');
  doc.setTextColor(...WHITE);
  doc.text('REPORTE DE MANTENIMIENTOS', pageW - marginR, 14, { align: 'right' });
  doc.setFontSize(9);
  doc.setFont(PDF_FONT, 'normal');
  doc.setTextColor(200, 220, 240);
  doc.text(`Período: ${periodo}`, pageW - marginR, 20, { align: 'right' });
  if (options.ownerFilterName) {
    doc.text(`Propietario: ${options.ownerFilterName}`, pageW - marginR, 25, { align: 'right' });
  } else {
    doc.text(`Generado: ${dateStr} ${timeStr}`, pageW - marginR, 25, { align: 'right' });
  }

  y = headerH + 8;

  // ── Group by owner ──
  const byOwner = new Map<string, MaintenancePDFTicket[]>();
  for (const t of tickets) {
    const k = t.ownerName || 'Sin propietario';
    if (!byOwner.has(k)) byOwner.set(k, []);
    byOwner.get(k)!.push(t);
  }
  const owners = Array.from(byOwner.keys()).sort((a, b) => a.localeCompare(b, 'es'));

  // Column layout (landscape A4 = 297mm; content ~269mm)
  const cols = [
    { key: 'realizado', label: 'Fecha', w: 22 },
    { key: 'propiedad', label: 'Propiedad', w: 55 },
    { key: 'descripcion', label: 'Descripción', w: 80 },
    { key: 'proveedor', label: 'Proveedor', w: 40 },
    { key: 'estado', label: 'Estado', w: 28 },
    { key: 'costo', label: 'Costo', w: 44 },
  ];
  // Adjust last column width to fill remaining
  const usedW = cols.reduce((s, c) => s + c.w, 0);
  if (usedW < contentW) cols[cols.length - 1].w += (contentW - usedW);

  const checkPage = (needed: number) => {
    if (y + needed > pageH - 18) {
      doc.addPage();
      y = 18;
    }
  };

  const drawTableHeader = () => {
    checkPage(10);
    doc.setFillColor(...BLUE);
    doc.rect(marginL, y, contentW, 7, 'F');
    doc.setFontSize(8);
    doc.setFont(PDF_FONT, 'bold');
    doc.setTextColor(...WHITE);
    let cx = marginL + 2;
    for (const c of cols) {
      const align = c.key === 'costo' ? 'right' : 'left';
      const tx = align === 'right' ? cx + c.w - 4 : cx;
      doc.text(c.label, tx, y + 4.8, { align });
      cx += c.w;
    }
    y += 7;
  };

  const drawRow = (t: MaintenancePDFTicket, zebra: boolean) => {
    // Calculate row height based on description wrapping
    doc.setFontSize(8);
    doc.setFont(PDF_FONT, 'normal');
    const descLines = doc.splitTextToSize(t.descripcion || '-', cols[2].w - 4);
    const propLines = doc.splitTextToSize(t.propiedad || '-', cols[1].w - 4);
    const provLines = doc.splitTextToSize(t.proveedor || '-', cols[3].w - 4);
    const maxLines = Math.max(descLines.length, propLines.length, provLines.length, 1);
    const rowH = Math.max(7, maxLines * 4 + 2);

    checkPage(rowH);

    if (zebra) {
      doc.setFillColor(...BG_LIGHT);
      doc.rect(marginL, y, contentW, rowH, 'F');
    }
    doc.setDrawColor(...LIGHT_GRAY);
    doc.line(marginL, y + rowH, marginL + contentW, y + rowH);

    let cx = marginL + 2;
    doc.setFontSize(8);
    doc.setFont(PDF_FONT, 'normal');
    doc.setTextColor(...DARK);

    // Fecha
    doc.text(t.realizado, cx, y + 4.5);
    cx += cols[0].w;
    // Propiedad
    doc.text(propLines, cx, y + 4.5);
    cx += cols[1].w;
    // Descripción
    doc.text(descLines, cx, y + 4.5);
    cx += cols[2].w;
    // Proveedor
    doc.text(provLines, cx, y + 4.5);
    cx += cols[3].w;
    // Estado
    doc.setTextColor(...GRAY);
    doc.text(t.estado, cx, y + 4.5);
    cx += cols[4].w;
    // Costo
    doc.setFont(PDF_FONT, t.esEstimado ? 'normal' : 'bold');
    doc.setTextColor(...DARK);
    const costoTxt = t.esEstimado ? `${t.costoLabel} (est.)` : t.costoLabel;
    doc.text(costoTxt, cx + cols[5].w - 4, y + 4.5, { align: 'right' });

    y += rowH;
  };

  let grandTotal = 0;
  let grandCount = 0;

  for (const owner of owners) {
    const list = byOwner.get(owner)!;

    // Owner header
    checkPage(14);
    doc.setFillColor(...ORANGE);
    doc.rect(marginL, y, 3, 7, 'F');
    doc.setFontSize(11);
    doc.setFont(PDF_FONT, 'bold');
    doc.setTextColor(...DARK);
    doc.text(owner, marginL + 6, y + 5);
    doc.setFontSize(8);
    doc.setFont(PDF_FONT, 'normal');
    doc.setTextColor(...GRAY);
    doc.text(`${list.length} ticket${list.length === 1 ? '' : 's'}`, pageW - marginR, y + 5, { align: 'right' });
    y += 9;

    drawTableHeader();

    let subtotal = 0;
    list.forEach((t, idx) => {
      drawRow(t, idx % 2 === 1);
      subtotal += t.costo;
    });
    grandTotal += subtotal;
    grandCount += list.length;

    // Subtotal row
    checkPage(8);
    doc.setFillColor(235, 240, 248);
    doc.rect(marginL, y, contentW, 7, 'F');
    doc.setFontSize(9);
    doc.setFont(PDF_FONT, 'bold');
    doc.setTextColor(...BLUE);
    doc.text(`Subtotal — ${owner}`, marginL + 4, y + 4.8);
    doc.text(`Gs. ${Math.round(subtotal).toLocaleString('es-PY')}`, marginL + contentW - 4, y + 4.8, { align: 'right' });
    y += 11;
  }

  // Grand total
  checkPage(14);
  doc.setFillColor(...BLUE);
  doc.rect(marginL, y, contentW, 9, 'F');
  doc.setFontSize(11);
  doc.setFont(PDF_FONT, 'bold');
  doc.setTextColor(...WHITE);
  doc.text(`TOTAL GENERAL  ·  ${grandCount} ticket${grandCount === 1 ? '' : 's'}`, marginL + 4, y + 6);
  doc.text(`Gs. ${Math.round(grandTotal).toLocaleString('es-PY')}`, marginL + contentW - 4, y + 6, { align: 'right' });
  y += 14;

  // Footer on every page
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(...BLUE);
    doc.setLineWidth(0.3);
    doc.line(marginL, pageH - 12, pageW - marginR, pageH - 12);

    if (logoContract) {
      try { doc.addImage(logoContract, 'PNG', marginL, pageH - 10, 18, 6); } catch {}
    }

    doc.setFontSize(7);
    doc.setFont(PDF_FONT, 'normal');
    doc.setTextColor(...GRAY);
    doc.text(`Generado: ${dateStr} ${timeStr}`, pageW / 2, pageH - 6, { align: 'center' });
    doc.text(`Página ${i} de ${totalPages}`, pageW - marginR, pageH - 6, { align: 'right' });
  }

  const filename = `mantenimientos_${now.toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}
