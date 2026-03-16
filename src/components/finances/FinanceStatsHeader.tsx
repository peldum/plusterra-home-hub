/**
 * FinanceStatsHeader — Global financial metrics always visible above tabs.
 */
import { ArrowDownLeft, ArrowUpRight, Wallet, TrendingUp, TrendingDown, Coins } from 'lucide-react';

const fmtPYG = (n: number) =>
  new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', minimumFractionDigits: 0 }).format(n);

interface FinanceStatsHeaderProps {
  totalIncome: number;
  totalExpense: number;
  canonTotal: number;
}

export const FinanceStatsHeader = ({ totalIncome, totalExpense, canonTotal }: FinanceStatsHeaderProps) => {
  const netBalance = totalIncome - totalExpense;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div className="bg-card border border-border rounded-xl p-5 animate-slide-up opacity-0" style={{ animationDelay: '0ms', animationFillMode: 'forwards' }}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-muted-foreground">Ingresos Totales</p>
          <div className="p-2 rounded-lg bg-success/10"><ArrowDownLeft className="w-4 h-4 text-success" /></div>
        </div>
        <p className="text-xl font-bold text-foreground font-display">{fmtPYG(totalIncome)}</p>
      </div>
      <div className="bg-card border border-border rounded-xl p-5 animate-slide-up opacity-0" style={{ animationDelay: '80ms', animationFillMode: 'forwards' }}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-muted-foreground">Egresos Totales</p>
          <div className="p-2 rounded-lg bg-destructive/10"><ArrowUpRight className="w-4 h-4 text-destructive" /></div>
        </div>
        <p className="text-xl font-bold text-foreground font-display">{fmtPYG(totalExpense)}</p>
      </div>
      <div className="bg-card border border-border rounded-xl p-5 animate-slide-up opacity-0" style={{ animationDelay: '160ms', animationFillMode: 'forwards' }}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-muted-foreground">Balance Neto</p>
          <div className="p-2 rounded-lg bg-primary/10"><Wallet className="w-4 h-4 text-primary" /></div>
        </div>
        <p className={`text-xl font-bold font-display ${netBalance >= 0 ? 'text-success' : 'text-destructive'}`}>{fmtPYG(netBalance)}</p>
      </div>
      <div className="bg-card border border-border rounded-xl p-5 animate-slide-up opacity-0" style={{ animationDelay: '240ms', animationFillMode: 'forwards' }}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-muted-foreground">Cánones Cobrados</p>
          <div className="p-2 rounded-lg bg-info/10"><Coins className="w-4 h-4 text-info" /></div>
        </div>
        <p className="text-xl font-bold text-foreground font-display">{fmtPYG(canonTotal)}</p>
      </div>
    </div>
  );
};
