import { useState, useMemo } from 'react';
import { useCollectionRecords } from '@/hooks/useCollectionRecords';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  ChevronLeft, ChevronRight, Loader2, ClipboardList, Save,
} from 'lucide-react';
import { format, subMonths } from 'date-fns';
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

export const CollectionControlTab = ({ buildingId, units, unitsLoading }: Props) => {
  const { user } = useAuth();
  const [monthDate, setMonthDate] = useState(new Date());
  const period = format(monthDate, 'yyyy-MM');
  const monthLabel = format(monthDate, 'MMMM yyyy', { locale: es });

  const { records, isLoading, upsert } = useCollectionRecords(buildingId, period);

  // Local edits keyed by unit_id
  const [edits, setEdits] = useState<Record<string, {
    status?: string;
    observation?: string;
    alquiler_check?: boolean;
    expensas_check?: boolean;
    energia_check?: boolean;
  }>>({});

  const prevMonth = () => { setEdits({}); setMonthDate(prev => subMonths(prev, 1)); };
  const nextMonth = () => {
    setEdits({});
    setMonthDate(prev => {
      const next = new Date(prev);
      next.setMonth(next.getMonth() + 1);
      return next > new Date() ? prev : next;
    });
  };

  const recordMap = useMemo(() => {
    const m: Record<string, typeof records[0]> = {};
    records.forEach(r => { m[r.unit_id] = r; });
    return m;
  }, [records]);

  const getStatus = (unitId: string) => edits[unitId]?.status ?? recordMap[unitId]?.payment_status ?? 'pending';
  const getObs = (unitId: string) => edits[unitId]?.observation ?? recordMap[unitId]?.observation ?? '';
  const getCheck = (unitId: string, field: 'alquiler_check' | 'expensas_check' | 'energia_check') =>
    edits[unitId]?.[field] ?? recordMap[unitId]?.[field] ?? false;

  const setEdit = (unitId: string, field: string, value: string | boolean) => {
    setEdits(prev => ({ ...prev, [unitId]: { ...prev[unitId], [field]: value } }));
  };

  const isDirty = (unitId: string) => {
    const e = edits[unitId];
    if (!e) return false;
    const rec = recordMap[unitId];
    if (e.status && e.status !== (rec?.payment_status ?? 'pending')) return true;
    if (e.observation !== undefined && e.observation !== (rec?.observation ?? '')) return true;
    if (e.alquiler_check !== undefined && e.alquiler_check !== (rec?.alquiler_check ?? false)) return true;
    if (e.expensas_check !== undefined && e.expensas_check !== (rec?.expensas_check ?? false)) return true;
    if (e.energia_check !== undefined && e.energia_check !== (rec?.energia_check ?? false)) return true;
    return false;
  };

  const handleSave = async (unitId: string) => {
    try {
      await upsert.mutateAsync({
        unit_id: unitId,
        building_id: buildingId,
        period,
        payment_status: getStatus(unitId),
        observation: getObs(unitId) || null,
        alquiler_check: getCheck(unitId, 'alquiler_check'),
        expensas_check: getCheck(unitId, 'expensas_check'),
        energia_check: getCheck(unitId, 'energia_check'),
        updated_by: user?.id ?? null,
      });
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
        await upsert.mutateAsync({
          unit_id: uid,
          building_id: buildingId,
          period,
          payment_status: getStatus(uid),
          observation: getObs(uid) || null,
          alquiler_check: getCheck(uid, 'alquiler_check'),
          expensas_check: getCheck(uid, 'expensas_check'),
          energia_check: getCheck(uid, 'energia_check'),
          updated_by: user?.id ?? null,
        });
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

  // Triple check summary
  const checkSummary = useMemo(() => {
    let alquiler = 0, expensas = 0, energia = 0;
    units.forEach(u => {
      if (getCheck(u.id, 'alquiler_check')) alquiler++;
      if (getCheck(u.id, 'expensas_check')) expensas++;
      if (getCheck(u.id, 'energia_check')) energia++;
    });
    return { alquiler, expensas, energia, total: units.length };
  }, [units, edits, recordMap]);

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
            </div>
            {/* Triple check summary */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="text-xs gap-1">
                🏠 Alquiler: {checkSummary.alquiler}/{checkSummary.total}
              </Badge>
              <Badge variant="outline" className="text-xs gap-1">
                💰 Expensas: {checkSummary.expensas}/{checkSummary.total}
              </Badge>
              <Badge variant="outline" className="text-xs gap-1">
                ⚡ Energía: {checkSummary.energia}/{checkSummary.total}
              </Badge>
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
                    <TableHead className="font-semibold w-[130px]">Estado</TableHead>
                    <TableHead className="font-semibold text-center w-[50px]">
                      <Tooltip><TooltipTrigger>🏠</TooltipTrigger><TooltipContent>Alquiler pagado</TooltipContent></Tooltip>
                    </TableHead>
                    <TableHead className="font-semibold text-center w-[50px]">
                      <Tooltip><TooltipTrigger>💰</TooltipTrigger><TooltipContent>Expensas pagadas</TooltipContent></Tooltip>
                    </TableHead>
                    <TableHead className="font-semibold text-center w-[50px]">
                      <Tooltip><TooltipTrigger>⚡</TooltipTrigger><TooltipContent>Energía ANDE pagada</TooltipContent></Tooltip>
                    </TableHead>
                    <TableHead className="font-semibold">Observación</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
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
                            <SelectTrigger className="h-7 text-xs w-[120px]">
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
                        <TableCell className="text-center">
                          <Checkbox
                            checked={getCheck(unit.id, 'alquiler_check')}
                            onCheckedChange={v => setEdit(unit.id, 'alquiler_check', !!v)}
                            className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Checkbox
                            checked={getCheck(unit.id, 'expensas_check')}
                            onCheckedChange={v => setEdit(unit.id, 'expensas_check', !!v)}
                            className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Checkbox
                            checked={getCheck(unit.id, 'energia_check')}
                            onCheckedChange={v => setEdit(unit.id, 'energia_check', !!v)}
                            className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                          />
                        </TableCell>
                        <TableCell>
                          <Textarea
                            className="min-h-[32px] h-8 text-xs resize-none py-1.5"
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
