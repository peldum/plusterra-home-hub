import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const agents = [
  {
    id: 1,
    name: 'Carlos Méndez',
    role: 'Agente Senior',
    avatar: 'CM',
    properties: 12,
    sales: 8,
    commission: '$125,000',
    trend: 'up',
  },
  {
    id: 2,
    name: 'Laura Fernández',
    role: 'Agente',
    avatar: 'LF',
    properties: 9,
    sales: 5,
    commission: '$78,500',
    trend: 'up',
  },
  {
    id: 3,
    name: 'Miguel Torres',
    role: 'Agente',
    avatar: 'MT',
    properties: 7,
    sales: 4,
    commission: '$52,000',
    trend: 'neutral',
  },
  {
    id: 4,
    name: 'Ana Rodríguez',
    role: 'Agente Junior',
    avatar: 'AR',
    properties: 5,
    sales: 2,
    commission: '$28,000',
    trend: 'down',
  },
];

export const AgentPerformance = () => {
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-success" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-destructive" />;
      default:
        return <Minus className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6 animate-slide-up opacity-0" style={{ animationDelay: '500ms', animationFillMode: 'forwards' }}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-display text-lg font-semibold text-foreground">
          Rendimiento de Agentes
        </h3>
        <button className="text-sm text-primary hover:text-primary/80 font-medium transition-colors">
          Ver todos
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider pb-3">
                Agente
              </th>
              <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider pb-3">
                Props.
              </th>
              <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider pb-3">
                Ventas
              </th>
              <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider pb-3">
                Comisión
              </th>
              <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider pb-3">
                Trend
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {agents.map((agent) => (
              <tr key={agent.id} className="table-row-hover">
                <td className="py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-xs font-semibold text-primary">
                        {agent.avatar}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {agent.name}
                      </p>
                      <p className="text-xs text-muted-foreground">{agent.role}</p>
                    </div>
                  </div>
                </td>
                <td className="text-center">
                  <span className="text-sm font-medium text-foreground">
                    {agent.properties}
                  </span>
                </td>
                <td className="text-center">
                  <span className="text-sm font-medium text-foreground">
                    {agent.sales}
                  </span>
                </td>
                <td className="text-right">
                  <span className="text-sm font-semibold text-success">
                    {agent.commission}
                  </span>
                </td>
                <td className="text-center">{getTrendIcon(agent.trend)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
