import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { PipelineDeal, getStages, getStageLabel, PipelineType, useUpdatePipelineDeal } from '@/hooks/usePipelineDeals';

interface Props {
  deal: PipelineDeal | null;
  pipelineType: PipelineType;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const REQUIRES_DATE = ['visita_agendada'];
const REQUIRES_RESERVATION = ['reservado', 'sena_reserva'];
const REQUIRES_CONFIRM = ['cerrado'];

export const PipelineStageChangeDialog = ({ deal, pipelineType, open, onOpenChange }: Props) => {
  const stages = getStages(pipelineType);
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [actionDate, setActionDate] = useState('');
  const [reservationDeadline, setReservationDeadline] = useState('');
  const [stageNotes, setStageNotes] = useState('');
  const updateDeal = useUpdatePipelineDeal();

  const needsDate = selectedStage && REQUIRES_DATE.includes(selectedStage);
  const needsReservation = selectedStage && REQUIRES_RESERVATION.includes(selectedStage);
  const needsConfirm = selectedStage && REQUIRES_CONFIRM.includes(selectedStage);

  const canSave = () => {
    if (!selectedStage) return false;
    if (needsDate && !actionDate) return false;
    if (needsReservation && (!reservationDeadline || !stageNotes.trim())) return false;
    if (needsConfirm && !stageNotes.trim()) return false;
    return true;
  };

  const handleSave = () => {
    if (!deal || !selectedStage) return;

    const updates: any = { id: deal.id, stage: selectedStage };
    if (actionDate) updates.next_action_date = actionDate;
    if (reservationDeadline) updates.reservation_deadline = reservationDeadline;
    if (stageNotes.trim()) updates.notes = [deal.notes, `[${selectedStage}] ${stageNotes}`].filter(Boolean).join('\n');

    updateDeal.mutate(updates, {
      onSuccess: () => {
        onOpenChange(false);
        setSelectedStage(null);
        setActionDate('');
        setReservationDeadline('');
        setStageNotes('');
      },
    });
  };

  if (!deal) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Cambiar etapa</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Actual: <strong>{getStageLabel(pipelineType, deal.stage)}</strong>
        </p>

        <div className="grid gap-1.5 max-h-48 overflow-y-auto">
          {stages.map((s) => (
            <Button
              key={s.key}
              variant={selectedStage === s.key ? 'default' : 'outline'}
              size="sm"
              className="justify-start text-xs h-8"
              disabled={s.key === deal.stage}
              onClick={() => setSelectedStage(s.key)}
            >
              {s.label}
            </Button>
          ))}
        </div>

        {needsDate && (
          <div className="space-y-1">
            <Label className="text-xs">Fecha de visita / acción *</Label>
            <Input type="datetime-local" value={actionDate} onChange={(e) => setActionDate(e.target.value)} />
          </div>
        )}

        {needsReservation && (
          <div className="space-y-1">
            <Label className="text-xs">Fecha límite reserva *</Label>
            <Input type="date" value={reservationDeadline} onChange={(e) => setReservationDeadline(e.target.value)} />
          </div>
        )}

        {(needsReservation || needsConfirm) && (
          <div className="space-y-1">
            <Label className="text-xs">Notas {needsConfirm ? 'finales' : ''} *</Label>
            <Textarea value={stageNotes} onChange={(e) => setStageNotes(e.target.value)} rows={2} />
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button size="sm" disabled={!canSave() || updateDeal.isPending} onClick={handleSave}>
            {updateDeal.isPending ? 'Guardando...' : 'Mover'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
