import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Database, RefreshCw, HardDrive, TableProperties, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';

interface TableInfo {
  table: string;
  label: string;
  rows: number;
  estimated_kb: number;
}

interface DbMonitorData {
  tables: TableInfo[];
  total_rows: number;
  estimated_mb: number;
  max_mb: number;
  usage_pct: number;
  timestamp: string;
}

const formatSize = (kb: number) => {
  if (kb >= 1024) return `${(kb / 1024).toFixed(1)} MB`;
  return `${kb.toFixed(1)} KB`;
};

const estimateMonthsRemaining = (totalRows: number, maxMB: number, estimatedMB: number) => {
  if (totalRows === 0) return '∞';
  const remainingMB = maxMB - estimatedMB;
  const avgKBperRow = 0.5;
  const rowsPerDay = 300; // estimate
  const kbPerDay = rowsPerDay * avgKBperRow;
  const daysRemaining = (remainingMB * 1024) / kbPerDay;
  const months = daysRemaining / 30;
  return months > 999 ? '999+' : months.toFixed(1);
};

export const DatabaseMonitorSection = () => {
  const { role } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);

  const { data, isLoading, isFetching } = useQuery<DbMonitorData>({
    queryKey: ['db-monitor', refreshKey],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke('db-monitor', {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (res.error) throw res.error;
      return res.data as DbMonitorData;
    },
    enabled: role === 'superadmin',
    staleTime: 5 * 60 * 1000,
  });

  if (role !== 'superadmin') return null;

  const monthsRemaining = data
    ? estimateMonthsRemaining(data.total_rows, data.max_mb, data.estimated_mb)
    : '—';

  return (
    <div className="bg-card border border-border rounded-xl p-6 animate-slide-up opacity-0" style={{ animationDelay: '150ms', animationFillMode: 'forwards' }}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <HardDrive className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-display text-lg font-semibold text-foreground">
              Monitor de Base de Datos
            </h3>
            <p className="text-sm text-muted-foreground">
              Uso estimado del almacenamiento y filas por tabla
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setRefreshKey(k => k + 1)}
          disabled={isFetching}
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : data ? (
        <div className="space-y-5">
          {/* Usage bar */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">Uso estimado</span>
              <span className="text-sm font-bold text-primary">
                {data.estimated_mb} MB / {data.max_mb} MB ({data.usage_pct}%)
              </span>
            </div>
            <Progress value={data.usage_pct} className="h-3" />
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-muted-foreground">
                Total de filas: {data.total_rows.toLocaleString('es-AR')}
              </span>
              <span className="text-xs text-muted-foreground">
                Actualizado: {new Date(data.timestamp).toLocaleString('es-AR')}
              </span>
            </div>
          </div>

          {/* Capacity estimate */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-success/10 border border-success/20">
            <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
            <p className="text-sm text-foreground">
              A 300 registros/día, te quedan aproximadamente{' '}
              <span className="font-bold text-primary">{monthsRemaining} meses</span> de capacidad
            </p>
          </div>

          {/* Table breakdown */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">Desglose por tabla</h4>
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="grid grid-cols-[1fr_auto_auto] gap-4 px-4 py-2.5 bg-muted/50 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <span>Tabla</span>
                <span className="text-center w-16">Filas</span>
                <span className="text-right w-20">Peso est.</span>
              </div>
              <div className="divide-y divide-border">
                {data.tables.map((t) => (
                  <div
                    key={t.table}
                    className="grid grid-cols-[1fr_auto_auto] gap-4 px-4 py-3 items-center hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <TableProperties className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-foreground">{t.label}</span>
                    </div>
                    <span className="text-sm font-medium text-primary bg-primary/10 px-2.5 py-0.5 rounded-full text-center w-16">
                      {t.rows}
                    </span>
                    <span className="text-sm text-muted-foreground text-right w-20">
                      {formatSize(t.estimated_kb)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-8">
          Error al cargar datos. Intenta actualizar.
        </p>
      )}
    </div>
  );
};
