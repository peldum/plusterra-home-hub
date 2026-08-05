import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Loader2, FileDown } from 'lucide-react';
import jsPDF from 'jspdf';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { portalExternalUrl } from '@/lib/portalDomain';

interface BulkProperty {
  id: string;
  title: string;
  property_code: string;
  address?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  rental_price?: number | null;
  sale_price?: number | null;
  currency?: string | null;
  rental_period?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  area_m2?: number | null;
  has_garage?: boolean | null;
  description?: string | null;
  public_description?: string | null;
  visible_en_portal?: boolean | null;
  photos?: { photo_url: string; thumbnail_url?: string | null }[];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  properties: BulkProperty[];
}

const formatPrice = (amount: number, currency?: string | null) =>
  currency === 'USD'
    ? 'USD ' + Math.round(amount).toLocaleString('en-US')
    : 'Gs. ' + Math.round(amount).toLocaleString('es-PY');

/** Strip emojis and other non-latin Unicode symbols that jsPDF/helvetica can't render */
const cleanText = (text: string): string =>
  text
    .replace(/[\u{1F600}-\u{1F9FF}]/gu, '')
    .replace(/[\u{2600}-\u{27BF}]/gu, '')
    .replace(/[\u{FE00}-\u{FE0F}]/gu, '')
    .replace(/[\u{1F000}-\u{1FFFF}]/gu, '')
    .replace(/[\u{200D}]/gu, '')
    .trim();

/** Format description with proper line breaks: bullets on own lines, paragraphs separated */
const formatDescription = (text: string, maxChars = 2000): string => {
  let cleaned = cleanText(text);
  if (cleaned.length > maxChars) cleaned = cleaned.substring(0, maxChars) + '...';
  // Normalize bullet patterns to newline + bullet
  cleaned = cleaned.replace(/\s*[•·]\s*/g, '\n• ');
  // Normalize multiple newlines to double
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  return cleaned.trim();
};

/** Truncate title cleanly */
const truncateTitle = (text: string, max = 80): string => {
  const cleaned = cleanText(text);
  if (cleaned.length <= max) return cleaned;
  return cleaned.substring(0, max).replace(/\s+\S*$/, '') + '...';
};

/** Compress image: max 800px wide, JPEG 70% quality. Returns dataURL + natural size */
async function compressImageFromUrl(url: string, maxW = 800, quality = 0.7): Promise<{ dataUrl: string; width: number; height: number } | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    const bmp = await createImageBitmap(blob);
    const naturalW = bmp.width;
    const naturalH = bmp.height;
    const scale = bmp.width > maxW ? maxW / bmp.width : 1;
    const w = Math.round(bmp.width * scale);
    const h = Math.round(bmp.height * scale);
    const canvas = new OffscreenCanvas(w, h);
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(bmp, 0, 0, w, h);
    bmp.close();
    const outBlob = await canvas.convertToBlob({ type: 'image/jpeg', quality });
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve({ dataUrl: reader.result as string, width: naturalW, height: naturalH });
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(outBlob);
    });
  } catch {
    return null;
  }
}

