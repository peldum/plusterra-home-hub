import { useState, useEffect, useRef, forwardRef } from 'react';
import { format, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  ChevronLeft, ChevronRight, Loader2, FileText, TrendingUp, TrendingDown,
  Wallet, Coins, Building2,
} from 'lucide-react';
import { useAdminPlusterraGains, type PlusterraBuildingGainRow } from '@/hooks/useAdminPlusterraGains';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { generatePlusterraGainsReportPDF } from '@/lib/plusterraGainsReportPDF';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { DualScrollArea } from '@/components/ui/dual-scroll-area';

const fmtGs = (n: number) => '₲ ' + Math.round(n).toLocaleString('es-PY');

/** Inline editable observation cell with auto-save on blur (POR EDIFICIO) */
const BuildingObservationCell = forwardRef<HTMLDivElement, {
  row: PlusterraBuildingGainRow;
  period: string;
  onSaved: () => void;
}>(({ row, period, onSaved }, ref) => {
  const { user } = useAuth();
  const [value, setValue] = useState(row.observation);
  const [saving, setSaving] = useState(false);
  const initial = useRef(row.observation);

  useEffect(() => {
    setValue(row.observation);
    initial.current = row.observation;
  }, [row.observation, period, row.building_id]);

  const save = async () => {
    const next = value.trim();
    if (next === initial.current.trim()) return;
    setSaving(true);
    try {
      // Upsert manual porque el unique es índice parcial
      const filterCol = row.building_id ? 'building_id' : null;
      let existingId: string | null = null;
      const baseQuery = (supabase as any)
        .from('admin_building_observations')
        .select('id')
        .eq('period', period);
      const finalQuery = filterCol
        ? baseQuery.eq('building_id', row.building_id)
        : baseQuery.is('building_id', null);
      const { data: existing } = await finalQuery.maybeSingle();
      existingId = existing?.id || null;

      if (existingId) {
        const { error } = await (supabase as any)
          .from('admin_building_observations')
          .update({ observation: next || null })
          .eq('id', existingId);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from('admin_building_observations')
          .insert({
            building_id: row.building_id,
            period,
            observation: next || null,
            created_by: user!.id,
          });
        if (error) throw error;
      }
      initial.current = next;
      onSaved();
    } catch (e: any) {
      toast.error('No se pudo guardar la observación: ' + (e?.message || ''));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div ref={ref} className="relative">
      <input
        value={value}
        onChange={e => setValue(e.target.value)}
        onBlur={save}
        placeholder="Anotá algo sobre este edificio…"
        className="w-full h-8 text-xs px-2 rounded border border-input bg-background focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none transition-colors"
      />
      {saving && (
        <Loader2 className="w-3 h-3 animate-spin absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
      )}
    </div>
  );
});
BuildingObservationCell.displayName = 'BuildingObservationCell';

export const PlusterraGainsTab = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [monthDate, setMonthDate] = useState(new Date());
  const period = format(monthDate, 'yyyy-MM');
  const monthLabel = format(monthDate, 'MMMM yyyy', { locale: es });

  const [generalNote, setGeneralNote] = useState('');
  const [generating, setGenerating] = useState(false);

  const prevMonth = () => setMonthDate(prev => subMonths(prev, 1));
  const nextMonth = () => {
    setMonthDate(prev => {
      const next = new Date(prev);
      next.setMonth(next.getMonth() + 1);
      return next > new Date() ? prev : next;
    });
  };

  const { data, isLoading } = useAdminPlusterraGains(period);
  const activeBuildings = data?.buildings.filter(b => b.units_count > 0 || b.collected !== 0 || b.gain !== 0 || b.expenses !== 0) ?? [];

  // Cargar nota general del mes
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: rows } = await (supabase as any)
        .from('admin_monthly_observations')
        .select('general_note')
        .eq('period', period)
        .is('building_id', null)
        .maybeSingle();
      if (!cancelled) setGeneralNote(rows?.general_note || '');
    })();
    return () => { cancelled = true; };
  }, [period]);

  const refetch = () => {
    qc.invalidateQueries({ queryKey: ['admin-plusterra-gains', period] });
  };

  const saveGeneralNote = async () => {
    const note = generalNote.trim();
    try {
      // upsert manual: existe?
      const { data: existing } = await (supabase as any)
        .from('admin_monthly_observations')
        .select('id')
        .eq('period', period)
        .is('building_id', null)
        .maybeSingle();
      if (existing?.id) {
        await (supabase as any)
          .from('admin_monthly_observations')
          .update({ general_note: note || null })
          .eq('id', existing.id);
      } else if (note) {
        await (supabase as any)
          .from('admin_monthly_observations')
          .insert({ period, building_id: null, general_note: note, observation: null, created_by: user!.id });
      }
    } catch (e) {
      // silent
    }
  };

  const handleExport = async () => {
    if (!data) {
      toast.info('Esperá a que cargue el mes para exportar');
      return;
    }
    setGenerating(true);
    try {
      await saveGeneralNote();

      await generatePlusterraGainsReportPDF({
        period,
        monthLabel,
        buildings: activeBuildings.map(r => ({
          building_name: r.building_name,
          units_count: r.units_count,
          internal_pct: r.internal_pct,
          collected: r.collected,
          gain: r.gain,
          expenses: r.expenses,
          observation: r.observation,
        })),
        totalGain: data.totalGain,
        totalExpenses: data.totalExpenses,
        totalCollected: data.totalCollected,
        generalNote,
      });
      toast.success('Reporte exportado');
    } catch (e: any) {
      toast.error('Error al generar PDF: ' + (e?.message || ''));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Hero / explanación */}
      <div className="rounded-lg border border-primary/30 bg-gradient-to-br from-primary/10 via-sky-50 to-background px-4 py-3">
        <div className="flex items-center gap-2 mb-1">
          <Coins className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Ganancia interna de Plusterra</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Consolidado mensual <strong>por edificio</strong> de lo que ganó Plusterra en administración (un solo total por edificio). Los gastos provienen de la <strong>Caja Administración</strong> (egresos imputados al edificio o a sus propiedades) y no se mezclan con Finanzas.
        </p>
      </div>

      {/* Navegador + acciones */}
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={prevMonth}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-semibold min-w-[140px] text-center capitalize">{monthLabel}</span>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={nextMonth}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <Button
          size="sm"
          onClick={handleExport}
          disabled={generating || isLoading || !data}
          className="gap-1.5"
        >
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
          Exportar reporte PDF
        </Button>
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      )}

      {!isLoading && data && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Card className="border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20 dark:border-emerald-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs text-muted-foreground">Total ganancia Plusterra</span>
                </div>
                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 font-mono">
                  {fmtGs(data.totalGain)}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Sobre cobros de {fmtGs(data.totalCollected)} · {activeBuildings.length} {activeBuildings.length === 1 ? 'edificio' : 'edificios'}
                </p>
              </CardContent>
            </Card>

            <Card className="border-rose-200 bg-rose-50/50 dark:bg-rose-950/20 dark:border-rose-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingDown className="w-4 h-4 text-rose-600" />
                  <span className="text-xs text-muted-foreground">Gastos imputados</span>
                </div>
                <p className="text-2xl font-bold text-rose-700 dark:text-rose-400 font-mono">
                  {fmtGs(data.totalExpenses)}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Egresos de Caja Admin asociados a propiedades
                </p>
              </CardContent>
            </Card>

            <Card className={data.netResult >= 0 ? 'border-sky-300 bg-sky-100/70 dark:bg-sky-950/30 dark:border-sky-800' : 'border-rose-300 bg-rose-50/50'}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  {data.netResult >= 0
                    ? <TrendingUp className="w-4 h-4 text-emerald-600" />
                    : <Wallet className="w-4 h-4 text-rose-600" />}
                  <span className="text-xs text-muted-foreground">Resultado neto del mes</span>
                </div>
                <p className={`text-2xl font-bold font-mono ${data.netResult >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700'}`}>
                  {fmtGs(data.netResult)}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">Ganancia − Gastos</p>
              </CardContent>
            </Card>
          </div>

          {/* Tabla */}
          {activeBuildings.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Building2 className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">
                  No hay edificios con cobros confirmados en {monthLabel}.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <DualScrollArea>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead className="text-xs">Edificio</TableHead>
                        <TableHead className="text-xs text-center">Unid. cobradas</TableHead>
                        <TableHead className="text-xs text-center">%</TableHead>
                        <TableHead className="text-xs text-right">Cobrado</TableHead>
                        <TableHead className="text-xs text-right">Ganancia Plusterra</TableHead>
                        <TableHead className="text-xs text-right">Gastos</TableHead>
                        <TableHead className="text-xs min-w-[260px]">Observación interna</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activeBuildings.map(b => (
                        <TableRow key={b.building_id || '__none__'} className="hover:bg-muted/20">
                          <TableCell className="text-xs font-semibold">
                            <div className="flex items-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                              {b.building_name}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-center font-mono">
                            {b.units_count}
                          </TableCell>
                          <TableCell className="text-xs text-center">
                            <Badge variant="outline" className="text-[10px] font-mono">
                              {b.internal_pct}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-right font-mono">{fmtGs(b.collected)}</TableCell>
                          <TableCell className="text-xs text-right font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                            {fmtGs(b.gain)}
                          </TableCell>
                          <TableCell className="text-xs text-right font-mono text-rose-700 dark:text-rose-400">
                            {b.expenses > 0 ? fmtGs(b.expenses) : '—'}
                          </TableCell>
                          <TableCell className="py-1.5">
                            <BuildingObservationCell row={b} period={period} onSaved={refetch} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <TableFooter>
                      <TableRow className={data.netResult >= 0 ? 'bg-sky-100 dark:bg-sky-950/40 font-semibold' : 'bg-muted/60 font-semibold'}>
                        <TableCell colSpan={3} className="text-xs">TOTAL DEL MES</TableCell>
                        <TableCell className="text-xs text-right font-mono">{fmtGs(data.totalCollected)}</TableCell>
                        <TableCell className="text-xs text-right font-mono text-emerald-700 dark:text-emerald-400">
                          {fmtGs(data.totalGain)}
                        </TableCell>
                        <TableCell className="text-xs text-right font-mono text-rose-700 dark:text-rose-400">
                          {fmtGs(data.totalExpenses)}
                        </TableCell>
                        <TableCell className="text-xs text-right">
                          Neto: <span className={`font-mono font-bold ${data.netResult >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700'}`}>{fmtGs(data.netResult)}</span>
                        </TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
                </DualScrollArea>
              </CardContent>
            </Card>
          )}

          {/* Nota general */}
          <Card>
            <CardContent className="p-4 space-y-2">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                Observaciones generales del mes (opcional)
              </Label>
              <Textarea
                value={generalNote}
                onChange={e => setGeneralNote(e.target.value)}
                onBlur={saveGeneralNote}
                placeholder="Notas globales del mes que aparecerán al final del PDF…"
                className="min-h-[70px]"
              />
              <p className="text-[10px] text-muted-foreground">
                Se guarda automáticamente al salir del campo. Se usa también en el reporte mensual de Resumen Gerencial.
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};