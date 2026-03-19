import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { CheckCircle2, Loader2, Eye, ShieldOff } from 'lucide-react';
import type { Receivable } from '@/hooks/useReceivables';

const fmtGs = (n: number) =>
  'Gs. ' + new Intl.NumberFormat('es-PY', { minimumFractionDigits: 0 }).format(n);

const conceptLabels: Record<string, string> = {
  alquiler: 'Alquiler', canon: 'Canon', multa: 'Multa',
  servicio: 'Servicio', expensa: 'Expensa', otro: 'Otro',
};

function getDiasMora(r: Receivable): number {
  if (r.status === 'paid') return 0;
  const dueDate = new Date(r.due_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
}

interface Props {
  receivable: Receivable | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmPayment: (data: {
    id: string;
    paidAmount: number;
    mora_automatica: number;
    mora_negociada: number;
    descuento: number;
    total_cobrado: number;
    payment_method: string;
    reference_number?: string;
  }) => void;
  isPending: boolean;
  readOnly?: boolean;
}

export const ReceivableDetailDialog = ({
  receivable, open, onOpenChange, onConfirmPayment, isPending, readOnly,
}: Props) => {
  const [mora, setMora] = useState(0);
  const [descuento, setDescuento] = useState(0);
  const [exonerarMora, setExonerarMora] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');

  const r = receivable;

  useEffect(() => {
    if (r) {
      setMora(r.mora_negociada ?? 0);
      setDescuento(r.descuento ?? 0);
      setExonerarMora(false);
    }
  }, [r]);

  const diasMora = r ? getDiasMora(r) : 0;
  const effectiveMora = exonerarMora ? 0 : mora;
  const totalACobrar = r ? r.amount + effectiveMora - descuento : 0;

  const isPaid = r?.status === 'paid';

  if (!r) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-primary" />
            {isPaid ? 'Comprobante de Cobro' : 'Detalle de Cobro'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Info section */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">Cliente / Agente</span>
              <p className="font-medium">{r.debtor_name || '—'}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Rol</span>
              <p>
                <Badge variant="outline" className="capitalize text-xs">
                  {r.debtor_role === 'tenant' ? 'Inquilino' : 'Agente'}
                </Badge>
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Propiedad</span>
              <p className="font-medium">{r.property_title || '—'}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Concepto</span>
              <p className="font-medium">{conceptLabels[r.concept] || r.concept}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Vencimiento</span>
              <p className="font-medium">{new Date(r.due_date).toLocaleDateString('es-PY')}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Días de mora</span>
              <p className={`font-semibold ${diasMora > 0 ? 'text-destructive' : 'text-success'}`}>
                {diasMora > 0 ? diasMora : 'Al día'}
              </p>
            </div>
          </div>

          <Separator />

          {/* Desglose */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm">Desglose del monto</h4>

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Monto base</span>
              <span className="font-medium">{fmtGs(r.amount)}</span>
            </div>

            {!isPaid && !readOnly ? (
              <>
                {/* Exonerar mora toggle */}
                <div className="flex items-center justify-between rounded-lg bg-warning/5 border border-warning/20 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <ShieldOff className="w-4 h-4 text-warning" />
                    <Label htmlFor="exonerar-mora" className="text-sm font-medium cursor-pointer">
                      Exonerar mora
                    </Label>
                  </div>
                  <Switch
                    id="exonerar-mora"
                    checked={exonerarMora}
                    onCheckedChange={(checked) => {
                      setExonerarMora(checked);
                      if (checked) setMora(0);
                    }}
                  />
                </div>

                <div className="flex items-center justify-between text-sm gap-2">
                  <span className="text-muted-foreground">Mora (manual)</span>
                  <Input
                    type="number"
                    min={0}
                    value={exonerarMora ? 0 : (mora || '')}
                    onChange={e => setMora(Number(e.target.value) || 0)}
                    className="w-32 h-8 text-right text-sm"
                    placeholder="0"
                    disabled={exonerarMora}
                  />
                </div>
                <div className="flex items-center justify-between text-sm gap-2">
                  <span className="text-muted-foreground">Descuento</span>
                  <Input
                    type="number"
                    min={0}
                    value={descuento || ''}
                    onChange={e => setDescuento(Number(e.target.value) || 0)}
                    className="w-32 h-8 text-right text-sm"
                    placeholder="0"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Mora</span>
                  <span className={`font-medium ${(r.mora_negociada ?? 0) > 0 ? 'text-destructive' : ''}`}>
                    {fmtGs(r.mora_negociada ?? 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Descuento</span>
                  <span className="font-medium">- {fmtGs(r.descuento ?? 0)}</span>
                </div>
              </>
            )}

            <Separator />

            <div className="flex items-center justify-between">
              <span className="font-bold text-base">TOTAL A COBRAR</span>
              <span className="font-bold text-lg text-primary">
                {fmtGs(isPaid ? (r.total_cobrado ?? r.paid_amount ?? r.amount) : totalACobrar)}
              </span>
            </div>

            {isPaid && r.paid_date && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Fecha de pago</span>
                <span className="font-medium text-success">
                  {new Date(r.paid_date).toLocaleDateString('es-PY')}
                </span>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          {!isPaid && !readOnly ? (
            <Button
              onClick={() =>
                onConfirmPayment({
                  id: r.id,
                  paidAmount: totalACobrar,
                  mora_automatica: 0,
                  mora_negociada: effectiveMora,
                  descuento,
                  total_cobrado: totalACobrar,
                })
              }
              disabled={isPending || totalACobrar <= 0}
              className="w-full"
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mr-2" />
              )}
              Confirmar pago por {fmtGs(totalACobrar)}
            </Button>
          ) : (
            <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">
              Cerrar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
