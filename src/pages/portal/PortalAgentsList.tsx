import { Link } from 'react-router-dom';
import { usePortalAgents } from '@/hooks/usePortalAgents';
import { usePublicListings } from '@/hooks/usePublicListings';
import { MessageCircle, Star, Loader2, Building2 } from 'lucide-react';

const PortalAgentsList = () => {
  const { data: agents, isLoading } = usePortalAgents();
  const { data: listings } = usePublicListings();

  const getAgentListingCount = (agentId: string) =>
    listings?.filter(p => p.captor_agent_id === agentId).length || 0;

  if (isLoading) return (
    <div className="flex justify-center items-center min-h-[60vh]">
      <Loader2 className="w-8 h-8 animate-spin text-[#00447C]" />
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-gray-900">Nuestros Agentes</h1>
        <p className="text-gray-500 mt-2">Profesionales inmobiliarios a tu servicio</p>
      </div>

      {!agents || agents.length === 0 ? (
        <div className="text-center py-16">
          <Building2 className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">No hay agentes publicados actualmente.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {agents.map(agent => {
            const phone = (agent.public_phone_whatsapp || '').replace(/\D/g, '');
            const waUrl = phone
              ? `https://wa.me/${phone.startsWith('595') ? phone : '595' + phone}?text=${encodeURIComponent('Hola, vi su perfil en Plusterra. ¿Podemos conversar?')}`
              : null;
            const count = getAgentListingCount(agent.agent_id);

            return (
              <div
                key={agent.id}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow text-center p-6 relative"
              >
                {agent.is_featured && (
                  <div className="absolute top-3 right-3">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  </div>
                )}
                <Link to={`/portal/agentes/${agent.agent_id}`}>
                  <div className="w-24 h-24 mx-auto rounded-full overflow-hidden bg-gray-100 mb-4">
                    {agent.public_photo_url_webp ? (
                      <img src={agent.public_photo_url_webp} alt={agent.public_name} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-3xl font-bold">
                        {agent.public_name?.[0]?.toUpperCase() || '?'}
                      </div>
                    )}
                  </div>
                  <h3 className="font-semibold text-gray-900 text-lg">{agent.public_name}</h3>
                </Link>
                {agent.areas && <p className="text-sm text-gray-500 mt-1">{agent.areas}</p>}
                {agent.bio && <p className="text-sm text-gray-500 mt-2 line-clamp-3">{agent.bio}</p>}
                <p className="text-xs text-gray-400 mt-2">{count} propiedad{count !== 1 ? 'es' : ''}</p>
                <div className="flex gap-2 justify-center mt-4">
                  {waUrl && (
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-full transition-colors"
                    >
                      <MessageCircle className="w-4 h-4" /> WhatsApp
                    </a>
                  )}
                  <Link
                    to={`/portal/agentes/${agent.agent_id}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#00447C] hover:bg-[#003366] text-white text-sm font-medium rounded-full transition-colors"
                  >
                    Ver propiedades
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PortalAgentsList;
