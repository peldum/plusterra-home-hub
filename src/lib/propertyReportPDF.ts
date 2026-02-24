import jsPDF from 'jspdf';
import { PropertyReport, ReportComment } from '@/hooks/usePropertyReports';
import { supabase } from '@/integrations/supabase/client';

export const exportPropertyReportPDF = async (report: PropertyReport) => {
  // Fetch comments for this report
  const { data: comments } = await supabase
    .from('property_report_comments')
    .select('*')
    .eq('report_id', report.id)
    .order('comment_date', { ascending: true });

  const doc = new jsPDF('p', 'mm', 'a4');
  const pageW = doc.internal.pageSize.getWidth();
  const marginL = 25;
  const marginR = 25;
  const contentW = pageW - marginL - marginR;
  let y = 20;

  const addLine = () => {
    doc.setDrawColor(200);
    doc.line(marginL, y, pageW - marginR, y);
    y += 4;
  };

  const addSection = (title: string) => {
    if (y > 250) { doc.addPage(); y = 20; }
    y += 4;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(40, 40, 40);
    doc.text(title, marginL, y);
    y += 2;
    addLine();
  };

  const addText = (text: string, bold = false) => {
    doc.setFontSize(10);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setTextColor(60, 60, 60);
    const lines = doc.splitTextToSize(text, contentW);
    if (y + lines.length * 5 > 280) { doc.addPage(); y = 20; }
    doc.text(lines, marginL, y);
    y += lines.length * 5;
  };

  const addCheckItem = (label: string, checked: boolean, url?: string) => {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    const icon = checked ? '✓' : '✗';
    let text = `${icon}  ${label}`;
    if (url) text += ` — ${url}`;
    doc.text(text, marginL + 4, y);
    y += 5;
  };

  // Header
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text('REPORTE COMERCIAL', marginL, y);
  y += 6;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('Informe de gestión para propietario', marginL, y);
  y += 8;

  addLine();

  // Property info
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(40, 40, 40);
  doc.text(`Propiedad: ${report.property_code ?? ''} – ${report.property_title ?? ''}`, marginL, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.text(`Período: ${report.period}`, marginL, y);
  doc.text(`Agente: ${report.agent_name ?? ''}`, marginL + 60, y);
  y += 8;

  // Section: Diffusion
  addSection('ACCIONES DE DIFUSIÓN');
  y += 2;
  addCheckItem('Portales inmobiliarios', report.diffusion.portales?.active, report.diffusion.portales?.url);
  addCheckItem('Página web propia', report.diffusion.web_propia?.active, report.diffusion.web_propia?.url);
  addCheckItem('Facebook', report.diffusion.facebook?.active, report.diffusion.facebook?.url);
  addCheckItem('Instagram', report.diffusion.instagram?.active, report.diffusion.instagram?.url);
  addCheckItem('Difusión por WhatsApp', report.diffusion.whatsapp);
  addCheckItem('Cartelería física', report.diffusion.carteleria?.active);
  if (report.diffusion.carteleria?.active && report.diffusion.carteleria?.observacion) {
    doc.setFontSize(9);
    doc.text(`   Obs: ${report.diffusion.carteleria.observacion}`, marginL + 4, y);
    y += 5;
  }

  // Section: Client Comments
  if (comments && comments.length > 0) {
    addSection('COMENTARIOS DE CLIENTES');
    y += 2;
    for (const c of comments) {
      const dateStr = c.comment_date ? new Date(c.comment_date).toLocaleDateString('es-PY') : '';
      addText(`• ${dateStr} (${c.agent_name ?? 'Agente'}): ${c.comment_text}`);
      y += 1;
    }
  }

  // Section: Management Tracking
  addSection('SEGUIMIENTO DE GESTIÓN');
  y += 2;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Ajustes realizados en el período:', marginL, y);
  y += 5;
  addCheckItem('Ajuste de precio', report.adjustments.precio);
  addCheckItem('Ajuste de condiciones', report.adjustments.condiciones);
  addCheckItem('Ajuste de presentación', report.adjustments.presentacion);

  if (report.agent_recommendation) {
    y += 3;
    addText('Recomendación del agente:', true);
    addText(report.agent_recommendation);
  }

  if (report.final_comment) {
    y += 3;
    addText('Comentario de la inmobiliaria:', true);
    addText(report.final_comment);
  }

  // Footer
  y += 10;
  if (y > 270) { doc.addPage(); y = 270; }
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(150, 150, 150);
  doc.text('Plusterra Inmobiliaria — Reporte generado automáticamente', marginL, 285);
  doc.text(`Encarnación, Paraguay — ${new Date().toLocaleDateString('es-PY')}`, pageW - marginR, 285, { align: 'right' });

  // Save
  const fileName = `Reporte_${report.property_code ?? 'PROP'}_${report.period}.pdf`;
  doc.save(fileName);
};
