import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Loader2 } from 'lucide-react';
import { PipelineKanban } from '@/components/pipeline/PipelineKanban';
import { PipelineDealFormDialog } from '@/components/pipeline/PipelineDealFormDialog';
import { usePipelineDeals, PipelineType, useStageCounts } from '@/hooks/usePipelineDeals';

const Pipeline = () => {
  const [pipelineType, setPipelineType] = useState<PipelineType>('ALQUILER');
  const [showForm, setShowForm] = useState(false);

  const { data: deals, isLoading } = usePipelineDeals(pipelineType);
  const stageCounts = useStageCounts(pipelineType, deals);

  const activeDeals = deals?.filter((d) => d.stage !== 'caido' && d.stage !== 'cerrado').length ?? 0;
  const closedDeals = deals?.filter((d) => d.stage === 'cerrado').length ?? 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Pipeline</h1>
          <p className="text-sm text-muted-foreground">
            {activeDeals} activos · {closedDeals} cerrados
          </p>
        </div>
        <Button size="sm" onClick={() => setShowForm(true)} className="gap-1">
          <Plus className="h-4 w-4" /> Nuevo Deal
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={pipelineType} onValueChange={(v) => setPipelineType(v as PipelineType)}>
        <TabsList>
          <TabsTrigger value="ALQUILER">🔑 Alquiler</TabsTrigger>
          <TabsTrigger value="VENTA">🏷️ Venta</TabsTrigger>
        </TabsList>

        {/* Summary pills */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {stageCounts.map((s) => (
            <Badge key={s.key} variant={s.count > 0 ? 'secondary' : 'outline'} className="text-[10px]">
              {s.label}: {s.count}
            </Badge>
          ))}
        </div>

        <TabsContent value="ALQUILER" className="mt-3">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <PipelineKanban deals={deals ?? []} pipelineType="ALQUILER" />
          )}
        </TabsContent>

        <TabsContent value="VENTA" className="mt-3">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <PipelineKanban deals={deals ?? []} pipelineType="VENTA" />
          )}
        </TabsContent>
      </Tabs>

      {/* New deal dialog */}
      <PipelineDealFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        pipelineType={pipelineType}
      />
    </div>
  );
};

export default Pipeline;
