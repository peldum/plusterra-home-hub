import { useMemo, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Loader2, BarChart3, Kanban } from 'lucide-react';
import { PipelineKanban } from '@/components/pipeline/PipelineKanban';
import { PipelineDealFormDialog } from '@/components/pipeline/PipelineDealFormDialog';
import { PipelineStats } from '@/components/pipeline/PipelineStats';
import { usePipelineDeals, PipelineType, useStageCounts } from '@/hooks/usePipelineDeals';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

const useAgentsList = (enabled: boolean) =>
  useQuery({
    queryKey: ['agents-list-pipeline'],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name')
        .order('full_name');
      return data ?? [];
    },
    enabled,
  });

const Pipeline = () => {
  const { role } = useAuth();
  const [pipelineType, setPipelineType] = useState<PipelineType>('ALQUILER');
  const [showForm, setShowForm] = useState(false);
  const [agentFilter, setAgentFilter] = useState<string>('all');
  const [view, setView] = useState<'kanban' | 'stats'>('kanban');

  const canFilter = role === 'admin' || role === 'superadmin';
  const { data: agents } = useAgentsList(canFilter);
  const { data: deals, isLoading } = usePipelineDeals(pipelineType);

  const filteredDeals = useMemo(() => {
    if (!deals) return [];
    if (agentFilter === 'all') return deals;
    return deals.filter((d) => d.agent_id === agentFilter);
  }, [deals, agentFilter]);

  const stageCounts = useStageCounts(pipelineType, filteredDeals);
  const activeDeals = filteredDeals.filter((d) => d.stage !== 'caido' && d.stage !== 'cerrado').length;
  const closedDeals = filteredDeals.filter((d) => d.stage === 'cerrado').length;

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
        <div className="flex items-center gap-2">
          {canFilter && (
            <Select value={agentFilter} onValueChange={setAgentFilter}>
              <SelectTrigger className="w-[200px] h-9 text-xs">
                <SelectValue placeholder="Todos los agentes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los agentes</SelectItem>
                {agents?.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <div className="flex border rounded-md overflow-hidden">
            <Button
              size="sm"
              variant={view === 'kanban' ? 'default' : 'ghost'}
              className="rounded-none gap-1 h-9"
              onClick={() => setView('kanban')}
            >
              <Kanban className="h-4 w-4" />
              <span className="hidden sm:inline">Kanban</span>
            </Button>
            <Button
              size="sm"
              variant={view === 'stats' ? 'default' : 'ghost'}
              className="rounded-none gap-1 h-9"
              onClick={() => setView('stats')}
            >
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Métricas</span>
            </Button>
          </div>
          <Button size="sm" onClick={() => setShowForm(true)} className="gap-1">
            <Plus className="h-4 w-4" /> Nuevo Deal
          </Button>
        </div>
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
          ) : view === 'stats' ? (
            <PipelineStats deals={filteredDeals} pipelineType="ALQUILER" />
          ) : (
            <PipelineKanban deals={filteredDeals} pipelineType="ALQUILER" />
          )}
        </TabsContent>

        <TabsContent value="VENTA" className="mt-3">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : view === 'stats' ? (
            <PipelineStats deals={filteredDeals} pipelineType="VENTA" />
          ) : (
            <PipelineKanban deals={filteredDeals} pipelineType="VENTA" />
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
