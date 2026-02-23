import { useState } from 'react';
import { format, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useOwnerStatement } from '@/hooks/useOwnerStatement';
import { Owner } from '@/hooks/useOwners';
import { exportOwnerStatementPDF } from '@/lib/ownerStatementExport';
import { toast } from 'sonner';
import {
  ChevronLeft, ChevronRight, TrendingUp, TrendingDown,
  Loader2, FileText, Wrench, ArrowUpCircle, ArrowDownCircle, Download,
} from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  owner: Owner | null;
}

const formatCurrency = (amount: number, currency: string) => {
  if (currency === 'USD') return `US$ ${amount.toLocaleString('es-PY', { minimumFractionDigits: 2 })}`;
  return `₲ ${amount.toLocaleString('es-PY')}`;
};

export const OwnerStatementDialog = ({ open, onOpenChange, owner }: Props) => {
  const [monthDate, setMonthDate] = useState(new Date());
  const month = format(monthDate, 'yyyy-MM');
  const { data, isLoading } = useOwnerStatement(owner?.id ?? null, month);

  const lines = data?.lines ?? [];
  const totalIncome = lines.filter(l => l.type === 'income').reduce((s, l) => s + l.amount, 0);
  const totalExpense = lines.filter(l => l.type === 'expense').reduce((s, l) => s + l.amount, 0);
  const balance = totalIncome - totalExpense;

  const prevMonth = () => setMonthDate(prev => subMonths(prev, 1));
  const nextMonth = () => setMonthDate(prev => {
    const next = new Date(prev);
    next.setMonth(next.getMonth() + 1);
    return next > new Date() ? prev : next;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Estado de Cuenta — {owner?.full_name}
            </DialogTitle>
            {lines.length > 0 && (
              <button
                onClick={async () => {
                  try {
                    await exportOwnerStatementPDF(
                      owner?.full_name || '',
                      month,
                      lines,
                      data?.properties?.length ?? 0,
                    );
                    toast.success('PDF descargado');
                  } catch (e) {
                    toast.error('Error al generar PDF');
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                PDF
              </button>
            )}
          </div>
        </DialogHeader>
        <div className="flex items-center justify-center gap-4 py-2">
          <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm font-semibold capitalize min-w-[140px] text-center">
            {format(monthDate, 'MMMM yyyy', { locale: es })}
          </span>
          <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-3 text-center">
            <TrendingUp className="w-4 h-4 mx-auto mb-1 text-emerald-600" />
            <p className="text-xs text-muted-foreground">Ingresos</p>
            <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
              {formatCurrency(totalIncome, 'PYG')}
            </p>
          </div>
          <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-3 text-center">
            <TrendingDown className="w-4 h-4 mx-auto mb-1 text-red-600" />
            <p className="text-xs text-muted-foreground">Gastos</p>
            <p className="text-sm font-bold text-red-700 dark:text-red-400">
              {formatCurrency(totalExpense, 'PYG')}
            </p>
          </div>
          <div className={`rounded-lg p-3 text-center ${balance >= 0 ? 'bg-blue-50 dark:bg-blue-950/30' : 'bg-orange-50 dark:bg-orange-950/30'}`}>
            <span className="text-xs text-muted-foreground">Balance</span>
            <p className={`text-sm font-bold ${balance >= 0 ? 'text-blue-700 dark:text-blue-400' : 'text-orange-700 dark:text-orange-400'}`}>
              {formatCurrency(balance, 'PYG')}
            </p>
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        )}

        {/* Movements table */}
        {!isLoading && lines.length > 0 && (
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left px-3 py-2 font-medium">Fecha</th>
                  <th className="text-left px-3 py-2 font-medium">Descripción</th>
                  <th className="text-left px-3 py-2 font-medium">Propiedad</th>
                  <th className="text-right px-3 py-2 font-medium">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {lines.map(line => (
                  <tr key={`${line.source}-${line.id}`} className="hover:bg-muted/30">
                    <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                      {format(new Date(line.date + 'T12:00:00'), 'dd/MM')}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        {line.source === 'maintenance' ? (
                          <Wrench className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                        ) : line.type === 'income' ? (
                          <ArrowUpCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                        ) : (
                          <ArrowDownCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                        )}
                        <span className="truncate max-w-[200px]">{line.description}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{line.category}</span>
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground truncate max-w-[120px]">
                      {line.property_title}
                    </td>
                    <td className={`px-3 py-2 text-right font-medium whitespace-nowrap ${
                      line.type === 'income' ? 'text-emerald-600' : 'text-red-600'
                    }`}>
                      {line.type === 'income' ? '+' : '-'}{formatCurrency(line.amount, line.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && lines.length === 0 && (
          <div className="text-center py-8">
            <FileText className="w-10 h-10 mx-auto mb-2 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              {(data?.properties?.length ?? 0) === 0
                ? 'Este propietario no tiene propiedades asociadas'
                : 'Sin movimientos en este período'}
            </p>
          </div>
        )}

        {/* Properties count */}
        {(data?.properties?.length ?? 0) > 0 && (
          <p className="text-xs text-muted-foreground text-center">
            {data!.properties.length} propiedad{data!.properties.length !== 1 ? 'es' : ''} asociada{data!.properties.length !== 1 ? 's' : ''}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
};
