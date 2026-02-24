import { useState } from 'react';
import { PipelineDeal, PipelineType, getStages, useUpdatePipelineDeal } from '@/hooks/usePipelineDeals';
import { PipelineDealCard } from './PipelineDealCard';
import { PipelineStageChangeDialog } from './PipelineStageChangeDialog';
import { PipelineDealFormDialog } from './PipelineDealFormDialog';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface Props {
  deals: PipelineDeal[];
  pipelineType: PipelineType;
}

export const PipelineKanban = ({ deals, pipelineType }: Props) => {
  const stages = getStages(pipelineType);
  const [editDeal, setEditDeal] = useState<PipelineDeal | null>(null);
  const [stageChangeDeal, setStageChangeDeal] = useState<PipelineDeal | null>(null);
  const updateDeal = useUpdatePipelineDeal();

  // Desktop drag & drop state
  const [draggedDeal, setDraggedDeal] = useState<PipelineDeal | null>(null);

  const handleDragStart = (e: React.DragEvent, deal: PipelineDeal) => {
    setDraggedDeal(deal);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetStage: string) => {
    e.preventDefault();
    if (!draggedDeal || draggedDeal.stage === targetStage) {
      setDraggedDeal(null);
      return;
    }

    // Stages that require extra data → open dialog instead
    const requiresDialog = ['visita_agendada', 'reservado', 'sena_reserva', 'cerrado'];
    if (requiresDialog.includes(targetStage)) {
      // Pre-set stage in dialog
      setStageChangeDeal({ ...draggedDeal, stage: draggedDeal.stage });
      setDraggedDeal(null);
      return;
    }

    updateDeal.mutate({ id: draggedDeal.id, stage: targetStage });
    setDraggedDeal(null);
  };

  return (
    <>
      <ScrollArea className="w-full">
        <div className="flex gap-3 pb-4 min-w-max px-1">
          {stages.map((stage) => {
            const stageDeals = deals.filter((d) => d.stage === stage.key);
            const isDropTarget = draggedDeal && draggedDeal.stage !== stage.key;

            return (
              <div
                key={stage.key}
                className={`flex-shrink-0 w-[280px] rounded-lg border bg-muted/30 transition-colors ${
                  isDropTarget ? 'border-primary/50 bg-primary/5' : 'border-border'
                }`}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, stage.key)}
              >
                {/* Column header */}
                <div className="p-3 border-b border-border">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold truncate">{stage.label}</h3>
                    <Badge variant="secondary" className="text-[10px] h-5 min-w-[20px] justify-center">
                      {stageDeals.length}
                    </Badge>
                  </div>
                </div>

                {/* Cards */}
                <div className="p-2 space-y-2 min-h-[120px] max-h-[calc(100vh-300px)] overflow-y-auto">
                  {stageDeals.map((deal) => (
                    <div
                      key={deal.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, deal)}
                      onDragEnd={() => setDraggedDeal(null)}
                    >
                      <PipelineDealCard
                        deal={deal}
                        pipelineType={pipelineType}
                        onEdit={setEditDeal}
                        onChangeStage={setStageChangeDeal}
                      />
                    </div>
                  ))}

                  {stageDeals.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-6">Sin deals</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Edit dialog */}
      <PipelineDealFormDialog
        open={!!editDeal}
        onOpenChange={(v) => !v && setEditDeal(null)}
        pipelineType={pipelineType}
        deal={editDeal}
      />

      {/* Stage change dialog (mobile) */}
      <PipelineStageChangeDialog
        deal={stageChangeDeal}
        pipelineType={pipelineType}
        open={!!stageChangeDeal}
        onOpenChange={(v) => !v && setStageChangeDeal(null)}
      />
    </>
  );
};
