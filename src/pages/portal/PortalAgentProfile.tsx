import { useParams, Link } from 'react-router-dom';
import { usePublicListings } from '@/hooks/usePublicListings';
import { PortalPropertyCard } from '@/components/portal/PortalPropertyCard';
import { ArrowLeft, Loader2, User } from 'lucide-react';

const PortalAgentProfile = () => {
  const { id } = useParams<{ id: string }>();
  const { data: listings, isLoading } = usePublicListings();

  const agentListings = listings?.filter(p => p.captor_agent_id === id) || [];
  const agentName = agentListings[0]?.captor_name || 'Agente';

  if (isLoading) return (
    <div className="flex justify-center items-center min-h-[60vh]">
      <Loader2 className="w-8 h-8 animate-spin text-[#00447C]" />
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Link to="/portal/propiedades" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[#00447C] mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Volver
      </Link>

      <div className="flex items-center gap-4 mb-8">
        <div className="w-16 h-16 rounded-full bg-[#00447C] flex items-center justify-center text-white">
          <User className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{agentName}</h1>
          <p className="text-gray-500 text-sm">
            {agentListings.length} propiedad{agentListings.length !== 1 ? 'es' : ''} publicada{agentListings.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {agentListings.length === 0 ? (
        <p className="text-center text-gray-500 py-12">Este agente no tiene propiedades publicadas.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {agentListings.map(p => <PortalPropertyCard key={p.id} property={p} />)}
        </div>
      )}
    </div>
  );
};

export default PortalAgentProfile;
