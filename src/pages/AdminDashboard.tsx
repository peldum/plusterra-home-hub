import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { PropertyOverview } from '@/components/dashboard/PropertyOverview';
import { PropertyFormDialog } from '@/components/properties/PropertyFormDialog';
import { ClientFormDialog } from '@/components/clients/ClientFormDialog';
import { IncomeFormDialog } from '@/components/dashboard/IncomeFormDialog';
import { VisitFormDialog } from '@/components/dashboard/VisitFormDialog';
import { DashboardWidgets } from '@/components/dashboard/DashboardWidgets';
import { DailyVerseBanner } from '@/components/dashboard/DailyVerseBanner';
import { Building2, Users, Wallet, Calendar } from 'lucide-react';

const AdminDashboard = () => {
  const [propertyFormOpen, setPropertyFormOpen] = useState(false);
  const [clientFormOpen, setClientFormOpen] = useState(false);
  const [incomeFormOpen, setIncomeFormOpen] = useState(false);
  const [visitFormOpen, setVisitFormOpen] = useState(false);

  const today = new Date().toLocaleDateString('es-AR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const quickActions = [
    { label: 'Registrar Ingreso', icon: Wallet, color: 'bg-success/10 text-success hover:bg-success/20', onClick: () => setIncomeFormOpen(true) },
    { label: 'Nueva Propiedad', icon: Building2, color: 'bg-primary/10 text-primary hover:bg-primary/20', onClick: () => setPropertyFormOpen(true) },
    { label: 'Agregar Cliente', icon: Users, color: 'bg-info/10 text-info hover:bg-info/20', onClick: () => setClientFormOpen(true) },
    { label: 'Agendar Visita', icon: Calendar, color: 'bg-secondary/10 text-secondary hover:bg-secondary/20', onClick: () => setVisitFormOpen(true) },
  ];

  return (
    <MainLayout title="Dashboard" subtitle={`Bienvenido de vuelta · ${today}`}
      action={{ label: 'Nueva Propiedad', onClick: () => setPropertyFormOpen(true) }}>
      <div className="mb-8"><DailyVerseBanner /></div>

      {/* Admin: solo propiedades y clientes activos — sin finanzas ni comisiones */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <StatCard title="Propiedades Totales" value="155" change="+12 este mes" changeType="positive" icon={Building2} iconColor="text-primary" delay={0} />
        <StatCard title="Clientes Activos" value="1,234" change="+48 nuevos" changeType="positive" icon={Users} iconColor="text-info" delay={100} />
      </div>

      {/* Alertas operativas y resumen de contratos */}
      <div className="mb-8"><DashboardWidgets /></div>

      {/* Resumen de propiedades — sin transacciones detalladas por agente */}
      <div className="mb-8"><PropertyOverview /></div>

      <div className="mt-8 p-6 bg-card border border-border rounded-xl animate-slide-up opacity-0" style={{ animationDelay: '600ms', animationFillMode: 'forwards' }}>
        <h3 className="font-display text-lg font-semibold text-foreground mb-4">Acciones Rápidas</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickActions.map((action) => (
            <button key={action.label} onClick={action.onClick}
              className={`flex flex-col items-center gap-3 p-4 rounded-xl transition-all duration-200 ${action.color}`}>
              <action.icon className="w-6 h-6" />
              <span className="text-sm font-medium">{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      <PropertyFormDialog open={propertyFormOpen} onOpenChange={setPropertyFormOpen} property={null} />
      <ClientFormDialog open={clientFormOpen} onOpenChange={setClientFormOpen} />
      <IncomeFormDialog open={incomeFormOpen} onOpenChange={setIncomeFormOpen} />
      <VisitFormDialog open={visitFormOpen} onOpenChange={setVisitFormOpen} />
    </MainLayout>
  );
};

export default AdminDashboard;
