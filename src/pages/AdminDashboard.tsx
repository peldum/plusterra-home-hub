import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { PropertyOverview } from '@/components/dashboard/PropertyOverview';
import { PropertyFormDialog } from '@/components/properties/PropertyFormDialog';
import { ClientFormDialog } from '@/components/clients/ClientFormDialog';
import { IncomeFormDialog } from '@/components/dashboard/IncomeFormDialog';
import { ExpenseFormDialog } from '@/components/finances/ExpenseFormDialog';
import { VisitFormDialog } from '@/components/dashboard/VisitFormDialog';
import { QuickCommissionDialog } from '@/components/commissions/QuickCommissionDialog';
import { DashboardWidgets } from '@/components/dashboard/DashboardWidgets';
import { DailyVerseBanner } from '@/components/dashboard/DailyVerseBanner';
import { ActiveReservationsPanel } from '@/components/dashboard/ActiveReservationsPanel';
import { BirthdayWidget } from '@/components/dashboard/BirthdayWidget';
import { useReceivableCounters } from '@/hooks/useReceivableCounters';
import { Building2, Users, Wallet, Calendar, AlertTriangle, Clock, ArrowUpRight, Coins } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const AdminDashboard = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [propertyFormOpen, setPropertyFormOpen] = useState(false);
  const [clientFormOpen, setClientFormOpen] = useState(false);
  const [incomeFormOpen, setIncomeFormOpen] = useState(false);
  const [expenseFormOpen, setExpenseFormOpen] = useState(false);
  const [visitFormOpen, setVisitFormOpen] = useState(false);
  const [quickCommOpen, setQuickCommOpen] = useState(false);
  const { data: receivableCounters } = useReceivableCounters();

  const { data: propertyCount } = useQuery({
    queryKey: ['admin-stat-properties'],
    queryFn: async () => {
      const { count, error } = await supabase.from('properties').select('id', { count: 'exact', head: true });
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!user,
  });

  const { data: clientCount } = useQuery({
    queryKey: ['admin-stat-clients'],
    queryFn: async () => {
      const { count, error } = await supabase.from('clients').select('id', { count: 'exact', head: true });
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!user,
  });

  const firstName = profile?.full_name?.split(' ')[0] || 'usuario';
  const overdueCount = receivableCounters?.overdue ?? 0;
  const subtitle = overdueCount > 0
    ? `Tenés ${overdueCount} cobro${overdueCount !== 1 ? 's' : ''} vencido${overdueCount !== 1 ? 's' : ''} pendiente${overdueCount !== 1 ? 's' : ''}.`
    : 'Todo al día. ¡Buen trabajo!';

  const quickActions = [
    { label: 'Registrar Ingreso', icon: Wallet, color: 'bg-success/10 text-success hover:bg-success/20', onClick: () => setIncomeFormOpen(true) },
    { label: 'Registrar Egreso', icon: ArrowUpRight, color: 'bg-destructive/10 text-destructive hover:bg-destructive/20', onClick: () => setExpenseFormOpen(true) },
    { label: 'Comisión Rápida', icon: Coins, color: 'bg-primary/10 text-primary hover:bg-primary/20', onClick: () => setQuickCommOpen(true) },
    { label: 'Nueva Propiedad', icon: Building2, color: 'bg-info/10 text-info hover:bg-info/20', onClick: () => setPropertyFormOpen(true) },
    { label: 'Agregar Cliente', icon: Users, color: 'bg-info/10 text-info hover:bg-info/20', onClick: () => setClientFormOpen(true) },
    { label: 'Agendar Visita', icon: Calendar, color: 'bg-success/10 text-success hover:bg-success/20', onClick: () => setVisitFormOpen(true) },
  ];

  return (
    <MainLayout title={`Hola, ${firstName}`} subtitle={subtitle}
      action={{ label: 'Nueva Propiedad', onClick: () => setPropertyFormOpen(true) }}>
      <div className="space-y-8">
        {/* Admin: solo propiedades y clientes activos — sin finanzas ni comisiones */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <StatCard title="Propiedades Totales" value={String(propertyCount ?? '...')} icon={Building2} iconColor="text-primary" delay={0} onClick={() => navigate('/properties')} />
          <StatCard title="Clientes Activos" value={String(clientCount ?? '...')} icon={Users} iconColor="text-info" delay={100} onClick={() => navigate('/clients')} />
          <StatCard title="Cobros por Vencer" value={String(receivableCounters?.nearDue ?? 0)} icon={Clock} iconColor="text-warning" delay={200} onClick={() => navigate('/finanzas?tab=control-cobros')} />
          <StatCard title="Cobros Vencidos" value={String(receivableCounters?.overdue ?? 0)} icon={AlertTriangle} iconColor="text-destructive" delay={300} onClick={() => navigate('/finanzas?tab=control-cobros')} />
        </div>

        {/* Alertas operativas y resumen de contratos */}
        <DashboardWidgets />
        <BirthdayWidget />

        {/* Resumen de propiedades */}
        <PropertyOverview />

        {/* Acciones Rápidas */}
        <div className="bg-card rounded-2xl shadow-sm p-6 animate-slide-up opacity-0" style={{ animationDelay: '600ms', animationFillMode: 'forwards' }}>
          <h3 className="font-display text-lg font-semibold text-foreground mb-4">Acciones Rápidas</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {quickActions.map((action) => (
              <button key={action.label} onClick={action.onClick}
                className={`flex flex-col items-center gap-3 p-4 rounded-2xl transition-all duration-200 ${action.color}`}>
                <action.icon className="w-6 h-6" strokeWidth={1.5} />
                <span className="text-sm font-medium">{action.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Reflexión del día — colapsable al final */}
        <DailyVerseBanner />
      </div>

      <PropertyFormDialog open={propertyFormOpen} onOpenChange={setPropertyFormOpen} property={null} />
      <ClientFormDialog open={clientFormOpen} onOpenChange={setClientFormOpen} />
      <IncomeFormDialog open={incomeFormOpen} onOpenChange={setIncomeFormOpen} />
      <ExpenseFormDialog open={expenseFormOpen} onOpenChange={setExpenseFormOpen} />
      <VisitFormDialog open={visitFormOpen} onOpenChange={setVisitFormOpen} />
      <QuickCommissionDialog open={quickCommOpen} onOpenChange={setQuickCommOpen} />
    </MainLayout>
  );
};

export default AdminDashboard;
