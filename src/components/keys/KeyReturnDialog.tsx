import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useRegisterKeyReturn } from '@/hooks/useKeyMovements';
import { KeyCurrentStatus } from '@/hooks/useKeyMovements';
import { KeyStatusBadge } from './KeyStatusBadge';
import { ArrowDownCircle } from 'lucide-react';

interface KeyReturnDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  propertyTitle: string;
  currentStatus: KeyCurrentStatus;
}

export const KeyReturnDialog = ({ open, onOpenChange, propertyId, propertyTitle, currentStatus }: KeyReturnDialogProps) => {
  const [notes, setNotes] = useState('');
  const registerReturn = useRegisterKeyReturn();

  const handleConfirm = async () => {
    if (!currentStatus.lastMovement) return;
    await registerReturn.mutateAsync({
      propertyId,
      lastMovementType: currentStatus.lastMovement.movement_type,
      notes: notes.trim() || undefined,
    });
    setNotes('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowDownCircle className="w-5 h-5 text-success" />
            Confirmar Devolución
          </DialogTitle>
          <p className="text-xs text-muted-foreground truncate">{propertyTitle}</p>
        </DialogHeader>

        <div className="space-y-4">
          <KeyStatusBadge
            status={currentStatus.status}
            responsibleName={currentStatus.responsibleName}
            since={currentStatus.since}
          />

          <div className="p-3 rounded-xl bg-success/5 border border-success/20">
            <p className="text-sm text-success font-medium">Al confirmar, la llave pasará a:</p>
            <p className="text-sm font-bold text-success mt-1">🏢 EN OFICINA</p>
          </div>

          <div>
            <label className="text-xs font-medium text-foreground mb-1 block">Notas de devolución (opcional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Observaciones sobre la devolución..."
              rows={2}
              maxLength={300}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>

          <div className="flex gap-2">
            <button onClick={() => onOpenChange(false)}
              className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              disabled={registerReturn.isPending}
              className="flex-1 px-4 py-2.5 rounded-xl bg-success text-white text-sm font-medium hover:bg-success/90 transition-colors disabled:opacity-50"
            >
              {registerReturn.isPending ? 'Confirmando...' : '✓ Confirmar Devolución'}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
