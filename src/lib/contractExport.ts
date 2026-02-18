import { generateRentalContractText } from '@/lib/contractTemplates';
import type { ContractWithRelations } from '@/hooks/useContracts';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

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

/** Builds the full HTML string for the contract PDF/print */
export const buildContractHtml = (contract: ContractWithRelations): string => {
  // If the contract has stored contract_data (from template), use it
  const cd = contract.contract_data as Record<string, any> | null;
  const propertyTitle = contract.properties?.title || 'Sin propiedad';
  const propertyAddress = contract.property_address || contract.properties?.address || '';
  const clientName = contract.clients?.full_name || contract.tenant_name || 'Sin cliente';
  const contractType = contractTypeLabels[contract.contract_type] || contract.contract_type;
  const rent = formatCurrency(Number(contract.monthly_rent || 0), contract.currency);
  const deposit = contract.deposit_amount ? formatCurrency(Number(contract.deposit_amount), contract.currency) : null;

  // If full contract text was generated from template, render it
  if (cd && typeof cd.contract_date === 'string') {
    const text: string = generateRentalContractText(cd as any);
    const bodyContent = text
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

    const signaturesHtml = `
      <div class="signatures-section">
        <p class="signatures-title">En prueba de conformidad, firman las partes</p>
        <div class="signatures-row">
          <div class="sig-block">
            <div class="sig-space"></div>
            <p class="sig-name">${cd.tenant_name || clientName}</p>
            <p class="sig-role">Inquilino/a</p>
            <p class="sig-doc">${cd.tenant_document ? 'CI: ' + cd.tenant_document : ''}</p>
          </div>
          <div class="sig-block">
            <div class="sig-space"></div>
            <p class="sig-name">${cd.landlord_name || 'Propietario/a'}</p>
            <p class="sig-role">Propietario/a</p>
            <p class="sig-doc">${cd.landlord_document ? 'CI: ' + cd.landlord_document : ''}</p>
          </div>
        </div>
        <div style="display:flex;justify-content:center;margin-top:10px;">
          <div class="sig-block-center">
            <p class="sig-name">Plusterra</p>
            <p class="sig-role">Administradora / Intermediaria</p>
          </div>
        </div>
      </div>
    `;

    return buildHtmlWrapper('Contrato de Alquiler', bodyContent + signaturesHtml);
  }

  // Fallback: structured summary view
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

  const body = `
    <h1>Contrato de ${contractType}</h1>
    <p class="subtitle">Resumen de condiciones pactadas</p>
    <table>${tableRows}</table>
    <div class="signatures-section">
      <p class="signatures-title">En prueba de conformidad, firman las partes</p>
      <div class="signatures-row">
        <div class="sig-block">
          <div class="sig-space"></div>
          <p class="sig-name">${clientName}</p>
          <p class="sig-role">Inquilino/a</p>
          <p class="sig-doc">${contract.tenant_document ? 'CI: ' + contract.tenant_document : ''}</p>
        </div>
        <div class="sig-block">
          <div class="sig-space"></div>
          <p class="sig-name">${contract.landlord_name || 'Propietario/a'}</p>
          <p class="sig-role">Propietario/a</p>
          <p class="sig-doc">${contract.landlord_document ? 'CI: ' + contract.landlord_document : ''}</p>
        </div>
      </div>
      <div style="display:flex;justify-content:center;margin-top:10px;">
        <div class="sig-block-center">
          <p class="sig-name">Plusterra</p>
          <p class="sig-role">Administradora / Intermediaria</p>
        </div>
      </div>
    </div>
  `;

  return buildHtmlWrapper(`Contrato de ${contractType}`, body);
};

const LOGO_URL = `${window.location.origin}/logo-plusterra-contract.png`;

