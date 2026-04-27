import { useState, useRef, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Copy, ChevronLeft, ChevronRight, Loader2, Check, Share2 } from 'lucide-react';
import { usePropertyPhotos } from '@/hooks/usePropertyPhotos';
import { toast } from 'sonner';
import logoColor from '@/assets/plusterra-logo-color.png';

const W = 1080;
const H = 1350;

const operationLabels: Record<string, string> = {
  rent: 'ALQUILER', sale: 'VENTA', temporary: 'TEMPORAL',
};

const formatPrice = (amount: number | null, currency: string | null) => {
  if (!amount) return '-';
  if (currency === 'USD') return `USD ${amount.toLocaleString('es-PY')}`;
  return `GS. ${amount.toLocaleString('es-PY')}`;
};

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  property: any;
  operationType: string;
}

export const FlyerGeneratorDialog = ({ open, onOpenChange, property, operationType }: Props) => {
  const { data: photos } = usePropertyPhotos(property?.id);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [rendering, setRendering] = useState(false);
  const [copied, setCopied] = useState(false);

  const currentPhoto = photos?.[photoIndex];
  const photoUrl = currentPhoto?.photo_url || currentPhoto?.thumbnail_url;

  const drawFlyer = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas || !property) return;
    setRendering(true);

    const ctx = canvas.getContext('2d')!;
    canvas.width = W;
    canvas.height = H;

    // ── White background ──
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, W, H);

    // Layout constants (per design spec)
    const sideMargin = 30;       // 30px lateral margins
    const topMargin = 30;        // 30px top margin
    const gapPhotoBox = 30;      // 30px between photo and info box
    const radius = 40;           // rounded corners radius
    const boxPad = 60;           // 60px internal padding in info box
    const gapText = 30;          // 30px between text rows
    const gapPriceCode = 50;     // larger gap before code
    const footerH = 160;         // reserved space for features + logo
    const orangeBarH = 12;       // bottom orange accent bar

    const contentW = W - sideMargin * 2;

    // ── Photo section (rounded, floating) ──
    const photoX = sideMargin;
    const photoY = topMargin;
    const photoW = contentW;
    const photoH = 620;

    ctx.save();
    roundRect(ctx, photoX, photoY, photoW, photoH, radius);
    ctx.clip();
    if (photoUrl) {
      try {
        const img = await loadImage(photoUrl);
        const imgRatio = img.width / img.height;
        const targetRatio = photoW / photoH;
        let sx = 0, sy = 0, sw = img.width, sh = img.height;
        if (imgRatio > targetRatio) {
          sw = img.height * targetRatio;
          sx = (img.width - sw) / 2;
        } else {
          sh = img.width / targetRatio;
          sy = (img.height - sh) / 2;
        }
        ctx.drawImage(img, sx, sy, sw, sh, photoX, photoY, photoW, photoH);
      } catch {
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(photoX, photoY, photoW, photoH);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '48px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Sin foto disponible', W / 2, photoY + photoH / 2);
        ctx.textAlign = 'left';
      }
    } else {
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(photoX, photoY, photoW, photoH);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '48px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Sin foto disponible', W / 2, photoY + photoH / 2);
      ctx.textAlign = 'left';
    }
    ctx.restore();

    // ── Info box (rounded, floating) ──
    const boxX = sideMargin;
    const boxY = photoY + photoH + gapPhotoBox;

    // Pre-compute text content
    const badge = operationLabels[operationType] || 'PROPIEDAD';
    const titleText = (property.title || 'Propiedad').toUpperCase();
    const locText = (property.neighborhood || property.address || '').toString().toUpperCase();
    const op = operationType;
    const priceVal = op === 'sale' ? Number(property.sale_price) : Number(property.rental_price);
    const priceStr = formatPrice(priceVal, property.currency);
    const codeText = property.property_code ? `CÓDIGO: ${property.property_code}` : '';

    // Measure title lines (up to 2)
    ctx.font = 'bold 46px sans-serif';
    const titleLines = wrapText(ctx, titleText, contentW - boxPad * 2, 2);

    // Calculate dynamic box height
    const badgeH = 50;
    const titleLineH = 56;
    const titleH = titleLines.length * titleLineH;
    const locH = locText ? 38 : 0;
    const priceH = 50;
    const codeH = codeText ? 28 : 0;

    const boxH =
      boxPad +                       // top padding
      badgeH +
      gapText +
      titleH +
      (locText ? gapText + locH : 0) +
      gapText + priceH +
      (codeText ? gapPriceCode + codeH : 0) +
      boxPad;                        // bottom padding

    const boxW = contentW;

    ctx.fillStyle = '#1e3a5f';
    roundRect(ctx, boxX, boxY, boxW, boxH, radius);
    ctx.fill();

    // Draw box content
    let y = boxY + boxPad;
    const textX = boxX + boxPad;

    // Badge (white pill, dark blue text)
    ctx.font = 'bold 24px sans-serif';
    const badgeW = ctx.measureText(badge).width + 36;
    ctx.fillStyle = '#FFFFFF';
    roundRect(ctx, textX, y, badgeW, badgeH, 8);
    ctx.fill();
    ctx.fillStyle = '#1e3a5f';
    ctx.textBaseline = 'middle';
    ctx.fillText(badge, textX + 18, y + badgeH / 2 + 2);
    ctx.textBaseline = 'alphabetic';
    y += badgeH + gapText;

    // Title
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 46px sans-serif';
    for (let i = 0; i < titleLines.length; i++) {
      ctx.fillText(titleLines[i], textX, y + 44);
      y += titleLineH;
    }

    // Location (with pin)
    if (locText) {
      y += gapText - 10;
      ctx.font = '32px sans-serif';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText('\u{1F4CD} ' + locText, textX, y + 28);
      y += locH;
    }

    // Price
    y += gapText;
    ctx.font = 'bold 42px sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(priceStr, textX, y + 36);
    y += priceH;

    // Code (smaller, separated)
    if (codeText) {
      y += gapPriceCode - 20;
      ctx.font = '22px sans-serif';
      ctx.fillStyle = '#FFFFFFCC';
      ctx.fillText(codeText, textX, y + 20);
    }

    // ── Footer (features + logo) on white background ──
    // Footer is anchored to the bottom of the canvas with a fixed reserved height,
    // so it never gets clipped regardless of how tall the info box becomes.
    // The orange bar sits below the footer; subtract it so the footer doesn't sit on top of the bar.
    const footerY = H - footerH - orangeBarH;
    // Shift the visual center down a bit so text + logo sit more centered between the box and orange bar.
    const footerCenterY = footerY + footerH / 2 + 20;

    const features: string[] = [];
    if (Number(property.area_m2) > 0) features.push(`${property.area_m2} m²`);
    if ((property.bedrooms ?? 0) > 0) features.push(`${property.bedrooms} hab.`);
    if ((property.bathrooms ?? 0) > 0) features.push(`${property.bathrooms} baño${property.bathrooms > 1 ? 's' : ''}`);
    if (property.has_garage) features.push('cochera');

    if (features.length > 0) {
      ctx.font = '28px sans-serif';
      ctx.fillStyle = '#475569';
      // Draw features with bullet separators
      let fx = textX;
      const baseY = footerCenterY + 10;
      for (let i = 0; i < features.length; i++) {
        const part = features[i];
        ctx.fillText(part, fx, baseY);
        fx += ctx.measureText(part).width;
        if (i < features.length - 1) {
          const sep = '   •   ';
          ctx.fillStyle = '#1e3a5f';
          ctx.fillText(sep, fx, baseY);
          fx += ctx.measureText(sep).width;
          ctx.fillStyle = '#475569';
        }
      }
    }

    // Logo (right side, aligned with box right edge)
    try {
      const logo = await loadImage(logoColor);
      const logoH2 = 90;
      const logoW2 = (logo.width / logo.height) * logoH2;
      const logoX = W - sideMargin - boxPad / 2 - logoW2;
      ctx.drawImage(logo, logoX, footerCenterY - logoH2 / 2, logoW2, logoH2);
    } catch { /* logo fail silently */ }

    // Bottom accent line (orange)
    ctx.fillStyle = '#FC5100';
    ctx.fillRect(0, H - orangeBarH, W, orangeBarH);

    setRendering(false);
  }, [property, photoUrl, operationType]);

  useEffect(() => {
    if (open && property) {
      // Small delay so dialog is rendered
      const t = setTimeout(drawFlyer, 100);
      return () => clearTimeout(t);
    }
  }, [open, property, drawFlyer]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `flyer-${property.property_code || property.id}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    toast.success('Flyer descargado');
  };

  const canCopy = typeof navigator !== 'undefined' && !!navigator.clipboard?.write && typeof ClipboardItem !== 'undefined';

  const handleCopy = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const blob = await new Promise<Blob>((res, rej) =>
        canvas.toBlob(b => (b ? res(b) : rej(new Error('No blob'))), 'image/png')
      );
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Imagen copiada al portapapeles');
    } catch {
      // Fallback: download instead
      handleDownload();
      toast.info('Tu navegador no soporta copiar imágenes. Se descargó el archivo.');
    }
  };

  const handleShare = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const blob = await new Promise<Blob>((res, rej) =>
        canvas.toBlob(b => (b ? res(b) : rej(new Error('No blob'))), 'image/png')
      );
      const file = new File([blob], `flyer-${property.property_code || property.id}.png`, { type: 'image/png' });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: property.title });
      } else {
        handleDownload();
      }
    } catch {
      handleDownload();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">Generador de Flyer</DialogTitle>
          <DialogDescription className="sr-only">
            Vista previa y descarga del flyer de la propiedad.
          </DialogDescription>
        </DialogHeader>

        {/* Photo selector */}
        {photos && photos.length > 1 && (
          <div className="flex items-center justify-center gap-3 mb-2">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPhotoIndex(i => Math.max(0, i - 1))} disabled={photoIndex === 0}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-xs text-muted-foreground">Foto {photoIndex + 1} de {photos.length}</span>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPhotoIndex(i => Math.min((photos?.length || 1) - 1, i + 1))} disabled={photoIndex >= (photos?.length || 1) - 1}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Canvas preview */}
        <div className="relative bg-muted rounded-lg overflow-hidden">
          {rendering && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/60 z-10">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          )}
          <canvas ref={canvasRef} className="w-full h-auto" style={{ aspectRatio: `${W}/${H}` }} />
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-2">
          <Button onClick={handleDownload} className="flex-1 gap-2">
            <Download className="w-4 h-4" /> Descargar PNG
          </Button>
          {canCopy ? (
            <Button onClick={handleCopy} variant="outline" className="flex-1 gap-2">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copiado' : 'Copiar imagen'}
            </Button>
          ) : (
            <Button onClick={handleShare} variant="outline" className="flex-1 gap-2">
              <Share2 className="w-4 h-4" /> Compartir
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

/* ── Helpers ── */

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxW: number, maxLines: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const w of words) {
    const test = current ? `${current} ${w}` : w;
    if (ctx.measureText(test).width > maxW && current) {
      lines.push(current);
      current = w;
      if (lines.length >= maxLines) break;
    } else {
      current = test;
    }
  }
  if (current && lines.length < maxLines) lines.push(current);
  if (lines.length === maxLines && current && !lines.includes(current)) {
    lines[maxLines - 1] = lines[maxLines - 1] + '…';
  }
  return lines;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
