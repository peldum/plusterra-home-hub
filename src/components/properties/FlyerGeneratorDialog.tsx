import { useState, useRef, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Copy, ChevronLeft, ChevronRight, Loader2, Check } from 'lucide-react';
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
  return `₲ ${amount.toLocaleString('es-PY')}`;
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

    // Layout zones
    const photoH = 1050;
    const infoH = 520;
    const footerH = H - photoH - infoH; // white bottom area

    // ── Photo section ──
    if (photoUrl) {
      try {
        const img = await loadImage(photoUrl);
        const imgRatio = img.width / img.height;
        const targetRatio = W / photoH;
        let sx = 0, sy = 0, sw = img.width, sh = img.height;
        if (imgRatio > targetRatio) {
          sw = img.height * targetRatio;
          sx = (img.width - sw) / 2;
        } else {
          sh = img.width / targetRatio;
          sy = (img.height - sh) / 2;
        }
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, W, photoH);
      } catch {
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(0, 0, W, photoH);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '48px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Sin foto disponible', W / 2, photoH / 2);
        ctx.textAlign = 'left';
      }
    } else {
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(0, 0, W, photoH);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '48px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Sin foto disponible', W / 2, photoH / 2);
      ctx.textAlign = 'left';
    }

    // ── Dark blue info section (no gradient, clean edge) ──
    ctx.fillStyle = '#1e3a5f';
    ctx.fillRect(0, photoH, W, infoH);

    const pad = 60;
    let y = photoH + 65;

    // Badge
    const badge = operationLabels[operationType] || 'PROPIEDAD';
    ctx.font = 'bold 28px sans-serif';
    const badgeW = ctx.measureText(badge).width + 36;
    ctx.fillStyle = '#FFFFFF';
    roundRect(ctx, pad, y - 6, badgeW, 44, 6);
    ctx.fill();
    ctx.fillStyle = '#1e3a5f';
    ctx.fillText(badge, pad + 18, y + 24);
    y += 110;

    // Title
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 48px sans-serif';
    const titleLines = wrapText(ctx, property.title || 'Propiedad', W - pad * 2, 2);
    for (const line of titleLines) {
      ctx.fillText(line, pad, y);
      y += 58;
    }
    y += 8;

    // Code
    if (property.property_code) {
      ctx.font = 'bold 32px sans-serif';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(property.property_code, pad, y);
      y += 48;
    }

    // Location
    const location = [property.neighborhood || property.address, property.city].filter(Boolean).join(', ');
    if (location) {
      ctx.font = '32px sans-serif';
      ctx.fillStyle = '#ffffffcc';
      ctx.fillText('\u{1F4CD} ' + location, pad, y);
      y += 48;
    }

    // Price
    const op = operationType;
    const priceVal = op === 'sale' ? Number(property.sale_price) : Number(property.rental_price);
    const priceStr = formatPrice(priceVal, property.currency);
    const suffix = op === 'sale' ? '' : '/mes';
    ctx.font = 'bold 44px sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(`${priceStr}${suffix}`, pad, y);

    // ── White footer section ──
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, photoH + infoH, W, footerH);

    const footerY = photoH + infoH;
    const footerMidY = footerY + footerH / 2;

    // Features row with text symbols instead of emojis
    const features: string[] = [];
    if ((property.bedrooms ?? 0) > 0) features.push(`\u25FB ${property.bedrooms} hab.`);
    if ((property.bathrooms ?? 0) > 0) features.push(`\u25AB ${property.bathrooms} baño${property.bathrooms > 1 ? 's' : ''}`);
    if (Number(property.area_m2) > 0) features.push(`${property.area_m2}m²`);
    if (property.has_garage) features.push('cochera');

    if (features.length > 0) {
      ctx.font = '36px sans-serif';
      ctx.fillStyle = '#475569';
      const featStr = features.join('    ');
      ctx.fillText(featStr, pad, footerMidY + 12);
    }

    // Color logo (right side, centered vertically, bigger)
    try {
      const logo = await loadImage(logoColor);
      const logoH2 = 120;
      const logoW2 = (logo.width / logo.height) * logoH2;
      // Clear any background artifact by painting white behind logo area
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(W - pad - logoW2 - 4, footerMidY - logoH2 / 2 - 4, logoW2 + 8, logoH2 + 8);
      ctx.drawImage(logo, W - pad - logoW2, footerMidY - logoH2 / 2, logoW2, logoH2);
    } catch { /* logo fail silently */ }

    // Bottom accent line (orange)
    ctx.fillStyle = '#FC5100';
    ctx.fillRect(0, H - 10, W, 10);

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
      toast.error('No se pudo copiar. Intentá descargar.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">Generador de Flyer</DialogTitle>
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
          <Button onClick={handleCopy} variant="outline" className="flex-1 gap-2">
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copiado' : 'Copiar imagen'}
          </Button>
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
