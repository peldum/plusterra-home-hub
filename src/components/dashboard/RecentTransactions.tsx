import { ArrowUpRight, ArrowDownLeft } from 'lucide-react';

const transactions = [
  {
    id: 1,
    type: 'income',
    description: 'Alquiler - Av. Libertador 1234',
    client: 'María González',
    amount: '$45,000',
    date: 'Hoy, 10:30',
  },
  {
    id: 2,
    type: 'expense',
    description: 'Comisión Agente - Prop. #2341',
    client: 'Carlos Méndez',
    amount: '-$8,500',
    date: 'Hoy, 09:15',
  },
  {
    id: 3,
    type: 'income',
    description: 'Venta - Casa 3 ambientes',
    client: 'Roberto Sánchez',
    amount: '$250,000',
    date: 'Ayer, 16:45',
  },
  {
    id: 4,
    type: 'expense',
    description: 'Mantenimiento - Oficina Central',
    client: 'Servicios Generales',
    amount: '-$12,000',
    date: 'Ayer, 14:20',
  },
  {
    id: 5,
    type: 'income',
    description: 'Alquiler Temporal - Depto 5B',
    client: 'Ana Martínez',
    amount: '$28,000',
    date: 'Hace 2 días',
  },
];

export const RecentTransactions = () => {
  return (
    <div className="bg-card border border-border rounded-xl p-6 animate-slide-up opacity-0" style={{ animationDelay: '400ms', animationFillMode: 'forwards' }}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-display text-lg font-semibold text-foreground">
          Transacciones Recientes
        </h3>
        <button className="text-sm text-primary hover:text-primary/80 font-medium transition-colors">
          Ver todas
        </button>
      </div>
      
      <div className="space-y-4">
        {transactions.map((transaction) => (
          <div
            key={transaction.id}
            className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
          >
            <div
              className={`p-2 rounded-lg ${
                transaction.type === 'income'
                  ? 'bg-success/10 text-success'
                  : 'bg-destructive/10 text-destructive'
              }`}
            >
              {transaction.type === 'income' ? (
                <ArrowDownLeft className="w-4 h-4" />
              ) : (
                <ArrowUpRight className="w-4 h-4" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {transaction.description}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {transaction.client}
              </p>
            </div>
            <div className="text-right">
              <p
                className={`text-sm font-semibold ${
                  transaction.type === 'income' ? 'text-success' : 'text-destructive'
                }`}
              >
                {transaction.amount}
              </p>
              <p className="text-xs text-muted-foreground">{transaction.date}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
