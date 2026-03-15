import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Loader2, FileDown } from 'lucide-react';
import jsPDF from 'jspdf';
import { toast } from 'sonner';

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
    .replace(/\s{2,}/g, ' ')
    .trim();

async function imageUrlToBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export const BulkExportDialog = ({ open, onOpenChange, properties }: Props) => {
  const [title, setTitle] = useState('');
  const [includeComparison, setIncludeComparison] = useState(false);
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    if (properties.length === 0) return;
    setGenerating(true);

    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 15;
      const contentW = pageW - margin * 2;

      // ── Cover page ──
      doc.setFillColor(0, 68, 124);
      doc.rect(0, 0, pageW, 40, 'F');
      doc.setFillColor(252, 81, 0);
      doc.rect(0, 40, pageW, 3, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('PLUSTERRA', pageW / 2, 18, { align: 'center' });
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text('Propiedades', pageW / 2, 28, { align: 'center' });

      doc.setTextColor(0, 68, 124);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      const pdfTitle = title.trim() || 'Selección de Propiedades';
      doc.text(pdfTitle, pageW / 2, 60, { align: 'center' });

      doc.setTextColor(100, 100, 100);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(`${properties.length} propiedad${properties.length !== 1 ? 'es' : ''}`, pageW / 2, 70, { align: 'center' });
      doc.text(`Generado: ${new Date().toLocaleDateString('es-PY')}`, pageW / 2, 78, { align: 'center' });

      // ── Property pages ──
      for (let i = 0; i < properties.length; i++) {
        const p = properties[i];
        doc.addPage();

        // Header bar
        doc.setFillColor(0, 68, 124);
        doc.rect(0, 0, pageW, 12, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text(`PLUSTERRA · ${pdfTitle}`, margin, 8);
        doc.text(`${i + 1} / ${properties.length}`, pageW - margin, 8, { align: 'right' });

        let y = 20;

        // Photo
        const photoUrl = p.photos?.[0]?.thumbnail_url || p.photos?.[0]?.photo_url;
        if (photoUrl) {
          const imgData = await imageUrlToBase64(photoUrl);
          if (imgData) {
            const imgH = Math.min(contentW * 0.5, 70);
            doc.addImage(imgData, 'JPEG', margin, y, contentW, imgH);
            y += imgH + 5;
          }
        }

        // Title
        doc.setTextColor(0, 68, 124);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        const titleLines = doc.splitTextToSize(p.title, contentW);
        doc.text(titleLines, margin, y);
        y += titleLines.length * 7 + 2;

        // Code
        doc.setTextColor(120, 120, 120);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(`Código: ${p.property_code}`, margin, y);
        y += 6;

        // Location
        const location = [p.address, p.neighborhood, p.city].filter(Boolean).join(', ');
        if (location) {
          doc.setTextColor(80, 80, 80);
          doc.setFontSize(10);
          doc.text(location, margin, y);
          y += 7;
        }

        // Prices
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, y, pageW - margin, y);
        y += 6;

        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 68, 124);

        if (Number(p.rental_price) > 0) {
          const label = p.rental_period === 'daily' ? 'Temporal' : 'Alquiler';
          doc.text(`${label}: ${formatPrice(Number(p.rental_price), p.currency)}/${p.rental_period === 'daily' ? 'día' : 'mes'}`, margin, y);
          y += 8;
        }
        if (Number(p.sale_price) > 0) {
          doc.text(`Venta: ${formatPrice(Number(p.sale_price), p.currency)}`, margin, y);
          y += 8;
        }
        y += 3;

        // Specs
        const specs: string[] = [];
        if (p.bedrooms != null) specs.push(`${p.bedrooms} Dormitorios`);
        if (p.bathrooms != null) specs.push(`${p.bathrooms} Baños`);
        if (p.area_m2 != null) specs.push(`${p.area_m2} m²`);
        if (p.has_garage) specs.push('Cochera');

        if (specs.length > 0) {
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(60, 60, 60);
          doc.text(specs.join('  ·  '), margin, y);
          y += 8;
        }
      }

      // ── Comparison table ──
      if (includeComparison && properties.length > 1) {
        doc.addPage();
        doc.setFillColor(0, 68, 124);
        doc.rect(0, 0, pageW, 12, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('PLUSTERRA · Comparativa', margin, 8);

        let y = 22;
        doc.setTextColor(0, 68, 124);
        doc.setFontSize(14);
        doc.text('Comparativa de Propiedades', margin, y);
        y += 10;

        // Table headers
        const cols = [margin, margin + 55, margin + 90, margin + 115, margin + 135, margin + 155];
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(60, 60, 60);
        doc.text('Propiedad', cols[0], y);
        doc.text('Precio', cols[1], y);
        doc.text('Dormit.', cols[2], y);
        doc.text('Baños', cols[3], y);
        doc.text('m²', cols[4], y);
        doc.text('Cochera', cols[5], y);
        y += 3;
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, y, pageW - margin, y);
        y += 5;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        properties.forEach(p => {
          if (y > pageH - 20) { doc.addPage(); y = 20; }
          const price = Number(p.sale_price) > 0
            ? formatPrice(Number(p.sale_price), p.currency)
            : Number(p.rental_price) > 0
              ? formatPrice(Number(p.rental_price), p.currency)
              : '-';
          const titleTrunc = p.title.length > 28 ? p.title.substring(0, 26) + '…' : p.title;
          doc.setTextColor(40, 40, 40);
          doc.text(titleTrunc, cols[0], y);
          doc.text(price, cols[1], y);
          doc.text(String(p.bedrooms ?? '-'), cols[2], y);
          doc.text(String(p.bathrooms ?? '-'), cols[3], y);
          doc.text(p.area_m2 != null ? String(p.area_m2) : '-', cols[4], y);
          doc.text(p.has_garage ? 'Sí' : 'No', cols[5], y);
          y += 6;
        });
      }

      // Footer on last page
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text('Plusterra Propiedades · Encarnación, Paraguay', pageW / 2, pageH - 5, { align: 'center' });

      const fileName = (title.trim() || 'propiedades-seleccionadas').replace(/\s+/g, '-').toLowerCase();
      doc.save(`${fileName}.pdf`);
      toast.success('PDF generado correctamente');
      onOpenChange(false);
    } catch (err) {
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
