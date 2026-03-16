import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CalendarPlus, ChevronLeft, ChevronRight, Loader2,
  Home, Users, CheckCircle2, AlertCircle,
} from 'lucide-react';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function formatPeriod(year: number, month: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (period: string) => void;
  isPending: boolean;
  result: { count: number; period: string } | null;
}

export const GenerateReceivablesDialog = ({
  open, onOpenChange, onConfirm, isPending, result,
}: Props) => {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  // Reset to current month when opening
  useEffect(() => {
    if (open) {
      const d = new Date();
      setYear(d.getFullYear());
      setMonth(d.getMonth());
    }
  }, [open]);

  const period = formatPeriod(year, month);

  // Fetch preview counts
  const { data: preview, isLoading: previewLoading } = useQuery({
    queryKey: ['generate-receivables-preview', period],
    queryFn: async () => {
      const periodStart = `${period}-01`;
      const nextMonth = month === 11
        ? `${year + 1}-01-01`
        : `${year}-${String(month + 2).padStart(2, '0')}-01`;

      // Count active rental contracts for that period
      const { count: contractCount } = await supabase
        .from('contracts')
        .select('id', { count: 'exact', head: true })
        .in('status', ['active', 'near_expiration'])
        .in('contract_type', ['rental', 'temporary_rental'])
        .gt('monthly_rent', 0)
        .lte('start_date', new Date(new Date(nextMonth).getTime() - 86400000).toISOString().split('T')[0])
        .or(`end_date.is.null,end_date.gte.${periodStart}`);

      // Count active agents
      const { count: agentCount } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active')
        .not('id', 'is', null);

      // Refine: only those with agent role
      const { count: agentRoleCount } = await supabase
        .from('user_roles')
        .select('user_id', { count: 'exact', head: true })
        .eq('role', 'agent');

      // Count existing receivables for this period
      const { count: existingCount } = await supabase
        .from('receivables')
        .select('id', { count: 'exact', head: true })
        .gte('due_date', periodStart)
        .lt('due_date', nextMonth);

      return {
        contracts: contractCount || 0,
        agents: agentRoleCount || 0,
        existing: existingCount || 0,
      };
    },
    enabled: open,
  });

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const showResult = result && result.period === period;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarPlus className="w-5 h-5 text-primary" />
            Generar cobros del mes
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Month selector */}
          <div className="flex items-center justify-center gap-3">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={prevMonth}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="text-center min-w-[160px]">
              <p className="text-lg font-semibold text-foreground">
                {MONTH_NAMES[month]} {year}
              </p>
              <p className="text-xs text-muted-foreground">Período: {period}</p>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={nextMonth}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Preview */}
          {previewLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : preview ? (
            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground">
                Se generarán cobros para:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center gap-3 rounded-lg border border-border p-3">
                  <Home className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-lg font-bold text-foreground">{preview.contracts}</p>
                    <p className="text-xs text-muted-foreground">Contratos de alquiler activos</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg border border-border p-3">
                  <Users className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-lg font-bold text-foreground">{preview.agents}</p>
                    <p className="text-xs text-muted-foreground">Agentes con canon</p>
                  </div>
                </div>
              </div>
              {preview.existing > 0 && (
                <div className="flex items-start gap-2 rounded-lg bg-warning/10 border border-warning/20 p-3">
                  <AlertCircle className="w-4 h-4 text-warning mt-0.5 shrink-0" />
                  <p className="text-xs text-warning">
                    Ya existen <strong>{preview.existing}</strong> cobro(s) para este período.
                    Solo se crearán los que falten, sin duplicados.
                  </p>
                </div>
              )}
            </div>
          ) : null}

          {/* Result after generation */}
          {showResult && (
            <div className={`flex items-start gap-2 rounded-lg p-3 border ${
              result.count > 0
                ? 'bg-success/10 border-success/20'
                : 'bg-muted border-border'
            }`}>
              <CheckCircle2 className={`w-4 h-4 mt-0.5 shrink-0 ${
                result.count > 0 ? 'text-success' : 'text-muted-foreground'
              }`} />
              <p className="text-sm">
                {result.count > 0
                  ? <>Se generaron <strong>{result.count}</strong> cobro(s) nuevos para {MONTH_NAMES[month]} {year}.</>
                  : <>Ya existen todos los cobros para {MONTH_NAMES[month]} {year}. No se crearon duplicados.</>
                }
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
            {showResult ? 'Cerrar' : 'Cancelar'}
          </Button>
          {!showResult && (
            <Button
              onClick={() => onConfirm(period)}
              disabled={isPending || previewLoading}
              className="w-full sm:w-auto"
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <CalendarPlus className="w-4 h-4 mr-1.5" />
              )}
              Generar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