/** Strip Google Maps URLs from text */
const stripMapLinks = (text: string): string =>
  text.replace(/https?:\/\/(maps\.app\.goo\.gl|www\.google\.com\/maps|goo\.gl\/maps)[^\s)"]*/gi, '').replace(/\n{3,}/g, '\n\n').trim();

/** Remove leading line if it duplicates the title (case-insensitive) */
const stripDuplicateTitle = (desc: string, title: string): string => {
  const lines = desc.split('\n');
  if (lines.length > 0 && lines[0].trim().toLowerCase().replace(/[^a-záéíóúñ0-9\s]/gi, '') === title.trim().toLowerCase().replace(/[^a-záéíóúñ0-9\s]/gi, '')) {
    return lines.slice(1).join('\n').trim();
  }
  // Also check if first line contains the title in uppercase
  if (lines.length > 0 && title.length > 10 && lines[0].toUpperCase().includes(title.toUpperCase().substring(0, Math.min(title.length, 40)))) {
    return lines.slice(1).join('\n').trim();
  }
  return desc;
};

export const BulkExportDialog = ({ open, onOpenChange, properties }: Props) => {
  const [title, setTitle] = useState('');
  const [includeComparison, setIncludeComparison] = useState(false);
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    if (properties.length === 0) return;
    setGenerating(true);

    try {
      // Fetch photos for all selected properties
      const propertyIds = properties.map(p => p.id);
      const { data: allPhotos } = await supabase
        .from('property_photos')
        .select('property_id, photo_url, thumbnail_url, order_index')
        .in('property_id', propertyIds)
        .order('order_index', { ascending: true });

      const photosMap: Record<string, { photo_url: string; thumbnail_url?: string | null }[]> = {};
      (allPhotos || []).forEach(photo => {
        if (!photosMap[photo.property_id]) photosMap[photo.property_id] = [];
        photosMap[photo.property_id].push(photo);
      });

      const enrichedProperties = properties.map(p => ({
        ...p,
        photos: photosMap[p.id] || p.photos || [],
      }));

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 20;
      const contentW = pageW - margin * 2;
      const pdfTitle = cleanText(title.trim() || 'Seleccion de Propiedades');

      // ── Helper: draw page header bar ──
      const drawHeader = (leftText: string, rightText?: string) => {
        doc.setFillColor(0, 68, 124);
        doc.rect(0, 0, pageW, 12, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text(leftText, margin, 8);
        if (rightText) doc.text(rightText, pageW - margin, 8, { align: 'right' });
      };

      // ── Helper: draw footer ──
      const drawFooter = () => {
        doc.setFontSize(7);
        doc.setTextColor(160, 160, 160);
        doc.text('Plusterra Propiedades · Encarnacion, Paraguay', pageW / 2, pageH - 6, { align: 'center' });
      };

      // ── Helper: draw separator line ──
      const drawSep = (y: number) => {
        doc.setDrawColor(210, 210, 210);
        doc.line(margin, y, pageW - margin, y);
        return y + 5;
      };

      const multiple = enrichedProperties.length > 1;

      // ══════════ COVER PAGE (solo si hay varias propiedades) ══════════
      if (multiple) {
        doc.setFillColor(0, 68, 124);
        doc.rect(0, 0, pageW, 45, 'F');
        doc.setFillColor(252, 81, 0);
        doc.rect(0, 45, pageW, 3, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text('PLUSTERRA', pageW / 2, 20, { align: 'center' });
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text('Propiedades', pageW / 2, 30, { align: 'center' });

        doc.setTextColor(0, 68, 124);
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text(pdfTitle, pageW / 2, 65, { align: 'center' });

        doc.setTextColor(100, 100, 100);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text(`${enrichedProperties.length} propiedades`, pageW / 2, 76, { align: 'center' });
        doc.text(`Generado: ${new Date().toLocaleDateString('es-PY')}`, pageW / 2, 84, { align: 'center' });

        drawFooter();
      }

      // ══════════ PROPERTY PAGES ══════════
      for (let i = 0; i < enrichedProperties.length; i++) {
        const p = enrichedProperties[i];
        if (multiple || i > 0) doc.addPage();
        drawHeader(`PLUSTERRA · ${pdfTitle}`, multiple ? `${i + 1} / ${enrichedProperties.length}` : new Date().toLocaleDateString('es-PY'));

        let y = 18;

        // ── 1. Photo (respeta proporción, centrada) ──
        const photoUrl = p.photos?.[0]?.photo_url || p.photos?.[0]?.thumbnail_url;
        if (photoUrl) {
          const img = await compressImageFromUrl(photoUrl);
          if (img) {
            const maxH = 78;
            const aspect = img.width / img.height;
            let drawW = contentW;
            let drawH = drawW / aspect;
            if (drawH > maxH) {
              drawH = maxH;
              drawW = drawH * aspect;
            }
            const drawX = margin + (contentW - drawW) / 2;
            doc.addImage(img.dataUrl, 'JPEG', drawX, y, drawW, drawH);
            y += drawH + 5;
          }
        }

        // ── 2. Title (max 2 lines) ──
        doc.setTextColor(0, 68, 124);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        const titleText = truncateTitle(p.title);
        const titleLines = doc.splitTextToSize(titleText, contentW);
        const displayTitleLines = titleLines.slice(0, 2);
        doc.text(displayTitleLines, margin, y + 5);
        y += displayTitleLines.length * 6 + 6;

        // ── 3. Code & address (small grey) ──
        doc.setTextColor(130, 130, 130);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(`Codigo: ${p.property_code}`, margin, y);
        y += 5;

        const location = [p.address, p.neighborhood, p.city].filter(Boolean).map(cleanText).join(', ');
        if (location) {
          const locLines = doc.splitTextToSize(location, contentW);
          doc.text(locLines.slice(0, 2), margin, y);
          y += locLines.slice(0, 2).length * 4.5 + 3;
        }

        // ── 4. Separator ──
        y = drawSep(y);

        // ── 5. Price (prominent) ──
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 68, 124);

        if (Number(p.rental_price) > 0) {
          const label = p.rental_period === 'daily' ? 'Temporal' : 'Alquiler';
          doc.text(`${label}: ${formatPrice(Number(p.rental_price), p.currency)}/${p.rental_period === 'daily' ? 'dia' : 'mes'}`, margin, y);
          y += 7;
        }
        if (Number(p.sale_price) > 0) {
          doc.text(`Venta: ${formatPrice(Number(p.sale_price), p.currency)}`, margin, y);
          y += 7;
        }
        y += 3;

        // ── 6. Specs line ──
        const specs: string[] = [];
        if (p.bedrooms != null && p.bedrooms > 0) specs.push(`${p.bedrooms} Dormitorios`);
        if (p.bathrooms != null && p.bathrooms > 0) specs.push(`${p.bathrooms} Banos`);
        if (p.area_m2 != null && Number(p.area_m2) > 0) specs.push(`${p.area_m2} m2`);
        if (p.has_garage) specs.push('Cochera');

        if (specs.length > 0) {
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(70, 70, 70);
          doc.text(specs.join('  ·  '), margin, y);
          y += 7;
        }

        // ── 6b. Link al portal (solo si está publicada) ──
        if (p.visible_en_portal) {
          const url = portalExternalUrl(`/portal/propiedades/${p.id}`);
          doc.setFontSize(10);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(252, 81, 0);
          doc.textWithLink('Ver mas detalles y fotos en la web', margin, y, { url });
          const linkW = doc.getTextWidth('Ver mas detalles y fotos en la web');
          doc.setDrawColor(252, 81, 0);
          doc.line(margin, y + 1, margin + linkW, y + 1);
          y += 7;
        }

        // ── 7. Separator ──
        y = drawSep(y);

        // ── 8. Description (formatted, with page breaks) ──
        const rawDesc = p.public_description || p.description;
        if (rawDesc) {
          let descText = stripMapLinks(rawDesc);
          descText = stripDuplicateTitle(descText, p.title);
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(0, 68, 124);
          doc.text('Descripcion', margin, y);
          y += 7;

          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(60, 60, 60);

          const formatted = formatDescription(descText);
          const paragraphs = formatted.split('\n');
          const lineH = 4.5;

          for (const paragraph of paragraphs) {
            if (paragraph.trim() === '') {
              y += 2; // paragraph spacing
              continue;
            }

            const isBullet = paragraph.trim().startsWith('•');
            const indent = isBullet ? 4 : 0;
            const textW = contentW - indent;
            const wrapped = doc.splitTextToSize(paragraph.trim(), textW);

            for (const line of wrapped) {
              if (y + lineH > pageH - 15) {
                drawFooter();
                doc.addPage();
                drawHeader(`PLUSTERRA · ${pdfTitle}`, `${i + 1} / ${enrichedProperties.length}`);
                y = 18;
              }
              doc.text(line, margin + indent, y);
              y += lineH;
            }
          }
        }

        drawFooter();
      }

      // ══════════ COMPARISON TABLE ══════════
      if (includeComparison && enrichedProperties.length > 1) {
        doc.addPage();
        drawHeader('PLUSTERRA · Comparativa');

        let y = 22;
        doc.setTextColor(0, 68, 124);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Comparativa de Propiedades', margin, y);
        y += 10;

        // Column widths (proportional to content)
        const colX = [margin, margin + 60, margin + 100, margin + 118, margin + 132, margin + 148];
        const colW = [58, 38, 16, 12, 14, 20];

        // Table header background
        doc.setFillColor(0, 68, 124);
        doc.rect(margin, y - 4, contentW, 7, 'F');
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text('Propiedad', colX[0] + 2, y);
        doc.text('Precio', colX[1] + 2, y);
        doc.text('Dorm.', colX[2] + 2, y);
        doc.text('Banos', colX[3] + 1, y);
        doc.text('m2', colX[4] + 2, y);
        doc.text('Cochera', colX[5] + 2, y);
        y += 6;

        // Rows
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        enrichedProperties.forEach((p, idx) => {
          if (y > pageH - 20) {
            drawFooter();
            doc.addPage();
            drawHeader('PLUSTERRA · Comparativa');
            y = 20;
          }

          // Alternating row background
          if (idx % 2 === 0) {
            doc.setFillColor(245, 247, 250);
            doc.rect(margin, y - 3.5, contentW, 6, 'F');
          }

          const price = Number(p.sale_price) > 0
            ? formatPrice(Number(p.sale_price), p.currency)
            : Number(p.rental_price) > 0
              ? formatPrice(Number(p.rental_price), p.currency)
              : '-';

          const titleTrunc = truncateTitle(p.title, 32);

          doc.setTextColor(40, 40, 40);
          doc.text(titleTrunc, colX[0] + 2, y);
          doc.text(price, colX[1] + 2, y);
          doc.text(String(p.bedrooms ?? '-'), colX[2] + 2, y);
          doc.text(String(p.bathrooms ?? '-'), colX[3] + 2, y);
          doc.text(p.area_m2 != null ? String(p.area_m2) : '-', colX[4] + 2, y);
          doc.text(p.has_garage ? 'Si' : 'No', colX[5] + 2, y);
          y += 6;
        });

        // Bottom border
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, y - 2, pageW - margin, y - 2);

        drawFooter();
      }

      const dateStr = new Date().toISOString().slice(0, 10);
      const fileName = title.trim()
        ? title.trim().replace(/\s+/g, '-').toLowerCase()
        : `Plusterra-${enrichedProperties.length}propiedades-${dateStr}`;
      doc.save(`${fileName}.pdf`);
      toast.success('PDF generado correctamente');
      onOpenChange(false);
    } catch (err) {
      console.error('PDF generation error:', err);
      toast.error('Error al generar PDF');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileDown className="w-5 h-5 text-primary" />
            Exportar {properties.length} propiedad{properties.length !== 1 ? 'es' : ''} en PDF
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Título del PDF</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ej: Terrenos en Cambyretá"
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {properties.length > 1 && (
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={includeComparison}
                onCheckedChange={v => setIncludeComparison(!!v)}
              />
              <span className="text-sm">Incluir tabla comparativa</span>
            </label>
          )}

          <p className="text-xs text-muted-foreground">
            Máximo 10 propiedades por PDF. {properties.length > 10 ? `Se exportarán las primeras 10 de ${properties.length} seleccionadas.` : ''}
          </p>

          <div className="flex justify-end gap-3 pt-2 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={generating}>
              Cancelar
            </Button>
            <Button onClick={handleGenerate} disabled={generating}>
              {generating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FileDown className="w-4 h-4 mr-2" />}
              Generar PDF
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
