import { useState, useRef, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Copy, ChevronLeft, ChevronRight, Loader2, Check } from 'lucide-react';
import { usePropertyPhotos } from '@/hooks/usePropertyPhotos';
import { toast } from 'sonner';
import logoColor from '@/assets/logo-plusterra-horizontal.png';

const W = 1080;
const H = 1920;

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

    // Background
    ctx.fillStyle = '#00447C';
    ctx.fillRect(0, 0, W, H);

    // Load and draw property photo
    const photoH = 1150;
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
        ctx.fillStyle = '#1a3a5c';
        ctx.fillRect(0, 0, W, photoH);
        ctx.fillStyle = '#ffffff40';
        ctx.font = '48px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Sin foto disponible', W / 2, photoH / 2);
        ctx.textAlign = 'left';
      }
    } else {
      ctx.fillStyle = '#1a3a5c';
      ctx.fillRect(0, 0, W, photoH);
      ctx.fillStyle = '#ffffff40';
      ctx.font = '48px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Sin foto disponible', W / 2, photoH / 2);
      ctx.textAlign = 'left';
    }

    // Gradient overlay at bottom of photo
    const grad = ctx.createLinearGradient(0, photoH - 200, 0, photoH);
    grad.addColorStop(0, 'rgba(0,68,124,0)');
    grad.addColorStop(1, 'rgba(0,68,124,1)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, photoH - 200, W, 200);

    // Dark blue area below photo
    ctx.fillStyle = '#00447C';
    ctx.fillRect(0, photoH, W, H - photoH);

    const pad = 60;
    let y = photoH + 40;

    // Badge
    const badge = operationLabels[operationType] || 'PROPIEDAD';
    ctx.font = 'bold 32px sans-serif';
    const badgeW = ctx.measureText(badge).width + 40;
    ctx.fillStyle = '#FC5100';
    roundRect(ctx, pad, y - 8, badgeW, 52, 8);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(badge, pad + 20, y + 28);
    y += 75;

    // Title
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 52px sans-serif';
    const titleLines = wrapText(ctx, property.title || 'Propiedad', W - pad * 2, 2);
    for (const line of titleLines) {
      ctx.fillText(line, pad, y);
      y += 62;
    }
    y += 10;

    // Code
    if (property.property_code) {
      ctx.font = 'bold 34px sans-serif';
      ctx.fillStyle = '#ffffffcc';
      ctx.fillText(property.property_code, pad, y);
      y += 50;
    }

    // Location
    const location = [property.neighborhood || property.address, property.city].filter(Boolean).join(', ');
    if (location) {
      ctx.font = '34px sans-serif';
      ctx.fillStyle = '#ffffffbb';
      ctx.fillText(`📍 ${location}`, pad, y);
      y += 50;
    }

    // Price
    const op = operationType;
    const priceVal = op === 'sale' ? Number(property.sale_price) : Number(property.rental_price);
    const priceStr = formatPrice(priceVal, property.currency);
    const suffix = op === 'sale' ? '' : '/mes';
    ctx.font = 'bold 52px sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(`${priceStr}${suffix}`, pad, y + 10);
    y += 70;

    // Features row
    const features: string[] = [];
    if ((property.bedrooms ?? 0) > 0) features.push(`🛏 ${property.bedrooms}`);
    if ((property.bathrooms ?? 0) > 0) features.push(`🚿 ${property.bathrooms}`);
    if (Number(property.area_m2) > 0) features.push(`📐 ${property.area_m2}m²`);
    if (property.has_garage) features.push('🚗');

    if (features.length > 0) {
      ctx.font = '36px sans-serif';
      ctx.fillStyle = '#ffffffcc';
      const featStr = features.join('    ');
      ctx.fillText(featStr, pad, y + 10);
    }

    // Logo bottom right
    try {
      const logo = await loadImage(logoBlanco);
      const logoH = 80;
      const logoW = (logo.width / logo.height) * logoH;
      ctx.drawImage(logo, W - pad - logoW, H - pad - logoH, logoW, logoH);
    } catch { /* logo fail silently */ }

    // Bottom accent line
    ctx.fillStyle = '#FC5100';
    ctx.fillRect(0, H - 12, W, 12);

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
