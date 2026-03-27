import jsPDF from 'jspdf';
import { PropertyReport, ReportComment } from '@/hooks/usePropertyReports';
import { supabase } from '@/integrations/supabase/client';

const BLUE: [number, number, number] = [0, 68, 124];
const ORANGE: [number, number, number] = [252, 81, 0];
const DARK: [number, number, number] = [30, 30, 30];
const GRAY: [number, number, number] = [100, 100, 100];
const LIGHT_GRAY: [number, number, number] = [220, 220, 220];
const WHITE: [number, number, number] = [255, 255, 255];
const BG_LIGHT: [number, number, number] = [245, 247, 250];

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

export const exportPropertyReportPDF = async (report: PropertyReport) => {
  // Fetch comments
  const { data: comments } = await supabase
    .from('property_report_comments')
    .select('*')
    .eq('report_id', report.id)
    .order('comment_date', { ascending: true });

  // Fetch property details (address, owner, building)
  let propertyAddress = '';
  let ownerName = '';
  let buildingName = '';

  if (report.property_id) {
    const { data: prop } = await supabase
      .from('properties')
      .select('address, city, neighborhood, owner_id, unit_id')
      .eq('id', report.property_id)
      .single();

    if (prop) {
      propertyAddress = [prop.address, prop.neighborhood, prop.city].filter(Boolean).join(', ');

      if (prop.owner_id) {
        const { data: owner } = await supabase
          .from('owners')
          .select('full_name')
          .eq('id', prop.owner_id)
          .single();
        ownerName = owner?.full_name ?? '';
      }

      if (prop.unit_id) {
        const { data: unit } = await supabase
          .from('units')
          .select('building_id')
          .eq('id', prop.unit_id)
          .single();
        if (unit?.building_id) {
          const { data: building } = await supabase
            .from('buildings')
            .select('name')
            .eq('id', unit.building_id)
            .single();
          buildingName = building?.name ?? '';
        }
      }
    }
  }

  // Get current user name
  const { data: { user } } = await supabase.auth.getUser();
  let generatorName = 'Sistema';
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();
    generatorName = profile?.full_name ?? user.email ?? 'Sistema';
  }

  const logoWhite = await loadLogoBase64('/logo-plusterra-white.png');
  const logoContract = await loadLogoBase64('/logo-plusterra-contract.png');
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginL = 18;
  const marginR = 18;
  const contentW = pageW - marginL - marginR;
  let y = 0;

  const now = new Date();
  const dateStr = now.toLocaleDateString('es-PY', { day: '2-digit', month: 'long', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' });

  // ── Helpers ──
  const checkPage = (needed: number) => {
    if (y + needed > pageH - 22) {
      doc.addPage();
      y = 18;
    }
  };

  const addSectionTitle = (title: string) => {
    checkPage(16);
    y += 6;
    doc.setFillColor(...ORANGE);
    doc.rect(marginL, y, 3, 7, 'F');
    doc.setFontSize(12);
    doc.setFont(PDF_FONT, 'bold');
    doc.setTextColor(...DARK);
    doc.text(title, marginL + 6, y + 5.5);
    y += 10;
    doc.setDrawColor(...LIGHT_GRAY);
    doc.line(marginL, y, pageW - marginR, y);
    y += 5;
  };

  const addKeyValue = (key: string, value: string, xOffset = 0) => {
    doc.setFontSize(8);
    doc.setFont(PDF_FONT, 'bold');
    doc.setTextColor(...GRAY);
    doc.text(key, marginL + 5 + xOffset, y);
    doc.setFont(PDF_FONT, 'normal');
    doc.setTextColor(...DARK);
    doc.text(value, marginL + 5 + xOffset + doc.getTextWidth(key) + 2, y);
  };

  // ═══════════════════════════════════════════════════
  // HEADER - Tall professional header
  // ═══════════════════════════════════════════════════
  const headerH = 62;
  doc.setFillColor(...BLUE);
  doc.rect(0, 0, pageW, headerH, 'F');

  // Orange accent bar
  doc.setFillColor(...ORANGE);
  doc.rect(0, headerH, pageW, 3, 'F');

  // Logo large on left
  if (logoWhite) {
    try {
      doc.addImage(logoWhite, 'PNG', marginL, 12, 58, 20);
    } catch { /* ignore */ }
  }

  // Title block on right, centered vertically
  doc.setFontSize(24);
  doc.setFont(PDF_FONT, 'bold');
  doc.setTextColor(...WHITE);
  doc.text('REPORTE COMERCIAL', pageW - marginR, 24, { align: 'right' });

  doc.setFontSize(11);
  doc.setFont(PDF_FONT, 'normal');
  doc.setTextColor(200, 220, 240);
  doc.text('Gestión de Propiedad', pageW - marginR, 32, { align: 'right' });

  doc.setFontSize(9);
  doc.text(`Período: ${report.period}`, pageW - marginR, 40, { align: 'right' });

  doc.setFontSize(8);
  doc.setTextColor(170, 195, 220);
  doc.text(`Generado: ${dateStr}`, pageW - marginR, 47, { align: 'right' });

  y = headerH + 10;

  // ═══════════════════════════════════════════════════
  // DATOS DE LA PROPIEDAD
  // ═══════════════════════════════════════════════════
  addSectionTitle('DATOS DE LA PROPIEDAD');

  const propBoxH = 30;
  doc.setFillColor(...BG_LIGHT);
  doc.roundedRect(marginL, y, contentW, propBoxH, 2, 2, 'F');
  doc.setDrawColor(...LIGHT_GRAY);
  doc.roundedRect(marginL, y, contentW, propBoxH, 2, 2, 'S');

  y += 6;
  addKeyValue('Propiedad:', `${report.property_code ?? ''} – ${report.property_title ?? ''}`);
  y += 5;
  addKeyValue('Edificio:', buildingName || 'N/A', 0);
  addKeyValue('Dirección:', propertyAddress || 'N/A', contentW / 2);
  y += 5;
  addKeyValue('Propietario(s):', ownerName || 'N/A', 0);
  addKeyValue('Agente responsable:', report.agent_name ?? 'N/A', contentW / 2);
  y += propBoxH - 14;

  // ═══════════════════════════════════════════════════
  // RESUMEN EJECUTIVO (KPIs)
  // ═══════════════════════════════════════════════════
  addSectionTitle('RESUMEN EJECUTIVO');

  // Count diffusion channels and comments as proxy KPIs
  const diffChannels = [
    report.diffusion.portales?.active,
    report.diffusion.web_propia?.active,
    report.diffusion.facebook?.active,
    report.diffusion.instagram?.active,
    report.diffusion.whatsapp,
    report.diffusion.carteleria?.active,
  ].filter(Boolean).length;

  const commentCount = comments?.length ?? 0;
  const hasAdjustments = [report.adjustments.precio, report.adjustments.condiciones, report.adjustments.presentacion].filter(Boolean).length;

  // KPI cards row
  const kpiLabels = ['Canales activos', 'Comentarios', 'Ajustes realizados'];
  const kpiValues = [String(diffChannels), String(commentCount), String(hasAdjustments)];
  const kpiW = (contentW - 8) / 3;
  const kpiH = 18;

  for (let i = 0; i < 3; i++) {
    const kx = marginL + i * (kpiW + 4);
    doc.setFillColor(...BG_LIGHT);
    doc.roundedRect(kx, y, kpiW, kpiH, 2, 2, 'F');
    doc.setDrawColor(...LIGHT_GRAY);
    doc.roundedRect(kx, y, kpiW, kpiH, 2, 2, 'S');

    // Blue top accent
    doc.setFillColor(...BLUE);
    doc.rect(kx, y, kpiW, 1.5, 'F');

    doc.setFontSize(18);
    doc.setFont(PDF_FONT, 'bold');
    doc.setTextColor(...BLUE);
    doc.text(kpiValues[i], kx + kpiW / 2, y + 10, { align: 'center' });

    doc.setFontSize(7);
    doc.setFont(PDF_FONT, 'normal');
    doc.setTextColor(...GRAY);
    doc.text(kpiLabels[i], kx + kpiW / 2, y + 15.5, { align: 'center' });
  }
  y += kpiH + 6;

  // ═══════════════════════════════════════════════════
  // ACCIONES DE LA INMOBILIARIA (Difusión)
  // ═══════════════════════════════════════════════════
  addSectionTitle('ACCIONES DE LA INMOBILIARIA');

  const addCheckItem = (label: string, checked: boolean, detail?: string) => {
    checkPage(8);
    doc.setFontSize(9);

    if (checked) {
      doc.setFillColor(...BLUE);
      doc.roundedRect(marginL + 5, y - 3, 3.5, 3.5, 0.5, 0.5, 'F');
      doc.setTextColor(...WHITE);
      doc.setFontSize(7);
      doc.text('✓', marginL + 5.7, y - 0.2);
    } else {
      doc.setDrawColor(...LIGHT_GRAY);
      doc.roundedRect(marginL + 5, y - 3, 3.5, 3.5, 0.5, 0.5, 'S');
    }

    doc.setFontSize(9);
    doc.setFont(PDF_FONT, checked ? 'bold' : 'normal');
    doc.setTextColor(50, 50, 50);
    doc.text(label, marginL + 12, y);

    if (detail) {
      doc.setTextColor(...BLUE);
      doc.setFontSize(7);
      doc.setFont(PDF_FONT, 'normal');
      const truncated = detail.length > 70 ? detail.substring(0, 67) + '...' : detail;
      doc.text(truncated, marginL + 12, y + 3.5);
      y += 3.5;
    }

    y += 5.5;
  };

  // Sub-header: Publicaciones y Portales
  doc.setFontSize(9);
  doc.setFont(PDF_FONT, 'bold');
  doc.setTextColor(...ORANGE);
  doc.text('Publicaciones y Portales', marginL + 4, y);
  y += 5;

  addCheckItem('Portales inmobiliarios', report.diffusion.portales?.active, report.diffusion.portales?.url);
  addCheckItem('Página web propia', report.diffusion.web_propia?.active, report.diffusion.web_propia?.url);

  // Sub-header: Redes Sociales
  doc.setFontSize(9);
  doc.setFont(PDF_FONT, 'bold');
  doc.setTextColor(...ORANGE);
  doc.text('Redes Sociales', marginL + 4, y);
  y += 5;

  addCheckItem('Facebook', report.diffusion.facebook?.active, report.diffusion.facebook?.url);
  addCheckItem('Instagram', report.diffusion.instagram?.active, report.diffusion.instagram?.url);
  addCheckItem('Difusión por WhatsApp', report.diffusion.whatsapp);

  // Sub-header: Cartelería
  doc.setFontSize(9);
  doc.setFont(PDF_FONT, 'bold');
  doc.setTextColor(...ORANGE);
  doc.text('Cartelería', marginL + 4, y);
  y += 5;

  addCheckItem('Cartelería física', report.diffusion.carteleria?.active);
  if (report.diffusion.carteleria?.active && report.diffusion.carteleria?.observacion) {
    doc.setFontSize(8);
    doc.setFont(PDF_FONT, 'italic');
    doc.setTextColor(...GRAY);
    const obsLines = doc.splitTextToSize(`Obs: ${report.diffusion.carteleria.observacion}`, contentW - 16);
    checkPage(obsLines.length * 4);
    doc.text(obsLines, marginL + 12, y);
    y += obsLines.length * 4 + 2;
  }

  // ═══════════════════════════════════════════════════
  // COMENTARIOS DE INTERESADOS
  // ═══════════════════════════════════════════════════
  if (comments && comments.length > 0) {
    addSectionTitle('COMENTARIOS DE INTERESADOS');

    for (const c of comments) {
      const cDate = c.comment_date ? new Date(c.comment_date).toLocaleDateString('es-PY') : '';
      const textLines = doc.splitTextToSize(c.comment_text, contentW - 18);
      const bubbleH = textLines.length * 4 + 10;
      checkPage(bubbleH + 4);

      // Comment bubble
      doc.setFillColor(...BG_LIGHT);
      doc.roundedRect(marginL + 4, y - 2, contentW - 8, bubbleH, 2, 2, 'F');

      // Left accent
      doc.setFillColor(...BLUE);
      doc.rect(marginL + 4, y - 2, 2, bubbleH, 'F');

      // Header
      doc.setFontSize(7);
      doc.setFont(PDF_FONT, 'bold');
      doc.setTextColor(...BLUE);
      doc.text(`${c.agent_name ?? 'Interesado'}`, marginL + 10, y + 2.5);
      doc.setFont(PDF_FONT, 'normal');
      doc.setTextColor(...GRAY);
      doc.text(`· ${cDate}`, marginL + 10 + doc.getTextWidth(`${c.agent_name ?? 'Interesado'} `), y + 2.5);

      // Body
      doc.setFontSize(9);
      doc.setFont(PDF_FONT, 'normal');
      doc.setTextColor(50, 50, 50);
      doc.text(textLines, marginL + 10, y + 7);

      y += bubbleH + 4;
    }
  }

  // ═══════════════════════════════════════════════════
  // SEGUIMIENTO DE GESTIÓN
  // ═══════════════════════════════════════════════════
  addSectionTitle('SEGUIMIENTO DE GESTIÓN');

  doc.setFontSize(9);
  doc.setFont(PDF_FONT, 'normal');
  doc.setTextColor(50, 50, 50);
  doc.text('Ajustes realizados en el período:', marginL + 5, y);
  y += 5;

  addCheckItem('Ajuste de precio', report.adjustments.precio);
  addCheckItem('Ajuste de condiciones', report.adjustments.condiciones);
  addCheckItem('Ajuste de presentación', report.adjustments.presentacion);

  // Recommendation box
  if (report.agent_recommendation) {
    y += 2;
    const recLines = doc.splitTextToSize(report.agent_recommendation, contentW - 18);
    const recH = recLines.length * 4 + 12;
    checkPage(recH + 4);

    doc.setFillColor(255, 248, 240);
    doc.setDrawColor(...ORANGE);
    doc.roundedRect(marginL + 4, y - 2, contentW - 8, recH, 2, 2, 'FD');

    doc.setFillColor(...ORANGE);
    doc.rect(marginL + 4, y - 2, 2, recH, 'F');

    doc.setFontSize(8);
    doc.setFont(PDF_FONT, 'bold');
    doc.setTextColor(...ORANGE);
    doc.text('RECOMENDACIÓN DEL AGENTE', marginL + 10, y + 3);

    doc.setFontSize(9);
    doc.setFont(PDF_FONT, 'normal');
    doc.setTextColor(50, 50, 50);
    doc.text(recLines, marginL + 10, y + 8);
    y += recH + 4;
  }

  // ═══════════════════════════════════════════════════
  // ESTADO COMERCIAL ACTUAL
  // ═══════════════════════════════════════════════════
  addSectionTitle('ESTADO COMERCIAL ACTUAL');

  // Status badge
  const statusLabel = report.adjustments.precio || report.adjustments.condiciones
    ? 'EN REVISIÓN'
    : diffChannels > 3
      ? 'DIFUSIÓN ACTIVA'
      : diffChannels > 0
        ? 'DIFUSIÓN PARCIAL'
        : 'SIN DIFUSIÓN';

  const statusColor: [number, number, number] = statusLabel === 'DIFUSIÓN ACTIVA'
    ? [34, 139, 34]
    : statusLabel === 'EN REVISIÓN'
      ? ORANGE
      : statusLabel === 'DIFUSIÓN PARCIAL'
        ? [200, 150, 0]
        : [180, 40, 40];

  checkPage(16);
  doc.setFillColor(...statusColor);
  const badgeW = doc.getTextWidth(statusLabel) * 1.6 + 12;
  doc.roundedRect(marginL + 5, y - 1, badgeW, 9, 3, 3, 'F');
  doc.setFontSize(10);
  doc.setFont(PDF_FONT, 'bold');
  doc.setTextColor(...WHITE);
  doc.text(statusLabel, marginL + 5 + badgeW / 2, y + 5, { align: 'center' });
  y += 14;

  // ═══════════════════════════════════════════════════
  // OBSERVACIONES FINALES
  // ═══════════════════════════════════════════════════
  if (report.final_comment) {
    addSectionTitle('OBSERVACIONES FINALES');

    const comLines = doc.splitTextToSize(report.final_comment, contentW - 18);
    const comH = comLines.length * 4 + 12;
    checkPage(comH + 4);

    doc.setFillColor(240, 245, 255);
    doc.setDrawColor(...BLUE);
    doc.roundedRect(marginL + 4, y - 2, contentW - 8, comH, 2, 2, 'FD');

    doc.setFillColor(...BLUE);
    doc.rect(marginL + 4, y - 2, 2, comH, 'F');

    doc.setFontSize(8);
    doc.setFont(PDF_FONT, 'bold');
    doc.setTextColor(...BLUE);
    doc.text('OBSERVACIONES DE ADMINISTRACIÓN', marginL + 10, y + 3);

    doc.setFontSize(9);
    doc.setFont(PDF_FONT, 'normal');
    doc.setTextColor(50, 50, 50);
    doc.text(comLines, marginL + 10, y + 8);
    y += comH + 4;
  }

  // ═══════════════════════════════════════════════════
  // FOOTER (all pages)
  // ═══════════════════════════════════════════════════
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Footer separator
    doc.setDrawColor(...BLUE);
    doc.setLineWidth(0.5);
    doc.line(marginL, pageH - 18, pageW - marginR, pageH - 18);

    // Footer logo small
    if (logoContract) {
      try {
        doc.addImage(logoContract, 'PNG', marginL, pageH - 16, 22, 8);
      } catch { /* ignore */ }
    }

    // Footer text
    doc.setFontSize(7);
    doc.setFont(PDF_FONT, 'normal');
    doc.setTextColor(...GRAY);

    const footerX = marginL + (logoContract ? 26 : 0);
    doc.text(`Generado por: ${generatorName}`, footerX, pageH - 12);
    doc.text(`${dateStr} · ${timeStr}`, footerX, pageH - 8);

    doc.text(`Plusterra Inmobiliaria · Encarnación, Paraguay`, pageW - marginR, pageH - 12, { align: 'right' });
    doc.text(`Página ${i} de ${totalPages}`, pageW - marginR, pageH - 8, { align: 'right' });
  }

  const fileName = `Reporte_Comercial_${report.property_code ?? 'PROP'}_${report.period}.pdf`;
  doc.save(fileName);
};
