import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Receipt, FileDown, Eye, Share2 } from 'lucide-react';
import { SignaturePad } from './SignaturePad';
import { useAuth } from '@/contexts/AuthContext';
import { generateReceiptPDF, autoAmountInWords, type ReceiptData } from '@/lib/receiptGenerator';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CURRENCIES = [
  { value: 'PYG', label: 'Gs. (Guaranies)' },
  { value: 'USD', label: 'USD (Dolares)' },
  { value: 'BRL', label: 'BRL (Reales)' },
  { value: 'ARS', label: 'ARS (Pesos Argentinos)' },
  { value: 'USDT', label: 'USDT (Tether)' },
  { value: 'BTC', label: 'BTC (Bitcoin)' },
  { value: 'OTHER', label: 'Otra moneda' },
];

const PAYMENT_METHODS = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia bancaria' },
  { value: 'binance', label: 'Binance' },
  { value: 'cripto_otro', label: 'Otro cripto' },
  { value: 'otro', label: 'Otro' },
];

const isCrypto = (c: string) => ['USDT', 'BTC'].includes(c);

function generateReceiptNumber(): string {
  const now = new Date();
  const y = now.getFullYear();
  const seq = String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0');
  return `REC-${y}-${seq}`;
}

export const MoneyReceiptDialog = ({ open, onOpenChange }: Props) => {
  const { profile } = useAuth();

  const [emisorName, setEmisorName] = useState('');
  const [city, setCity] = useState('Encarnacion');
  const [receivedFrom, setReceivedFrom] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('PYG');
  const [currencyLabel, setCurrencyLabel] = useState('');
  const [cryptoPlatform, setCryptoPlatform] = useState('');
  const [amountInWordsManual, setAmountInWordsManual] = useState('');
  const [concept, setConcept] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('efectivo');
  const [paymentMethodOther, setPaymentMethodOther] = useState('');
  const [propertyDescription, setPropertyDescription] = useState('');
  const [observations, setObservations] = useState('');
  const [receiptNumber] = useState(generateReceiptNumber);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.full_name && !emisorName) {
      setEmisorName(profile.full_name);
    }
  }, [profile, emisorName]);

  const autoWords = useMemo(() => autoAmountInWords(amount, currency), [amount, currency]);
  const canAutoWords = currency === 'PYG' || currency === 'USD';
  const finalWords = canAutoWords ? autoWords : amountInWordsManual;

  const buildData = (): ReceiptData => ({
    emisorName,
    city,
    date: new Date().toLocaleDateString('es-PY', { day: 'numeric', month: 'long', year: 'numeric' }),
    receiptNumber,
    receivedFrom,
    amount,
    currency,
    currencyLabel,
    cryptoPlatform: isCrypto(currency) || paymentMethod === 'binance' || paymentMethod === 'cripto_otro' ? cryptoPlatform : '',
    amountInWords: finalWords,
    concept,
    paymentMethod,
    paymentMethodOther,
    propertyDescription,
    observations,
    signatureDataUrl,
  });

  const handlePreview = () => {
    if (!receivedFrom || !amount || !concept) {
      toast.error('Completa los campos obligatorios: Recibi de, Monto y Concepto');
      return;
    }
    try {
      const pdf = generateReceiptPDF(buildData());
      const blob = pdf.output('blob');
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      window.open(url, '_blank');
    } catch {
      toast.error('Error al generar vista previa');
    }
  };

  const handleDownload = () => {
    if (!receivedFrom || !amount || !concept) {
      toast.error('Completa los campos obligatorios');
      return;
    }
    try {
      const pdf = generateReceiptPDF(buildData());
      pdf.save(`${receiptNumber}.pdf`);
      toast.success('Recibo descargado');
    } catch {
      toast.error('Error al generar PDF');
    }
  };

  const handleShare = async () => {
    if (!receivedFrom || !amount || !concept) {
      toast.error('Completa los campos obligatorios');
      return;
    }
    try {
      const pdf = generateReceiptPDF(buildData());
      const blob = pdf.output('blob');
      const file = new File([blob], `${receiptNumber}.pdf`, { type: 'application/pdf' });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Recibo de Dinero' });
      } else {
        // fallback: download
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${receiptNumber}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        toast.info('Descargado. Compartilo manualmente por WhatsApp.');
      }
    } catch {
      toast.error('Error al compartir');
    }
  };

  const showCryptoField = isCrypto(currency) || paymentMethod === 'binance' || paymentMethod === 'cripto_otro';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-primary" />
            Recibo de Dinero
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Genera un recibo rapido para enviar por WhatsApp. No se guarda en el sistema.
          </p>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* ENCABEZADO */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Nombre del emisor</Label>
              <Input value={emisorName} onChange={(e) => setEmisorName(e.target.value)} placeholder="Tu nombre" />
            </div>
            <div>
              <Label>Ciudad</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
          </div>

          <div className="text-xs text-muted-foreground">
            Recibo No. <span className="font-mono font-semibold">{receiptNumber}</span> — Fecha: {new Date().toLocaleDateString('es-PY')}
          </div>

          <Separator />

          {/* DATOS DEL PAGO */}
          <div>
            <Label>Recibi de <span className="text-destructive">*</span></Label>
            <Input value={receivedFrom} onChange={(e) => setReceivedFrom(e.target.value)} placeholder="Nombre de quien paga" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Monto <span className="text-destructive">*</span></Label>
              <Input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9.,]/g, ''))}
                placeholder="0"
              />
            </div>
            <div>
              <Label>Moneda</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {currency === 'OTHER' && (
            <div>
              <Label>Nombre de la moneda</Label>
              <Input value={currencyLabel} onChange={(e) => setCurrencyLabel(e.target.value)} placeholder="Ej: Euros" />
            </div>
          )}

          {showCryptoField && (
            <div>
              <Label>Plataforma / Red</Label>
              <Input value={cryptoPlatform} onChange={(e) => setCryptoPlatform(e.target.value)} placeholder="Ej: Binance, MetaMask, TRC20" />
            </div>
          )}

          {canAutoWords && autoWords && (
            <p className="text-xs text-muted-foreground italic">En letras: {autoWords}</p>
          )}

          {!canAutoWords && (
            <div>
              <Label>Monto en letras (manual)</Label>
              <Input value={amountInWordsManual} onChange={(e) => setAmountInWordsManual(e.target.value)} placeholder="Trescientos USDT" />
            </div>
          )}

          <div>
            <Label>En concepto de <span className="text-destructive">*</span></Label>
            <Textarea
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              placeholder="Ej: Senia por alquiler de departamento"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Forma de cobro</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {paymentMethod === 'otro' && (
              <div>
                <Label>Especificar</Label>
                <Input value={paymentMethodOther} onChange={(e) => setPaymentMethodOther(e.target.value)} />
              </div>
            )}
          </div>

          <Separator />

          {/* PROPIEDAD OPCIONAL */}
          <div>
            <Label>Descripcion del inmueble <span className="text-muted-foreground text-xs">(opcional)</span></Label>
            <Input value={propertyDescription} onChange={(e) => setPropertyDescription(e.target.value)} placeholder="Ej: Depto 4B, Edificio Sol" />
          </div>

          <div>
            <Label>Observaciones <span className="text-muted-foreground text-xs">(opcional)</span></Label>
            <Textarea value={observations} onChange={(e) => setObservations(e.target.value)} rows={2} />
          </div>

          {/* FIRMA */}
          <SignaturePad onSignatureChange={setSignatureDataUrl} />

          <Separator />

          {/* ACCIONES */}
          <div className="flex flex-wrap gap-2 justify-end">
            <Button variant="outline" onClick={handlePreview} className="gap-2">
              <Eye className="w-4 h-4" /> Previsualizar
            </Button>
            <Button variant="outline" onClick={handleDownload} className="gap-2">
              <FileDown className="w-4 h-4" /> Descargar PDF
            </Button>
            <Button onClick={handleShare} className="gap-2">
              <Share2 className="w-4 h-4" /> Compartir
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
