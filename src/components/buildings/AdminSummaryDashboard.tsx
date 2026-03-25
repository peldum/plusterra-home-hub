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
  TrendingUp, TrendingDown, Percent, Building2,
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

  // Fetch receivables for the period
  const { data: receivables, isLoading: recvLoading } = useQuery({
    queryKey: ['admin-summary-receivables', period],
    queryFn: async () => {
      const start = `${period}-01`;
      const [y, m] = period.split('-').map(Number);
      const end = new Date(y, m, 0).toISOString().split('T')[0];
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

  // Fetch payments (expenses) for the period
  const { data: expenses, isLoading: expLoading } = useQuery({
    queryKey: ['admin-summary-expenses', period],
    queryFn: async () => {
      const start = `${period}-01`;
      const [y, m] = period.split('-').map(Number);
      const end = new Date(y, m, 0).toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('payments')
        .select('amount, category, description, currency, payment_date')
        .eq('payment_type', 'expense')
        .gte('payment_date', start)
        .lte('payment_date', end);
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

  const summary = useMemo(() => {
    if (!receivables || !buildings) return null;

    const buildingMap = new Map(buildings.map(b => [b.id, b]));
    let totalRent = 0;
    let totalCollected = 0;
    let totalAdmin = 0;
    let totalPlusterra = 0;
    let totalGlosker = 0;
    let paidCount = 0;
    let pendingCount = 0;

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
    }>();

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

      if (r.status === 'paid') {
        paidCount++;
        const adminAmount = Math.round(collected * adminPct / 100);
        const plustarraAmount = Math.round(collected * internalPct / 100);
        const gloskerAmount = Math.round(collected * externalPct / 100);
        totalAdmin += adminAmount;
        totalPlusterra += plustarraAmount;
        totalGlosker += gloskerAmount;

        if (!byBuilding.has(bId)) {
          byBuilding.set(bId, { name: bName, rent: 0, collected: 0, admin: 0, plusterra: 0, glosker: 0, paid: 0, pending: 0 });
        }
        const entry = byBuilding.get(bId)!;
        entry.rent += amount;
        entry.collected += collected;
        entry.admin += adminAmount;
        entry.plusterra += plustarraAmount;
        entry.glosker += gloskerAmount;
        entry.paid++;
      } else {
        pendingCount++;
        if (!byBuilding.has(bId)) {
          byBuilding.set(bId, { name: bName, rent: 0, collected: 0, admin: 0, plusterra: 0, glosker: 0, paid: 0, pending: 0 });
        }
        byBuilding.get(bId)!.rent += amount;
        byBuilding.get(bId)!.pending++;
      }
    });

    const totalExpenses = (expenses || []).reduce((s, e) => s + Number(e.amount), 0);

    // Group expenses by category
    const expenseByCategory = new Map<string, number>();
    (expenses || []).forEach((e: any) => {
      const cat = e.category || 'otro';
      expenseByCategory.set(cat, (expenseByCategory.get(cat) || 0) + Number(e.amount));
    });

    return {
      totalRent,
      totalCollected,
      totalAdmin,
      totalPlusterra,
      totalGlosker,
      totalExpenses,
      netProfit: totalAdmin - totalExpenses,
      paidCount,
      pendingCount,
      collectionRate: totalRent > 0 ? Math.round((totalCollected / totalRent) * 100) : 0,
      byBuilding: Array.from(byBuilding.values()).sort((a, b) => b.collected - a.collected),
      expenseByCategory: Array.from(expenseByCategory.entries()).sort((a, b) => b[1] - a[1]),
    };
  }, [receivables, buildings, expenses]);

  const isLoading = recvLoading || expLoading;

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
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Card className="border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20 dark:border-emerald-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs text-muted-foreground">Cobrado</span>
                </div>
                <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{fmtGs(summary.totalCollected)}</p>
                <p className="text-[10px] text-muted-foreground">{summary.paidCount} pagos — {summary.collectionRate}% cobrado</p>
              </CardContent>
            </Card>

            <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Percent className="w-4 h-4 text-blue-600" />
                  <span className="text-xs text-muted-foreground">Comisión Admin (8%)</span>
                </div>
                <p className="text-lg font-bold text-blue-700 dark:text-blue-400">{fmtGs(summary.totalAdmin)}</p>
                <div className="flex gap-2 mt-1">
                  <Badge variant="outline" className="text-[9px] bg-blue-100/50 text-blue-700 border-blue-300">
                    Plusterra 5%: {fmtGs(summary.totalPlusterra)}
                  </Badge>
                  <Badge variant="outline" className="text-[9px] bg-purple-100/50 text-purple-700 border-purple-300">
                    Glosker 3%: {fmtGs(summary.totalGlosker)}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="border-rose-200 bg-rose-50/50 dark:bg-rose-950/20 dark:border-rose-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingDown className="w-4 h-4 text-rose-600" />
                  <span className="text-xs text-muted-foreground">Gastos del Mes</span>
                </div>
                <p className="text-lg font-bold text-rose-700 dark:text-rose-400">{fmtGs(summary.totalExpenses)}</p>
              </CardContent>
            </Card>

            <Card className={`border-${summary.netProfit >= 0 ? 'emerald' : 'rose'}-200`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-foreground" />
                  <span className="text-xs text-muted-foreground">Ganancia Neta</span>
                </div>
                <p className={`text-lg font-bold ${summary.netProfit >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                  {fmtGs(summary.netProfit)}
                </p>
                <p className="text-[10px] text-muted-foreground">Comisión − Gastos</p>
              </CardContent>
            </Card>
          </div>

          {/* Pending alert */}
          {summary.pendingCount > 0 && (
            <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
              <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 text-xs">
                {summary.pendingCount} pendientes
              </Badge>
              <span className="text-sm text-amber-700 dark:text-amber-400">
                Faltan cobrar {fmtGs(summary.totalRent - summary.totalCollected)}
              </span>
            </div>
          )}

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
                        <TableHead className="text-xs text-right">Comisión 8%</TableHead>
                        <TableHead className="text-xs text-right">Plusterra 5%</TableHead>
                        <TableHead className="text-xs text-right">Glosker 3%</TableHead>
                        <TableHead className="text-xs text-center">Pagados</TableHead>
                        <TableHead className="text-xs text-center">Pendientes</TableHead>
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
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Expense breakdown */}
          {summary.expenseByCategory.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-rose-500" />
                  ¿En qué se gastó?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {summary.expenseByCategory.map(([cat, amount]) => (
                    <div key={cat} className="flex items-center justify-between">
                      <span className="text-sm capitalize">{cat.replace(/_/g, ' ')}</span>
                      <span className="text-sm font-mono font-medium text-rose-600">{fmtGs(amount)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};
