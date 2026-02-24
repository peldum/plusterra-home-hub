import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, FileText, Pencil, Download, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { usePropertyReports, PropertyReport } from '@/hooks/usePropertyReports';
import { PropertyReportFormDialog } from './PropertyReportFormDialog';
import { exportPropertyReportPDF } from '@/lib/propertyReportPDF';

export const PropertyReportList = () => {
  const { role } = useAuth();
  const { data: reports, isLoading } = usePropertyReports();
  const [showForm, setShowForm] = useState(false);
  const [editReport, setEditReport] = useState<PropertyReport | null>(null);

  const canCreate = role === 'agent' || role === 'admin' || role === 'superadmin';
  const canExport = role === 'admin' || role === 'superadmin' || role === 'secretaria';

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {reports?.length ?? 0} reportes comerciales
        </p>
        {canCreate && (
          <Button size="sm" onClick={() => setShowForm(true)} className="gap-1">
            <Plus className="h-4 w-4" /> Nuevo Reporte
          </Button>
        )}
      </div>

      {(!reports || reports.length === 0) ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          <FileText className="h-10 w-10 mx-auto mb-2 opacity-30" />
          No hay reportes comerciales aún.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {reports.map(report => {
            const diffusionCount = [
              report.diffusion.portales?.active,
              report.diffusion.web_propia?.active,
              report.diffusion.facebook?.active,
              report.diffusion.instagram?.active,
              report.diffusion.whatsapp,
              report.diffusion.carteleria?.active,
            ].filter(Boolean).length;

            return (
              <Card key={report.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">
                        {report.property_code ?? ''} – {report.property_title ?? 'Propiedad'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Período: {report.period} · {report.agent_name ?? 'Agente'}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-[10px] flex-shrink-0">
                      📊 {diffusionCount} canales
                    </Badge>
                  </div>

                  {report.final_comment && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {report.final_comment}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-1">
                    {report.adjustments.precio && <Badge variant="outline" className="text-[10px]">💰 Precio</Badge>}
                    {report.adjustments.condiciones && <Badge variant="outline" className="text-[10px]">📋 Condiciones</Badge>}
                    {report.adjustments.presentacion && <Badge variant="outline" className="text-[10px]">🎨 Presentación</Badge>}
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1 flex-1"
                      onClick={() => setEditReport(report)}
                    >
                      <Pencil className="h-3 w-3" /> Editar
                    </Button>
                    {canExport && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1 flex-1"
                        onClick={() => exportPropertyReportPDF(report)}
                      >
                        <Download className="h-3 w-3" /> PDF
                      </Button>
                    )}
                  </div>

                  <p className="text-[10px] text-muted-foreground text-right">
                    {format(new Date(report.updated_at), 'dd MMM yyyy HH:mm', { locale: es })}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* New report dialog */}
      <PropertyReportFormDialog
        open={showForm}
        onOpenChange={setShowForm}
      />

      {/* Edit report dialog */}
      <PropertyReportFormDialog
        open={!!editReport}
        onOpenChange={v => !v && setEditReport(null)}
        report={editReport}
      />
    </div>
  );
};
