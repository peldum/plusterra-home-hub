import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useBuildingDetail } from '@/hooks/useBuildingDetail';
import { useBuildingLiquidation } from '@/hooks/useBuildingLiquidation';
import { exportUnitLiquidationPDF, exportBuildingSummaryCSV } from '@/lib/buildingExport';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  ArrowLeft, Building2, Layers, Users, Loader2, MapPin,
  ChevronLeft, ChevronRight, Download, FileSpreadsheet, FileText,
  TrendingUp, TrendingDown, DollarSign, Percent, ReceiptText,
} from 'lucide-react';
import { format, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

const formatCurrency = (amount: number, currency: string = 'PYG') => {
  if (currency === 'USD') return `US$ ${amount.toLocaleString('es-PY', { minimumFractionDigits: 2 })}`;
  return `₲ ${amount.toLocaleString('es-PY')}`;
};

const BuildingDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { building, buildingLoading, units, unitsLoading } = useBuildingDetail(id);

  // Liquidation month
  const [monthDate, setMonthDate] = useState(new Date());
  const month = format(monthDate, 'yyyy-MM');
  const monthLabel = format(monthDate, 'MMMM yyyy', { locale: es });

  const { data: liquidation, isLoading: liqLoading } = useBuildingLiquidation(id, units, month);
  const liquidationLines = liquidation ?? [];

  const prevMonth = () => setMonthDate(prev => subMonths(prev, 1));
  const nextMonth = () => {
    setMonthDate(prev => {
      const next = new Date(prev);
      next.setMonth(next.getMonth() + 1);
      return next > new Date() ? prev : next;
    });
  };

  // Totals
  const totals = useMemo(() => {
    const t = { rental: 0, admin: 0, income: 0, expense: 0, maintenance: 0, net: 0 };
    liquidationLines.forEach(l => {
      t.rental += l.rental_price;
      t.admin += l.admin_fee_amount;
      t.income += l.income_total;
      t.expense += l.expense_total;
      t.maintenance += l.maintenance_total;
      t.net += l.net_balance;
    });
    return t;
  }, [liquidationLines]);

  if (buildingLoading) {
    return (
      <MainLayout title="Edificio">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!building) {
    return (
      <MainLayout title="Edificio no encontrado">
        <div className="text-center py-16">
          <p className="text-muted-foreground mb-4">El edificio solicitado no existe.</p>
          <button onClick={() => navigate('/edificios')} className="text-primary hover:underline text-sm">
            Volver a Edificios
          </button>
        </div>
      </MainLayout>
    );
  }

  const handleExportPDF = async (line: typeof liquidationLines[0]) => {
    try {
      await exportUnitLiquidationPDF(building.name, line, month);
      toast.success(`PDF generado para ${line.unit_code}`);
    } catch {
      toast.error('Error al generar PDF');
    }
  };

  const handleExportCSV = () => {
    try {
      exportBuildingSummaryCSV(building.name, liquidationLines, month);
      toast.success('Excel/CSV descargado');
    } catch {
      toast.error('Error al exportar');
    }
  };

  return (
    <MainLayout title="">
      {/* Header */}
      <div className="mb-6">
        <button onClick={() => navigate('/edificios')} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" />
          Volver a Edificios
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-7 h-7 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-foreground">{building.name}</h1>
            <div className="flex flex-wrap items-center gap-3 mt-1">
              {building.address && (
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {building.address}{building.city ? `, ${building.city}` : ''}
                </span>
              )}
              {building.total_units && (
                <Badge variant="secondary" className="text-xs">
                  <Layers className="w-3 h-3 mr-1" />
                  {building.total_units} unidades
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="units" className="w-full">
        <TabsList className="w-full justify-start bg-muted/50 mb-4">
          <TabsTrigger value="units" className="gap-1.5">
            <Layers className="w-3.5 h-3.5" />
            Unidades
            <Badge variant="secondary" className="ml-1 text-[10px] px-1.5">{units.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="liquidation" className="gap-1.5">
            <ReceiptText className="w-3.5 h-3.5" />
            Liquidación Mensual
          </TabsTrigger>
        </TabsList>

        {/* ── Tab: Unidades ── */}
        <TabsContent value="units">
          {unitsLoading && <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>}
          {!unitsLoading && units.length === 0 && (
            <div className="text-center py-12">
              <Layers className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">Sin unidades registradas</p>
            </div>
          )}
          {!unitsLoading && units.length > 0 && (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="font-semibold">Unidad</TableHead>
                    <TableHead className="font-semibold">Piso</TableHead>
                    <TableHead className="font-semibold">Propietario(s)</TableHead>
                    <TableHead className="font-semibold">Propiedad</TableHead>
                    <TableHead className="font-semibold">Estado</TableHead>
                    <TableHead className="font-semibold text-right">Alquiler</TableHead>
                    <TableHead className="font-semibold text-right">Admin %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {units.map(unit => {
                    const statusLabel: Record<string, string> = {
                      available: 'Disponible', rented: 'Alquilado', sold: 'Vendido',
                      reserved: 'Reservado', draft: 'Borrador', archived: 'Archivado',
                    };
                    return (
                      <TableRow key={unit.id} className="hover:bg-muted/30">
                        <TableCell className="font-mono font-semibold text-primary text-sm">{unit.unit_code}</TableCell>
                        <TableCell className="text-sm">{unit.floor ?? '-'}</TableCell>
                        <TableCell>
                          {unit.owners.length === 0 ? (
                            <span className="text-xs text-muted-foreground italic">Sin propietario</span>
                          ) : (
                            <div className="space-y-0.5">
                              {unit.owners.map(o => (
                                <div key={o.id} className="flex items-center gap-1.5">
                                  <Users className="w-3 h-3 text-primary/60 flex-shrink-0" />
                                  <span className="text-sm">{o.full_name}</span>
                                  {o.ownership_percentage && o.ownership_percentage < 100 && (
                                    <Badge variant="outline" className="text-[9px] px-1">{o.ownership_percentage}%</Badge>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {unit.property ? (
                            <span className="text-xs font-mono text-muted-foreground">{unit.property.property_code}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {unit.property ? (
                            <Badge variant={unit.property.status === 'rented' ? 'secondary' : 'outline'} className="text-[10px]">
                              {statusLabel[unit.property.status] || unit.property.status}
                            </Badge>
                          ) : '—'}
                        </TableCell>
                        <TableCell className="text-right text-sm font-medium">
                          {unit.property?.rental_price
                            ? formatCurrency(unit.property.rental_price, unit.property.currency || 'PYG')
                            : '—'}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {unit.property?.management_fee_pct != null ? `${unit.property.management_fee_pct}%` : '—'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* ── Tab: Liquidación Mensual ── */}
        <TabsContent value="liquidation">
          {/* Month navigation + export buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={prevMonth}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm font-semibold min-w-[140px] text-center capitalize">
                {monthLabel}
              </span>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={nextMonth}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleExportCSV} disabled={liquidationLines.length === 0}>
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Excel Resumen
              </Button>
            </div>
          </div>

          {/* Summary cards */}
          {!liqLoading && liquidationLines.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div className="bg-card border border-border rounded-lg p-3">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Ingresos Totales</p>
                <p className="text-lg font-bold text-foreground flex items-center gap-1">
                  <TrendingUp className="w-4 h-4 text-success" />
                  {formatCurrency(totals.income)}
                </p>
              </div>
              <div className="bg-card border border-border rounded-lg p-3">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Administración</p>
                <p className="text-lg font-bold text-foreground flex items-center gap-1">
                  <Percent className="w-4 h-4 text-secondary" />
                  {formatCurrency(totals.admin)}
                </p>
              </div>
              <div className="bg-card border border-border rounded-lg p-3">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Gastos + Mant.</p>
                <p className="text-lg font-bold text-foreground flex items-center gap-1">
                  <TrendingDown className="w-4 h-4 text-destructive" />
                  {formatCurrency(totals.expense + totals.maintenance)}
                </p>
              </div>
              <div className="bg-card border border-border rounded-lg p-3">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Neto Propietarios</p>
                <p className={`text-lg font-bold flex items-center gap-1 ${totals.net >= 0 ? 'text-success' : 'text-destructive'}`}>
                  <DollarSign className="w-4 h-4" />
                  {formatCurrency(totals.net)}
                </p>
              </div>
            </div>
          )}

          {/* Liquidation table */}
          {liqLoading && <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>}
          {!liqLoading && liquidationLines.length === 0 && (
            <div className="text-center py-12">
              <ReceiptText className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">Sin datos de liquidación para este período</p>
              <p className="text-xs text-muted-foreground mt-1">Verificá que las unidades tengan propiedades vinculadas con pagos registrados.</p>
            </div>
          )}
          {!liqLoading && liquidationLines.length > 0 && (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="font-semibold">Unidad</TableHead>
                    <TableHead className="font-semibold">Propietario</TableHead>
                    <TableHead className="font-semibold text-right">Alquiler</TableHead>
                    <TableHead className="font-semibold text-right">Admin</TableHead>
                    <TableHead className="font-semibold text-right">Ingresos</TableHead>
                    <TableHead className="font-semibold text-right">Gastos</TableHead>
                    <TableHead className="font-semibold text-right">Mant.</TableHead>
                    <TableHead className="font-semibold text-right">Neto</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {liquidationLines.map(line => (
                    <TableRow key={line.unit_id} className="hover:bg-muted/30">
                      <TableCell className="font-mono font-semibold text-primary text-sm">{line.unit_code}</TableCell>
                      <TableCell className="text-sm max-w-[150px] truncate">{line.owner_name}</TableCell>
                      <TableCell className="text-right text-sm">{formatCurrency(line.rental_price, line.currency)}</TableCell>
                      <TableCell className="text-right text-sm text-secondary font-medium">
                        {formatCurrency(line.admin_fee_amount, line.currency)}
                        <span className="text-[10px] text-muted-foreground ml-1">({line.admin_fee_pct}%)</span>
                      </TableCell>
                      <TableCell className="text-right text-sm text-success font-medium">{formatCurrency(line.income_total, line.currency)}</TableCell>
                      <TableCell className="text-right text-sm text-destructive">{line.expense_total > 0 ? formatCurrency(line.expense_total, line.currency) : '—'}</TableCell>
                      <TableCell className="text-right text-sm text-destructive">{line.maintenance_total > 0 ? formatCurrency(line.maintenance_total, line.currency) : '—'}</TableCell>
                      <TableCell className={`text-right text-sm font-bold ${line.net_balance >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {formatCurrency(line.net_balance, line.currency)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title="Descargar PDF individual"
                          onClick={() => handleExportPDF(line)}
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Totals row */}
                  <TableRow className="bg-muted/50 font-bold border-t-2">
                    <TableCell className="text-sm">TOTALES</TableCell>
                    <TableCell></TableCell>
                    <TableCell className="text-right text-sm">{formatCurrency(totals.rental)}</TableCell>
                    <TableCell className="text-right text-sm text-secondary">{formatCurrency(totals.admin)}</TableCell>
                    <TableCell className="text-right text-sm text-success">{formatCurrency(totals.income)}</TableCell>
                    <TableCell className="text-right text-sm text-destructive">{totals.expense > 0 ? formatCurrency(totals.expense) : '—'}</TableCell>
                    <TableCell className="text-right text-sm text-destructive">{totals.maintenance > 0 ? formatCurrency(totals.maintenance) : '—'}</TableCell>
                    <TableCell className={`text-right text-sm font-bold ${totals.net >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {formatCurrency(totals.net)}
                    </TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
};

export default BuildingDetailPage;
