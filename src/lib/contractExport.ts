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
    return buildHtmlWrapper('Contrato de Alquiler', text
      .split('\n')
      .map((line: string) => {
        if (line.startsWith('CONTRATO DE ALQUILER')) return `<h1>${line}</h1>`;
        if (line.match(/^(PRIMERA|SEGUNDA|TERCERA|CUARTA|QUINTA|SEXTA|SÉPTIMA|OCTAVA|NOVENA|DÉCIMA)/))
          return `<h3>${line}</h3>`;
        if (line.startsWith('Media firma') || line.startsWith('Firma:')) return `<p class="signature-line">${line}</p>`;
        if (line.trim() === '') return '<br/>';
        return `<p>${line}</p>`;
      })
      .join('')
    );
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
    <p class="subtitle">Plusterra Negocios Inmobiliarios</p>
    <table>${tableRows}</table>
    <div class="signatures">
      <div class="sig-block">
        <div class="sig-line"></div>
        <p>${clientName}</p>
        <p class="small">${contract.tenant_document ? 'CI: ' + contract.tenant_document : 'Locatario/a'}</p>
      </div>
      <div class="sig-block">
        <div class="sig-line"></div>
        <p>${contract.landlord_name || 'Propietario/a'}</p>
        <p class="small">${contract.landlord_document ? 'CI: ' + contract.landlord_document : 'Locador/a'}</p>
      </div>
      <div class="sig-block">
        <div class="sig-line"></div>
        <p>Plusterra Inmobiliaria</p>
        <p class="small">Administradora</p>
      </div>
    </div>
  `;

  return buildHtmlWrapper(`Contrato de ${contractType}`, body);
};

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
      h1 {
        text-align: center;
        font-size: 15pt;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-bottom: 6px;
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
        background: #f5f5f5;
      }
      .signatures {
        display: flex;
        justify-content: space-between;
        margin-top: 80px;
        gap: 24px;
      }
      .sig-block {
        text-align: center;
        flex: 1;
      }
      .sig-line {
        border-top: 1px solid #000;
        margin-bottom: 10px;
        height: 60px;
      }
      .sig-block p { text-align: center; font-size: 10pt; }
      .small { color: #555; font-size: 9.5pt; }
      .signature-line { font-style: italic; color: #555; }
      @media print {
        body { padding: 20px 30px; }
        @page { margin: 15mm 20mm; }
      }
    </style>
  </head>
  <body>${body}</body>
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
