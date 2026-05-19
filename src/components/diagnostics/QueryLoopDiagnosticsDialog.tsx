import { useEffect, useMemo, useState } from 'react';
import { Activity, Copy, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { getQueryLoopHistory, clearQueryLoopHistory, type QueryKeyLoopEntry } from '@/lib/queryTelemetry';
import { getLoopEvents, clearLoopEvents, subscribeLoopEvents, type LoopEvent, type LoopEventType } from '@/lib/loopSentinel';
import { getRenderTrackerSnapshot } from '@/lib/sensors/renderSensor';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Aggregated = {
  hash: string;
  keyText: string;
  occurrences: number;
  maxHits: number;
  lastSeen: number;
  lastUrl?: string;
  observers: number;
};

const aggregate = (entries: QueryKeyLoopEntry[]): Aggregated[] => {
  const map = new Map<string, Aggregated>();
  for (const e of entries) {
    const hash = e.queryHash || JSON.stringify(e.queryKey);
    const keyText = JSON.stringify(e.queryKey);
    const existing = map.get(hash);
    if (existing) {
      existing.occurrences += 1;
      existing.maxHits = Math.max(existing.maxHits, e.hits);
      existing.lastSeen = Math.max(existing.lastSeen, e.detectedAt);
      if (e.lastUrl) existing.lastUrl = e.lastUrl;
      existing.observers = Math.max(existing.observers, e.observers);
    } else {
      map.set(hash, {
        hash,
        keyText,
        occurrences: 1,
        maxHits: e.hits,
        lastSeen: e.detectedAt,
        lastUrl: e.lastUrl,
        observers: e.observers,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.occurrences - a.occurrences);
};

const formatTime = (ts: number) => {
  try { return new Date(ts).toLocaleTimeString(); } catch { return String(ts); }
};

export const QueryLoopDiagnosticsDialog = ({ open, onOpenChange }: Props) => {
  const [history, setHistory] = useState<QueryKeyLoopEntry[]>([]);
  const [events, setEvents] = useState<LoopEvent[]>([]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!open) return;
    setHistory(getQueryLoopHistory());
    setEvents(getLoopEvents());
    const onLoop = () => setHistory(getQueryLoopHistory());
    const unsub = subscribeLoopEvents(() => setEvents(getLoopEvents()));
    window.addEventListener('query-key-loop', onLoop);
    window.addEventListener('query-loop-detected', onLoop);
    const interval = window.setInterval(() => setTick((t) => t + 1), 2000);
    return () => {
      window.removeEventListener('query-key-loop', onLoop);
      window.removeEventListener('query-loop-detected', onLoop);
      window.clearInterval(interval);
      unsub();
    };
  }, [open]);

  // Refresh on tick
  useEffect(() => {
    if (!open) return;
    setHistory(getQueryLoopHistory());
    setEvents(getLoopEvents());
  }, [tick, open]);

  const aggregated = useMemo(() => aggregate(history).slice(0, 15), [history]);
  const last = history[history.length - 1];

  const byType = useMemo(() => {
    const map: Record<LoopEventType, LoopEvent[]> = { render: [], query: [], network: [], navigation: [] };
    for (const e of events) map[e.type].push(e);
    return map;
  }, [events]);

  const renderSnapshot = useMemo(() => {
    void tick; return getRenderTrackerSnapshot().sort((a, b) => b.recentRenders - a.recentRenders).slice(0, 20);
  }, [tick]);

  const copyReport = async () => {
    const lines: string[] = [];
    lines.push(`# Reporte LoopSentinel — ${new Date().toLocaleString()}`);
    lines.push(`Total eventos: ${events.length}`);
    lines.push(`  render: ${byType.render.length}  query: ${byType.query.length}  network: ${byType.network.length}  navigation: ${byType.navigation.length}`);
    lines.push('');
    lines.push('## Eventos por tipo');
    for (const t of ['render', 'query', 'network', 'navigation'] as LoopEventType[]) {
      if (byType[t].length === 0) continue;
      lines.push(`### ${t}`);
      for (const e of byType[t].slice(-10)) {
        lines.push(`- [${formatTime(e.detectedAt)}] ${e.label} — hits=${e.hits}/${e.windowMs}ms`);
      }
    }
    lines.push('');
    lines.push('## Top queryKeys');
    for (const a of aggregated) {
      lines.push(`- ${a.keyText}`);
      lines.push(`    occurrences=${a.occurrences} maxHits=${a.maxHits} observers=${a.observers} lastSeen=${formatTime(a.lastSeen)}`);
      if (a.lastUrl) lines.push(`    url=${a.lastUrl}`);
    }
    if (last) {
      lines.push('');
      lines.push('## Última detección');
      lines.push(JSON.stringify(last, null, 2));
    }
    const text = lines.join('\n');
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Reporte copiado al portapapeles');
    } catch {
      toast.error('No se pudo copiar. Mira la consola.');
      // eslint-disable-next-line no-console
      console.log(text);
    }
  };

  const handleClear = () => {
    clearQueryLoopHistory();
    clearLoopEvents();
    setHistory([]);
    setEvents([]);
    toast.success('Historial de loops limpiado');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Diagnóstico de bucles (LoopSentinel)
          </DialogTitle>
          <DialogDescription>
            Detecta bucles de render, queries, red y navegación. Solo se almacena en esta sesión.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {events.length} eventos · R:{byType.render.length} Q:{byType.query.length} N:{byType.network.length} Nav:{byType.navigation.length}
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={copyReport} disabled={events.length === 0 && history.length === 0}>
              <Copy className="w-3.5 h-3.5 mr-1" /> Copiar reporte
            </Button>
            <Button size="sm" variant="ghost" onClick={handleClear} disabled={events.length === 0 && history.length === 0}>
              <Trash2 className="w-3.5 h-3.5 mr-1" /> Limpiar
            </Button>
          </div>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="render">Render ({byType.render.length})</TabsTrigger>
            <TabsTrigger value="query">Queries ({byType.query.length})</TabsTrigger>
            <TabsTrigger value="network">Red ({byType.network.length})</TabsTrigger>
            <TabsTrigger value="navigation">Nav ({byType.navigation.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <EventList events={[...events].slice(-50).reverse()} />
          </TabsContent>
          <TabsContent value="render">
            <div className="space-y-2">
              <EventList events={byType.render.slice(-30).reverse()} />
              <div className="rounded-md border bg-muted/30 p-2">
                <div className="text-[11px] font-medium mb-1 text-muted-foreground">Renders activos (últimos 2s)</div>
                {renderSnapshot.length === 0 ? (
                  <div className="text-[11px] text-muted-foreground">Sin datos. Agregá <code>useRenderTracker</code> en componentes.</div>
                ) : (
                  <div className="space-y-0.5">
                    {renderSnapshot.map((r) => (
                      <div key={r.name} className="flex justify-between text-[11px] font-mono">
                        <span className="truncate">{r.name}</span>
                        <span className={r.recentRenders >= 30 ? 'text-destructive font-bold' : ''}>{r.recentRenders}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
          <TabsContent value="query">
            <ScrollArea className="h-[380px] rounded-md border bg-muted/30">
          {aggregated.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Sin loops detectados todavía. Mantené esta sesión abierta mientras navegás.
            </div>
          ) : (
            <div className="divide-y">
              {aggregated.map((a) => (
                <div key={a.hash} className="p-3 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <code className="text-xs font-mono break-all">{a.keyText}</code>
                    <Badge variant="destructive" className="shrink-0">{a.occurrences}×</Badge>
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                    <span>max hits/ventana: <b>{a.maxHits}</b></span>
                    <span>observers: {a.observers}</span>
                    <span>último: {formatTime(a.lastSeen)}</span>
                  </div>
                  {a.lastUrl && (
                    <div className="text-[10px] text-muted-foreground/80 truncate font-mono">
                      {a.lastUrl}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
            </ScrollArea>
          </TabsContent>
          <TabsContent value="network">
            <EventList events={byType.network.slice(-30).reverse()} />
          </TabsContent>
          <TabsContent value="navigation">
            <EventList events={byType.navigation.slice(-30).reverse()} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

const typeColor: Record<LoopEventType, string> = {
  render: 'bg-purple-500/15 text-purple-700 dark:text-purple-300',
  query: 'bg-blue-500/15 text-blue-700 dark:text-blue-300',
  network: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  navigation: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
};

const EventList = ({ events }: { events: LoopEvent[] }) => {
  if (events.length === 0) {
    return (
      <div className="h-[380px] rounded-md border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
        Sin eventos en esta categoría.
      </div>
    );
  }
  return (
    <ScrollArea className="h-[380px] rounded-md border bg-muted/30">
      <div className="divide-y">
        {events.map((e, i) => (
          <div key={`${e.identity}-${e.detectedAt}-${i}`} className="p-3 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${typeColor[e.type]}`}>{e.type}</span>
                <span className="text-xs truncate">{e.label}</span>
              </div>
              <Badge variant="destructive" className="shrink-0">{e.hits}×</Badge>
            </div>
            <div className="flex flex-wrap gap-x-3 text-[11px] text-muted-foreground">
              <span>ventana: {e.windowMs}ms</span>
              <span>{formatTime(e.detectedAt)}</span>
              <code className="font-mono text-[10px] truncate">{e.identity}</code>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
};

export default QueryLoopDiagnosticsDialog;