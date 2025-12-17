import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import {
  ArrowUpRight,
  ArrowDownLeft,
  TrendingUp,
  TrendingDown,
  Calendar,
  Download,
  Filter,
  PieChart,
  Wallet,
} from 'lucide-react';

const transactions = [
  { id: 1, type: 'income', category: 'Alquiler', description: 'Cobro mensual - Depto Palermo', amount: 1500, date: '2024-12-01', client: 'María González' },
  { id: 2, type: 'income', category: 'Venta', description: 'Cierre venta - Casa Nordelta', amount: 580000, date: '2024-12-01', client: 'Roberto Sánchez' },
  { id: 3, type: 'expense', category: 'Comisión', description: 'Comisión agente - Venta Nordelta', amount: 17400, date: '2024-12-01', client: 'Carlos Méndez' },
  { id: 4, type: 'income', category: 'Alquiler', description: 'Cobro mensual - Oficina Madero', amount: 4200, date: '2024-11-30', client: 'Tech Solutions SA' },
  { id: 5, type: 'expense', category: 'Mantenimiento', description: 'Reparación plomería - Belgrano', amount: 450, date: '2024-11-29', client: 'Servicios Integrales' },
  { id: 6, type: 'income', category: 'Alquiler', description: 'Cobro mensual - Loft Belgrano', amount: 950, date: '2024-11-28', client: 'Ana Martínez' },
  { id: 7, type: 'expense', category: 'Impuestos', description: 'ABL - Propiedades administradas', amount: 2800, date: '2024-11-27', client: 'GCBA' },
  { id: 8, type: 'income', category: 'Comisión', description: 'Comisión agencia - Venta Nordelta', amount: 29000, date: '2024-11-26', client: 'Plusterra' },
];

const monthlyStats = {
  totalIncome: 615650,
  totalExpense: 20650,
  netBalance: 595000,
  pendingCommissions: 45000,
};

const categoryBreakdown = [
  { name: 'Alquileres', value: 65000, percentage: 42, color: 'bg-info' },
  { name: 'Ventas', value: 580000, percentage: 35, color: 'bg-success' },
  { name: 'Comisiones', value: 29000, percentage: 15, color: 'bg-secondary' },
  { name: 'Otros', value: 12000, percentage: 8, color: 'bg-muted' },
];

const Finances = () => {
  const [dateRange, setDateRange] = useState('month');
  const [transactionType, setTransactionType] = useState<string>('all');

  const filteredTransactions = transactions.filter(t => 
    transactionType === 'all' || t.type === transactionType
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <MainLayout
      title="Finanzas"
      subtitle="Control de ingresos, egresos y comisiones"
      action={{
        label: 'Nuevo Registro',
        onClick: () => console.log('Nuevo registro'),
      }}
    >
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-card border border-border rounded-xl p-6 animate-slide-up opacity-0" style={{ animationDelay: '0ms', animationFillMode: 'forwards' }}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-muted-foreground">Ingresos del Mes</p>
            <div className="p-2 rounded-lg bg-success/10">
              <ArrowDownLeft className="w-5 h-5 text-success" />
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground font-display">{formatCurrency(monthlyStats.totalIncome)}</p>
          <div className="flex items-center gap-1 mt-2 text-sm text-success">
            <TrendingUp className="w-4 h-4" />
            <span>+18% vs mes anterior</span>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 animate-slide-up opacity-0" style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-muted-foreground">Egresos del Mes</p>
            <div className="p-2 rounded-lg bg-destructive/10">
              <ArrowUpRight className="w-5 h-5 text-destructive" />
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground font-display">{formatCurrency(monthlyStats.totalExpense)}</p>
          <div className="flex items-center gap-1 mt-2 text-sm text-destructive">
            <TrendingDown className="w-4 h-4" />
            <span>-5% vs mes anterior</span>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 animate-slide-up opacity-0" style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-muted-foreground">Balance Neto</p>
            <div className="p-2 rounded-lg bg-primary/10">
              <Wallet className="w-5 h-5 text-primary" />
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground font-display">{formatCurrency(monthlyStats.netBalance)}</p>
          <div className="flex items-center gap-1 mt-2 text-sm text-success">
            <TrendingUp className="w-4 h-4" />
            <span>Excelente rendimiento</span>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 animate-slide-up opacity-0" style={{ animationDelay: '300ms', animationFillMode: 'forwards' }}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-muted-foreground">Comisiones Pendientes</p>
            <div className="p-2 rounded-lg bg-secondary/10">
              <PieChart className="w-5 h-5 text-secondary" />
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground font-display">{formatCurrency(monthlyStats.pendingCommissions)}</p>
          <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
            <span>5 pagos por procesar</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Transactions list */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-6 animate-slide-up opacity-0" style={{ animationDelay: '400ms', animationFillMode: 'forwards' }}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-display text-lg font-semibold text-foreground">
              Movimientos Recientes
            </h3>
            <div className="flex items-center gap-2">
              <select
                value={transactionType}
                onChange={(e) => setTransactionType(e.target.value)}
                className="px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="all">Todos</option>
                <option value="income">Ingresos</option>
                <option value="expense">Egresos</option>
              </select>
              <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 text-sm transition-colors">
                <Download className="w-4 h-4" />
                Exportar
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {filteredTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center gap-4 p-4 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div
                  className={`p-2 rounded-lg ${
                    transaction.type === 'income'
                      ? 'bg-success/10 text-success'
                      : 'bg-destructive/10 text-destructive'
                  }`}
                >
                  {transaction.type === 'income' ? (
                    <ArrowDownLeft className="w-5 h-5" />
                  ) : (
                    <ArrowUpRight className="w-5 h-5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground truncate">
                      {transaction.description}
                    </p>
                    <span className="badge-status text-xs bg-muted text-muted-foreground">
                      {transaction.category}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{transaction.client}</p>
                </div>
                <div className="text-right">
                  <p
                    className={`font-semibold ${
                      transaction.type === 'income' ? 'text-success' : 'text-destructive'
                    }`}
                  >
                    {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                  </p>
                  <p className="text-xs text-muted-foreground">{transaction.date}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Category breakdown */}
        <div className="bg-card border border-border rounded-xl p-6 animate-slide-up opacity-0" style={{ animationDelay: '500ms', animationFillMode: 'forwards' }}>
          <h3 className="font-display text-lg font-semibold text-foreground mb-6">
            Desglose por Categoría
          </h3>

          <div className="space-y-4">
            {categoryBreakdown.map((category) => (
              <div key={category.name}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">{category.name}</span>
                  <span className="text-sm text-muted-foreground">{category.percentage}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full ${category.color} rounded-full transition-all duration-500`}
                    style={{ width: `${category.percentage}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatCurrency(category.value)}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-6 border-t border-border">
            <h4 className="text-sm font-semibold text-foreground mb-4">Configuración de Comisiones</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-sm text-muted-foreground">Comisión Agencia</span>
                <span className="font-semibold text-foreground">5%</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-sm text-muted-foreground">Comisión Agente</span>
                <span className="font-semibold text-foreground">3%</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-sm text-muted-foreground">Comisión Propietario</span>
                <span className="font-semibold text-foreground">2%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Finances;
