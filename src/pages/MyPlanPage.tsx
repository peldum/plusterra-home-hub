import { MainLayout } from '@/components/layout/MainLayout';
import { useAgentPlan } from '@/hooks/useAgentPlan';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Crown, Star, Video, Globe, BadgeCheck, Eye, FileText, BarChart3,
  CheckCircle2, Lock, MessageSquare,
} from 'lucide-react';

const MyPlanPage = () => {
  const { user } = useAuth();
  const { data: agentPlan, isLoading } = useAgentPlan();
  const isPremium = agentPlan === 'premium';

  // Leads count for premium agents
  const { data: leadsCount } = useQuery({
    queryKey: ['agent-leads-count', user?.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('portal_leads')
        .select('id', { count: 'exact', head: true })
        .eq('captor_agent_id', user!.id);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!user && isPremium,
  });

  const allFeatures = [
    { icon: FileText, label: 'Publicaciones ilimitadas', desc: 'Sin límite de propiedades', included: true },
    { icon: MessageSquare, label: 'WhatsApp directo', desc: 'Los clientes te contactan directo', included: true },
    { icon: Globe, label: 'Presencia en el portal', desc: 'Tu perfil visible para todos', included: true },
    { icon: Eye, label: 'Ubicación en mapa', desc: 'Tus propiedades en el mapa interactivo', included: true },
    { icon: FileText, label: 'PDF de propiedad', desc: 'Ficha profesional descargable', included: true },
    { icon: Star, label: 'Propiedades destacadas', desc: 'Aparecen primero en el portal', premium: true },
    { icon: Video, label: 'Video embebido', desc: 'YouTube o Vimeo en la ficha', premium: true },
    { icon: Globe, label: 'Tour virtual 360°', desc: 'Matterport, Kuula y más', premium: true },
    { icon: BadgeCheck, label: 'Agente Verificado', desc: 'Badge visible en tu perfil público', premium: true },
    { icon: BarChart3, label: 'Leads recibidos', desc: 'Estadísticas de contactos por propiedad', premium: true },
    { icon: Eye, label: 'Mayor visibilidad', desc: 'Prioridad visual en listados', premium: true },
  ];

  if (isLoading) {
    return (
      <MainLayout title="Mi Plan">
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Mi Plan" subtitle="Conocé los beneficios de tu suscripción">
      {/* Current Plan Card */}
      <div className={`relative overflow-hidden rounded-2xl p-6 mb-8 ${
        isPremium
          ? 'bg-gradient-to-br from-amber-500/15 via-yellow-400/10 to-orange-500/10 border-2 border-amber-400/40'
          : 'bg-card border border-border'
      }`}>
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-amber-400/10 rounded-full blur-3xl" />
        <div className="relative flex items-center gap-4">
          <div className={`p-3 rounded-xl shadow-lg ${
            isPremium
              ? 'bg-gradient-to-br from-amber-500 to-yellow-500 text-white shadow-amber-500/30'
              : 'bg-muted text-muted-foreground'
          }`}>
            <Crown className="w-7 h-7" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-foreground font-display">
              {isPremium ? 'Plan Premium' : 'Plan Básico'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isPremium
                ? 'Disfrutás de todos los beneficios exclusivos'
                : 'Tenés acceso completo al sistema con funciones esenciales'}
            </p>
          </div>
          {isPremium && (
            <span className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-bold">
              <Star className="w-3.5 h-3.5 fill-current" /> Activo
            </span>
          )}
        </div>

        {/* Premium Stats */}
        {isPremium && (
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="rounded-xl bg-white/60 dark:bg-white/5 backdrop-blur-sm p-3 text-center">
              <p className="text-2xl font-bold text-foreground font-display">{leadsCount ?? '—'}</p>
              <p className="text-xs text-muted-foreground">Leads recibidos</p>
            </div>
            <div className="rounded-xl bg-white/60 dark:bg-white/5 backdrop-blur-sm p-3 text-center">
              <BadgeCheck className="w-5 h-5 mx-auto text-[#00447C] dark:text-blue-400 mb-1" />
              <p className="text-xs text-muted-foreground">Agente Verificado</p>
            </div>
            <div className="rounded-xl bg-white/60 dark:bg-white/5 backdrop-blur-sm p-3 text-center col-span-2 sm:col-span-1">
              <Star className="w-5 h-5 mx-auto text-amber-500 fill-amber-500 mb-1" />
              <p className="text-xs text-muted-foreground">Prioridad en portal</p>
            </div>
          </div>
        )}
      </div>

      {/* Features List */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-muted/30">
          <h3 className="font-display font-semibold text-foreground">Funcionalidades incluidas</h3>
        </div>
        <div className="divide-y divide-border">
          {allFeatures.map(({ icon: Icon, label, desc, premium }) => {
            const available = !premium || isPremium;
            return (
              <div key={label} className={`flex items-center gap-4 px-6 py-4 transition-colors ${
                !available ? 'opacity-50' : ''
              }`}>
                <div className={`p-2 rounded-lg flex-shrink-0 ${
                  premium
                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                    : 'bg-primary/10 text-primary'
                }`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground flex items-center gap-2">
                    {label}
                    {premium && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-400 uppercase tracking-wide">
                        Premium
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
                <div className="flex-shrink-0">
                  {available ? (
                    <CheckCircle2 className="w-5 h-5 text-success" />
                  ) : (
                    <Lock className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CTA for basic users */}
      {!isPremium && (
        <div className="mt-8 text-center rounded-2xl border-2 border-dashed border-amber-400/40 bg-amber-50/50 dark:bg-amber-950/20 p-8">
          <Crown className="w-10 h-10 mx-auto text-amber-500 mb-3" />
          <h3 className="text-lg font-bold text-foreground font-display mb-2">
            ¿Querés desbloquear todo?
          </h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
            Contactá a tu administrador para activar el Plan Premium y acceder a todas las herramientas exclusivas.
          </p>
          <p className="text-xs text-muted-foreground">
            Escribí a tu admin o al soporte de Plusterra para más información.
          </p>
        </div>
      )}
    </MainLayout>
  );
};

export default MyPlanPage;
