import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { OwnerStatementLine } from '@/hooks/useOwnerStatement';
import { registerPdfFont, PDF_FONT } from '@/lib/pdfFontHelper';

const formatCurrency = (amount: number, currency: string) => {
  if (currency === 'USD') return `US$ ${amount.toLocaleString('es-PY', { minimumFractionDigits: 2 })}`;
  return `Gs. ${amount.toLocaleString('es-PY')}`;
};

export const exportOwnerStatementPDF = async (
  ownerName: string,
  month: string,
  lines: OwnerStatementLine[],
  propertyCount: number,
) => {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  registerPdfFont(pdf);

  const PAGE_W = 210;
  const ML = 30; // left margin 3cm
  const MR = 25;
  const MT = 25;
  const MB = 25;
  const CONTENT_W = PAGE_W - ML - MR;
  let y = MT;

  // ── Footer helper ──
  const addFooter = (pageNum: number) => {
    pdf.setFontSize(8);
    pdf.setTextColor(130, 130, 130);
    pdf.text(
      `Encarnación, Paraguay — Generado el ${format(new Date(), 'dd/MM/yyyy HH:mm')}`,
      PAGE_W / 2, 297 - 12, { align: 'center' }
    );
    pdf.text(`Página ${pageNum}`, PAGE_W - MR, 297 - 12, { align: 'right' });
    pdf.setTextColor(0, 0, 0);
  };

  const checkPage = (needed: number) => {
    if (y + needed > 297 - MB) {
      addFooter(pdf.getNumberOfPages());
      pdf.addPage();
      y = MT;
    }
  };

  // ── Logo ──
  try {
    const logoImg = new Image();
    logoImg.crossOrigin = 'anonymous';
    logoImg.src = '/logo-plusterra-contract.png';
    await new Promise<void>((resolve) => {
      logoImg.onload = () => resolve();
      logoImg.onerror = () => resolve();
      setTimeout(resolve, 2000);
    });
    if (logoImg.complete && logoImg.naturalWidth > 0) {
      const logoH = 14;
      const logoW = (logoImg.naturalWidth / logoImg.naturalHeight) * logoH;
      pdf.addImage(logoImg, 'PNG', ML, y, logoW, logoH);
      y += logoH + 6;
    }
  } catch {
    y += 6;
  }

  // ── Title ──
  const [yr, mo] = month.split('-').map(Number);
  const monthLabel = format(new Date(yr, mo - 1), 'MMMM yyyy', { locale: es });

  pdf.setFontSize(16);
  pdf.setFont(PDF_FONT, 'bold');
  pdf.text('Estado de Cuenta', ML, y);
  y += 8;

  pdf.setFontSize(12);
  pdf.setFont(PDF_FONT, 'normal');
  pdf.text(`Propietario/a: ${ownerName}`, ML, y);
  y += 6;
  pdf.text(`Período: ${monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}`, ML, y);
  y += 6;
  pdf.text(`Propiedades asociadas: ${propertyCount}`, ML, y);
  y += 10;

  // ── Summary ──
  const totalIncome = lines.filter(l => l.type === 'income').reduce((s, l) => s + l.amount, 0);
  const totalExpense = lines.filter(l => l.type === 'expense').reduce((s, l) => s + l.amount, 0);
  const balance = totalIncome - totalExpense;

  pdf.setFillColor(240, 248, 240);
  pdf.roundedRect(ML, y, CONTENT_W / 3 - 2, 18, 2, 2, 'F');
  pdf.setFillColor(255, 240, 240);
  pdf.roundedRect(ML + CONTENT_W / 3 + 1, y, CONTENT_W / 3 - 2, 18, 2, 2, 'F');
  pdf.setFillColor(240, 245, 255);
  pdf.roundedRect(ML + (CONTENT_W / 3) * 2 + 2, y, CONTENT_W / 3 - 2, 18, 2, 2, 'F');

  pdf.setFontSize(8);
  pdf.setTextColor(100);
  pdf.text('Ingresos', ML + CONTENT_W / 6 - 1, y + 6, { align: 'center' });
  pdf.text('Gastos', ML + CONTENT_W / 2, y + 6, { align: 'center' });
  pdf.text('Balance', ML + (CONTENT_W / 6) * 5 + 1, y + 6, { align: 'center' });

  pdf.setFontSize(11);
  pdf.setFont(PDF_FONT, 'bold');
  pdf.setTextColor(22, 128, 57);
  pdf.text(formatCurrency(totalIncome, 'PYG'), ML + CONTENT_W / 6 - 1, y + 13, { align: 'center' });
  pdf.setTextColor(180, 40, 40);
  pdf.text(formatCurrency(totalExpense, 'PYG'), ML + CONTENT_W / 2, y + 13, { align: 'center' });
  pdf.setTextColor(balance >= 0 ? 22 : 180, balance >= 0 ? 90 : 100, balance >= 0 ? 160 : 20);
  pdf.text(formatCurrency(balance, 'PYG'), ML + (CONTENT_W / 6) * 5 + 1, y + 13, { align: 'center' });

  pdf.setTextColor(0, 0, 0);
  pdf.setFont(PDF_FONT, 'normal');
  y += 26;

  // ── Table ──
  if (lines.length === 0) {
    pdf.setFontSize(11);
    pdf.setTextColor(120);
    pdf.text('Sin movimientos en este período.', ML, y);
    y += 10;
  } else {
    // Header
    const colX = [ML, ML + 22, ML + 22 + 65, ML + 22 + 65 + 45];
    const colW = [22, 65, 45, CONTENT_W - 22 - 65 - 45];

    pdf.setFillColor(230, 230, 235);
    pdf.rect(ML, y, CONTENT_W, 8, 'F');
    pdf.setFontSize(9);
    pdf.setFont(PDF_FONT, 'bold');
    pdf.text('Fecha', colX[0] + 2, y + 5.5);
    pdf.text('Descripción', colX[1] + 2, y + 5.5);
    pdf.text('Propiedad', colX[2] + 2, y + 5.5);
    pdf.text('Monto', colX[3] + colW[3] - 2, y + 5.5, { align: 'right' });
    y += 10;
    pdf.setFont(PDF_FONT, 'normal');

    lines.forEach((line, i) => {
      checkPage(8);

      if (i % 2 === 0) {
        pdf.setFillColor(248, 248, 250);
        pdf.rect(ML, y - 1, CONTENT_W, 7, 'F');
      }

      pdf.setFontSize(9);
      pdf.setTextColor(80);
      pdf.text(format(new Date(line.date + 'T12:00:00'), 'dd/MM'), colX[0] + 2, y + 4);

      // Description (truncate)
      const desc = line.description.length > 35 ? line.description.substring(0, 33) + '…' : line.description;
      pdf.setTextColor(30);
      pdf.text(desc, colX[1] + 2, y + 4);

      // Property (truncate)
      const prop = (line.property_title || '').length > 22
        ? (line.property_title || '').substring(0, 20) + '…'
        : (line.property_title || '');
      pdf.setTextColor(100);
      pdf.text(prop, colX[2] + 2, y + 4);

      // Amount
      const sign = line.type === 'income' ? '+' : '-';
      pdf.setTextColor(line.type === 'income' ? 22 : 180, line.type === 'income' ? 128 : 40, line.type === 'income' ? 57 : 40);
      pdf.setFont(PDF_FONT, 'bold');
      pdf.text(`${sign}${formatCurrency(line.amount, line.currency)}`, colX[3] + colW[3] - 2, y + 4, { align: 'right' });
      pdf.setFont(PDF_FONT, 'normal');

      y += 7;
    });

    // Totals row
    checkPage(12);
    y += 3;
    pdf.setDrawColor(180);
    pdf.line(ML, y, ML + CONTENT_W, y);
    y += 5;
    pdf.setFontSize(10);
    pdf.setFont(PDF_FONT, 'bold');
    pdf.setTextColor(0);
    pdf.text('Balance neto:', colX[2] + 2, y + 1);
    pdf.setTextColor(balance >= 0 ? 22 : 180, balance >= 0 ? 90 : 100, balance >= 0 ? 160 : 20);
    pdf.text(formatCurrency(balance, 'PYG'), colX[3] + colW[3] - 2, y + 1, { align: 'right' });
  }

  addFooter(pdf.getNumberOfPages());

  const fileName = `Estado_Cuenta_${ownerName.replace(/\s+/g, '_')}_${month}.pdf`;
  pdf.save(fileName);
};
