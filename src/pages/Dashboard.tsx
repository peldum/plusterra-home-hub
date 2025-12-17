import { MainLayout } from '@/components/layout/MainLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { RecentTransactions } from '@/components/dashboard/RecentTransactions';
import { PropertyOverview } from '@/components/dashboard/PropertyOverview';
import { AgentPerformance } from '@/components/dashboard/AgentPerformance';
import { Building2, Users, Wallet, TrendingUp, Calendar } from 'lucide-react';

const Dashboard = () => {
  const today = new Date().toLocaleDateString('es-AR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <MainLayout
      title="Dashboard"
      subtitle={`Bienvenido de vuelta · ${today}`}
      action={{
        label: 'Nueva Propiedad',
        onClick: () => console.log('Nueva propiedad'),
      }}
    >
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Propiedades Totales"
          value="155"
          change="+12 este mes"
          changeType="positive"
          icon={Building2}
          iconColor="text-primary"
          delay={0}
        />
        <StatCard
          title="Clientes Activos"
          value="1,234"
          change="+48 nuevos"
          changeType="positive"
          icon={Users}
          iconColor="text-info"
          delay={100}
        />
        <StatCard
          title="Ingresos del Mes"
          value="$2.4M"
          change="+18% vs mes anterior"
          changeType="positive"
          icon={Wallet}
          iconColor="text-success"
          delay={200}
        />
        <StatCard
          title="Comisiones Pendientes"
          value="$185K"
          change="8 pagos por procesar"
          changeType="neutral"
          icon={TrendingUp}
          iconColor="text-secondary"
          delay={300}
        />
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <PropertyOverview />
        <RecentTransactions />
      </div>

      {/* Agent Performance */}
      <AgentPerformance />

      {/* Quick actions */}
      <div className="mt-8 p-6 bg-card border border-border rounded-xl animate-slide-up opacity-0" style={{ animationDelay: '600ms', animationFillMode: 'forwards' }}>
        <h3 className="font-display text-lg font-semibold text-foreground mb-4">
          Acciones Rápidas
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Registrar Ingreso', icon: Wallet, color: 'bg-success/10 text-success hover:bg-success/20' },
            { label: 'Nueva Propiedad', icon: Building2, color: 'bg-primary/10 text-primary hover:bg-primary/20' },
            { label: 'Agregar Cliente', icon: Users, color: 'bg-info/10 text-info hover:bg-info/20' },
            { label: 'Agendar Visita', icon: Calendar, color: 'bg-secondary/10 text-secondary hover:bg-secondary/20' },
          ].map((action) => (
            <button
              key={action.label}
              className={`flex flex-col items-center gap-3 p-4 rounded-xl transition-all duration-200 ${action.color}`}
            >
              <action.icon className="w-6 h-6" />
              <span className="text-sm font-medium">{action.label}</span>
            </button>
          ))}
        </div>
      </div>
    </MainLayout>
  );
};

export default Dashboard;
