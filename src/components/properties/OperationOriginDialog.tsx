/**
 * OperationOriginDialog — Pregunta el origen de una operación (alquiler/venta)
 * antes de generar la comisión automática.
 *
 * Caso de uso: cuando se marca una propiedad como "Alquilada" o "Vendida",
 * el sistema necesita saber si la operación fue cerrada por Plusterra (genera
 * comisión) o por el propietario / otra inmobiliaria (solo cambia el estado).
 */
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Building2, UserCheck } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  operationType: 'rental' | 'sale';
  /** Plusterra cerró la operación → abrir flujo de comisión */
  onPlusterra: () => void;
  /** Propietario u otra empresa cerró la operación → solo cambiar estado, sin comisión */
  onExternal: () => void;
}

export const OperationOriginDialog = ({
  open,
  onOpenChange,
  operationType,
  onPlusterra,
  onExternal,
}: Props) => {
  const verb = operationType === 'rental' ? 'alquiler' : 'venta';
  const Verbo = operationType === 'rental' ? 'Alquiler' : 'Venta';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-lg">
            ¿Quién cerró este {verb}?
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground pt-1">
            La propiedad será marcada como {operationType === 'rental' ? 'Alquilada' : 'Vendida'}
            {' '}en cualquier caso. Solo se registra comisión si la operación fue gestionada por Plusterra.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-2">
          {/* Plusterra cerró */}
          <button
            type="button"
            onClick={onPlusterra}
            className="w-full text-left rounded-xl border border-border bg-card hover:border-primary hover:bg-primary/5 transition-all p-4 flex gap-3 items-start group"
          >
            <div className="shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-foreground text-sm">
                Plusterra cerró la operación
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Se abrirá el formulario para registrar la comisión cobrada por la inmobiliaria.
              </p>
            </div>
          </button>

          {/* Externo */}
          <button
            type="button"
            onClick={onExternal}
            className="w-full text-left rounded-xl border border-border bg-card hover:border-muted-foreground hover:bg-muted/40 transition-all p-4 flex gap-3 items-start group"
          >
            <div className="shrink-0 w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
              <UserCheck className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-foreground text-sm">
                El propietario u otra empresa cerró la operación
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                La propiedad queda como {Verbo.toLowerCase()}, pero <strong>no se registra ninguna comisión</strong> en Finanzas.
              </p>
            </div>
          </button>
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