const buildHtmlWrapper = (title: string, body: string): string => `
  <!DOCTYPE html>
  <html lang="es">
  <head>
    <meta charset="UTF-8"/>
    <title>${title}</title>
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        font-family: 'Times New Roman', Times, serif;
        font-size: 12pt;
        line-height: 1.65;
        color: #000;
        padding: 40px 60px;
        max-width: 900px;
        margin: 0 auto;
      }
      /* ── Header ── */
      .contract-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-bottom: 2px solid #00447C;
        padding-bottom: 14px;
        margin-bottom: 28px;
      }
      .contract-header img {
        height: 52px;
        width: auto;
      }
      .contract-header-info {
        text-align: right;
        font-size: 9pt;
        color: #555;
        line-height: 1.5;
      }
      .contract-header-info strong {
        font-size: 10pt;
        color: #00447C;
        display: block;
      }
      /* ── Title ── */
      h1 {
        text-align: center;
        font-size: 15pt;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: #00447C;
        margin-bottom: 4px;
      }
      .subtitle {
        text-align: center;
        font-size: 10pt;
        color: #555;
        margin-bottom: 28px;
      }
      h3 {
        font-size: 12pt;
        margin-top: 18px;
        margin-bottom: 6px;
        color: #00447C;
      }
      p {
        text-align: justify;
        margin-bottom: 10px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin: 24px 0 32px;
        font-size: 11pt;
      }
      td {
        padding: 7px 12px;
        border: 1px solid #ccc;
        vertical-align: top;
      }
      td.label {
        font-weight: bold;
        width: 38%;
        background: #f0f4f9;
        color: #00447C;
      }
      /* ── Signatures ── */
      .signatures-section {
        margin-top: 100px;
        page-break-inside: avoid;
      }
      .signatures-title {
        text-align: center;
        font-size: 9pt;
        color: #888;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        margin-bottom: 40px;
      }
      .signatures-row {
        display: flex;
        justify-content: space-between;
        gap: 40px;
        margin-bottom: 36px;
      }
      .sig-block {
        flex: 1;
        text-align: center;
      }
      .sig-space {
        height: 70px;
        border-bottom: 1.5px solid #000;
        margin-bottom: 10px;
      }
      .sig-name {
        font-size: 11pt;
        font-weight: bold;
        color: #000;
        margin-bottom: 2px;
      }
      .sig-role {
        font-size: 9pt;
        color: #555;
        font-style: italic;
        margin-bottom: 2px;
      }
      .sig-doc {
        font-size: 9pt;
        color: #777;
      }
      .sig-block-center {
        flex: 1;
        text-align: center;
        border-top: 1.5px solid #FC5100;
        padding-top: 10px;
        max-width: 240px;
        margin: 0 auto;
      }
      .sig-block-center .sig-name { color: #FC5100; }
      .sig-block-center .sig-role { color: #FC5100; font-style: normal; font-size: 8pt; }
      /* ── Footer ── */
      .contract-footer {
        margin-top: 40px;
        border-top: 1px solid #ddd;
        padding-top: 10px;
        text-align: center;
        font-size: 8pt;
        color: #aaa;
      }
      .small { color: #555; font-size: 9.5pt; }
      .signature-line { font-style: italic; color: #555; }
      @media print {
        body { padding: 20px 30px; }
        @page { margin: 15mm 20mm; }
      }
    </style>
  </head>
  <body>
    <div class="contract-header">
      <img src="${LOGO_URL}" alt="Plusterra" crossorigin="anonymous" />
      <div class="contract-header-info">
        <strong>Plusterra Negocios Inmobiliarios</strong>
        Asunción, Paraguay
      </div>
    </div>
    ${body}
    <div class="contract-footer">
      Plusterra Negocios Inmobiliarios · Documento generado el ${new Date().toLocaleDateString('es-PY', { day: '2-digit', month: '2-digit', year: 'numeric' })}
    </div>
  </body>
  </html>
`;

/** Mount HTML in a hidden iframe, render to canvas, export as real PDF */
const renderHtmlToPdf = async (html: string): Promise<jsPDF> => {
  // Create hidden container
  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:794px;background:#fff;';
  container.innerHTML = html;
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: 794,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const imgW = pageW;
    const imgH = (canvas.height * imgW) / canvas.width;

    let yPos = 0;
    let heightLeft = imgH;

    pdf.addImage(imgData, 'PNG', 0, yPos, imgW, imgH);
    heightLeft -= pageH;

    while (heightLeft > 0) {
      yPos -= pageH;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, yPos, imgW, imgH);
      heightLeft -= pageH;
    }

    return pdf;
  } finally {
    document.body.removeChild(container);
  }
};

/** Open print dialog (browser handles Save as PDF) */
export const printContractPDF = async (contract: ContractWithRelations) => {
  const html = buildContractHtml(contract);
  // Use a hidden iframe to avoid popup blockers
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
  }, 500);
};

/** Generate and download a real PDF file */
export const downloadContractPDF = async (contract: ContractWithRelations) => {
  const html = buildContractHtml(contract);
  const pdf = await renderHtmlToPdf(html);
  const clientName = contract.clients?.full_name || contract.tenant_name || 'cliente';
  pdf.save(`contrato-${clientName.replace(/\s+/g, '-').toLowerCase()}.pdf`);
};

/** Build WhatsApp share message */
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

/** Check if the current user can export this contract */
export const canExportContract = (
  contract: ContractWithRelations,
  userId: string | undefined,
  role: string | null
): boolean => {
  if (!userId) return false;
  if (role === 'superadmin' || role === 'admin' || role === 'accounting') return true;
  if (role === 'agent') {
    // Agent can export if they created it or are the responsible agent
    return contract.created_by === userId || contract.responsible_agent_id === userId;
  }
  return false;
};
