import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { generateAdminMonthlyReportPDF } from '@/lib/adminMonthlyReportPDF';

const fmtGs = (n: number) => '₲ ' + Math.round(n).toLocaleString('es-PY');

interface BuildingRow {
  building_id: string;
  name: string;
  collected: number;
  admin: number;
  plusterra: number;
  paid: number;
  total: number;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  period: string;
  monthLabel: string;
  buildings: BuildingRow[];
  cashIngresos: number;
  cashEgresos: number;
  totalIva: number;
}

export const AdminMonthlyReportDialog = ({
  open, onOpenChange, period, monthLabel,
  buildings, cashIngresos, cashEgresos, totalIva,
}: Props) => {
  const { user } = useAuth();
  const [observations, setObservations] = useState<Record<string, string>>({});
  const [generalNote, setGeneralNote] = useState('');
  const [generating, setGenerating] = useState(false);

  const { data: existing, isLoading } = useQuery({
    queryKey: ['admin-monthly-observations', period],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('admin_monthly_observations')
        .select('*')
        .eq('period', period);
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  useEffect(() => {
    if (!existing) return;
    const map: Record<string, string> = {};
    let general = '';
    for (const r of existing as any[]) {
      if (r.building_id) map[r.building_id] = r.observation || '';
      else general = r.general_note || '';
    }
    setObservations(map);
    setGeneralNote(general);
  }, [existing, open]);

  const totalCollected = useMemo(() => buildings.reduce((s, b) => s + b.collected, 0), [buildings]);
  const totalPlusterra = useMemo(() => buildings.reduce((s, b) => s + b.plusterra, 0), [buildings]);
  const resultadoNeto = totalPlusterra + totalIva + cashIngresos - cashEgresos;

  const saveObservations = async () => {
    const rows: any[] = [];
    for (const b of buildings) {
      const obs = observations[b.building_id]?.trim();
      if (obs) {
        rows.push({
          building_id: b.building_id,
          period,
          observation: obs,
          general_note: null,
          created_by: user!.id,
        });
      }
    }
    if (generalNote.trim()) {
      rows.push({
        building_id: null,
        period,
        observation: null,
        general_note: generalNote.trim(),
        created_by: user!.id,
      });
    }
    if (rows.length === 0) return;
    const { error } = await (supabase as any)
      .from('admin_monthly_observations')
      .upsert(rows, { onConflict: 'building_id,period' });
    if (error) console.warn('Error guardando observaciones:', error.message);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await saveObservations();
      generateAdminMonthlyReportPDF({
        period,
        monthLabel,
        buildings: buildings.map(b => ({
          name: b.name,
          collected: b.collected,
          admin: b.admin,
          plusterra: b.plusterra,
          paid: b.paid,
          total: b.total,
          observation: observations[b.building_id] || '',
        })),
        cashIngresos,
        cashEgresos,
        totalCommission: buildings.reduce((s, b) => s + b.admin, 0),
        totalIva,
        generalNote,
        generatedBy: user?.email || 'Sistema',
      });
      toast.success('Reporte generado correctamente');
      onOpenChange(false);
    } catch (e: any) {
      toast.error('Error al generar PDF: ' + (e?.message || ''));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Reporte mensual de Administración — <span className="capitalize">{monthLabel}</span>
          </DialogTitle>
          <DialogDescription className="text-xs">
            Agregá observaciones por edificio (opcional). Las observaciones quedan guardadas para el mes y aparecen en el PDF.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : (
          <div className="space-y-4">
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold">Edificio</th>
                    <th className="text-right px-3 py-2 font-semibold">Cobrado</th>
                    <th className="text-right px-3 py-2 font-semibold">Comisión</th>
                    <th className="text-right px-3 py-2 font-semibold">Ganancia Plusterra</th>
                    <th className="text-center px-3 py-2 font-semibold">Pagados</th>
                    <th className="text-left px-3 py-2 font-semibold w-[280px]">Observación</th>
                  </tr>
                </thead>
                <tbody>
                  {buildings.map(b => (
                    <tr key={b.building_id} className="border-t">
                      <td className="px-3 py-2 font-medium">{b.name}</td>
                      <td className="px-3 py-2 text-right font-mono">{fmtGs(b.collected)}</td>
                      <td className="px-3 py-2 text-right font-mono">{fmtGs(b.admin)}</td>
                      <td className="px-3 py-2 text-right font-mono text-blue-700">{fmtGs(b.plusterra)}</td>
                      <td className="px-3 py-2 text-center text-xs">{b.paid}/{b.total}</td>
                      <td className="px-2 py-1.5">
                        <input
                          value={observations[b.building_id] || ''}
                          onChange={e => setObservations(prev => ({ ...prev, [b.building_id]: e.target.value }))}
                          placeholder="Ej: cliente del 4B abonó con atraso..."
                          className="w-full h-8 text-xs px-2 rounded border border-input bg-background"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-muted/30 font-semibold text-sm">
                  <tr className="border-t-2">
                    <td className="px-3 py-2">TOTAL</td>
                    <td className="px-3 py-2 text-right font-mono">{fmtGs(totalCollected)}</td>
                    <td className="px-3 py-2 text-right font-mono">
                      {fmtGs(buildings.reduce((s, b) => s + b.admin, 0))}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-blue-700">{fmtGs(totalPlusterra)}</td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 rounded-lg p-3">
                <div className="text-muted-foreground">+ Ingresos caja Admin</div>
                <div className="text-base font-bold text-emerald-700">{fmtGs(cashIngresos)}</div>
              </div>
              <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 rounded-lg p-3">
                <div className="text-muted-foreground">− Egresos caja Admin</div>
                <div className="text-base font-bold text-rose-700">{fmtGs(cashEgresos)}</div>
              </div>
              <div className="bg-cyan-50 dark:bg-cyan-950/20 border border-cyan-200 rounded-lg p-3">
                <div className="text-muted-foreground">IVA recuperado</div>
                <div className="text-base font-bold text-cyan-700">{fmtGs(totalIva)}</div>
              </div>
              <div className="bg-primary/10 border border-primary/40 rounded-lg p-3">
                <div className="text-muted-foreground">Resultado neto</div>
                <div className="text-base font-bold text-primary">{fmtGs(resultadoNeto)}</div>
              </div>
            </div>

            <div>
              <Label className="text-sm">Observaciones generales del mes</Label>
              <Textarea
                value={generalNote}
                onChange={e => setGeneralNote(e.target.value)}
                placeholder="Notas globales sobre el mes (opcional)..."
                className="min-h-[80px]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button onClick={handleGenerate} disabled={generating}>
                {generating && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                <FileText className="w-4 h-4 mr-2" />
                Generar PDF
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};