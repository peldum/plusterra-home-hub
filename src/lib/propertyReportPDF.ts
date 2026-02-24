import jsPDF from 'jspdf';
import { PropertyReport, ReportComment } from '@/hooks/usePropertyReports';
import { supabase } from '@/integrations/supabase/client';

const BLUE = [0, 68, 124] as const;    // #00447C
const ORANGE = [252, 81, 0] as const;  // #FC5100
const DARK = [30, 30, 30] as const;
const GRAY = [100, 100, 100] as const;
const LIGHT_GRAY = [220, 220, 220] as const;
const WHITE = [255, 255, 255] as const;

const loadLogoBase64 = async (): Promise<string | null> => {
  try {
    const res = await fetch('/logo-plusterra-white.png');
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

export const exportPropertyReportPDF = async (report: PropertyReport) => {
  const { data: comments } = await supabase
    .from('property_report_comments')
    .select('*')
    .eq('report_id', report.id)
    .order('comment_date', { ascending: true });

  const logo = await loadLogoBase64();
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginL = 20;
  const marginR = 20;
  const contentW = pageW - marginL - marginR;
  let y = 0;

  // ── Header band ──
  const headerH = 54;
  doc.setFillColor(...BLUE);
  doc.rect(0, 0, pageW, headerH, 'F');

  // Orange accent stripe
  doc.setFillColor(...ORANGE);
  doc.rect(0, headerH, pageW, 3, 'F');

  // Logo – white logo directly on blue background
  if (logo) {
    try {
      const logoW = 52;
      const logoH = 18;
      const logoX = marginL;
      const logoY = (headerH - logoH) / 2;
      doc.addImage(logo, 'PNG', logoX, logoY, logoW, logoH);
    } catch { /* ignore */ }
  }

  // Header text – vertically centered on right side
  const textCenterY = headerH / 2;
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...WHITE);
  doc.text('REPORTE COMERCIAL', pageW - marginR, textCenterY - 4, { align: 'right' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(200, 220, 240);
  doc.text('Informe de gestión para propietario', pageW - marginR, textCenterY + 5, { align: 'right' });

  doc.setFontSize(8);
  doc.text(`Generado: ${new Date().toLocaleDateString('es-PY')}`, pageW - marginR, textCenterY + 12, { align: 'right' });

  y = headerH + 10;

  // ── Property info box ──
  doc.setFillColor(245, 247, 250);
  doc.roundedRect(marginL, y, contentW, 20, 2, 2, 'F');
  doc.setDrawColor(...LIGHT_GRAY);
  doc.roundedRect(marginL, y, contentW, 20, 2, 2, 'S');

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BLUE);
  doc.text(`${report.property_code ?? ''} – ${report.property_title ?? ''}`, marginL + 5, y + 8);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRAY);
  doc.text(`Período: ${report.period}`, marginL + 5, y + 15);
  doc.text(`Agente: ${report.agent_name ?? ''}`, marginL + 70, y + 15);

  y += 28;

  // ── Helpers ──
  const checkPage = (needed: number) => {
    if (y + needed > pageH - 20) {
      doc.addPage();
      y = 20;
    }
  };

  const addSection = (title: string) => {
    checkPage(16);
    y += 4;
    // Section line with orange accent
    doc.setFillColor(...ORANGE);
    doc.rect(marginL, y, 3, 6, 'F');
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK);
    doc.text(title, marginL + 6, y + 5);
    y += 10;
    doc.setDrawColor(...LIGHT_GRAY);
    doc.line(marginL, y, pageW - marginR, y);
    y += 4;
  };

  const addText = (text: string, bold = false, indent = 0) => {
    doc.setFontSize(9);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setTextColor(50, 50, 50);
    const lines = doc.splitTextToSize(text, contentW - indent);
    checkPage(lines.length * 4.5);
    doc.text(lines, marginL + indent, y);
    y += lines.length * 4.5;
  };

  const addCheckItem = (label: string, checked: boolean, url?: string) => {
    checkPage(6);
    doc.setFontSize(9);

    // Checkbox icon
    if (checked) {
      doc.setFillColor(...BLUE);
      doc.roundedRect(marginL + 4, y - 3.2, 3.5, 3.5, 0.5, 0.5, 'F');
      doc.setTextColor(...WHITE);
      doc.setFontSize(7);
      doc.text('✓', marginL + 4.7, y - 0.3);
    } else {
      doc.setDrawColor(...LIGHT_GRAY);
      doc.roundedRect(marginL + 4, y - 3.2, 3.5, 3.5, 0.5, 0.5, 'S');
    }

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 50, 50);
    doc.text(label, marginL + 10, y);

    if (url) {
      doc.setTextColor(...BLUE);
      doc.setFontSize(7);
      const urlTruncated = url.length > 60 ? url.substring(0, 57) + '...' : url;
      doc.text(urlTruncated, marginL + 10, y + 3.5);
      y += 3.5;
    }

    y += 5;
  };

  // ── Section: Diffusion ──
  addSection('ACCIONES DE DIFUSIÓN');
  addCheckItem('Portales inmobiliarios', report.diffusion.portales?.active, report.diffusion.portales?.url);
  addCheckItem('Página web propia', report.diffusion.web_propia?.active, report.diffusion.web_propia?.url);
  addCheckItem('Facebook', report.diffusion.facebook?.active, report.diffusion.facebook?.url);
  addCheckItem('Instagram', report.diffusion.instagram?.active, report.diffusion.instagram?.url);
  addCheckItem('Difusión por WhatsApp', report.diffusion.whatsapp);
  addCheckItem('Cartelería física', report.diffusion.carteleria?.active);
  if (report.diffusion.carteleria?.active && report.diffusion.carteleria?.observacion) {
    addText(`Observación: ${report.diffusion.carteleria.observacion}`, false, 10);
  }

  // ── Section: Client Comments ──
  if (comments && comments.length > 0) {
    addSection('COMENTARIOS DE CLIENTES');
    for (const c of comments) {
      const dateStr = c.comment_date ? new Date(c.comment_date).toLocaleDateString('es-PY') : '';
      checkPage(10);
      // Comment bubble style
      doc.setFillColor(245, 247, 250);
      const textLines = doc.splitTextToSize(c.comment_text, contentW - 14);
      const bubbleH = textLines.length * 4 + 8;
      doc.roundedRect(marginL + 4, y - 2, contentW - 8, bubbleH, 1.5, 1.5, 'F');

      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...BLUE);
      doc.text(`${c.agent_name ?? 'Agente'} · ${dateStr}`, marginL + 7, y + 2);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(50, 50, 50);
      doc.text(textLines, marginL + 7, y + 6);

      y += bubbleH + 3;
    }
  }

  // ── Section: Management Tracking ──
  addSection('SEGUIMIENTO DE GESTIÓN');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(50, 50, 50);
  doc.text('Ajustes realizados en el período:', marginL + 4, y);
  y += 5;
  addCheckItem('Ajuste de precio', report.adjustments.precio);
  addCheckItem('Ajuste de condiciones', report.adjustments.condiciones);
  addCheckItem('Ajuste de presentación', report.adjustments.presentacion);

  if (report.agent_recommendation) {
    y += 2;
    checkPage(14);
    doc.setFillColor(255, 248, 240);
    doc.setDrawColor(...ORANGE);
    const recLines = doc.splitTextToSize(report.agent_recommendation, contentW - 14);
    const recH = recLines.length * 4 + 10;
    doc.roundedRect(marginL + 4, y - 2, contentW - 8, recH, 1.5, 1.5, 'FD');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...ORANGE);
    doc.text('Recomendación del agente:', marginL + 7, y + 2);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 50, 50);
    doc.text(recLines, marginL + 7, y + 7);
    y += recH + 3;
  }

  if (report.final_comment) {
    y += 2;
    checkPage(14);
    doc.setFillColor(240, 245, 255);
    doc.setDrawColor(...BLUE);
    const comLines = doc.splitTextToSize(report.final_comment, contentW - 14);
    const comH = comLines.length * 4 + 10;
    doc.roundedRect(marginL + 4, y - 2, contentW - 8, comH, 1.5, 1.5, 'FD');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BLUE);
    doc.text('Comentario de la inmobiliaria:', marginL + 7, y + 2);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 50, 50);
    doc.text(comLines, marginL + 7, y + 7);
    y += comH + 3;
  }

  // ── Footer ──
  const addFooter = (pageNum: number) => {
    doc.setPage(pageNum);
    // Footer line
    doc.setDrawColor(...BLUE);
    doc.setLineWidth(0.5);
    doc.line(marginL, pageH - 14, pageW - marginR, pageH - 14);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRAY);
    doc.text('Plusterra Inmobiliaria · Encarnación, Paraguay', marginL, pageH - 10);
    doc.text('Reporte generado automáticamente', pageW - marginR, pageH - 10, { align: 'right' });
  };

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    addFooter(i);
  }

  const fileName = `Reporte_${report.property_code ?? 'PROP'}_${report.period}.pdf`;
  doc.save(fileName);
};
