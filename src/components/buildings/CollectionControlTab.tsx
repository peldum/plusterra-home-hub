import { useState, useMemo } from 'react';
import { useCollectionRecords } from '@/hooks/useCollectionRecords';
import { useBuildingReceivables } from '@/hooks/useBuildingReceivables';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  ChevronLeft, ChevronRight, Loader2, ClipboardList, Save, AlertTriangle,
  CalendarCheck,
} from 'lucide-react';
import { format, subMonths, addMonths, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface UnitInfo {
  id: string;
  unit_code: string;
  floor: number | null;
  owners: { id: string; full_name: string }[];
  property?: { rental_price: number | null; currency: string | null } | null;
}

interface Props {
  buildingId: string;
  units: UnitInfo[];
  unitsLoading: boolean;
}

const STATUS_OPTIONS = [
  { value: 'paid', label: 'Pagado', color: 'bg-emerald-500/15 text-emerald-700 border-emerald-300' },
  { value: 'pending', label: 'Pendiente', color: 'bg-amber-500/15 text-amber-700 border-amber-300' },
  { value: 'overdue', label: 'Vencido', color: 'bg-destructive/15 text-destructive border-destructive/30' },
  { value: 'partial', label: 'Parcial', color: 'bg-blue-500/15 text-blue-700 border-blue-300' },
];

const getStatusBadge = (status: string) => {
  const opt = STATUS_OPTIONS.find(s => s.value === status) ?? STATUS_OPTIONS[1];
  return <Badge variant="outline" className={`text-[10px] ${opt.color}`}>{opt.label}</Badge>;
};

type EditFields = {
  status?: string;
  observation?: string;
  alquiler_check?: boolean;
  expensas_check?: boolean;
  energia_check?: boolean;
  alquiler_amount?: number;
  expensas_amount?: number;
  energia_amount?: number;
  mora_days?: number;
  mora_amount?: number;
  destino_expensas?: string;
  fecha_pago_alquiler?: string;
  fecha_pago_expensas?: string;
  iva_check?: boolean;
  iva_amount?: number;
};

export const CollectionControlTab = ({ buildingId, units, unitsLoading }: Props) => {
  const { user } = useAuth();
  const [monthDate, setMonthDate] = useState(new Date());
  const period = format(monthDate, 'yyyy-MM');
  const monthLabel = format(monthDate, 'MMMM yyyy', { locale: es });

  const { records, isLoading, upsert } = useCollectionRecords(buildingId, period);

  // Query prepaid receivables for this building+period
  const { data: periodReceivables } = useBuildingReceivables(buildingId, period);
  const prepaidMap = useMemo(() => {
    const m: Record<string, { paid: boolean; prepaid: boolean; prepaidMonths?: string[] }> = {};
    (periodReceivables || []).forEach(r => {
      const detail = r.payment_detail as any;
      const isPrepaid = r.source_type === 'prepaid' || detail?.prepaid;
      if (r.unit_code) {
        m[r.unit_code] = {
          paid: r.status === 'paid',
          prepaid: !!isPrepaid,
          prepaidMonths: detail?.prepaid_months,
        };
      }
    });
    return m;
  }, [periodReceivables]);

  const [edits, setEdits] = useState<Record<string, EditFields>>({});

  const prevMonth = () => { setEdits({}); setMonthDate(prev => subMonths(prev, 1)); };
  const nextMonth = () => {
    setEdits({});
    setMonthDate(prev => {
      const next = addMonths(prev, 1);
      // Allow up to 6 months in the future
      const maxDate = addMonths(new Date(), 6);
      return next > maxDate ? prev : next;
    });
  };
  const isFutureMonth = monthDate > new Date();

  const recordMap = useMemo(() => {
    const m: Record<string, typeof records[0]> = {};
    records.forEach(r => { m[r.unit_id] = r; });
    return m;
  }, [records]);

  const getStatus = (unitId: string) => edits[unitId]?.status ?? recordMap[unitId]?.payment_status ?? 'pending';
  const getObs = (unitId: string) => edits[unitId]?.observation ?? recordMap[unitId]?.observation ?? '';
  const getCheck = (unitId: string, field: 'alquiler_check' | 'expensas_check' | 'energia_check') =>
    edits[unitId]?.[field] ?? recordMap[unitId]?.[field] ?? false;
  const getAmount = (unitId: string, field: 'alquiler_amount' | 'expensas_amount' | 'energia_amount') =>
    edits[unitId]?.[field] ?? recordMap[unitId]?.[field] ?? 0;
  const getMoraDaysValue = (unitId: string): number => {
    if (edits[unitId]?.mora_days !== undefined) return edits[unitId]!.mora_days!;
    if (recordMap[unitId]?.mora_days !== undefined && recordMap[unitId]!.mora_days > 0) return recordMap[unitId]!.mora_days;
    return getAutoMoraDays(unitId);
  };
  const getMoraAmount = (unitId: string): number => {
    if (edits[unitId]?.mora_amount !== undefined) return edits[unitId]!.mora_amount!;
    return recordMap[unitId]?.mora_amount ?? 0;
  };
  const getDestinoExpensas = (unitId: string) => edits[unitId]?.destino_expensas ?? recordMap[unitId]?.destino_expensas ?? '';
  const getFechaPagoAlquiler = (unitId: string) => edits[unitId]?.fecha_pago_alquiler ?? recordMap[unitId]?.fecha_pago_alquiler ?? '';
  const getFechaPagoExpensas = (unitId: string) => edits[unitId]?.fecha_pago_expensas ?? recordMap[unitId]?.fecha_pago_expensas ?? '';
  const getIvaCheck = (unitId: string) => edits[unitId]?.iva_check ?? recordMap[unitId]?.iva_check ?? false;
  const getIvaAmount = (unitId: string): number => edits[unitId]?.iva_amount ?? recordMap[unitId]?.iva_amount ?? 0;

  const setEdit = (unitId: string, field: string, value: string | boolean | number) => {
    setEdits(prev => ({ ...prev, [unitId]: { ...prev[unitId], [field]: value } }));
  };

  const isDirty = (unitId: string) => {
    const e = edits[unitId];
    if (!e) return false;
    const rec = recordMap[unitId];
    if (e.status && e.status !== (rec?.payment_status ?? 'pending')) return true;
    if (e.observation !== undefined && e.observation !== (rec?.observation ?? '')) return true;
    if (e.mora_days !== undefined && e.mora_days !== (rec?.mora_days ?? 0)) return true;
    if (e.mora_amount !== undefined && e.mora_amount !== (rec?.mora_amount ?? 0)) return true;
    if (e.destino_expensas !== undefined && e.destino_expensas !== (rec?.destino_expensas ?? '')) return true;
    if (e.fecha_pago_alquiler !== undefined && e.fecha_pago_alquiler !== (rec?.fecha_pago_alquiler ?? '')) return true;
    if (e.fecha_pago_expensas !== undefined && e.fecha_pago_expensas !== (rec?.fecha_pago_expensas ?? '')) return true;
    if (e.iva_check !== undefined && e.iva_check !== (rec?.iva_check ?? false)) return true;
    if (e.iva_amount !== undefined && e.iva_amount !== (rec?.iva_amount ?? 0)) return true;
    for (const f of ['alquiler_check', 'expensas_check', 'energia_check'] as const) {
      if (e[f] !== undefined && e[f] !== (rec?.[f] ?? false)) return true;
    }
    for (const f of ['alquiler_amount', 'expensas_amount', 'energia_amount'] as const) {
      if (e[f] !== undefined && e[f] !== (rec?.[f] ?? 0)) return true;
    }
    return false;
  };

  const buildSavePayload = (unitId: string) => ({
    unit_id: unitId,
    building_id: buildingId,
    period,
    payment_status: getStatus(unitId),
    observation: getObs(unitId) || null,
    alquiler_check: getCheck(unitId, 'alquiler_check'),
    expensas_check: getCheck(unitId, 'expensas_check'),
    energia_check: getCheck(unitId, 'energia_check'),
    alquiler_amount: getAmount(unitId, 'alquiler_amount'),
    expensas_amount: getAmount(unitId, 'expensas_amount'),
    energia_amount: getAmount(unitId, 'energia_amount'),
    mora_days: getMoraDaysValue(unitId),
    mora_amount: getMoraAmount(unitId),
    destino_expensas: getDestinoExpensas(unitId) || null,
    fecha_pago_alquiler: getFechaPagoAlquiler(unitId) || null,
    fecha_pago_expensas: getFechaPagoExpensas(unitId) || null,
    iva_check: getIvaCheck(unitId),
    iva_amount: getIvaAmount(unitId),
    updated_by: user?.id ?? null,
  });

  const handleSave = async (unitId: string) => {
    try {
      await upsert.mutateAsync(buildSavePayload(unitId));
      setEdits(prev => { const n = { ...prev }; delete n[unitId]; return n; });
      toast.success('Registro guardado');
    } catch {
      toast.error('Error al guardar');
    }
  };

  const handleSaveAll = async () => {
    const dirtyIds = units.filter(u => isDirty(u.id)).map(u => u.id);
    if (dirtyIds.length === 0) { toast.info('Sin cambios pendientes'); return; }
    try {
      for (const uid of dirtyIds) {
        await upsert.mutateAsync(buildSavePayload(uid));
      }
      setEdits({});
      toast.success(`${dirtyIds.length} registro(s) guardados`);
    } catch {
      toast.error('Error al guardar');
    }
  };

  const hasDirty = units.some(u => isDirty(u.id));

  // Summary
  const summary = useMemo(() => {
    const s = { paid: 0, pending: 0, overdue: 0, partial: 0 };
    units.forEach(u => {
      const st = getStatus(u.id) as keyof typeof s;
      if (st in s) s[st]++;
    });
    return s;
  }, [units, edits, recordMap]);

  // Totals
  const totals = useMemo(() => {
    let alquiler = 0, expensas = 0, energia = 0;
    units.forEach(u => {
      alquiler += getAmount(u.id, 'alquiler_amount');
      expensas += getAmount(u.id, 'expensas_amount');
      energia += getAmount(u.id, 'energia_amount');
    });
    return { alquiler, expensas, energia, total: alquiler + expensas + energia };
  }, [units, edits, recordMap]);

  // Check summary
  const checkSummary = useMemo(() => {
    let alquiler = 0, expensas = 0, energia = 0;
    units.forEach(u => {
      if (getCheck(u.id, 'alquiler_check')) alquiler++;
      if (getCheck(u.id, 'expensas_check')) expensas++;
      if (getCheck(u.id, 'energia_check')) energia++;
    });
    return { alquiler, expensas, energia, total: units.length };
  }, [units, edits, recordMap]);

  // Mora calculation: days past due date (5th of month)
  const getAutoMoraDays = (unitId: string): number => {
    const status = getStatus(unitId);
    if (status === 'paid') return 0;
    const [y, m] = period.split('-').map(Number);
    const dueDate = new Date(y, m - 1, 5);
    const today = new Date();
    if (today <= dueDate) return 0;
    return differenceInDays(today, dueDate);
  };

  const getMoraBadge = (days: number) => {
    if (days <= 0) return <span className="text-muted-foreground text-xs">—</span>;
    if (days <= 10)
      return (
        <Badge variant="outline" className="bg-amber-500/15 text-amber-700 border-amber-300 text-[10px] gap-1">
          <AlertTriangle className="w-3 h-3" /> {days}d
        </Badge>
      );
    return (
      <Badge variant="outline" className="bg-destructive/15 text-destructive border-destructive/30 text-[10px] gap-1 animate-pulse">
        <AlertTriangle className="w-3 h-3" /> {days}d
      </Badge>
    );
  };

  // Mora summary
  const moraSummary = useMemo(() => {
    let enMora = 0;
    units.forEach(u => {
      if (getMoraDaysValue(u.id) > 0) enMora++;
    });
    return enMora;
  }, [units, edits, recordMap, period]);

  const fmtGs = (n: number) => n > 0 ? `₲ ${Math.round(n).toLocaleString('es-PY')}` : '—';

  return (
    <TooltipProvider>
      <div>
        {/* Month nav + save all */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={prevMonth}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-semibold min-w-[140px] text-center capitalize">{monthLabel}</span>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={nextMonth}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <Button size="sm" className="gap-1.5 text-xs" onClick={handleSaveAll} disabled={!hasDirty || upsert.isPending}>
            <Save className="w-3.5 h-3.5" />
            Guardar Cambios
          </Button>
        </div>

        {/* Summary pills */}
        {units.length > 0 && (
          <div className="space-y-2 mb-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="bg-emerald-500/15 text-emerald-700 border-emerald-300 text-xs">
                Pagados: {summary.paid}
              </Badge>
              <Badge variant="outline" className="bg-amber-500/15 text-amber-700 border-amber-300 text-xs">
                Pendientes: {summary.pending}
              </Badge>
              <Badge variant="outline" className="bg-destructive/15 text-destructive border-destructive/30 text-xs">
                Vencidos: {summary.overdue}
              </Badge>
              <Badge variant="outline" className="bg-blue-500/15 text-blue-700 border-blue-300 text-xs">
                Parciales: {summary.partial}
              </Badge>
              {moraSummary > 0 && (
                <Badge variant="outline" className="bg-destructive/15 text-destructive border-destructive/30 text-xs gap-1">
                  <AlertTriangle className="w-3 h-3" /> En mora: {moraSummary}
                </Badge>
              )}
            </div>
            {/* Check + amounts summary */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="text-xs gap-1">
                🏠 Alquiler: {checkSummary.alquiler}/{checkSummary.total} — {fmtGs(totals.alquiler)}
              </Badge>
              <Badge variant="outline" className="text-xs gap-1">
                💰 Expensas: {checkSummary.expensas}/{checkSummary.total} — {fmtGs(totals.expensas)}
              </Badge>
              <Badge variant="outline" className="text-xs gap-1">
                ⚡ Energía: {checkSummary.energia}/{checkSummary.total} — {fmtGs(totals.energia)}
              </Badge>
              {totals.total > 0 && (
                <Badge className="text-xs gap-1 bg-primary/10 text-primary border-primary/30" variant="outline">
                  Total: {fmtGs(totals.total)}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Loading */}
        {(unitsLoading || isLoading) && (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        )}

        {/* Empty */}
        {!unitsLoading && units.length === 0 && (
          <div className="text-center py-12">
            <ClipboardList className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">Sin unidades registradas</p>
          </div>
        )}

        {/* Table */}
        {!unitsLoading && units.length > 0 && !isLoading && (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="font-semibold w-[90px]">Unidad</TableHead>
                    <TableHead className="font-semibold">Propietario</TableHead>
                    <TableHead className="font-semibold w-[120px]">Estado</TableHead>
                    <TableHead className="font-semibold text-center w-[140px]">
                      <Tooltip><TooltipTrigger>⚠️ Mora</TooltipTrigger><TooltipContent>Días en mora + monto manual</TooltipContent></Tooltip>
                    </TableHead>
                    <TableHead className="font-semibold text-center w-[60px]">
                      <Tooltip><TooltipTrigger>🏠 Alquiler</TooltipTrigger><TooltipContent>Alquiler cobrado</TooltipContent></Tooltip>
                    </TableHead>
                    <TableHead className="font-semibold text-center w-[80px]">
                      <Tooltip><TooltipTrigger>📅 F. Pago Alq.</TooltipTrigger><TooltipContent>Fecha de pago del alquiler</TooltipContent></Tooltip>
                    </TableHead>
                    <TableHead className="font-semibold text-center w-[110px]">
                      <Tooltip><TooltipTrigger>💰 Expensas</TooltipTrigger><TooltipContent>Expensas pagadas + monto</TooltipContent></Tooltip>
                    </TableHead>
                    <TableHead className="font-semibold text-center w-[80px]">
                      <Tooltip><TooltipTrigger>📅 F. Pago Exp.</TooltipTrigger><TooltipContent>Fecha de pago de expensas</TooltipContent></Tooltip>
                    </TableHead>
                    <TableHead className="font-semibold text-center w-[60px]">
                      <Tooltip><TooltipTrigger>⚡ Energía</TooltipTrigger><TooltipContent>Energía ANDE cobrada</TooltipContent></Tooltip>
                    </TableHead>
                    <TableHead className="font-semibold text-center w-[100px]">
                      <Tooltip><TooltipTrigger>📍 Destino Exp.</TooltipTrigger><TooltipContent>A quién se transfieren las expensas</TooltipContent></Tooltip>
                    </TableHead>
                    <TableHead className="font-semibold text-center w-[100px]">
                      <Tooltip><TooltipTrigger>🧾 IVA 5%</TooltipTrigger><TooltipContent>Check + monto IVA deducido (manual)</TooltipContent></Tooltip>
                    </TableHead>
                    <TableHead className="font-semibold">Obs.</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {units.map(unit => {
                    const allChecks = getCheck(unit.id, 'alquiler_check') && getCheck(unit.id, 'expensas_check') && getCheck(unit.id, 'energia_check');
                    return (
                      <TableRow key={unit.id} className={`hover:bg-muted/30 ${allChecks ? 'bg-emerald-500/5' : ''}`}>
                        <TableCell className="font-mono font-semibold text-primary text-sm">{unit.unit_code}</TableCell>
                        <TableCell className="text-sm">
                          {unit.owners.length > 0 ? unit.owners.map(o => o.full_name).join(', ') : <span className="text-muted-foreground italic text-xs">Sin propietario</span>}
                        </TableCell>
                        <TableCell>
                          <Select value={getStatus(unit.id)} onValueChange={v => setEdit(unit.id, 'status', v)}>
                            <SelectTrigger className="h-7 text-xs w-[110px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {STATUS_OPTIONS.map(opt => (
                                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        {/* Mora - editable */}
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              className="h-7 w-[45px] text-xs text-center px-1"
                              placeholder="0d"
                              title="Días"
                              value={getMoraDaysValue(unit.id) || ''}
                              onChange={e => setEdit(unit.id, 'mora_days', Number(e.target.value) || 0)}
                            />
                            <Input
                              type="number"
                              className="h-7 w-[70px] text-xs text-right px-1"
                              placeholder="₲"
                              title="Monto mora"
                              value={getMoraAmount(unit.id) || ''}
                              onChange={e => setEdit(unit.id, 'mora_amount', Number(e.target.value) || 0)}
                            />
                            {getMoraDaysValue(unit.id) > 0 && getMoraBadge(getMoraDaysValue(unit.id))}
                          </div>
                        </TableCell>
                        {/* Alquiler: check only */}
                        <TableCell>
                          <div className="flex items-center justify-center">
                            <Checkbox
                              checked={getCheck(unit.id, 'alquiler_check')}
                              onCheckedChange={v => setEdit(unit.id, 'alquiler_check', !!v)}
                              className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                            />
                          </div>
                        </TableCell>
                        {/* Fecha pago alquiler */}
                        <TableCell>
                          <Input
                            type="date"
                            className="h-7 w-[100px] text-xs px-1"
                            value={getFechaPagoAlquiler(unit.id)}
                            onChange={e => setEdit(unit.id, 'fecha_pago_alquiler', e.target.value)}
                          />
                        </TableCell>
                        {/* Expensas: check + amount */}
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Checkbox
                              checked={getCheck(unit.id, 'expensas_check')}
                              onCheckedChange={v => setEdit(unit.id, 'expensas_check', !!v)}
                              className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                            />
                            <Input
                              type="number"
                              className="h-7 w-[70px] text-xs text-right px-1"
                              placeholder="₲"
                              value={getAmount(unit.id, 'expensas_amount') || ''}
                              onChange={e => setEdit(unit.id, 'expensas_amount', Number(e.target.value) || 0)}
                            />
                          </div>
                        </TableCell>
                        {/* Fecha pago expensas */}
                        <TableCell>
                          <Input
                            type="date"
                            className="h-7 w-[100px] text-xs px-1"
                            value={getFechaPagoExpensas(unit.id)}
                            onChange={e => setEdit(unit.id, 'fecha_pago_expensas', e.target.value)}
                          />
                        </TableCell>
                        {/* Energía: check only */}
                        <TableCell>
                          <div className="flex items-center justify-center">
                            <Checkbox
                              checked={getCheck(unit.id, 'energia_check')}
                              onCheckedChange={v => setEdit(unit.id, 'energia_check', !!v)}
                              className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                            />
                          </div>
                        </TableCell>
                        {/* Destino expensas */}
                        <TableCell>
                          <Input
                            type="text"
                            className="h-7 w-[90px] text-xs px-1"
                            placeholder="Destino..."
                            value={getDestinoExpensas(unit.id)}
                            onChange={e => setEdit(unit.id, 'destino_expensas', e.target.value)}
                          />
                        </TableCell>
                        {/* IVA 5%: check + monto */}
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Checkbox
                              checked={getIvaCheck(unit.id)}
                              onCheckedChange={v => setEdit(unit.id, 'iva_check', !!v)}
                              className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                            />
                            <Input
                              type="number"
                              className="h-7 w-[60px] text-xs text-right px-1"
                              placeholder="₲"
                              value={getIvaAmount(unit.id) || ''}
                              onChange={e => setEdit(unit.id, 'iva_amount', Number(e.target.value) || 0)}
                            />
                          </div>
                        </TableCell>
                        <TableCell className="min-w-[160px]">
                          <Textarea
                            className="min-h-[60px] text-xs resize-y py-1.5"
                            placeholder="Observaciones..."
                            value={getObs(unit.id)}
                            onChange={e => setEdit(unit.id, 'observation', e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          {isDirty(unit.id) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleSave(unit.id)}
                              disabled={upsert.isPending}
                            >
                              <Save className="w-3.5 h-3.5 text-primary" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};
