/**
 * FinanceStatsHeader — Caja real de Plusterra: 3 tarjetas principales.
 */
import { ArrowDownLeft, ArrowUpRight, TrendingUp, TrendingDown } from 'lucide-react';

const fmtPYG = (n: number) =>
  new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', minimumFractionDigits: 0 }).format(n);

interface FinanceStatsHeaderProps {
  totalIncome: number;
  totalExpense: number;
}

export const FinanceStatsHeader = ({ totalIncome, totalExpense }: FinanceStatsHeaderProps) => {
  const resultado = totalIncome - totalExpense;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div className="bg-card border border-border rounded-xl p-5 animate-slide-up opacity-0" style={{ animationDelay: '0ms', animationFillMode: 'forwards' }}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-muted-foreground">Ingresos Totales</p>
          <div className="p-2 rounded-lg bg-success/10"><ArrowDownLeft className="w-4 h-4 text-success" /></div>
        </div>
        <p className="text-xl font-bold text-success font-display">{fmtPYG(totalIncome)}</p>
        <p className="text-xs text-muted-foreground mt-1">Ingresos propios de Plusterra</p>
      </div>
      <div className="bg-card border border-border rounded-xl p-5 animate-slide-up opacity-0" style={{ animationDelay: '80ms', animationFillMode: 'forwards' }}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-muted-foreground">Egresos Operativos</p>
          <div className="p-2 rounded-lg bg-destructive/10"><ArrowUpRight className="w-4 h-4 text-destructive" /></div>
        </div>
        <p className="text-xl font-bold text-destructive font-display">{fmtPYG(totalExpense)}</p>
        <p className="text-xs text-muted-foreground mt-1">Gastos operativos de la empresa</p>
      </div>
      <div className="bg-card border border-border rounded-xl p-5 animate-slide-up opacity-0" style={{ animationDelay: '160ms', animationFillMode: 'forwards' }}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-muted-foreground">Resultado</p>
          <div className={`p-2 rounded-lg ${resultado >= 0 ? 'bg-success/10' : 'bg-destructive/10'}`}>
            {resultado >= 0 ? <TrendingUp className="w-4 h-4 text-success" /> : <TrendingDown className="w-4 h-4 text-destructive" />}
          </div>
        </div>
        <p className={`text-xl font-bold font-display ${resultado >= 0 ? 'text-success' : 'text-destructive'}`}>{fmtPYG(resultado)}</p>
        <p className="text-xs text-muted-foreground mt-1">Flujo de caja real</p>
      </div>
    </div>
  );
};
