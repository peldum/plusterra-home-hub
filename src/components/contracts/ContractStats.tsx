import { FileText, AlertTriangle, CheckCircle, Calendar, XCircle } from 'lucide-react';
import { useContractStats } from '@/hooks/useContracts';
import { useAuth } from '@/contexts/AuthContext';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount);

export const ContractStats = () => {
  const { stats, isLoading } = useContractStats();
  const { isAdmin } = useAuth();

  const items = [
    { label: 'Contratos Activos', value: stats.active, icon: FileText, color: 'text-success' },
    { label: 'Por Vencer (30 días)', value: stats.nearExpiration, icon: AlertTriangle, color: 'text-warning' },
    { label: 'Expirados', value: stats.expired, icon: XCircle, color: 'text-destructive' },
    ...(isAdmin
      ? [{ label: 'Ingreso Mensual', value: formatCurrency(stats.totalMonthlyIncome), icon: Calendar, color: 'text-primary' }]
      : []),
  ];

  return (
    <div className={`grid grid-cols-1 md:grid-cols-${isAdmin ? 4 : 3} gap-4 mb-6`}>
      {items.map((stat, index) => (
        <div
          key={stat.label}
          className="bg-card border border-border rounded-xl p-4 animate-slide-up opacity-0"
          style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'forwards' }}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-muted ${stat.color}`}>
              <stat.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {isLoading ? '...' : stat.value}
              </p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
