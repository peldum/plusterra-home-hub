import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Star, Video, Globe, BadgeCheck, Eye, FileText, BarChart3,
  CheckCircle2, MessageSquare, Layout, QrCode, MapPin, Sparkles,
} from 'lucide-react';

const MyPlanPage = () => {
  const { user } = useAuth();

  // Leads count
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
    enabled: !!user,
  });

  const allFeatures = [
    { icon: FileText, label: 'Publicaciones ilimitadas', desc: 'Sin límite de propiedades' },
    { icon: MessageSquare, label: 'WhatsApp directo', desc: 'Los clientes te contactan directo' },
    { icon: Globe, label: 'Presencia en el portal', desc: 'Tu perfil visible para todos' },
    { icon: MapPin, label: 'Ubicación en mapa', desc: 'Tus propiedades en el mapa interactivo' },
    { icon: FileText, label: 'PDF de propiedad', desc: 'Ficha profesional descargable' },
    { icon: Star, label: 'Propiedades destacadas', desc: 'Aparecen primero en el portal' },
    { icon: Video, label: 'Video embebido', desc: 'YouTube o Vimeo en la ficha' },
    { icon: Globe, label: 'Tour virtual 360°', desc: 'Matterport, Kuula y más' },
    { icon: BadgeCheck, label: 'Agente Verificado', desc: 'Badge visible en tu perfil público' },
    { icon: Layout, label: 'Landing page exclusiva', desc: 'Tu propia página de agente en el portal' },
    { icon: QrCode, label: 'Código QR personalizado', desc: 'Compartí tu perfil con un QR profesional' },
    { icon: BarChart3, label: 'Leads recibidos', desc: 'Estadísticas de contactos por propiedad' },
    { icon: Eye, label: 'Mayor visibilidad', desc: 'Prioridad visual en listados' },
  ];

  return (
    <MainLayout title="Mis Herramientas" subtitle="Todas las funcionalidades disponibles para tu perfil">
      {/* Active badge */}
      <div className="relative overflow-hidden rounded-2xl p-6 mb-8 bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10 border border-primary/20">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />
        <div className="relative flex items-center gap-4">
          <div className="p-3 rounded-xl shadow-lg bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-primary/30">
            <Sparkles className="w-7 h-7" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-foreground font-display">
              Acceso Completo
            </h2>
            <p className="text-sm text-muted-foreground">
              Tenés acceso a todas las herramientas y funcionalidades del sistema.
            </p>
          </div>
          <span className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-success/20 text-success text-xs font-bold">
            <CheckCircle2 className="w-3.5 h-3.5" /> Activo
          </span>
        </div>

        {/* Stats */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="rounded-xl bg-white/60 dark:bg-white/5 backdrop-blur-sm p-3 text-center">
            <p className="text-2xl font-bold text-foreground font-display">{leadsCount ?? '—'}</p>
            <p className="text-xs text-muted-foreground">Leads recibidos</p>
          </div>
          <div className="rounded-xl bg-white/60 dark:bg-white/5 backdrop-blur-sm p-3 text-center">
            <BadgeCheck className="w-5 h-5 mx-auto text-primary mb-1" />
            <p className="text-xs text-muted-foreground">Agente Verificado</p>
          </div>
          <div className="rounded-xl bg-white/60 dark:bg-white/5 backdrop-blur-sm p-3 text-center col-span-2 sm:col-span-1">
            <Star className="w-5 h-5 mx-auto text-[hsl(var(--warning))] fill-[hsl(var(--warning))] mb-1" />
            <p className="text-xs text-muted-foreground">Prioridad en portal</p>
          </div>
        </div>
      </div>

      {/* Features List */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-muted/30">
          <h3 className="font-display font-semibold text-foreground">Funcionalidades disponibles</h3>
        </div>
        <div className="divide-y divide-border">
          {allFeatures.map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex items-center gap-4 px-6 py-4 transition-colors">
              <div className="p-2 rounded-lg flex-shrink-0 bg-primary/10 text-primary">
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
              <div className="flex-shrink-0">
                <CheckCircle2 className="w-5 h-5 text-success" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </MainLayout>
  );
};

export default MyPlanPage;
