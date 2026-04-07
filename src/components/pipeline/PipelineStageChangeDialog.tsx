import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { PipelineDeal, UNIFIED_STAGES, getStageLabel, PipelineType, useUpdatePipelineDeal } from '@/hooks/usePipelineDeals';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CalendarPlus } from 'lucide-react';

interface Props {
  deal: PipelineDeal | null;
  pipelineType: PipelineType;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const REQUIRES_DATE = ['visita_agendada'];
const REQUIRES_CONFIRM = ['cerrado'];

export const PipelineStageChangeDialog = ({ deal, pipelineType, open, onOpenChange }: Props) => {
  const stages = UNIFIED_STAGES;
  const { user } = useAuth();
  const qc = useQueryClient();
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [actionDate, setActionDate] = useState('');
  const [stageNotes, setStageNotes] = useState('');
  const [createAgendaEvent, setCreateAgendaEvent] = useState(true);
  const updateDeal = useUpdatePipelineDeal();

  const needsDate = selectedStage && REQUIRES_DATE.includes(selectedStage);
  const needsConfirm = selectedStage && REQUIRES_CONFIRM.includes(selectedStage);

  const canSave = () => {
    if (!selectedStage) return false;
    if (needsDate && !actionDate) return false;
    if (needsConfirm && !stageNotes.trim()) return false;
    return true;
  };

  const handleSave = async () => {
    if (!deal || !selectedStage) return;

    const updates: any = { id: deal.id, stage: selectedStage };
    if (actionDate) updates.next_action_date = actionDate;
    if (stageNotes.trim()) updates.notes = [deal.notes, `[${selectedStage}] ${stageNotes}`].filter(Boolean).join('\n');

    updateDeal.mutate(updates, {
      onSuccess: async () => {
        // Create agenda event when moving to "Visita agendada"
        if (selectedStage === 'visita_agendada' && createAgendaEvent && actionDate && user) {
          try {
            await supabase.from('agent_tasks' as any).insert({
              agent_id: user.id,
              task_type: 'visita',
              title: `Visita: ${deal.client_name || 'Cliente'}`,
              description: `Visita agendada para ${deal.client_name}${deal.property_title_snap ? ` - ${deal.property_title_snap}` : ''}`,
              client_name: deal.client_name,
              client_id: deal.client_id,
              property_id: deal.property_id,
              property_title: deal.property_title_snap,
              pipeline_deal_id: deal.id,
              scheduled_at: actionDate,
              status: 'pending',
            } as any);
            qc.invalidateQueries({ queryKey: ['agent-tasks'] });
            toast.success('Evento creado en Mi Agenda');
          } catch {
            // Silent fail for agenda - deal was already moved
          }
        }

        onOpenChange(false);
        setSelectedStage(null);
        setActionDate('');
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
          <>
            <div className="space-y-1">
              <Label className="text-xs">Fecha y hora de visita *</Label>
              <Input type="datetime-local" value={actionDate} onChange={(e) => setActionDate(e.target.value)} />
            </div>
            <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={createAgendaEvent}
                onChange={e => setCreateAgendaEvent(e.target.checked)}
                className="rounded"
              />
              <CalendarPlus className="h-3.5 w-3.5" />
              Crear evento en Mi Agenda
            </label>
          </>
        )}

        {needsConfirm && (
          <div className="space-y-1">
            <Label className="text-xs">Notas finales *</Label>
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
