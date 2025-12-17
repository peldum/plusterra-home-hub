import { MainLayout } from '@/components/layout/MainLayout';
import {
  FileText,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  Download,
  Eye,
  MoreVertical,
} from 'lucide-react';

const contracts = [
  {
    id: 1,
    title: 'Contrato Alquiler - Depto Palermo',
    client: 'María González',
    property: 'Av. Santa Fe 3200, Palermo',
    type: 'Alquiler',
    startDate: '2024-01-15',
    endDate: '2026-01-15',
    status: 'vigente',
    monthlyAmount: 1500,
  },
  {
    id: 2,
    title: 'Contrato Venta - Casa Nordelta',
    client: 'Roberto Sánchez',
    property: 'Barrio Los Castores, Nordelta',
    type: 'Venta',
    startDate: '2024-12-01',
    endDate: '2024-12-01',
    status: 'completado',
    monthlyAmount: 580000,
  },
  {
    id: 3,
    title: 'Contrato Alquiler - Oficina Madero',
    client: 'Tech Solutions SA',
    property: 'Av. Madero 900, Puerto Madero',
    type: 'Alquiler',
    startDate: '2023-06-01',
    endDate: '2024-12-31',
    status: 'por_vencer',
    monthlyAmount: 4200,
  },
  {
    id: 4,
    title: 'Contrato Alquiler - Loft Belgrano',
    client: 'Ana Martínez',
    property: 'Cabildo 2100, Belgrano',
    type: 'Alquiler',
    startDate: '2024-03-01',
    endDate: '2025-03-01',
    status: 'vigente',
    monthlyAmount: 950,
  },
  {
    id: 5,
    title: 'Contrato Administración - PH Recoleta',
    client: 'Familia Pérez',
    property: 'Av. Alvear 1800, Recoleta',
    type: 'Administración',
    startDate: '2022-01-01',
    endDate: '2025-01-01',
    status: 'vigente',
    monthlyAmount: 350,
  },
];

const statusConfig = {
  vigente: { label: 'Vigente', icon: CheckCircle, color: 'bg-success/10 text-success border-success/20' },
  por_vencer: { label: 'Por vencer', icon: AlertTriangle, color: 'bg-warning/10 text-warning border-warning/20' },
  completado: { label: 'Completado', icon: CheckCircle, color: 'bg-info/10 text-info border-info/20' },
  vencido: { label: 'Vencido', icon: AlertTriangle, color: 'bg-destructive/10 text-destructive border-destructive/20' },
};

const typeColors = {
  Alquiler: 'bg-info/10 text-info',
  Venta: 'bg-success/10 text-success',
  Administración: 'bg-secondary/10 text-secondary',
};

const Contracts = () => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const calculateDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const today = new Date();
    const diff = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <MainLayout
      title="Contratos"
      subtitle="Gestión de contratos y documentación"
      action={{
        label: 'Nuevo Contrato',
        onClick: () => console.log('Nuevo contrato'),
      }}
    >
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Contratos Vigentes', value: 3, icon: FileText, color: 'text-success' },
          { label: 'Por Vencer (30 días)', value: 1, icon: AlertTriangle, color: 'text-warning' },
          { label: 'Completados este mes', value: 1, icon: CheckCircle, color: 'text-info' },
          { label: 'Valor total mensual', value: formatCurrency(7000), icon: Calendar, color: 'text-primary' },
        ].map((stat, index) => (
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
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Contracts Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden animate-slide-up opacity-0" style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4">
                  Contrato
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4">
                  Cliente
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4">
                  Tipo
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4">
                  Vigencia
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4">
                  Estado
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4">
                  Monto
                </th>
                <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {contracts.map((contract) => {
                const status = statusConfig[contract.status as keyof typeof statusConfig];
                const daysRemaining = calculateDaysRemaining(contract.endDate);
                return (
                  <tr key={contract.id} className="table-row-hover">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <FileText className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{contract.title}</p>
                          <p className="text-sm text-muted-foreground">{contract.property}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-foreground">
                      {contract.client}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`badge-status text-xs ${typeColors[contract.type as keyof typeof typeColors]}`}>
                        {contract.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <p className="text-foreground">
                          {formatDate(contract.startDate)} - {formatDate(contract.endDate)}
                        </p>
                        {contract.status !== 'completado' && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <Clock className="w-3 h-3" />
                            {daysRemaining > 0 ? `${daysRemaining} días restantes` : 'Vencido'}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`badge-status text-xs border ${status.color}`}>
                        <status.icon className="w-3 h-3 mr-1" />
                        {status.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-foreground">
                        {formatCurrency(contract.monthlyAmount)}
                        {contract.type === 'Alquiler' && <span className="text-xs font-normal text-muted-foreground">/mes</span>}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button className="p-2 hover:bg-muted rounded-lg transition-colors" title="Ver contrato">
                          <Eye className="w-4 h-4 text-muted-foreground" />
                        </button>
                        <button className="p-2 hover:bg-muted rounded-lg transition-colors" title="Descargar">
                          <Download className="w-4 h-4 text-muted-foreground" />
                        </button>
                        <button className="p-2 hover:bg-muted rounded-lg transition-colors">
                          <MoreVertical className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </MainLayout>
  );
};

export default Contracts;
