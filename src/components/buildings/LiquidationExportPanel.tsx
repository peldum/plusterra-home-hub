/**
 * LiquidationExportPanel — Panel de exportación contextual para liquidaciones de edificios.
 * Muestra botones de PDF y Excel adaptados al modelo de administración.
 */
import { Building2, Users, FileSpreadsheet, FileText, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { exportBuildingLiquidationPDF } from '@/lib/buildingLiquidationPDF';
import type { CollectionCheckData } from '@/lib/buildingLiquidationPDF';
import { exportBuildingSummaryCSV, exportOwnerSummaryCSV } from '@/lib/buildingExport';
import type { LiquidationLine } from '@/hooks/useBuildingLiquidation';
import type { BuildingUnit } from '@/hooks/useBuildingDetail';
import { useState } from 'react';
import { useCollectionRecords } from '@/hooks/useCollectionRecords';

interface Props {
  building: any;
  filteredLines: LiquidationLine[];
  units: BuildingUnit[];
  month: string;
  selectedOwnerId: string | null;
  groupByOwner: boolean;
  ownerGroups: any[];
}

export const LiquidationExportPanel = ({
  building,
  filteredLines,
  units,
  month,
  selectedOwnerId,
  groupByOwner,
  ownerGroups,
}: Props) => {
  const [loadingPdf, setLoadingPdf] = useState<string | null>(null);
  const { records: collectionRecords } = useCollectionRecords(building?.id, month);
  const adminModel = building?.admin_model ?? 'modelo_2';
  const isThirdParty = adminModel === 'modelo_1';
  const externalCompany = building?.external_admin_company || 'Externa';
  const disabled = filteredLines.length === 0;

  const getSelectedOwnerName = () => {
    if (!selectedOwnerId) return null;
    return units.flatMap(u => u.owners).find(o => o.id === selectedOwnerId)?.full_name ?? null;
  };

  const buildCollectionChecks = (): CollectionCheckData[] => {
    const recordMap = new Map(collectionRecords.map(r => [r.unit_id, r]));
    return units.map(u => {
      const rec = recordMap.get(u.id);
      return {
        unit_id: u.id,
        unit_code: u.unit_code,
        owner_name: u.owners?.[0]?.full_name ?? 'Sin propietario',
        alquiler_check: rec?.alquiler_check ?? false,
        expensas_check: rec?.expensas_check ?? false,
        energia_check: rec?.energia_check ?? false,
        alquiler_amount: rec?.alquiler_amount ?? 0,
        expensas_amount: rec?.expensas_amount ?? 0,
        energia_amount: rec?.energia_amount ?? 0,
        mora_days: rec?.mora_days ?? 0,
        mora_amount: rec?.mora_amount ?? 0,
        observation: rec?.observation ?? '',
        destino_expensas: rec?.destino_expensas ?? '',
        fecha_pago_alquiler: rec?.fecha_pago_alquiler ?? '',
        fecha_pago_expensas: rec?.fecha_pago_expensas ?? '',
        iva_check: rec?.iva_check ?? false,
        iva_amount: rec?.iva_amount ?? 0,
      };
    });
  };

  const handlePDF = async (view: 'owner' | 'owner_individual' | 'internal' | 'external') => {
    setLoadingPdf(view);
    try {
      await exportBuildingLiquidationPDF({
        buildingName: building.name,
        lines: filteredLines,
        month,
        ownerName: getSelectedOwnerName(),
        view,
        collectionChecks: buildCollectionChecks(),
      });
      const labels: Record<string, string> = { owner: 'Consolidado Mensual', owner_individual: 'Reporte Propietario', internal: 'Plusterra', external: externalCompany };
      toast.success(`PDF ${labels[view]} generado correctamente`);
    } catch {
      toast.error('Error al generar PDF');
    } finally {
      setLoadingPdf(null);
    }
  };

  const handleCSV = () => {
    try {
      exportBuildingSummaryCSV(building.name, filteredLines, month);
      toast.success('Excel descargado');
    } catch {
      toast.error('Error al exportar');
    }
  };

  const handleOwnerCSV = () => {
    try {
      const groups = groupByOwner ? ownerGroups : (() => {
        const map = new Map<string, { owner_id: string; owner_name: string; lines: LiquidationLine[] }>();
        filteredLines.forEach(l => {
          const unit = units.find(u => u.id === l.unit_id);
          const ownerList = unit?.owners ?? [];
          const key = ownerList[0]?.id ?? '__no_owner';
          const name = ownerList[0]?.full_name ?? 'Sin propietario';
          if (!map.has(key)) map.set(key, { owner_id: key, owner_name: name, lines: [] });
          map.get(key)!.lines.push(l);
        });
        return Array.from(map.values()).map(g => ({
          ...g,
          rental: g.lines.reduce((s, l) => s + l.rental_price, 0),
          admin: g.lines.reduce((s, l) => s + l.admin_fee_amount, 0),
          income: g.lines.reduce((s, l) => s + l.income_total, 0),
          expense: g.lines.reduce((s, l) => s + l.expense_total, 0),
          maintenance: g.lines.reduce((s, l) => s + l.maintenance_total, 0),
          net: g.lines.reduce((s, l) => s + l.net_balance, 0),
        }));
      })();
      exportOwnerSummaryCSV(building.name, groups, month);
      toast.success('Excel por propietario descargado');
    } catch {
      toast.error('Error al exportar');
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Download className="w-4 h-4 text-primary" />
        <h4 className="text-sm font-semibold text-foreground">Exportar Reportes</h4>
        {isThirdParty && (
          <Badge variant="outline" className="text-[10px] ml-auto">
            {externalCompany}
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {/* ── PDF Section ── */}
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold px-1">
            Documentos PDF
          </p>

          {/* PDF Propietarios Global — tabla con todas las unidades */}
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2.5 h-10 text-xs font-medium border-green-200 hover:bg-green-50 hover:border-green-300 dark:border-green-800 dark:hover:bg-green-950/30"
            disabled={disabled || loadingPdf === 'owner'}
            onClick={() => handlePDF('owner')}
          >
            {loadingPdf === 'owner' ? (
              <Loader2 className="w-4 h-4 animate-spin text-green-600" />
            ) : (
              <Users className="w-4 h-4 text-green-600" />
            )}
            <span>Consolidado Mensual</span>
            <FileText className="w-3 h-3 text-muted-foreground ml-auto" />
          </Button>

          {/* PDF Individual por unidad — formato A-H */}
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2.5 h-10 text-xs font-medium border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300 dark:border-emerald-800 dark:hover:bg-emerald-950/30"
            disabled={disabled || loadingPdf === 'owner_individual'}
            onClick={() => handlePDF('owner_individual')}
          >
            {loadingPdf === 'owner_individual' ? (
              <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
            ) : (
              <FileText className="w-4 h-4 text-emerald-600" />
            )}
            <span>Reporte Propietario</span>
            <Badge variant="secondary" className="text-[8px] ml-auto px-1">A→H</Badge>
          </Button>

          {/* PDF Plusterra (Interno) — siempre visible */}
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2.5 h-10 text-xs font-medium border-blue-200 hover:bg-blue-50 hover:border-blue-300 dark:border-blue-800 dark:hover:bg-blue-950/30"
            disabled={disabled || loadingPdf === 'internal'}
            onClick={() => handlePDF('internal')}
          >
            {loadingPdf === 'internal' ? (
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            ) : (
              <Building2 className="w-4 h-4 text-blue-600" />
            )}
            <span>Reporte Plusterra</span>
            <FileText className="w-3 h-3 text-muted-foreground ml-auto" />
          </Button>

          {/* PDF Empresa Externa — solo Modelo 1 */}
          {isThirdParty && (
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start gap-2.5 h-10 text-xs font-medium border-orange-200 hover:bg-orange-50 hover:border-orange-300 dark:border-orange-800 dark:hover:bg-orange-950/30"
              disabled={disabled || loadingPdf === 'external'}
              onClick={() => handlePDF('external')}
            >
              {loadingPdf === 'external' ? (
                <Loader2 className="w-4 h-4 animate-spin text-orange-600" />
              ) : (
                <Building2 className="w-4 h-4 text-orange-600" />
              )}
              <span>Reporte {externalCompany}</span>
              <FileText className="w-3 h-3 text-muted-foreground ml-auto" />
            </Button>
          )}
        </div>

        {/* ── Excel Section ── */}
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold px-1">
            Planillas Excel
          </p>

          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2.5 h-10 text-xs font-medium"
            disabled={disabled}
            onClick={handleCSV}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Resumen General</span>
            <Badge variant="secondary" className="text-[9px] ml-auto px-1.5">.csv</Badge>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2.5 h-10 text-xs font-medium"
            disabled={disabled}
            onClick={handleOwnerCSV}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Por Propietario</span>
            <Badge variant="secondary" className="text-[9px] ml-auto px-1.5">.csv</Badge>
          </Button>
        </div>
      </div>

      {disabled && (
        <p className="text-[10px] text-muted-foreground mt-2 text-center italic">
          No hay datos para exportar en este período
        </p>
      )}
    </div>
  );
};
