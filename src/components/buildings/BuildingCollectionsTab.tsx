import { useState, useMemo } from 'react';
import { useBuildingReceivables, type BuildingReceivable } from '@/hooks/useBuildingReceivables';
import { useMarkReceivablePaid } from '@/hooks/useReceivables';
import { ReceivableDetailDialog } from '@/components/finances/ReceivableDetailDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  ChevronLeft, ChevronRight, Loader2, ClipboardList,
  CheckCircle2, Clock, AlertTriangle, Zap, TrendingUp,
  Eye, MessageCircle,
} from 'lucide-react';
import { format, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DualScrollArea } from '@/components/ui/dual-scroll-area';

const fmtGs = (n: number) => 'Gs. ' + Math.round(n).toLocaleString('es-PY');

const conceptLabels: Record<string, string> = {
  alquiler: 'Alquiler',
  deposito: 'Depósito de garantía',
};

type DisplayStatus = 'adelantado' | 'al_dia' | 'por_vencer' | 'vencido' | 'en_mora' | 'pagado';

const STATUS_CONFIG: Record<DisplayStatus, { label: string; color: string; icon: typeof Clock; pulse?: boolean }> = {
  adelantado: { label: 'Adelantado', color: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-300', icon: Zap },
  al_dia: { label: 'Al día', color: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300', icon: CheckCircle2 },
  por_vencer: { label: 'Por vencer', color: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-300', icon: Clock },
  vencido: { label: 'Vencido', color: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-300', icon: AlertTriangle },
  en_mora: { label: 'En mora', color: 'bg-destructive/10 text-destructive border-destructive/30', icon: AlertTriangle, pulse: true },
  pagado: { label: 'Pagado', color: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300', icon: CheckCircle2 },
};

function getDisplayStatus(r: BuildingReceivable): DisplayStatus {
  if (r.status === 'paid') {
    if (r.paid_date && r.due_date && new Date(r.paid_date) < new Date(r.due_date)) return 'adelantado';
    return 'pagado';
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(r.due_date);
  const diffDays = Math.ceil((due.getTime() - today.getTime()) / (86400000));
  if (diffDays < -15) return 'en_mora';
  if (diffDays < 0) return 'vencido';
  if (diffDays <= 5) return 'por_vencer';
  return 'al_dia';
}

function getDaysInfo(r: BuildingReceivable): { value: number; label: string; color: string } {
  if (r.status === 'paid') return { value: 0, label: '—', color: 'text-muted-foreground' };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(r.due_date);
  const diff = Math.ceil((due.getTime() - today.getTime()) / 86400000);
  if (diff > 0) return { value: diff, label: `${diff}d`, color: 'text-emerald-600' };
  if (diff === 0) return { value: 0, label: 'Hoy', color: 'text-amber-600 font-bold' };
  return { value: Math.abs(diff), label: `${Math.abs(diff)}d`, color: 'text-destructive font-bold' };
}

function buildWhatsAppMsg(r: BuildingReceivable): string {
  const name = r.debtor_name || 'Inquilino';
  const concept = conceptLabels[r.concept] || r.concept;
  const amount = fmtGs(r.amount);
  const date = new Date(r.due_date).toLocaleDateString('es-PY');
  return encodeURIComponent(
    `Hola ${name}, te escribimos de Plusterra.\n` +
    `Tenés pendiente el pago de ${concept} por ${amount}, con vencimiento ${date}.\n` +
    `Quedamos atentos. 🙏`
  );
}

interface Props {
  buildingId: string;
}

export const BuildingCollectionsTab = ({ buildingId }: Props) => {
  const [monthDate, setMonthDate] = useState(new Date());
  const period = format(monthDate, 'yyyy-MM');
  const monthLabel = format(monthDate, 'MMMM yyyy', { locale: es });

  const { data: receivables, isLoading } = useBuildingReceivables(buildingId, period);
  const markPaidMut = useMarkReceivablePaid();
  const [selectedReceivable, setSelectedReceivable] = useState<BuildingReceivable | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const prevMonth = () => setMonthDate(prev => subMonths(prev, 1));
  const nextMonth = () => {
    setMonthDate(prev => {
      const next = new Date(prev);
      next.setMonth(next.getMonth() + 1);
      return next > new Date() ? prev : next;
    });
  };

  const enriched = useMemo(() => {
    return (receivables || []).map(r => ({
      ...r,
      displayStatus: getDisplayStatus(r),
      daysInfo: getDaysInfo(r),
    })).sort((a, b) => {
      const order: Record<DisplayStatus, number> = { en_mora: 0, vencido: 1, por_vencer: 2, al_dia: 3, adelantado: 4, pagado: 5 };
      return (order[a.displayStatus] ?? 9) - (order[b.displayStatus] ?? 9);
    });
  }, [receivables]);

  // Stats
  const stats = useMemo(() => {
    const s = { adelantado: 0, al_dia: 0, por_vencer: 0, vencido: 0, en_mora: 0, pagado: 0, totalMes: 0, totalCobrado: 0, totalPendiente: 0 };
    enriched.forEach(r => {
      s[r.displayStatus]++;
      s.totalMes += r.amount;
      if (r.status === 'paid') s.totalCobrado += (r.total_cobrado ?? r.paid_amount ?? r.amount);
      else s.totalPendiente += r.amount;
    });
    return s;
  }, [enriched]);

  const pctCobrado = stats.totalMes > 0 ? Math.round((stats.totalCobrado / stats.totalMes) * 100) : 0;

  const handleConfirmPayment = (data: {
    id: string; paidAmount: number; mora_automatica: number; mora_negociada: number;
    descuento: number; total_cobrado: number; payment_method: string; reference_number?: string;
  }) => {
    markPaidMut.mutate(data, { onSuccess: () => setDialogOpen(false) });
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Month nav */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={prevMonth}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-semibold min-w-[140px] text-center capitalize">{monthLabel}</span>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={nextMonth}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          {enriched.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden min-w-[120px] max-w-[200px]">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${pctCobrado}%` }}
                />
              </div>
              <span className="text-sm font-bold text-foreground tabular-nums">{pctCobrado}%</span>
              <span className="text-xs text-muted-foreground">cobrado</span>
            </div>
          )}
        </div>

        {/* Stats cards */}
        {enriched.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {([
              { key: 'adelantado' as const, icon: Zap, bg: 'bg-blue-500/5 border-blue-200 dark:border-blue-800' },
              { key: 'al_dia' as const, icon: CheckCircle2, bg: 'bg-emerald-500/5 border-emerald-200 dark:border-emerald-800' },
              { key: 'por_vencer' as const, icon: Clock, bg: 'bg-amber-500/5 border-amber-200 dark:border-amber-800' },
              { key: 'vencido' as const, icon: AlertTriangle, bg: 'bg-orange-500/5 border-orange-200 dark:border-orange-800' },
              { key: 'en_mora' as const, icon: AlertTriangle, bg: 'bg-destructive/5 border-destructive/20' },
              { key: 'pagado' as const, icon: CheckCircle2, bg: 'bg-emerald-500/5 border-emerald-200 dark:border-emerald-800' },
            ]).map(({ key, icon: Icon, bg }) => {
              const cfg = STATUS_CONFIG[key];
              return (
                <Tooltip key={key}>
                  <TooltipTrigger asChild>
                    <div className={`rounded-xl border p-3 text-center transition-all hover:shadow-sm ${bg}`}>
                      <Icon className={`w-5 h-5 mx-auto mb-1 ${cfg.color.split(' ')[1]}`} />
                      <p className="text-lg font-bold text-foreground tabular-nums">{stats[key]}</p>
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{cfg.label}</p>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{cfg.label}: {stats[key]} inquilino{stats[key] !== 1 ? 's' : ''}</p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        )}

        {/* Financial summary */}
        {enriched.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total del mes</p>
              <p className="text-xl font-bold text-foreground mt-1 tabular-nums">{fmtGs(stats.totalMes)}</p>
            </div>
            <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-500/5 p-4">
              <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Cobrado</p>
              <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400 mt-1 tabular-nums">{fmtGs(stats.totalCobrado)}</p>
            </div>
            <div className="rounded-xl border border-orange-200 dark:border-orange-800 bg-orange-500/5 p-4">
              <p className="text-xs font-medium text-orange-700 dark:text-orange-400 uppercase tracking-wider">Pendiente</p>
              <p className="text-xl font-bold text-orange-700 dark:text-orange-400 mt-1 tabular-nums">{fmtGs(stats.totalPendiente)}</p>
            </div>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        )}

        {/* Empty */}
        {!isLoading && enriched.length === 0 && (
          <div className="text-center py-16">
            <ClipboardList className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Sin cobros para este período</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Los cobros se generan automáticamente desde contratos activos</p>
          </div>
        )}

        {/* Table */}
        {!isLoading && enriched.length > 0 && (
          <div className="rounded-xl border border-border bg-card">
            <DualScrollArea>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="font-semibold w-[80px]">Unidad</TableHead>
                    <TableHead className="font-semibold">Inquilino</TableHead>
                    <TableHead className="font-semibold text-right">Monto</TableHead>
                    <TableHead className="font-semibold text-center">Vencimiento</TableHead>
                    <TableHead className="font-semibold text-center">Estado</TableHead>
                    <TableHead className="font-semibold text-center w-[70px]">Días</TableHead>
                    <TableHead className="font-semibold text-center w-[100px]">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {enriched.map(r => {
                    const cfg = STATUS_CONFIG[r.displayStatus];
                    const Icon = cfg.icon;
                    const phone = r.client_phone || '';
                    const cleanPhone = phone.replace(/\D/g, '');

                    return (
                      <TableRow key={r.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="font-mono font-semibold text-primary text-sm">
                          <div className="flex flex-col gap-1">
                            <span>{r.unit_code || '—'}</span>
                            {r.property_code && (
                              <Badge variant="outline" className="w-fit text-[9px] px-1.5 py-0 font-mono text-muted-foreground border-border bg-muted/40">
                                {r.property_code}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm font-medium text-foreground">{r.debtor_name || '—'}</p>
                          {r.concept !== 'alquiler' && (
                            <Badge variant="outline" className="mt-1 text-[10px] bg-primary/5 text-primary border-primary/20">
                              {conceptLabels[r.concept] || r.concept}
                            </Badge>
                          )}
                          {r.description?.includes('prorrateo') && (
                            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">📐 Prorrateo</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-sm font-semibold tabular-nums">{fmtGs(r.amount)}</TableCell>
                        <TableCell className="text-center text-sm text-muted-foreground">
                          {new Date(r.due_date).toLocaleDateString('es-PY', { day: '2-digit', month: 'short' })}
                        </TableCell>
                        <TableCell className="text-center">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold border ${cfg.color} ${cfg.pulse ? 'animate-pulse' : ''}`}>
                                <Icon className="w-3 h-3" />
                                {cfg.label}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              {r.displayStatus === 'en_mora' && 'Más de 15 días sin pagar'}
                              {r.displayStatus === 'vencido' && 'Pasó la fecha de vencimiento'}
                              {r.displayStatus === 'por_vencer' && 'Vence en los próximos 5 días'}
                              {r.displayStatus === 'al_dia' && 'Pendiente, dentro del plazo'}
                              {r.displayStatus === 'adelantado' && 'Pagó antes de la fecha'}
                              {r.displayStatus === 'pagado' && 'Pago registrado'}
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`text-sm tabular-nums ${r.daysInfo.color}`}>
                            {r.daysInfo.label}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            {r.status !== 'paid' && cleanPhone && (
                              <a
                                href={`https://wa.me/${cleanPhone}?text=${buildWhatsAppMsg(r)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition-colors"
                                title="WhatsApp"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                              </a>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-primary hover:text-primary hover:bg-primary/10"
                              title={r.status !== 'paid' ? 'Registrar pago' : 'Ver detalle'}
                              onClick={() => { setSelectedReceivable(r); setDialogOpen(true); }}
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </DualScrollArea>
          </div>
        )}

        {/* Payment dialog */}
        <ReceivableDetailDialog
          receivable={selectedReceivable as any}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onConfirmPayment={handleConfirmPayment}
          isPending={markPaidMut.isPending}
          readOnly={selectedReceivable?.status === 'paid'}
        />
      </div>
    </TooltipProvider>
  );
};
