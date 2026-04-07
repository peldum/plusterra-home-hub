import { useMemo, useState } from 'react';
import { ModuleGuide } from '@/components/layout/ModuleGuide';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Loader2, BarChart3, Kanban, FileText, Search, UserPlus } from 'lucide-react';
import { PipelineKanban } from '@/components/pipeline/PipelineKanban';
import { PipelineDealFormDialog } from '@/components/pipeline/PipelineDealFormDialog';
import { PipelineStats } from '@/components/pipeline/PipelineStats';
import { PropertyReportList } from '@/components/pipeline/PropertyReportList';
import { usePipelineDeals, PipelineType, useStageCounts, isStale, UNIFIED_STAGES } from '@/hooks/usePipelineDeals';
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
  const [showForm, setShowForm] = useState(false);
  const [agentFilter, setAgentFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [followUpFilter, setFollowUpFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [view, setView] = useState<'kanban' | 'stats' | 'reports'>('kanban');

  const canFilterAgents = role === 'admin' || role === 'superadmin' || role === 'accounting' || role === 'secretaria';
  const { data: agents } = useAgentsList(canFilterAgents);
  // Fetch all deals (no pipeline_type filter - unified view)
  const { data: deals, isLoading } = usePipelineDeals();

  const filteredDeals = useMemo(() => {
    if (!deals) return [];
    let result = deals;

    // Type filter
    if (typeFilter !== 'all') {
      result = result.filter(d => d.pipeline_type === typeFilter);
    }

    // Agent filter
    if (agentFilter !== 'all') {
      result = result.filter(d => d.agent_id === agentFilter);
    }

    // Follow-up filter
    if (followUpFilter === 'sin_seguimiento') {
      result = result.filter(d => isStale(d, 3));
    } else if (followUpFilter === 'frios') {
      result = result.filter(d => isStale(d, 7));
    } else if (followUpFilter === 'calientes') {
      result = result.filter(d => !isStale(d, 3) && d.stage !== 'cerrado' && d.stage !== 'caido');
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(d =>
        (d.client_name && d.client_name.toLowerCase().includes(q)) ||
        (d.client_phone && d.client_phone.includes(q)) ||
        (d.property_title_snap && d.property_title_snap.toLowerCase().includes(q))
      );
    }

    return result;
  }, [deals, agentFilter, typeFilter, followUpFilter, searchQuery]);

  const stageCounts = useStageCounts(undefined, filteredDeals);
  const activeDeals = filteredDeals.filter(d => d.stage !== 'caido' && d.stage !== 'cerrado').length;
  const closedDeals = filteredDeals.filter(d => d.stage === 'cerrado').length;
  const staleCount = filteredDeals.filter(d => isStale(d, 3)).length;

  return (
    <MainLayout
      title="Seguimiento de Clientes"
      subtitle={`${activeDeals} activos · ${closedDeals} cerrados${staleCount > 0 ? ` · ${staleCount} sin seguimiento` : ''}`}
      actionNode={
        view !== 'reports' ? (
          <Button size="sm" onClick={() => setShowForm(true)} className="gap-1">
            <UserPlus className="h-4 w-4" /> <span className="hidden sm:inline">Nuevo cliente</span>
          </Button>
        ) : undefined
      }
    >
      <ModuleGuide
        moduleKey="pipeline"
        tips={[
          'Arrastrá las tarjetas entre columnas para actualizar el estado de cada cliente.',
          'Creá un "Nuevo cliente" para registrar un prospecto de alquiler o venta.',
          'Los clientes sin contacto por 3+ días se marcan automáticamente con etiqueta roja.',
          'Usá los filtros para ver solo alquileres, ventas, o clientes sin seguimiento.',
        ]}
      />
      <div className="space-y-4">
        {/* Filters row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar cliente, propiedad o teléfono..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          {/* Type filter */}
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-[150px] h-9 text-xs">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="ALQUILER">🔑 Alquiler</SelectItem>
              <SelectItem value="VENTA">🏷️ Venta</SelectItem>
            </SelectContent>
          </Select>

          {/* Follow-up filter */}
          <Select value={followUpFilter} onValueChange={setFollowUpFilter}>
            <SelectTrigger className="w-full sm:w-[180px] h-9 text-xs">
              <SelectValue placeholder="Seguimiento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="sin_seguimiento">🔴 Sin seguimiento (+3d)</SelectItem>
              <SelectItem value="frios">🧊 Fríos (+7d)</SelectItem>
              <SelectItem value="calientes">🔥 Calientes</SelectItem>
            </SelectContent>
          </Select>

          {/* Agent filter (admin only) */}
          {canFilterAgents && (
            <Select value={agentFilter} onValueChange={setAgentFilter}>
              <SelectTrigger className="w-full sm:w-[180px] h-9 text-xs">
                <SelectValue placeholder="Todos los agentes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los agentes</SelectItem>
                {agents?.map(a => (
                  <SelectItem key={a.id} value={a.id}>{a.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* View toggle */}
          <div className="flex border rounded-md overflow-hidden shrink-0">
            <Button size="sm" variant={view === 'kanban' ? 'default' : 'ghost'} className="rounded-none gap-1 h-9" onClick={() => setView('kanban')}>
              <Kanban className="h-4 w-4" />
              <span className="hidden sm:inline">Kanban</span>
            </Button>
            <Button size="sm" variant={view === 'stats' ? 'default' : 'ghost'} className="rounded-none gap-1 h-9" onClick={() => setView('stats')}>
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Métricas</span>
            </Button>
            <Button size="sm" variant={view === 'reports' ? 'default' : 'ghost'} className="rounded-none gap-1 h-9" onClick={() => setView('reports')}>
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Reportes</span>
            </Button>
          </div>
        </div>

        {/* Summary pills */}
        <div className="flex flex-wrap gap-1.5">
          {stageCounts.map(s => (
            <Badge key={s.key} variant={s.count > 0 ? 'secondary' : 'outline'} className="text-[10px]">
              {s.label}: {s.count}
            </Badge>
          ))}
          {staleCount > 0 && (
            <Badge variant="destructive" className="text-[10px]">
              ⚠ Sin seguimiento: {staleCount}
            </Badge>
          )}
        </div>

        {/* Content */}
        {view === 'reports' ? (
          <PropertyReportList />
        ) : isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : view === 'stats' ? (
          <PipelineStats deals={filteredDeals} pipelineType="ALQUILER" />
        ) : (
          <PipelineKanban deals={filteredDeals} pipelineType="ALQUILER" />
        )}

        {/* New client dialog */}
        <PipelineDealFormDialog
          open={showForm}
          onOpenChange={setShowForm}
          pipelineType="ALQUILER"
        />
      </div>
    </MainLayout>
  );
};

export default Pipeline;
