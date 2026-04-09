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

export function generateReceiptPDF(data: ReceiptData): jsPDF {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  registerPdfFont(pdf);

  const pageW = pdf.internal.pageSize.getWidth();
  const marginL = 25;
  const marginR = 25;
  const contentW = pageW - marginL - marginR;
  let y = 30;

  // Title
  pdf.setFont(PDF_FONT, 'bold');
  pdf.setFontSize(18);
  pdf.text('RECIBO DE DINERO', pageW / 2, y, { align: 'center' });
  y += 12;

  // Receipt number top right
  pdf.setFont(PDF_FONT, 'normal');
  pdf.setFontSize(10);
  pdf.text(`No. ${data.receiptNumber}`, pageW - marginR, 20, { align: 'right' });

  // City and date
  pdf.setFontSize(11);
  pdf.text(`${data.city}, ${data.date}`, marginL, y);
  y += 14;

  // Separator line
  pdf.setDrawColor(180, 180, 180);
  pdf.setLineWidth(0.3);
  pdf.line(marginL, y, pageW - marginR, y);
  y += 10;

  // Body paragraph
  pdf.setFont(PDF_FONT, 'normal');
  pdf.setFontSize(12);

  const amountFormatted = formatAmount(data.amount, data.currency, data.currencyLabel);
  const paymentMethodText = getPaymentMethodText(data.paymentMethod, data.paymentMethodOther);

  let body = `Yo, ${data.emisorName}, recibi de ${data.receivedFrom} la suma de ${amountFormatted}`;

  if (data.amountInWords) {
    body += ` (${data.amountInWords})`;
  }

  body += ` en concepto de ${data.concept || '---'}.`;
  body += `\n\nForma de cobro: ${paymentMethodText}.`;

  if (data.cryptoPlatform) {
    body += `\nPlataforma/Red: ${data.cryptoPlatform}.`;
  }

  if (data.propertyDescription) {
    body += `\n\nInmueble: ${data.propertyDescription}`;
  }

  if (data.observations) {
    body += `\n\nObservaciones: ${data.observations}`;
  }

  const lines = pdf.splitTextToSize(body, contentW);
  pdf.text(lines, marginL, y);
  y += lines.length * 6 + 20;

  // Ensure space for signature
  if (y > 230) y = 230;

  // Signature area
  const sigX = pageW / 2;

  if (data.signatureDataUrl) {
    try {
      pdf.addImage(data.signatureDataUrl, 'PNG', sigX - 25, y, 50, 20);
      y += 22;
    } catch {
      // fallback to dotted line
      pdf.setLineDashPattern([1, 1], 0);
      pdf.line(sigX - 35, y + 15, sigX + 35, y + 15);
      pdf.setLineDashPattern([], 0);
      y += 18;
    }
  } else {
    pdf.setLineDashPattern([1, 1], 0);
    pdf.line(sigX - 35, y + 15, sigX + 35, y + 15);
    pdf.setLineDashPattern([], 0);
    y += 18;
  }

  pdf.setFont(PDF_FONT, 'bold');
  pdf.setFontSize(11);
  pdf.text(data.emisorName, sigX, y, { align: 'center' });

  // Footer
  pdf.setFont(PDF_FONT, 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(150, 150, 150);
  pdf.text(`Documento generado el ${new Date().toLocaleDateString('es-PY')}`, pageW / 2, 285, { align: 'center' });

  return pdf;
}
