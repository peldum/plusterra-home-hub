import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PipelineDeal, PipelineType, getStages } from '@/hooks/usePipelineDeals';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, Cell, FunnelChart, Funnel, LabelList, Tooltip } from 'recharts';
import { TrendingUp, Clock, Target, AlertTriangle } from 'lucide-react';

interface Props {
  deals: PipelineDeal[];
  pipelineType: PipelineType;
}

const FUNNEL_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--primary) / 0.85)',
  'hsl(var(--primary) / 0.7)',
  'hsl(var(--primary) / 0.55)',
  'hsl(var(--primary) / 0.4)',
  'hsl(var(--primary) / 0.3)',
  'hsl(142 71% 45%)',   // cerrado - green
  'hsl(0 84% 60%)',     // caido - red
];

export const PipelineStats = ({ deals, pipelineType }: Props) => {
  const stages = getStages(pipelineType);

  const stats = useMemo(() => {
    if (!deals.length) return null;

    const total = deals.length;
    const cerrados = deals.filter(d => d.stage === 'cerrado').length;
    const caidos = deals.filter(d => d.stage === 'caido').length;
    const activos = total - cerrados - caidos;
    const conversionRate = total > 0 ? (cerrados / total) * 100 : 0;
    const lossRate = total > 0 ? (caidos / total) * 100 : 0;

    // Average deal age (days)
    const now = new Date();
    const ages = deals
      .filter(d => d.stage !== 'cerrado' && d.stage !== 'caido')
      .map(d => (now.getTime() - new Date(d.created_at).getTime()) / (1000 * 60 * 60 * 24));
    const avgAge = ages.length > 0 ? ages.reduce((a, b) => a + b, 0) / ages.length : 0;

    // Average time to close (days)
    const closedDeals = deals.filter(d => d.stage === 'cerrado');
    const closeTimes = closedDeals.map(d =>
      (new Date(d.updated_at).getTime() - new Date(d.created_at).getTime()) / (1000 * 60 * 60 * 24)
    );
    const avgCloseTime = closeTimes.length > 0 ? closeTimes.reduce((a, b) => a + b, 0) / closeTimes.length : 0;

    // Funnel data
    const funnelData = stages
      .filter(s => s.key !== 'caido')
      .map((s, i) => {
        const count = deals.filter(d => d.stage === s.key).length;
        // For funnel: cumulative = deals that reached this stage or beyond
        const stageIndex = stages.findIndex(st => st.key === s.key);
        const cumulative = deals.filter(d => {
          const dIdx = stages.findIndex(st => st.key === d.stage);
          return dIdx >= stageIndex || d.stage === 'cerrado';
        }).length;
        return { name: s.label, value: cumulative, count, fill: FUNNEL_COLORS[i] };
      });

    // Deals per stage for bar chart
    const barData = stages.map(s => ({
      name: s.label.length > 12 ? s.label.substring(0, 12) + '…' : s.label,
      fullName: s.label,
      count: deals.filter(d => d.stage === s.key).length,
    }));

    // Stale deals (no update in 7+ days, still active)
    const staleCount = deals.filter(d => {
      if (d.stage === 'cerrado' || d.stage === 'caido') return false;
      const daysSinceUpdate = (now.getTime() - new Date(d.updated_at).getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceUpdate > 7;
    }).length;

    return { total, cerrados, caidos, activos, conversionRate, lossRate, avgAge, avgCloseTime, funnelData, barData, staleCount };
  }, [deals, stages]);

  if (!stats || !deals.length) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        No hay deals para mostrar estadísticas.
      </div>
    );
  }

  const chartConfig = {
    count: { label: 'Deals', color: 'hsl(var(--primary))' },
  };

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Target className="h-3.5 w-3.5" />
              Tasa de conversión
            </div>
            <p className="text-2xl font-bold">{stats.conversionRate.toFixed(1)}%</p>
            <p className="text-[10px] text-muted-foreground">{stats.cerrados} de {stats.total} deals</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Clock className="h-3.5 w-3.5" />
              Tiempo promedio cierre
            </div>
            <p className="text-2xl font-bold">{stats.avgCloseTime > 0 ? `${Math.round(stats.avgCloseTime)}d` : '—'}</p>
            <p className="text-[10px] text-muted-foreground">{stats.cerrados} deals cerrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <TrendingUp className="h-3.5 w-3.5" />
              Edad promedio activos
            </div>
            <p className="text-2xl font-bold">{stats.activos > 0 ? `${Math.round(stats.avgAge)}d` : '—'}</p>
            <p className="text-[10px] text-muted-foreground">{stats.activos} deals activos</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <AlertTriangle className="h-3.5 w-3.5" />
              Deals estancados
            </div>
            <p className={`text-2xl font-bold ${stats.staleCount > 0 ? 'text-destructive' : ''}`}>
              {stats.staleCount}
            </p>
            <p className="text-[10px] text-muted-foreground">Sin actividad 7+ días</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Funnel */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Funnel de conversión</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {stats.funnelData.map((item, i) => {
                const maxVal = stats.funnelData[0]?.value || 1;
                const pct = (item.value / maxVal) * 100;
                return (
                  <div key={item.name} className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground w-28 truncate text-right">{item.name}</span>
                    <div className="flex-1 h-6 bg-muted/30 rounded overflow-hidden relative">
                      <div
                        className="h-full rounded transition-all"
                        style={{ width: `${Math.max(pct, 4)}%`, backgroundColor: item.fill }}
                      />
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium">
                        {item.value}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Bar chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Deals por etapa</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[220px] w-full">
              <BarChart data={stats.barData} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 10 }} />
                <ChartTooltip
                  content={<ChartTooltipContent />}
                  formatter={(value, _name, item) => [`${value} deals`, item.payload.fullName]}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {stats.barData.map((_, i) => (
                    <Cell key={i} fill={FUNNEL_COLORS[i % FUNNEL_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Loss rate */}
      <Card>
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Tasa de pérdida (caídos)</p>
            <p className="text-lg font-semibold">{stats.lossRate.toFixed(1)}%</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">{stats.caidos} caídos de {stats.total} totales</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
