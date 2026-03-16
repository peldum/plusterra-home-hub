import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import { BirthdayWidget } from '@/components/dashboard/BirthdayWidget';
import { useReceivableCounters } from '@/hooks/useReceivableCounters';
import { Building2, Users, Wallet, Calendar, AlertTriangle, Clock, ArrowUpRight, Coins } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const AdminDashboard = () => {
  const { user } = useAuth();
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

  const today = new Date().toLocaleDateString('es-AR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const quickActions = [
    { label: 'Registrar Ingreso', icon: Wallet, color: 'bg-success/10 text-success hover:bg-success/20', onClick: () => setIncomeFormOpen(true) },
    { label: 'Registrar Egreso', icon: ArrowUpRight, color: 'bg-destructive/10 text-destructive hover:bg-destructive/20', onClick: () => setExpenseFormOpen(true) },
    { label: 'Comisión Rápida', icon: Coins, color: 'bg-primary/10 text-primary hover:bg-primary/20', onClick: () => setQuickCommOpen(true) },
    { label: 'Nueva Propiedad', icon: Building2, color: 'bg-info/10 text-info hover:bg-info/20', onClick: () => setPropertyFormOpen(true) },
    { label: 'Agregar Cliente', icon: Users, color: 'bg-info/10 text-info hover:bg-info/20', onClick: () => setClientFormOpen(true) },
    { label: 'Agendar Visita', icon: Calendar, color: 'bg-success/10 text-success hover:bg-success/20', onClick: () => setVisitFormOpen(true) },
  ];

  return (
    <MainLayout title="Dashboard" subtitle={`Bienvenido de vuelta · ${today}`}
      action={{ label: 'Nueva Propiedad', onClick: () => setPropertyFormOpen(true) }}>
      <div className="mb-8"><DailyVerseBanner /></div>

      {/* Admin: solo propiedades y clientes activos — sin finanzas ni comisiones */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard title="Propiedades Totales" value={String(propertyCount ?? '...')} icon={Building2} iconColor="text-primary" delay={0} />
        <StatCard title="Clientes Activos" value={String(clientCount ?? '...')} icon={Users} iconColor="text-info" delay={100} />
        <StatCard title="Cobros por Vencer" value={String(receivableCounters?.nearDue ?? 0)} icon={Clock} iconColor="text-warning" delay={200} />
        <StatCard title="Cobros Vencidos" value={String(receivableCounters?.overdue ?? 0)} icon={AlertTriangle} iconColor="text-destructive" delay={300} />
      </div>

      {/* Alertas operativas y resumen de contratos */}
      <div className="mb-8"><DashboardWidgets /></div>
      <div className="mb-8"><BirthdayWidget /></div>

      {/* Resumen de propiedades — sin transacciones detalladas por agente */}
      <div className="mb-8"><PropertyOverview /></div>

      <div className="mt-8 p-6 bg-card border border-border rounded-xl animate-slide-up opacity-0" style={{ animationDelay: '600ms', animationFillMode: 'forwards' }}>
        <h3 className="font-display text-lg font-semibold text-foreground mb-4">Acciones Rápidas</h3>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
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
      <ExpenseFormDialog open={expenseFormOpen} onOpenChange={setExpenseFormOpen} />
      <VisitFormDialog open={visitFormOpen} onOpenChange={setVisitFormOpen} />
      <QuickCommissionDialog open={quickCommOpen} onOpenChange={setQuickCommOpen} />
    </MainLayout>
  );
};

export default AdminDashboard;
