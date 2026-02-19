import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { QRCodeSVG } from 'qrcode.react';
import { Key, Copy, Download } from 'lucide-react';
import { toast } from 'sonner';

interface KeyQRDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  property: { id: string; title: string; property_code?: string };
}

export const KeyQRDialog = ({ open, onOpenChange, property }: KeyQRDialogProps) => {
  const appUrl = window.location.origin;
  const qrValue = `${appUrl}/retiro-llave?property=${property.id}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(qrValue);
    toast.success('Enlace copiado al portapapeles');
  };

  const handleDownload = () => {
    const svg = document.getElementById('key-qr-svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    canvas.width = 300;
    canvas.height = 300;
    img.onload = () => {
      ctx?.drawImage(img, 0, 0);
      const a = document.createElement('a');
      a.download = `qr-llave-${property.property_code || property.id.slice(0, 8)}.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="w-5 h-5 text-primary" />
            QR Control de Llave
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">{property.title}</p>
          {property.property_code && (
            <p className="text-xs text-center font-mono bg-muted px-2 py-1 rounded">{property.property_code}</p>
          )}
          <div className="flex justify-center p-4 bg-white rounded-xl border border-border">
            <QRCodeSVG
              id="key-qr-svg"
              value={qrValue}
              size={200}
              level="H"
              includeMargin
            />
          </div>
          <p className="text-xs text-muted-foreground text-center">
            El agente escanea este QR para registrar el retiro de la llave.
            Requiere sesión activa en el sistema.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-border text-sm hover:bg-muted transition-colors"
            >
              <Copy className="w-4 h-4" /> Copiar enlace
            </button>
            <button
              onClick={handleDownload}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors"
            >
              <Download className="w-4 h-4" /> Descargar
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
