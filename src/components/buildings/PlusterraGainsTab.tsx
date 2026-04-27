import { useMemo, useState, useEffect, useRef } from 'react';
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
  Wallet, Sparkles, Building2,
} from 'lucide-react';
import { useAdminPlusterraGains, type PlusterraGainRow } from '@/hooks/useAdminPlusterraGains';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { generatePlusterraGainsReportPDF } from '@/lib/plusterraGainsReportPDF';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const fmtGs = (n: number) => '₲ ' + Math.round(n).toLocaleString('es-PY');

/** Inline editable observation cell with auto-save on blur */
const ObservationCell = ({
  row, period, onSaved,
}: { row: PlusterraGainRow; period: string; onSaved: () => void }) => {
  const { user } = useAuth();
  const [value, setValue] = useState(row.observation);
  const [saving, setSaving] = useState(false);
  const initial = useRef(row.observation);

  useEffect(() => {
    setValue(row.observation);
    initial.current = row.observation;
  }, [row.observation, period]);

  const save = async () => {
    const next = value.trim();
    if (next === initial.current.trim()) return;
    setSaving(true);
    try {
      const { error } = await (supabase as any)
        .from('admin_property_observations')
        .upsert(
          {
            property_id: row.property_id,
            period,
            observation: next || null,
            created_by: user!.id,
          },
          { onConflict: 'property_id,period' },
        );
      if (error) throw error;
      initial.current = next;
      onSaved();
    } catch (e: any) {
      toast.error('No se pudo guardar la observación: ' + (e?.message || ''));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative">
      <input
        value={value}
        onChange={e => setValue(e.target.value)}
        onBlur={save}
        placeholder="Anotá algo sobre esta propiedad…"
        className="w-full h-8 text-xs px-2 rounded border border-input bg-background focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none transition-colors"
      />
      {saving && (
        <Loader2 className="w-3 h-3 animate-spin absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
      )}
    </div>
  );
};

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
    if (!data || data.rows.length === 0) {
      toast.info('No hay propiedades cobradas en este mes');
      return;
    }
    setGenerating(true);
    try {
      await saveGeneralNote();
      generatePlusterraGainsReportPDF({
        period,
        monthLabel,
        rows: data.rows.map(r => ({
          building_name: r.building_name,
          unit_code: r.unit_code,
          property_code: r.property_code,
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
        generatedBy: user?.email || 'Sistema',
      });
      toast.success('Reporte exportado');
    } catch (e: any) {
      toast.error('Error al generar PDF: ' + (e?.message || ''));
    } finally {
      setGenerating(false);
    }
  };

  const grouped = useMemo(() => {
    if (!data) return [];
    const map = new Map<string, PlusterraGainRow[]>();
    data.rows.forEach(r => {
      const k = r.building_name;
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(r);
    });
    return Array.from(map.entries());
  }, [data]);

  return (
    <div className="space-y-5">
      {/* Hero / explanación */}
      <div className="rounded-lg border border-primary/30 bg-gradient-to-br from-primary/5 via-background to-background px-4 py-3">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Ganancia interna de Plusterra</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Consolidado mensual <strong>solo de lo que ganó Plusterra</strong> en administración, propiedad por propiedad. Los gastos provienen de la <strong>Caja Administración</strong> (egresos imputados a una propiedad) y no se mezclan con Finanzas.
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
          disabled={generating || !data || data.rows.length === 0}
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
                  Sobre cobros de {fmtGs(data.totalCollected)} · {data.rows.length} {data.rows.length === 1 ? 'propiedad' : 'propiedades'}
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

            <Card className={data.netResult >= 0 ? 'border-primary/40 bg-primary/5' : 'border-rose-300 bg-rose-50/50'}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Wallet className="w-4 h-4 text-foreground" />
                  <span className="text-xs text-muted-foreground">Resultado neto del mes</span>
                </div>
                <p className={`text-2xl font-bold font-mono ${data.netResult >= 0 ? 'text-primary' : 'text-rose-700'}`}>
                  {fmtGs(data.netResult)}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">Ganancia − Gastos</p>
              </CardContent>
            </Card>
          </div>

          {/* Tabla */}
          {data.rows.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Building2 className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">
                  No hay propiedades con cobros confirmados en {monthLabel}.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead className="text-xs">Edificio</TableHead>
                        <TableHead className="text-xs">Unidad</TableHead>
                        <TableHead className="text-xs">Código</TableHead>
                        <TableHead className="text-xs text-center">%</TableHead>
                        <TableHead className="text-xs text-right">Cobrado</TableHead>
                        <TableHead className="text-xs text-right">Ganancia Plusterra</TableHead>
                        <TableHead className="text-xs text-right">Gastos</TableHead>
                        <TableHead className="text-xs min-w-[260px]">Observación interna</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {grouped.map(([buildingName, rows]) => (
                        <>
                          {rows.map((r, idx) => (
                            <TableRow key={r.property_id} className="hover:bg-muted/20">
                              <TableCell className="text-xs font-medium">
                                {idx === 0 ? buildingName : <span className="text-muted-foreground/60">↳</span>}
                              </TableCell>
                              <TableCell className="text-xs font-mono">{r.unit_code}</TableCell>
                              <TableCell className="text-[10px] font-mono text-muted-foreground">
                                {r.property_code || '—'}
                              </TableCell>
                              <TableCell className="text-xs text-center">
                                <Badge variant="outline" className="text-[10px] font-mono">
                                  {r.internal_pct}%
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs text-right font-mono">{fmtGs(r.collected)}</TableCell>
                              <TableCell className="text-xs text-right font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                                {fmtGs(r.gain)}
                              </TableCell>
                              <TableCell className="text-xs text-right font-mono text-rose-700 dark:text-rose-400">
                                {r.expenses > 0 ? fmtGs(r.expenses) : '—'}
                              </TableCell>
                              <TableCell className="py-1.5">
                                <ObservationCell row={r} period={period} onSaved={refetch} />
                              </TableCell>
                            </TableRow>
                          ))}
                        </>
                      ))}
                    </TableBody>
                    <TableFooter>
                      <TableRow className="bg-muted/60 font-semibold">
                        <TableCell colSpan={4} className="text-xs">TOTAL DEL MES</TableCell>
                        <TableCell className="text-xs text-right font-mono">{fmtGs(data.totalCollected)}</TableCell>
                        <TableCell className="text-xs text-right font-mono text-emerald-700 dark:text-emerald-400">
                          {fmtGs(data.totalGain)}
                        </TableCell>
                        <TableCell className="text-xs text-right font-mono text-rose-700 dark:text-rose-400">
                          {fmtGs(data.totalExpenses)}
                        </TableCell>
                        <TableCell className="text-xs text-right">
                          Neto: <span className={`font-mono ${data.netResult >= 0 ? 'text-primary' : 'text-rose-700'}`}>{fmtGs(data.netResult)}</span>
                        </TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
                </div>
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