/**
 * contractExport.ts
 *
 * Sistema de exportación de contratos — Plusterra
 *
 * Estrategia:
 *  - downloadContractPDF: genera PDF A4 profesional usando jsPDF con texto nativo.
 *    Sin dependencia de html2canvas / viewport. Sin cortes de texto. Pie de página automático.
 *  - printContractPDF: usa iframe oculto con CSS @print optimizado para A4.
 *  - buildContractWhatsAppMessage / canExportContract: sin cambios (lógica de negocio intacta).
 *
 * REGLA DE ORO: No se modifica lógica de permisos ni contenido legal de los contratos.
 */

import { generateRentalContractText } from '@/lib/contractTemplates';
import type { ContractWithRelations } from '@/hooks/useContracts';
import { jsPDF } from 'jspdf';
import { registerPdfFont, PDF_FONT } from '@/lib/pdfFontHelper';

// ─── Formatters ──────────────────────────────────────────────────────────────

const formatDate = (d: string) =>
  new Date(d + 'T12:00:00').toLocaleDateString('es-PY', { day: '2-digit', month: '2-digit', year: 'numeric' });

const formatCurrency = (amount: number, currency?: string | null) =>
  `${currency === 'USD' ? 'USD' : 'Gs.'} ${Number(amount).toLocaleString('es-PY')}`;

const contractTypeLabels: Record<string, string> = {
  rental: 'Alquiler',
  temporary_rental: 'Alquiler Temporal',
  sale: 'Venta',
  property_management: 'Administración',
  exclusivity: 'Exclusividad',
};

// ─── jsPDF Native PDF Generator ──────────────────────────────────────────────

/**
 * Genera un PDF A4 nativo usando jsPDF con texto vectorial.
 * - Márgenes legales: sup 2.5cm, inf 2.5cm, izq 3cm, der 2.5cm
 * - Fuente: Helvetica (equivalente Arial en jsPDF)
 * - Interlineado 1.5, texto justificado
 * - Pie de página automático en cada página
 * - Sin cortes de palabras ni desborde
 */
