import { useMemo, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useMorososGlobal, useMarkMorosoCobrado, type MorosoRow } from '@/hooks/useMorososGlobal';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { DualScrollArea } from '@/components/ui/dual-scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OtrasDeudasTab } from '@/components/morosos/OtrasDeudasTab';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle, ChevronLeft, ChevronRight, CheckCircle2, Loader2, Search } from 'lucide-react';
import { format, subMonths, addMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

const fmtMoney = (n: number, currency: string) =>
  currency === 'USD'
    ? `USD ${Math.round(n).toLocaleString('en-US')}`
    : `₲ ${Math.round(n).toLocaleString('es-PY')}`;

const MorososPage = () => {
  const { user } = useAuth();
  const [monthDate, setMonthDate] = useState(new Date());
  const period = format(monthDate, 'yyyy-MM');
  const monthLabel = format(monthDate, 'MMMM yyyy', { locale: es });

  const { data: rows, isLoading, isError, refetch } = useMorososGlobal(period);
  const markCobrado = useMarkMorosoCobrado(period);

  const [search, setSearch] = useState('');
  const [onlyOverdue, setOnlyOverdue] = useState(true);
  const [target, setTarget] = useState<MorosoRow | null>(null);
  const [concepts, setConcepts] = useState({ alquiler: true, expensas: false, energia: false, iva: false });
  const [observation, setObservation] = useState('');

  const openTarget = (r: MorosoRow) => {
    setConcepts({
      alquiler: true,
      expensas: r.expensas_check,
      energia: r.energia_check,
      iva: r.iva_check,
    });
    setObservation(r.observation || '');
    setTarget(r);
  };

  /**
   * Criterio de "vencido" (presentación): el mes en curso ya venció (mora_days > 0)
   * O arrastra deuda de meses anteriores (prior_debt_total > 0).
   */
  const isOverdue = (r: MorosoRow) => r.mora_days > 0 || r.prior_debt_total > 0;

  const filtered = useMemo(() => {
    let list = rows || [];
    if (onlyOverdue) list = list.filter(isOverdue);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(r =>
        [r.building_name, r.unit_code, r.tenant_name, r.owner_names, r.property_code]
          .filter(Boolean)
          .some(v => String(v).toLowerCase().includes(q)),
      );
    }
    return list;
  }, [rows, onlyOverdue, search]);

  const stats = useMemo(() => {
    const all = rows || [];
    const overdue = all.filter(isOverdue);
    const pyg = (r: MorosoRow) => r.currency !== 'USD';
    return {
      overdue: overdue.length,
      pending: all.length - overdue.length,
      // Deuda total (mes en curso pendiente + arrastre) de las unidades vencidas.
      amount: overdue.filter(pyg).reduce((s, r) => s + r.total_debt, 0),
      // Solo el arrastre de meses anteriores, sobre todas las unidades.
      priorAmount: all.filter(pyg).reduce((s, r) => s + r.prior_debt_total, 0),
      priorCount: all.filter(r => r.prior_debt_total > 0).length,
    };
  }, [rows]);


  const handleConfirm = async () => {
    if (!target) return;
    try {
      await markCobrado.mutateAsync({
        unit_id: target.unit_id,
        building_id: target.building_id,
        amount: target.expected_amount,
        concepts,
        observation,
        updated_by: user?.id ?? null,
      });
      const allDone = concepts.alquiler && concepts.expensas && concepts.energia;
      toast.success(
        allDone
          ? `${target.unit_code} marcado como cobrado`
          : `${target.unit_code} actualizado (cobro parcial)`,
      );
      setTarget(null);
    } catch {
      toast.error('No se pudo registrar el cobro');
    }
  };

  return (
    <MainLayout title="Morosos" subtitle="Todos los que no están al día, de todos los edificios">
      <Tabs defaultValue="unidades" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="unidades">Unidades administradas</TabsTrigger>
          <TabsTrigger value="otras">Otros tipos de deuda</TabsTrigger>
        </TabsList>
        <TabsContent value="unidades">
      {/* Month nav */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setMonthDate(d => subMonths(d, 1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-semibold min-w-[140px] text-center capitalize">{monthLabel}</span>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setMonthDate(d => addMonths(d, 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar edificio, unidad, inquilino..."
              className="h-8 pl-8 text-xs w-[260px]"
            />
          </div>
          <Button
            size="sm"
            variant={onlyOverdue ? 'default' : 'outline'}
            className="text-xs h-8"
            onClick={() => setOnlyOverdue(v => !v)}
          >
            {onlyOverdue ? 'Solo vencidos' : 'Vencidos + pendientes'}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-destructive" /> Vencidos
            </p>
            <p className="text-2xl font-bold text-destructive">{stats.overdue}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Pendientes (aún en fecha)</p>
            <p className="text-2xl font-bold text-foreground">{stats.pending}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Monto vencido estimado (Gs.)</p>
            <p className="text-2xl font-bold text-foreground">₲ {stats.amount.toLocaleString('es-PY')}</p>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : isError ? (
        <div className="text-center py-12">
          <p className="text-sm text-muted-foreground mb-3">No se pudo cargar la lista de morosos.</p>
          <Button size="sm" onClick={() => refetch()}>Reintentar</Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 mb-3" />
          <p className="text-sm font-medium">Todo al día en {monthLabel}</p>
        </div>
      ) : (
        <DualScrollArea>
          <div className="min-w-[980px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Edificio</TableHead>
                  <TableHead className="text-xs">Unidad</TableHead>
                  <TableHead className="text-xs">Cobranza</TableHead>
                  <TableHead className="text-xs">Inquilino</TableHead>
                  <TableHead className="text-xs">Propietario</TableHead>
                  <TableHead className="text-xs">Vence</TableHead>
                  <TableHead className="text-xs">Mora</TableHead>
                  <TableHead className="text-xs">Observación</TableHead>
                  <TableHead className="text-xs text-right">Monto</TableHead>
                  <TableHead className="text-xs text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(r => (
                  <TableRow key={r.unit_id} className={r.mora_days > 0 ? 'bg-destructive/5 hover:bg-destructive/10' : ''}>
                    <TableCell className="text-xs">
                      <Link to={`/edificios/${r.building_id}`} className="text-primary hover:underline">
                        {r.building_name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-xs font-medium">{r.unit_code}</TableCell>
                    <TableCell className="text-xs">
                      {r.has_record ? (
                        <span className="text-muted-foreground">Cargado</span>
                      ) : (
                        <Badge variant="outline" className="bg-muted text-muted-foreground text-[10px]">
                          Sin registro
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">{r.tenant_name || '—'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.owner_names || '—'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">día {r.due_day}</TableCell>
                    <TableCell>
                      {r.mora_days > 0 ? (
                        <Badge variant="outline" className="bg-destructive/15 text-destructive border-destructive/30 text-[10px] gap-1">
                          <AlertTriangle className="w-3 h-3" /> {r.mora_days} días
                        </Badge>
                      ) : r.status === 'partial' ? (
                        <Badge variant="outline" className="bg-blue-500/15 text-blue-700 border-blue-300 text-[10px]">
                          Parcial
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-amber-500/15 text-amber-700 border-amber-300 text-[10px]">
                          Pendiente
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate" title={r.observation || ''}>
                      {r.observation || '—'}
                    </TableCell>
                    <TableCell className="text-xs text-right font-medium">
                      <div className="flex flex-col items-end gap-0.5">
                        <span>{r.expected_amount > 0 ? fmtMoney(r.expected_amount, r.currency) : '—'}</span>
                        {r.prior_debt_total > 0 && (
                          <span
                            className="text-[10px] text-destructive font-normal"
                            title={r.prior_debt_periods.map(p => `${p.period}: ${fmtMoney(p.amount, r.currency)}`).join('\n')}
                          >
                            + Acum. {r.prior_debt_label}: {fmtMoney(r.prior_debt_total, r.currency)}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" className="h-7 text-xs gap-1" onClick={() => openTarget(r)}>
                        <CheckCircle2 className="w-3.5 h-3.5" /> Cobrado
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DualScrollArea>
      )}
        </TabsContent>
        <TabsContent value="otras">
          <OtrasDeudasTab />
        </TabsContent>
      </Tabs>

      <AlertDialog open={!!target} onOpenChange={open => !open && setTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar cobro</AlertDialogTitle>
            <AlertDialogDescription>
              {target && (
                <>
                  Seleccioná los conceptos cobrados de <strong>{target.unit_code}</strong> ({target.building_name})
                  en <strong>{monthLabel}</strong>. Queda registrado en el Control de Cobranza del edificio
                  y en la liquidación del mes.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {target && (
            <div className="space-y-2 py-1">
              {([
                { key: 'alquiler', label: 'Alquiler', amount: target.expected_amount || target.alquiler_amount },
                { key: 'expensas', label: 'Expensas', amount: target.expensas_amount },
                { key: 'energia', label: 'Energía', amount: target.energia_amount },
                { key: 'iva', label: 'IVA', amount: target.iva_amount },
              ] as const).map(item => (
                <label
                  key={item.key}
                  className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 cursor-pointer"
                >
                  <span className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={concepts[item.key]}
                      onCheckedChange={v => setConcepts(prev => ({ ...prev, [item.key]: !!v }))}
                    />
                    {item.label}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {item.amount > 0 ? fmtMoney(item.amount, target.currency) : '—'}
                  </span>
                </label>
              ))}
              <div className="space-y-1 pt-1">
                <label className="text-xs font-medium text-foreground">Observación (opcional)</label>
                <Textarea
                  value={observation}
                  onChange={e => setObservation(e.target.value)}
                  placeholder="Ej: pagó en efectivo, transferencia parcial, acuerdo de pago..."
                  className="text-sm min-h-[70px]"
                />
                <p className="text-[11px] text-muted-foreground">
                  Se guarda en la observación del Control de Cobranza del edificio.
                </p>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Si no marcás todos los conceptos, la unidad queda en estado <strong>Parcial</strong> y sigue
                apareciendo en esta lista hasta completar el cobro.
              </p>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} disabled={markCobrado.isPending}>
              {markCobrado.isPending ? 'Guardando...' : 'Confirmar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
};

export default MorososPage;