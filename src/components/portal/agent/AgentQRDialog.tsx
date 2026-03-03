import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { QRCodeSVG } from 'qrcode.react';
import { Download, Share2 } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  agentName: string;
}

export const AgentQRDialog = ({ open, onOpenChange, agentName }: Props) => {
  const url = window.location.href;

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: `${agentName} - Plusterra`, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      toast.success('Enlace copiado');
    }
  };

  const handleDownload = () => {
    const svg = document.getElementById('agent-qr-svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      ctx?.drawImage(img, 0, 0, 512, 512);
      const a = document.createElement('a');
      a.download = `qr-${agentName.replace(/\s+/g, '-').toLowerCase()}.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm text-center">
        <DialogHeader>
          <DialogTitle className="text-center">Compartir perfil</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground mb-4">Escaneá el QR para ver el perfil de <strong>{agentName}</strong></p>
        <div className="flex justify-center">
          <div className="bg-white p-4 rounded-xl border border-border shadow-sm inline-block">
            <QRCodeSVG
              id="agent-qr-svg"
              value={url}
              size={200}
              fgColor="#00447C"
              level="M"
              includeMargin
            />
          </div>
        </div>
        <div className="flex items-center justify-center gap-3 mt-4">
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Download className="w-4 h-4" /> Descargar
          </button>
          <button
            onClick={handleShare}
            className="flex items-center gap-2 bg-muted text-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-muted/80 transition-colors"
          >
            <Share2 className="w-4 h-4" /> Compartir link
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
