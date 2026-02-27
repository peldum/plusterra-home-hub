import { usePortalAgents } from '@/hooks/usePortalAgents';
import { BadgeCheck } from 'lucide-react';
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon';

export const PortalAgentsSection = () => {
  const { data: agents, isLoading } = usePortalAgents();

  if (isLoading || !agents || agents.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 py-12">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Nuestros Agentes</h2>
        <p className="text-gray-500 text-sm mt-1">Profesionales a tu servicio</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {agents.map(agent => {
          const phone = (agent.public_phone_whatsapp || '').replace(/\D/g, '');
          const waUrl = phone
            ? `https://wa.me/${phone.startsWith('595') ? phone : '595' + phone}?text=${encodeURIComponent('Hola, vi su perfil en Plusterra. ¿Podemos conversar?')}`
            : null;
          const isPremium = agent.plan_agente === 'premium';

          return (
            <div
              key={agent.id}
              className={`bg-white rounded-xl overflow-hidden hover:shadow-lg transition-shadow text-center p-5 relative ${
                isPremium ? 'border-2 border-amber-400/50 ring-1 ring-amber-400/20' : 'border border-gray-200'
              }`}
            >
              {/* Avatar */}
              <div className="relative w-20 h-20 mx-auto mb-3">
                <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-100">
                  {agent.public_photo_url_webp ? (
                    <img
                      src={agent.public_photo_url_webp}
                      alt={agent.public_name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-2xl font-bold">
                      {agent.public_name?.[0]?.toUpperCase() || '?'}
                    </div>
                  )}
                </div>
                {isPremium && (
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-sm">
                    <BadgeCheck className="w-5 h-5 text-[#00447C] fill-[#00447C]/10" />
                  </div>
                )}
              </div>

              {/* Name + verified inline */}
              <div className="flex items-center justify-center gap-1">
                <h3 className="font-semibold text-gray-900">{agent.public_name}</h3>
              </div>

              {isPremium && (
                <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-semibold text-[#00447C] bg-[#00447C]/8 px-2 py-0.5 rounded-full">
                  <BadgeCheck className="w-3 h-3" /> Agente Verificado
                </span>
              )}

              {agent.areas && (
                <p className="text-xs text-gray-500 mt-1.5 line-clamp-1">{agent.areas}</p>
              )}
              {agent.bio && (
                <p className="text-xs text-gray-500 mt-2 line-clamp-2">{agent.bio}</p>
              )}
              {waUrl && (
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-full transition-colors"
                >
                  <WhatsAppIcon className="w-4 h-4" />
                  WhatsApp
                </a>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};