const generateNativePDF = async (contract: ContractWithRelations): Promise<jsPDF> => {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  registerPdfFont(pdf);

  // ── Medidas A4 ──
  const PAGE_W = 210;
  const PAGE_H = 297;
  const MARGIN_TOP = 25;      // 2.5cm
  const MARGIN_BOTTOM = 25;   // 2.5cm
  const MARGIN_LEFT = 30;     // 3cm
  const MARGIN_RIGHT = 25;    // 2.5cm
  const CONTENT_W = PAGE_W - MARGIN_LEFT - MARGIN_RIGHT; // ~155mm
  const FOOTER_H = 12;        // espacio reservado para pie de página
  const MAX_Y = PAGE_H - MARGIN_BOTTOM - FOOTER_H;

  let curY = MARGIN_TOP;
  let pageNum = 1;

  // ── Timestamp ──
  const now = new Date();
  const genDate = now.toLocaleDateString('es-PY', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const genTime = now.toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' });

  // ── Footer helper ──
  const drawFooter = (pn: number) => {
    const footerY = PAGE_H - MARGIN_BOTTOM + 4;
    pdf.setFont(PDF_FONT, 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(150, 150, 150);
    pdf.setDrawColor(200, 200, 200);
    pdf.setLineWidth(0.3);
    pdf.line(MARGIN_LEFT, footerY - 2, PAGE_W - MARGIN_RIGHT, footerY - 2);
    pdf.text('Contrato generado por Plusterra', MARGIN_LEFT, footerY + 2);
    pdf.text(`Fecha: ${genDate}  ·  Hora: ${genTime}  ·  Lugar: Paraguay`, MARGIN_LEFT, footerY + 6);
    pdf.text(`Página ${pn}`, PAGE_W - MARGIN_RIGHT, footerY + 2, { align: 'right' });
    pdf.setTextColor(0, 0, 0);
  };

  // ── New page helper ──
  const newPage = () => {
    drawFooter(pageNum);
    pageNum++;
    pdf.addPage();
    curY = MARGIN_TOP;
  };

  // ── Check space helper ──
  const checkSpace = (needed: number) => {
    if (curY + needed > MAX_Y) newPage();
  };

  // ── Text block helper: renders wrapped, justified text ──
  const addText = (text: string, fontSize: number, style: 'normal' | 'bold', color: [number, number, number] = [0, 0, 0], marginAfter = 4) => {
    pdf.setFont(PDF_FONT, style);
    pdf.setFontSize(fontSize);
    pdf.setTextColor(...color);
    const lines = pdf.splitTextToSize(text, CONTENT_W);
    lines.forEach((line: string) => {
      checkSpace(fontSize * 0.3528 * 1.5 + 1);
      pdf.text(line, MARGIN_LEFT, curY, { align: 'left' });
      curY += fontSize * 0.3528 * 1.5;
    });
    curY += marginAfter;
    pdf.setTextColor(0, 0, 0);
  };

  // ── Logo (fetch base64) ──
  let logoBase64 = '';
  try {
    const resp = await fetch(`${window.location.origin}/logo-plusterra-contract.png`);
    const blob = await resp.blob();
    logoBase64 = await new Promise<string>(resolve => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch { /* sin logo */ }

  // ── Header: Logo + info empresa ──
  if (logoBase64) {
    pdf.addImage(logoBase64, 'PNG', MARGIN_LEFT, curY, 40, 14);
  }
  pdf.setFont(PDF_FONT, 'bold');
  pdf.setFontSize(9);
  pdf.setTextColor(0, 68, 124);
  pdf.text('Plusterra Negocios Inmobiliarios', PAGE_W - MARGIN_RIGHT, curY + 5, { align: 'right' });
  pdf.setFont(PDF_FONT, 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(100, 100, 100);
  pdf.text('Encarnación, Paraguay', PAGE_W - MARGIN_RIGHT, curY + 10, { align: 'right' });
  curY += 18;

  // Línea separadora header
  pdf.setDrawColor(0, 68, 124);
  pdf.setLineWidth(0.5);
  pdf.line(MARGIN_LEFT, curY, PAGE_W - MARGIN_RIGHT, curY);
  curY += 8;
  pdf.setTextColor(0, 0, 0);
  pdf.setDrawColor(0, 0, 0);

  // ── Contenido del contrato ──
  const cd = contract.contract_data as Record<string, any> | null;
  const contractType = contractTypeLabels[contract.contract_type] || contract.contract_type;
  const clientName = contract.clients?.full_name || contract.tenant_name || 'Sin cliente';

  if (cd && typeof cd.contract_date === 'string') {
    // ── Contrato completo generado desde plantilla ──
    const rawText = generateRentalContractText(cd as any);
    const lines = rawText.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();

      // Filtrar líneas de firma intermedias (media firma) — ya van en sección final
      if (trimmed.startsWith('Media firma') || trimmed.startsWith('Firma:') || trimmed.startsWith('___')) continue;

      if (trimmed === '') {
        curY += 3;
        continue;
      }

      if (trimmed.startsWith('CONTRATO DE ALQUILER')) {
        checkSpace(14);
        pdf.setFont(PDF_FONT, 'bold');
        pdf.setFontSize(14);
        pdf.setTextColor(0, 68, 124);
        const titleLines = pdf.splitTextToSize(trimmed, CONTENT_W);
        titleLines.forEach((tl: string) => {
          pdf.text(tl, PAGE_W / 2, curY, { align: 'center' });
          curY += 7;
        });
        curY += 4;
        pdf.setTextColor(0, 0, 0);
        continue;
      }

      const isClause = /^(PRIMERA|SEGUNDA|TERCERA|CUARTA|QUINTA|SEXTA|SÉPTIMA|OCTAVA|NOVENA|DÉCIMA)/.test(trimmed);
      if (isClause) {
        checkSpace(10);
        pdf.setFont(PDF_FONT, 'bold');
        pdf.setFontSize(11);
        pdf.setTextColor(0, 68, 124);
        const clauseLines = pdf.splitTextToSize(trimmed, CONTENT_W);
        clauseLines.forEach((cl: string) => {
          checkSpace(6);
          pdf.text(cl, MARGIN_LEFT, curY);
          curY += 6;
        });
        curY += 2;
        pdf.setTextColor(0, 0, 0);
        continue;
      }

      // Párrafo normal
      addText(trimmed, 11, 'normal', [0, 0, 0], 3);
    }

    // ── Sección de firmas ──
    checkSpace(80);
    curY += 10;
    pdf.setDrawColor(180, 180, 180);
    pdf.setLineWidth(0.3);
    pdf.line(MARGIN_LEFT, curY, PAGE_W - MARGIN_RIGHT, curY);
    curY += 6;

    pdf.setFont(PDF_FONT, 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(120, 120, 120);
    pdf.text('EN PRUEBA DE CONFORMIDAD, FIRMAN LAS PARTES', PAGE_W / 2, curY, { align: 'center' });
    curY += 12;

    const sigY = curY;
    // Firmas simétricas: Locatario centrado en 25%, Propietario en 75%
    const sigLineW = 55;
    const sig1CX = MARGIN_LEFT + CONTENT_W * 0.25; // centro izquierdo
    const sig2CX = MARGIN_LEFT + CONTENT_W * 0.75; // centro derecho

    // Líneas de firma — mismo largo, misma altura
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.5);
    pdf.line(sig1CX - sigLineW / 2, sigY + 20, sig1CX + sigLineW / 2, sigY + 20);
    pdf.line(sig2CX - sigLineW / 2, sigY + 20, sig2CX + sigLineW / 2, sigY + 20);

    // Nombres
    pdf.setFont(PDF_FONT, 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(0, 0, 0);
    const tName = cd.tenant_name || clientName;
    const lName = cd.landlord_name || 'Propietario/a';
    pdf.text(tName, sig1CX, sigY + 26, { align: 'center' });
    pdf.text(lName, sig2CX, sigY + 26, { align: 'center' });

    // Roles
    pdf.setFont(PDF_FONT, 'normal');
    pdf.setFontSize(8.5);
    pdf.setTextColor(100, 100, 100);
    pdf.text('Locatario/a', sig1CX, sigY + 31, { align: 'center' });
    pdf.text('Propietario/a', sig2CX, sigY + 31, { align: 'center' });

    // Documentos
    if (cd.tenant_document) {
      pdf.text(`CI: ${cd.tenant_document}`, sig1CX, sigY + 36, { align: 'center' });
    }
    if (cd.landlord_document) {
      pdf.text(`CI: ${cd.landlord_document}`, sig2CX, sigY + 36, { align: 'center' });
    }

    // Sello Plusterra — centrado, sobrio, sin color naranja
    curY = sigY + 52;
    const sealLineW = 55;
    pdf.setDrawColor(150, 150, 150);
    pdf.setLineWidth(0.4);
    pdf.line(PAGE_W / 2 - sealLineW / 2, curY, PAGE_W / 2 + sealLineW / 2, curY);
    curY += 5;
    pdf.setFont(PDF_FONT, 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(0, 0, 0);
    pdf.text('Plusterra', PAGE_W / 2, curY, { align: 'center' });

  } else {
    // ── Fallback: resumen estructurado ──
    const rent = formatCurrency(Number(contract.monthly_rent || 0), contract.currency);
    const deposit = contract.deposit_amount ? formatCurrency(Number(contract.deposit_amount), contract.currency) : null;

    // Título
    checkSpace(14);
    pdf.setFont(PDF_FONT, 'bold');
    pdf.setFontSize(14);
    pdf.setTextColor(0, 68, 124);
    pdf.text(`CONTRATO DE ${contractType.toUpperCase()}`, PAGE_W / 2, curY, { align: 'center' });
    curY += 6;
    pdf.setFont(PDF_FONT, 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor(100, 100, 100);
    pdf.text('Resumen de condiciones pactadas', PAGE_W / 2, curY, { align: 'center' });
    curY += 10;
    pdf.setTextColor(0, 0, 0);

    // Tabla resumen
    const rows: [string, string][] = [
      ['Tipo de operación', contractType],
      ['Propiedad', (contract.properties?.title || 'Sin propiedad') + (contract.property_address ? ` · ${contract.property_address}` : '')],
      ['Inquilino / Parte', clientName],
      ...(contract.tenant_document ? [['Documento', contract.tenant_document]] as [string, string][] : []),
      ...(contract.landlord_name ? [['Propietario', contract.landlord_name]] as [string, string][] : []),
      ...(contract.landlord_document ? [['Documento propietario', contract.landlord_document]] as [string, string][] : []),
      ['Inicio', formatDate(contract.start_date)],
      ...(contract.end_date ? [['Vencimiento', formatDate(contract.end_date)]] as [string, string][] : []),
      ['Canon mensual', rent],
      ...(deposit ? [['Depósito de garantía', deposit]] as [string, string][] : []),
      ...(contract.currency ? [['Moneda', contract.currency]] as [string, string][] : []),
      ...(contract.has_garage ? [['Cochera', contract.garage_details || 'Sí']] as [string, string][] : []),
      ...(contract.nis_ande ? [['NIS ANDE', contract.nis_ande]] as [string, string][] : []),
      ...(contract.services_included ? [['Servicios incluidos', contract.services_included]] as [string, string][] : []),
      ...(contract.notes ? [['Notas', contract.notes]] as [string, string][] : []),
    ];

    const rowH = 8;
    const col1W = CONTENT_W * 0.38;
    const col2W = CONTENT_W - col1W;

    rows.forEach(([label, value]) => {
      checkSpace(rowH + 2);
      // Fondo label
      pdf.setFillColor(240, 244, 249);
      pdf.rect(MARGIN_LEFT, curY - 5, col1W, rowH, 'F');
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.2);
      pdf.rect(MARGIN_LEFT, curY - 5, CONTENT_W, rowH);

      pdf.setFont(PDF_FONT, 'bold');
      pdf.setFontSize(9.5);
      pdf.setTextColor(0, 68, 124);
      pdf.text(label, MARGIN_LEFT + 2, curY);

      pdf.setFont(PDF_FONT, 'normal');
      pdf.setTextColor(0, 0, 0);
      const valLines = pdf.splitTextToSize(value, col2W - 4);
      pdf.text(valLines[0] || '', MARGIN_LEFT + col1W + 2, curY);
      curY += rowH;
    });

    curY += 16;

    // Firmas fallback
    checkSpace(60);
    pdf.setDrawColor(180, 180, 180);
    pdf.setLineWidth(0.3);
    pdf.line(MARGIN_LEFT, curY, PAGE_W - MARGIN_RIGHT, curY);
    curY += 6;
    pdf.setFont(PDF_FONT, 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(120, 120, 120);
    pdf.text('EN PRUEBA DE CONFORMIDAD, FIRMAN LAS PARTES', PAGE_W / 2, curY, { align: 'center' });
    curY += 12;

    const sigY = curY;
    const sigLineW = 55;
    const sig1CX = MARGIN_LEFT + CONTENT_W * 0.25;
    const sig2CX = MARGIN_LEFT + CONTENT_W * 0.75;

    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.5);
    pdf.line(sig1CX - sigLineW / 2, sigY + 20, sig1CX + sigLineW / 2, sigY + 20);
    pdf.line(sig2CX - sigLineW / 2, sigY + 20, sig2CX + sigLineW / 2, sigY + 20);

    pdf.setFont(PDF_FONT, 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(0, 0, 0);
    pdf.text(clientName, sig1CX, sigY + 26, { align: 'center' });
    pdf.text(contract.landlord_name || 'Propietario/a', sig2CX, sigY + 26, { align: 'center' });

    pdf.setFont(PDF_FONT, 'normal');
    pdf.setFontSize(8.5);
    pdf.setTextColor(100, 100, 100);
    pdf.text('Locatario/a', sig1CX, sigY + 31, { align: 'center' });
    pdf.text('Propietario/a', sig2CX, sigY + 31, { align: 'center' });

    curY = sigY + 50;
    const sealLineW = 55;
    pdf.setDrawColor(150, 150, 150);
    pdf.setLineWidth(0.4);
    pdf.line(PAGE_W / 2 - sealLineW / 2, curY, PAGE_W / 2 + sealLineW / 2, curY);
    curY += 5;
    pdf.setFont(PDF_FONT, 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(0, 0, 0);
    pdf.text('Plusterra', PAGE_W / 2, curY, { align: 'center' });
  }

  // ── Footer última página ──
  drawFooter(pageNum);

  return pdf;
};

// ─── Public API ──────────────────────────────────────────────────────────────

/** Fetch logo as base64 (para impresión por iframe) */
const fetchLogoBase64 = async (): Promise<string> => {
  try {
    const url = `${window.location.origin}/logo-plusterra-contract.png`;
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch {
    return '';
  }
};

/**
 * buildContractHtml — HTML para vista previa e impresión del navegador.
 * Usa CSS @print con A4 exacto, márgenes legales y pie de página fijo.
 * No depende de html2canvas.
 */
export const buildContractHtml = (contract: ContractWithRelations, logoBase64 = ''): string => {
  const cd = contract.contract_data as Record<string, any> | null;
  const propertyTitle = contract.properties?.title || 'Sin propiedad';
  const propertyAddress = contract.property_address || contract.properties?.address || '';
  const clientName = contract.clients?.full_name || contract.tenant_name || 'Sin cliente';
  const contractType = contractTypeLabels[contract.contract_type] || contract.contract_type;
  const rent = formatCurrency(Number(contract.monthly_rent || 0), contract.currency);
  const deposit = contract.deposit_amount ? formatCurrency(Number(contract.deposit_amount), contract.currency) : null;

  const now = new Date();
  const genDate = now.toLocaleDateString('es-PY', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const genTime = now.toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' });

  let bodyContent = '';

  if (cd && typeof cd.contract_date === 'string') {
    const text: string = generateRentalContractText(cd as any);
    bodyContent = text
      .split('\n')
      .filter((line: string) => !line.startsWith('Media firma') && !line.startsWith('Firma:') && !line.startsWith('___'))
      .map((line: string) => {
        if (line.startsWith('CONTRATO DE ALQUILER')) return `<h1>${line}</h1>`;
        if (line.match(/^(PRIMERA|SEGUNDA|TERCERA|CUARTA|QUINTA|SEXTA|SÉPTIMA|OCTAVA|NOVENA|DÉCIMA)/))
          return `<h3>${line}</h3>`;
        if (line.trim() === '') return '<br/>';
        return `<p>${line}</p>`;
      })
      .join('');

    bodyContent += `
      <div class="signatures-section">
        <p class="signatures-title">En prueba de conformidad, firman las partes</p>
        <div class="signatures-row">
          <div class="sig-block">
            <div class="sig-space"></div>
            <p class="sig-name">${cd.tenant_name || clientName}</p>
            <p class="sig-role">Locatario/a</p>
            <p class="sig-doc">${cd.tenant_document ? 'CI: ' + cd.tenant_document : ''}</p>
          </div>
          <div class="sig-block">
            <div class="sig-space"></div>
            <p class="sig-name">${cd.landlord_name || 'Propietario/a'}</p>
            <p class="sig-role">Propietario/a</p>
            <p class="sig-doc">${cd.landlord_document ? 'CI: ' + cd.landlord_document : ''}</p>
          </div>
        </div>
        <div style="display:flex;justify-content:center;margin-top:16px;">
          <div class="sig-block-center">
            <p class="sig-name">Plusterra</p>
          </div>
        </div>
      </div>`;
  } else {
    const rows = [
      ['Tipo de operación', contractType],
      ['Propiedad', propertyTitle + (propertyAddress ? ` · ${propertyAddress}` : '')],
      ['Inquilino / Parte', clientName],
      ...(contract.tenant_document ? [['Documento', contract.tenant_document]] : []),
      ...(contract.landlord_name ? [['Propietario', contract.landlord_name]] : []),
      ...(contract.landlord_document ? [['Documento propietario', contract.landlord_document]] : []),
      ['Inicio', formatDate(contract.start_date)],
      ...(contract.end_date ? [['Vencimiento', formatDate(contract.end_date)]] : []),
      ['Canon mensual', rent],
      ...(deposit ? [['Depósito de garantía', deposit]] : []),
      ...(contract.currency ? [['Moneda', contract.currency]] : []),
      ...(contract.has_garage ? [['Cochera', contract.garage_details || 'Sí']] : []),
      ...(contract.nis_ande ? [['NIS ANDE', contract.nis_ande]] : []),
      ...(contract.services_included ? [['Servicios incluidos', contract.services_included]] : []),
      ...(contract.notes ? [['Notas', contract.notes]] : []),
    ] as [string, string][];

    const tableRows = rows.map(([label, value]) =>
      `<tr><td class="label">${label}</td><td>${value}</td></tr>`
    ).join('');

    bodyContent = `
      <h1>Contrato de ${contractType}</h1>
      <p class="subtitle">Resumen de condiciones pactadas</p>
      <table>${tableRows}</table>
      <div class="signatures-section">
        <p class="signatures-title">En prueba de conformidad, firman las partes</p>
        <div class="signatures-row">
          <div class="sig-block">
            <div class="sig-space"></div>
            <p class="sig-name">${clientName}</p>
            <p class="sig-role">Locatario/a</p>
            <p class="sig-doc">${contract.tenant_document ? 'CI: ' + contract.tenant_document : ''}</p>
          </div>
          <div class="sig-block">
            <div class="sig-space"></div>
            <p class="sig-name">${contract.landlord_name || 'Propietario/a'}</p>
            <p class="sig-role">Propietario/a</p>
            <p class="sig-doc">${contract.landlord_document ? 'CI: ' + contract.landlord_document : ''}</p>
          </div>
        </div>
        <div style="display:flex;justify-content:center;margin-top:16px;">
          <div class="sig-block-center">
            <p class="sig-name">Plusterra</p>
          </div>
        </div>
      </div>`;
  }

  return buildHtmlWrapper(`Contrato de ${contractType}`, bodyContent, logoBase64, genDate, genTime);
};

const buildHtmlWrapper = (title: string, body: string, logoBase64: string, genDate: string, genTime: string): string => `
  <!DOCTYPE html>
  <html lang="es">
  <head>
    <meta charset="UTF-8"/>
    <title>${title}</title>
    <style>
      /* ── Reset ── */
      * { box-sizing: border-box; margin: 0; padding: 0; }

      /* ── Body: A4 screen preview ── */
      html, body {
        font-family: 'Times New Roman', Times, serif;
        font-size: 12pt;
        line-height: 1.5;
        color: #000;
        background: #f0f0f0;
      }
      .page {
        width: 210mm;
        min-height: 297mm;
        margin: 10mm auto;
        background: #fff;
        padding: 25mm 25mm 35mm 30mm; /* top right bottom left — márgenes legales */
        position: relative;
        box-shadow: 0 2px 12px rgba(0,0,0,0.12);
      }

      /* ── Header ── */
      .contract-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-bottom: 2px solid #00447C;
        padding-bottom: 12px;
        margin-bottom: 24px;
      }
      .contract-header img { height: 48px; width: auto; }
      .contract-header-info {
        text-align: right;
        font-size: 9pt;
        color: #555;
        line-height: 1.4;
      }
      .contract-header-info strong {
        font-size: 10pt;
        color: #00447C;
        display: block;
      }

      /* ── Titles ── */
      h1 {
        text-align: center;
        font-size: 15pt;
        font-weight: bold;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: #00447C;
        margin-bottom: 4px;
      }
      .subtitle {
        text-align: center;
        font-size: 10pt;
        color: #555;
        margin-bottom: 24px;
      }
      h3 {
        font-size: 11pt;
        font-weight: bold;
        margin-top: 16px;
        margin-bottom: 5px;
        color: #00447C;
      }

      /* ── Body text ── */
      p {
        text-align: justify;
        margin-bottom: 8px;
        font-size: 11pt;
        line-height: 1.5;
      }

      /* ── Table ── */
      table {
        width: 100%;
        border-collapse: collapse;
        margin: 20px 0 28px;
        font-size: 10.5pt;
      }
      td {
        padding: 6px 10px;
        border: 1px solid #ccc;
        vertical-align: top;
        line-height: 1.4;
      }
      td.label {
        font-weight: bold;
        width: 38%;
        background: #f0f4f9;
        color: #00447C;
      }

      /* ── Signatures ── */
      .signatures-section {
        margin-top: 80px;
        page-break-inside: avoid;
      }
      .signatures-title {
        text-align: center;
        font-size: 8pt;
        color: #888;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        margin-bottom: 40px;
      }
      /* Firmas simétricas: Locatario al 25%, Propietario al 75% */
      .signatures-row {
        display: flex;
        justify-content: space-around;
        gap: 0;
        margin-bottom: 40px;
        padding: 0 5%;
      }
      .sig-block {
        width: 40%;
        text-align: center;
      }
      .sig-space {
        height: 56px;
        border-bottom: 1.5px solid #000;
        margin-bottom: 8px;
        width: 100%;
      }
      .sig-name { font-size: 10.5pt; font-weight: bold; color: #000; margin-bottom: 2px; }
      .sig-role { font-size: 8.5pt; color: #555; font-style: italic; margin-bottom: 2px; }
      .sig-doc { font-size: 8.5pt; color: #777; }
      /* Sello Plusterra — sobrio, institucional, sin color naranja */
      .sig-block-center {
        text-align: center;
        border-top: 1px solid #999;
        padding-top: 8px;
        width: 200px;
        margin: 0 auto;
      }
      .sig-block-center .sig-name { color: #000; font-size: 10.5pt; }
      .sig-block-center .sig-role { color: #555; font-style: normal; font-size: 8.5pt; }

      /* ── Footer: fijo al fondo de cada página en impresión ── */
      .page-footer {
        position: absolute;
        bottom: 10mm;
        left: 30mm;
        right: 25mm;
        border-top: 0.5px solid #ddd;
        padding-top: 4px;
        font-size: 7.5pt;
        color: #aaa;
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
      }

      /* ── Print: A4 exacto, márgenes legales, pie de página real ── */
      @media print {
        html, body { background: #fff; }
        .page {
          width: 100%;
          min-height: auto;
          margin: 0;
          padding: 0;
          box-shadow: none;
        }
        @page {
          size: A4 portrait;
          margin-top: 2.5cm;
          margin-bottom: 2.5cm;
          margin-left: 3cm;
          margin-right: 2.5cm;
        }
        /* Pie de página usando @page counter — funciona en todos los navegadores modernos */
        @page {
          @bottom-center {
            content: "Contrato generado por Plusterra  ·  Fecha: ${genDate}  ·  Hora: ${genTime}  ·  Lugar: Paraguay";
            font-family: Arial, sans-serif;
            font-size: 7pt;
            color: #aaa;
          }
          @bottom-right {
            content: "Página " counter(page) " de " counter(pages);
            font-family: Arial, sans-serif;
            font-size: 7pt;
            color: #aaa;
          }
        }
        .page-footer { display: none; }
        h3 { page-break-after: avoid; }
        p { orphans: 3; widows: 3; }
        .signatures-section { page-break-inside: avoid; }
        table { page-break-inside: avoid; }
      }
    </style>
  </head>
  <body>
    <div class="page">
      <div class="contract-header">
        ${logoBase64 ? `<img src="${logoBase64}" alt="Plusterra" style="mix-blend-mode:multiply;" />` : '<div style="width:120px"></div>'}
        <div class="contract-header-info">
          <strong>Plusterra Negocios Inmobiliarios</strong>
          Encarnación, Paraguay
        </div>
      </div>

      ${body}

      <!-- Pie de página visible en pantalla (en impresión lo maneja @page) -->
      <div class="page-footer">
        <span>Contrato generado por Plusterra &nbsp;·&nbsp; Fecha: ${genDate} &nbsp;·&nbsp; Hora: ${genTime} &nbsp;·&nbsp; Lugar: Paraguay</span>
      </div>
    </div>
  </body>
  </html>
`;

/** Open print dialog — usa iframe oculto con CSS A4 optimizado */
export const printContractPDF = async (contract: ContractWithRelations) => {
  const logoBase64 = await fetchLogoBase64();
  const html = buildContractHtml(contract, logoBase64);
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:0;';
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) { document.body.removeChild(iframe); return; }
  doc.open();
  doc.write(html);
  doc.close();
  setTimeout(() => {
    iframe.contentWindow?.print();
    setTimeout(() => document.body.removeChild(iframe), 2000);
  }, 600);
};

/** Genera y descarga PDF nativo A4 — sin html2canvas, sin dependencia de viewport */
export const downloadContractPDF = async (contract: ContractWithRelations) => {
  const pdf = await generateNativePDF(contract);
  const clientName = contract.clients?.full_name || contract.tenant_name || 'cliente';
  pdf.save(`contrato-${clientName.replace(/\s+/g, '-').toLowerCase()}.pdf`);
};

/** Build WhatsApp share message — sin cambios */
export const buildContractWhatsAppMessage = (contract: ContractWithRelations): string => {
  const propertyTitle = contract.properties?.title || 'la propiedad';
  const clientName = contract.clients?.full_name || contract.tenant_name || '';
  const rent = formatCurrency(Number(contract.monthly_rent || 0), contract.currency);
  const start = contract.start_date ? formatDate(contract.start_date) : '';
  const end = contract.end_date ? formatDate(contract.end_date) : 'indefinido';

  return encodeURIComponent(
    `📋 *Contrato de Alquiler — Plusterra*\n\n` +
    `🏢 *Propiedad:* ${propertyTitle}\n` +
    `👤 *Inquilino:* ${clientName}\n` +
    `📅 *Vigencia:* ${start} al ${end}\n` +
    `💰 *Canon:* ${rent}/mes\n\n` +
    `_Plusterra Negocios Inmobiliarios_`
  );
};

/** Check if the current user can export this contract — sin cambios */
export const canExportContract = (
  contract: ContractWithRelations,
  userId: string | undefined,
  role: string | null
): boolean => {
  if (!userId) return false;
  if (role === 'superadmin' || role === 'admin' || role === 'accounting') return true;
  if (role === 'agent') {
    return contract.created_by === userId || contract.responsible_agent_id === userId;
  }
  return false;
};
