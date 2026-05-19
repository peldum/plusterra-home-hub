import { useEffect, useMemo, useState } from 'react';
import { Activity, Copy, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { getQueryLoopHistory, clearQueryLoopHistory, type QueryKeyLoopEntry } from '@/lib/queryTelemetry';

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
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!open) return;
    setHistory(getQueryLoopHistory());
    const onLoop = () => setHistory(getQueryLoopHistory());
    window.addEventListener('query-key-loop', onLoop);
    window.addEventListener('query-loop-detected', onLoop);
    const interval = window.setInterval(() => setTick((t) => t + 1), 2000);
    return () => {
      window.removeEventListener('query-key-loop', onLoop);
      window.removeEventListener('query-loop-detected', onLoop);
      window.clearInterval(interval);
    };
  }, [open]);

  // Refresh on tick
  useEffect(() => { if (open) setHistory(getQueryLoopHistory()); }, [tick, open]);

  const aggregated = useMemo(() => aggregate(history).slice(0, 15), [history]);
  const last = history[history.length - 1];

  const copyReport = async () => {
    const lines: string[] = [];
    lines.push(`# Reporte Query Loops — ${new Date().toLocaleString()}`);
    lines.push(`Total detecciones: ${history.length}`);
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
    setHistory([]);
    toast.success('Historial de loops limpiado');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Diagnóstico de loops de queries
          </DialogTitle>
          <DialogDescription>
            Registra qué queryKey de React Query está disparando refetches en exceso. Solo se almacena en esta sesión.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{history.length} detecciones registradas</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={copyReport} disabled={history.length === 0}>
              <Copy className="w-3.5 h-3.5 mr-1" /> Copiar reporte
            </Button>
            <Button size="sm" variant="ghost" onClick={handleClear} disabled={history.length === 0}>
              <Trash2 className="w-3.5 h-3.5 mr-1" /> Limpiar
            </Button>
          </div>
        </div>

        <ScrollArea className="h-[420px] rounded-md border bg-muted/30">
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
      </DialogContent>
    </Dialog>
  );
};

export default QueryLoopDiagnosticsDialog;