import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  ChevronLeft, ChevronRight, Loader2, DollarSign,
  TrendingUp, Percent, Building2, Wrench, ReceiptText,
} from 'lucide-react';
import { format, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';

const fmtGs = (n: number) => '₲ ' + Math.round(n).toLocaleString('es-PY');

export const AdminSummaryDashboard = () => {
  const [monthDate, setMonthDate] = useState(new Date());
  const period = format(monthDate, 'yyyy-MM');
  const monthLabel = format(monthDate, 'MMMM yyyy', { locale: es });

  const prevMonth = () => setMonthDate(prev => subMonths(prev, 1));
  const nextMonth = () => {
    setMonthDate(prev => {
      const next = new Date(prev);
      next.setMonth(next.getMonth() + 1);
      return next > new Date() ? prev : next;
    });
  };

  const start = `${period}-01`;
  const [y, m] = period.split('-').map(Number);
  const end = new Date(y, m, 0).toISOString().split('T')[0];

  // Fetch receivables for the period
  const { data: receivables, isLoading: recvLoading } = useQuery({
    queryKey: ['admin-summary-receivables', period],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('receivables')
        .select('*, buildings:building_id(name)')
        .eq('concept', 'alquiler')
        .gte('due_date', start)
        .lte('due_date', end);
      if (error) throw error;
      return (data || []).map((r: any) => ({
        ...r,
        building_name: r.buildings?.name || 'Sin edificio',
      }));
    },
  });

  // Fetch maintenance tickets (costs charged to owners)
  const { data: maintenanceTickets, isLoading: maintLoading } = useQuery({
    queryKey: ['admin-summary-maintenance', period],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('maintenance_tickets')
        .select('id, actual_cost, estimated_cost, property_id, description, status')
        .eq('status', 'completed')
        .gte('completed_date', start)
        .lte('completed_date', end);
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch buildings for context
  const { data: buildings } = useQuery({
    queryKey: ['admin-summary-buildings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('buildings')
        .select('id, name, admin_fee_total_pct, admin_fee_internal_pct, admin_fee_external_pct');
      if (error) throw error;
      return data || [];
    },
    staleTime: 60_000,
  });

  // Fetch units count for the managed buildings
  const { data: unitsCount } = useQuery({
    queryKey: ['admin-summary-units-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('units')
        .select('id', { count: 'exact', head: true });
      if (error) throw error;
      return count || 0;
    },
    staleTime: 60_000,
  });

  const { data: adminExpenses, isLoading: expensesLoading } = useQuery({
    queryKey: ['admin-summary-expenses', period],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('payments')
        .select('amount')
        .eq('payment_type', 'expense')
        .eq('business_unit', 'administracion')
        .gte('payment_date', start)
        .lte('payment_date', end);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: collectionRecords, isLoading: collectionLoading } = useQuery({
    queryKey: ['admin-summary-iva-records', period],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('unit_collection_records')
        .select('iva_check, iva_amount')
        .eq('period', period);
      if (error) throw error;
      return data || [];
    },
  });

  const summary = useMemo(() => {
    if (!receivables || !buildings) return null;

    const today = new Date().toISOString().split('T')[0];
    const buildingMap = new Map(buildings.map(b => [b.id, b]));
    let totalRent = 0;
    let totalCollected = 0;
    let totalAdmin = 0;
    let totalPlusterra = 0;
    let totalGlosker = 0;
    const totalIvaRecuperado = (collectionRecords || [])
      .filter((r: any) => r.iva_check)
      .reduce((s: number, r: any) => s + Number(r.iva_amount || 0), 0);
    let paidCount = 0;
    let pendingCount = 0;
    let overdueCount = 0; // units in mora

    // Per-building breakdown
    const byBuilding = new Map<string, {
      name: string;
      rent: number;
      collected: number;
      admin: number;
      plusterra: number;
      glosker: number;
      paid: number;
      pending: number;
      overdue: number;
      maintenance: number;
    }>();

    const totalCount = receivables.length;

    receivables.forEach((r: any) => {
      const bId = r.building_id || '__none';
      const bName = r.building_name || 'Otros';
      const bConfig = buildingMap.get(bId);
      const adminPct = bConfig?.admin_fee_total_pct ?? 8;
      const internalPct = bConfig?.admin_fee_internal_pct ?? 5;
      const externalPct = bConfig?.admin_fee_external_pct ?? 3;

      const amount = Number(r.amount) || 0;
      const collected = r.status === 'paid' ? (Number(r.total_cobrado) || Number(r.paid_amount) || amount) : 0;

      totalRent += amount;
      totalCollected += collected;

      if (!byBuilding.has(bId)) {
        byBuilding.set(bId, { name: bName, rent: 0, collected: 0, admin: 0, plusterra: 0, glosker: 0, paid: 0, pending: 0, overdue: 0, maintenance: 0 });
      }
      const entry = byBuilding.get(bId)!;
      entry.rent += amount;

      if (r.status === 'paid') {
        paidCount++;
        const adminAmount = Math.round(collected * adminPct / 100);
        const plustarraAmount = Math.round(collected * internalPct / 100);
        const gloskerAmount = Math.round(collected * externalPct / 100);
        totalAdmin += adminAmount;
        totalPlusterra += plustarraAmount;
        totalGlosker += gloskerAmount;

        entry.collected += collected;
        entry.admin += adminAmount;
        entry.plusterra += plustarraAmount;
        entry.glosker += gloskerAmount;
        entry.paid++;
      } else {
        pendingCount++;
        entry.pending++;
        // Check if overdue (due_date < today and not paid)
        if (r.due_date && r.due_date < today) {
          overdueCount++;
          entry.overdue++;
        }
      }
    });

    // Maintenance costs (charged to owners, not Plusterra expenses)
    let totalMaintenance = 0;
    (maintenanceTickets || []).forEach((t: any) => {
      const cost = Number(t.actual_cost) || Number(t.estimated_cost) || 0;
      totalMaintenance += cost;
    });

    const collectionRate = totalRent > 0 ? Math.round((totalCollected / totalRent) * 100) : 0;

    const egresosAdministracion = (adminExpenses || []).reduce((s: number, p: any) => s + Number(p.amount || 0), 0);

    return {
      totalRent,
      totalCollected,
      totalAdmin,
      totalPlusterra,
      totalGlosker,
      totalIvaRecuperado,
      egresosAdministracion,
      resultadoAdministracion: totalPlusterra + totalIvaRecuperado - egresosAdministracion,
      totalMaintenance,
      paidCount,
      pendingCount,
      totalCount,
      overdueCount,
      collectionRate,
      byBuilding: Array.from(byBuilding.values()).sort((a, b) => b.collected - a.collected),
    };
  }, [receivables, buildings, maintenanceTickets, adminExpenses, collectionRecords]);

  const isLoading = recvLoading || maintLoading || expensesLoading || collectionLoading;

  return (
    <div className="space-y-6">
      {/* Month navigator */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={prevMonth}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="text-sm font-semibold min-w-[140px] text-center capitalize">{monthLabel}</span>
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={nextMonth}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      )}

      {!isLoading && summary && (
        <>
          {/* Resultado financiero de Administración */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {/* 1. Cobrado */}
            <Card className="border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20 dark:border-emerald-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs text-muted-foreground">Alquiler cobrado</span>
                </div>
                <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{fmtGs(summary.totalCollected)}</p>
                <p className="text-[10px] text-muted-foreground">
                  Fondos de terceros · {summary.collectionRate}% cobrado
                </p>
              </CardContent>
            </Card>

            {/* 2. Comisión Admin */}
            <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Percent className="w-4 h-4 text-blue-600" />
                  <span className="text-xs text-muted-foreground">Comisión Administración</span>
                </div>
                <p className="text-lg font-bold text-blue-700 dark:text-blue-400">{fmtGs(summary.totalAdmin)}</p>
                <div className="flex gap-2 mt-1 flex-wrap">
                  <Badge variant="outline" className="text-[9px] bg-blue-100/50 text-blue-700 border-blue-300">
                    Plusterra: {fmtGs(summary.totalPlusterra)}
                  </Badge>
                  {summary.totalGlosker > 0 && (
                    <Badge variant="outline" className="text-[9px] bg-purple-100/50 text-purple-700 border-purple-300">
                      Externo: {fmtGs(summary.totalGlosker)}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-cyan-200 bg-cyan-50/50 dark:bg-cyan-950/20 dark:border-cyan-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <ReceiptText className="w-4 h-4 text-cyan-600" />
                  <span className="text-xs text-muted-foreground">IVA recuperado</span>
                </div>
                <p className="text-lg font-bold text-cyan-700 dark:text-cyan-400">{fmtGs(summary.totalIvaRecuperado)}</p>
                <p className="text-[10px] text-muted-foreground">Solo unidades marcadas con IVA</p>
              </CardContent>
            </Card>

            {/* 4. Gastos Mantenimiento (a propietarios) */}
            <Card className="border-rose-200 bg-rose-50/50 dark:bg-rose-950/20 dark:border-rose-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Wrench className="w-4 h-4 text-rose-600" />
                  <span className="text-xs text-muted-foreground">Egresos Admin</span>
                </div>
                <p className="text-lg font-bold text-rose-700 dark:text-rose-400">{fmtGs(summary.egresosAdministracion)}</p>
                <p className="text-[10px] text-muted-foreground">Gastos propios de administración</p>
              </CardContent>
            </Card>

            <Card className={summary.resultadoAdministracion >= 0 ? 'border-emerald-200' : 'border-rose-200'}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-foreground" />
                  <span className="text-xs text-muted-foreground">Resultado Admin</span>
                </div>
                <p className={`text-lg font-bold ${summary.resultadoAdministracion >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                  {fmtGs(summary.resultadoAdministracion)}
                </p>
                <p className="text-[10px] text-muted-foreground">Comisión + IVA - egresos</p>
              </CardContent>
            </Card>
          </div>

          {/* Pending + Managed units info */}
          <div className="flex flex-wrap items-center gap-3">
            {summary.pendingCount > 0 && (
              <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 flex-1 min-w-[250px]">
                <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 text-xs">
                  {summary.pendingCount} pendientes
                </Badge>
                <span className="text-sm text-amber-700 dark:text-amber-400">
                  Faltan cobrar {fmtGs(summary.totalRent - summary.totalCollected)}
                </span>
              </div>
            )}
            {unitsCount != null && (
              <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <Building2 className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-blue-700 dark:text-blue-400 font-medium">
                  {unitsCount} unidades en administración
                </span>
              </div>
            )}
          </div>

          {/* Per-building table */}
          {summary.byBuilding.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Desglose por Propiedad
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead className="text-xs">Propiedad</TableHead>
                        <TableHead className="text-xs text-right">Cobrado</TableHead>
                        <TableHead className="text-xs text-right">Comisión config.</TableHead>
                        <TableHead className="text-xs text-right">Parte Plusterra</TableHead>
                        <TableHead className="text-xs text-right">Parte externa</TableHead>
                        <TableHead className="text-xs text-center">Pagados</TableHead>
                        <TableHead className="text-xs text-center">Pendientes</TableHead>
                        <TableHead className="text-xs text-center">En Mora</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {summary.byBuilding.map((b, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-sm font-medium">{b.name}</TableCell>
                          <TableCell className="text-sm text-right font-mono">{fmtGs(b.collected)}</TableCell>
                          <TableCell className="text-sm text-right font-mono">{fmtGs(b.admin)}</TableCell>
                          <TableCell className="text-sm text-right font-mono text-blue-600">{fmtGs(b.plusterra)}</TableCell>
                          <TableCell className="text-sm text-right font-mono text-purple-600">{fmtGs(b.glosker)}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="text-[10px] bg-emerald-500/15 text-emerald-700 border-emerald-300">{b.paid}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {b.pending > 0 ? (
                              <Badge variant="outline" className="text-[10px] bg-amber-500/15 text-amber-700 border-amber-300">{b.pending}</Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] bg-emerald-500/15 text-emerald-700 border-emerald-300">0</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {b.overdue > 0 ? (
                              <Badge variant="outline" className="text-[10px] bg-rose-500/15 text-rose-700 border-rose-300">{b.overdue}</Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] bg-emerald-500/15 text-emerald-700 border-emerald-300">0</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      {/* Totals row */}
                      <TableRow className="bg-muted/50 font-bold">
                        <TableCell className="text-sm">TOTAL</TableCell>
                        <TableCell className="text-sm text-right font-mono">{fmtGs(summary.totalCollected)}</TableCell>
                        <TableCell className="text-sm text-right font-mono">{fmtGs(summary.totalAdmin)}</TableCell>
                        <TableCell className="text-sm text-right font-mono text-blue-600">{fmtGs(summary.totalPlusterra)}</TableCell>
                        <TableCell className="text-sm text-right font-mono text-purple-600">{fmtGs(summary.totalGlosker)}</TableCell>
                        <TableCell className="text-center text-sm">{summary.paidCount}</TableCell>
                        <TableCell className="text-center text-sm">{summary.pendingCount}</TableCell>
                        <TableCell className="text-center text-sm">
                          {summary.overdueCount > 0 ? (
                            <Badge variant="outline" className="text-[10px] bg-rose-500/15 text-rose-700 border-rose-300">{summary.overdueCount}</Badge>
                          ) : '0'}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};
