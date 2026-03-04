import { useParams, Link, Navigate } from 'react-router-dom';
import { usePublicListings } from '@/hooks/usePublicListings';
import { usePortalAgents } from '@/hooks/usePortalAgents';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { AgentHeroSection } from '@/components/portal/agent/AgentHeroSection';
import { AgentStatsBar } from '@/components/portal/agent/AgentStatsBar';
import { FeaturedCarousel } from '@/components/portal/agent/FeaturedCarousel';
import { AgentListingsGrid } from '@/components/portal/agent/AgentListingsGrid';

const PortalAgentProfile = () => {
  const { id } = useParams<{ id: string }>();
  const { data: listings, isLoading } = usePublicListings();
  const { data: agents, isLoading: agentsLoading } = usePortalAgents();

  const agentListings = listings?.filter(p => p.captor_agent_id === id) || [];
  const portalAgent = agents?.find(a => a.agent_id === id);
  const agentName = portalAgent?.public_name || agentListings[0]?.captor_name || 'Agente';
  const isPremium = portalAgent?.plan_agente === 'premium' || portalAgent?.plan_agente === 'elite';

  if (isLoading || agentsLoading) return (
    <div className="flex justify-center items-center min-h-[60vh]">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  // Non-premium agents don't have a landing page
  if (!isPremium) {
    return <Navigate to="/portal/agentes" replace />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <Link to="/portal/agentes" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors">
        <ArrowLeft className="w-4 h-4" /> Volver a agentes
      </Link>

      <AgentHeroSection agent={portalAgent} agentName={agentName} listings={agentListings} />
      <AgentStatsBar listings={agentListings} />
      <FeaturedCarousel listings={agentListings} />
      <AgentListingsGrid listings={agentListings} agentName={agentName} />
    </div>
  );
};

export default PortalAgentProfile;
