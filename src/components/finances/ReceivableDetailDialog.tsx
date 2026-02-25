import { useState, useMemo, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle2, Loader2, Eye } from 'lucide-react';
import type { Receivable } from '@/hooks/useReceivables';

const fmtGs = (n: number) =>
  'Gs. ' + new Intl.NumberFormat('es-PY', { minimumFractionDigits: 0 }).format(n);

const conceptLabels: Record<string, string> = {
  alquiler: 'Alquiler',
  canon: 'Canon',
  multa: 'Multa',
  servicio: 'Servicio',
  expensa: 'Expensa',
  otro: 'Otro',
};

const NEAR_DUE_DAYS = 7;

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
  }) => void;
  isPending: boolean;
  readOnly?: boolean;
}

export const ReceivableDetailDialog = ({
  receivable, open, onOpenChange, onConfirmPayment, isPending, readOnly,
}: Props) => {
  const [moraNegociada, setMoraNegociada] = useState(0);
  const [descuento, setDescuento] = useState(0);

  const r = receivable;

  useEffect(() => {
    if (r) {
      setMoraNegociada(r.mora_negociada ?? 0);
      setDescuento(r.descuento ?? 0);
    }
  }, [r]);

  const diasMora = r ? getDiasMora(r) : 0;

  // Mora automática: 2% por día de mora sobre el monto base
  const moraAutomatica = useMemo(() => {
    if (!r || diasMora <= 0) return 0;
    return Math.round(r.amount * 0.02 * diasMora);
  }, [r, diasMora]);

  const totalACobrar = useMemo(() => {
    if (!r) return 0;
    return r.amount + moraAutomatica + moraNegociada - descuento;
  }, [r, moraAutomatica, moraNegociada, descuento]);

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

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Mora automática ({diasMora} días × 2%)</span>
              <span className={`font-medium ${moraAutomatica > 0 ? 'text-destructive' : ''}`}>
                {fmtGs(moraAutomatica)}
              </span>
            </div>

            {!isPaid && !readOnly ? (
              <>
                <div className="flex items-center justify-between text-sm gap-2">
                  <span className="text-muted-foreground">Mora negociada</span>
                  <Input
                    type="number"
                    min={0}
                    value={moraNegociada || ''}
                    onChange={e => setMoraNegociada(Number(e.target.value) || 0)}
                    className="w-32 h-8 text-right text-sm"
                    placeholder="0"
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
                  <span className="text-muted-foreground">Mora negociada</span>
                  <span className="font-medium">{fmtGs(r.mora_negociada ?? 0)}</span>
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
                  mora_automatica: moraAutomatica,
                  mora_negociada: moraNegociada,
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
