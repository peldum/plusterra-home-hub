import jsPDF from 'jspdf';
import { registerPdfFont, PDF_FONT } from './pdfFontHelper';
import { numberToWordsGuaranies } from './numberToWords';

export interface ReceiptData {
  emisorName: string;
  city: string;
  date: string;
  receiptNumber: string;
  receivedFrom: string;
  amount: string;
  currency: string;
  currencyLabel: string;
  cryptoPlatform: string;
  amountInWords: string;
  concept: string;
  paymentMethod: string;
  paymentMethodOther: string;
  propertyDescription: string;
  observations: string;
  signatureDataUrl: string | null;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  PYG: 'Gs.',
  USD: 'USD',
  BRL: 'BRL',
  ARS: 'ARS',
  USDT: 'USDT',
  BTC: 'BTC',
  OTHER: '',
};

function formatAmount(amount: string, currency: string, label?: string): string {
  const num = Number(amount) || 0;
  const sym = currency === 'OTHER' ? (label || '') : (CURRENCY_SYMBOLS[currency] || '');
  if (currency === 'PYG') {
    return `${sym} ${num.toLocaleString('es-PY')}`;
  }
  if (currency === 'BTC') {
    return `${num} ${sym}`;
  }
  return `${sym} ${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function numberToWordsUSD(n: number): string {
  if (n === 0) return 'cero dolares americanos';
  const intPart = Math.floor(n);
  const centPart = Math.round((n - intPart) * 100);
  // reuse guaranies logic for integer, replace suffix
  const words = numberToWordsGuaranies(intPart).replace(/ guaranies$/i, '').trim();
  let result = words + ' dolares americanos';
  if (centPart > 0) {
    result += ` con ${centPart}/100`;
  }
  return result;
}

export function autoAmountInWords(amount: string, currency: string): string {
  const num = Number(amount) || 0;
  if (num <= 0) return '';
  if (currency === 'PYG') return numberToWordsGuaranies(num);
  if (currency === 'USD') return numberToWordsUSD(num);
  return '';
}

function getPaymentMethodText(method: string, other: string): string {
  switch (method) {
    case 'efectivo': return 'Efectivo';
    case 'transferencia': return 'Transferencia bancaria';
    case 'binance': return 'Binance';
    case 'cripto_otro': return 'Cripto';
    case 'otro': return other || 'Otro';
    default: return method;
  }
}

async function loadLogoBase64(): Promise<string | null> {
  try {
    const res = await fetch(`${window.location.origin}/logo-plusterra-contract.png`);
    const blob = await res.blob();
    return await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function generateReceiptPDF(data: ReceiptData): Promise<jsPDF> {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  registerPdfFont(pdf);

  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const marginL = 25;
  const marginR = 25;
  const contentW = pageW - marginL - marginR;

  // ── Brand colors ──
  const BRAND_ORANGE: [number, number, number] = [252, 81, 0];
  const DARK: [number, number, number] = [40, 40, 40];
  const GRAY: [number, number, number] = [120, 120, 120];

  // ── Top accent bar ──
  pdf.setFillColor(...BRAND_ORANGE);
  pdf.rect(0, 0, pageW, 4, 'F');

  let y = 16;

  // ── Logo ──
  const logoBase64 = await loadLogoBase64();
  if (logoBase64) {
    try {
      pdf.addImage(logoBase64, 'PNG', marginL, y, 42, 14);
    } catch { /* ignore */ }
  }

  // Receipt number top right
  pdf.setFont(PDF_FONT, 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(...GRAY);
  pdf.text(`No. ${data.receiptNumber}`, pageW - marginR, y + 6, { align: 'right' });
  pdf.text(`${data.city}, ${data.date}`, pageW - marginR, y + 12, { align: 'right' });

  y += 24;

  // ── Separator line ──
  pdf.setDrawColor(...BRAND_ORANGE);
  pdf.setLineWidth(0.6);
  pdf.line(marginL, y, pageW - marginR, y);
  y += 12;

  // ── Title ──
  pdf.setFont(PDF_FONT, 'bold');
  pdf.setFontSize(16);
  pdf.setTextColor(...DARK);
  pdf.text('RECIBO DE DINERO', pageW / 2, y, { align: 'center' });
  y += 16;

  // ── Body paragraph with more line spacing ──
  pdf.setFont(PDF_FONT, 'normal');
  pdf.setFontSize(11);
  pdf.setTextColor(...DARK);

  const amountFormatted = formatAmount(data.amount, data.currency, data.currencyLabel);
  const paymentMethodText = getPaymentMethodText(data.paymentMethod, data.paymentMethodOther);

  let body = `Yo, ${data.emisorName}, recibi de ${data.receivedFrom} la suma de ${amountFormatted}`;

  if (data.amountInWords) {
    body += ` (${data.amountInWords})`;
  }

  body += ` en concepto de ${data.concept || '---'}.`;

  const mainLines = pdf.splitTextToSize(body, contentW);
  pdf.text(mainLines, marginL, y, { lineHeightFactor: 1.6 });
  y += mainLines.length * 7 + 10;

  // ── Payment details section ──
  pdf.setFillColor(248, 248, 248);
  const detailsH = 8 + (data.cryptoPlatform ? 7 : 0) + (data.propertyDescription ? 7 : 0);
  pdf.roundedRect(marginL, y - 2, contentW, detailsH + 6, 2, 2, 'F');

  pdf.setFont(PDF_FONT, 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(...DARK);
  pdf.text('Forma de cobro:', marginL + 4, y + 4);
  pdf.setFont(PDF_FONT, 'normal');
  pdf.text(paymentMethodText, marginL + 38, y + 4);
  y += 8;

  if (data.cryptoPlatform) {
    pdf.setFont(PDF_FONT, 'bold');
    pdf.text('Plataforma/Red:', marginL + 4, y + 4);
    pdf.setFont(PDF_FONT, 'normal');
    pdf.text(data.cryptoPlatform, marginL + 38, y + 4);
    y += 7;
  }

  if (data.propertyDescription) {
    pdf.setFont(PDF_FONT, 'bold');
    pdf.text('Inmueble:', marginL + 4, y + 4);
    pdf.setFont(PDF_FONT, 'normal');
    pdf.text(data.propertyDescription, marginL + 38, y + 4);
    y += 7;
  }

  y += 8;

  if (data.observations) {
    pdf.setFont(PDF_FONT, 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor(...GRAY);
    const obsLines = pdf.splitTextToSize(`Observaciones: ${data.observations}`, contentW);
    pdf.text(obsLines, marginL, y);
    y += obsLines.length * 5 + 6;
  }

  y += 14;

  // Ensure space for signature
  if (y > 220) y = 220;

  // ── Signature area ──
  const sigX = pageW / 2;

  if (data.signatureDataUrl) {
    try {
      pdf.addImage(data.signatureDataUrl, 'PNG', sigX - 30, y, 60, 22);
      y += 24;
    } catch {
      pdf.setDrawColor(...GRAY);
      pdf.setLineDashPattern([1, 1], 0);
      pdf.line(sigX - 40, y + 15, sigX + 40, y + 15);
      pdf.setLineDashPattern([], 0);
      y += 18;
    }
  } else {
    pdf.setDrawColor(...GRAY);
    pdf.setLineDashPattern([1, 1], 0);
    pdf.line(sigX - 40, y + 15, sigX + 40, y + 15);
    pdf.setLineDashPattern([], 0);
    y += 18;
  }

  pdf.setFont(PDF_FONT, 'bold');
  pdf.setFontSize(11);
  pdf.setTextColor(...DARK);
  pdf.text(data.emisorName, sigX, y, { align: 'center' });

  // ── Bottom accent bar ──
  pdf.setFillColor(...BRAND_ORANGE);
  pdf.rect(0, pageH - 4, pageW, 4, 'F');

  // ── Footer ──
  pdf.setFont(PDF_FONT, 'normal');
  pdf.setFontSize(7);
  pdf.setTextColor(...GRAY);
  pdf.text('Plusterra Negocios Inmobiliarios', pageW / 2, pageH - 8, { align: 'center' });
  pdf.text(`Documento generado el ${new Date().toLocaleDateString('es-PY')}`, pageW / 2, pageH - 12, { align: 'center' });

  return pdf;
}
