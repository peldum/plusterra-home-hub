import { User, BadgeCheck, Phone } from 'lucide-react';
import type { PortalAgent } from '@/hooks/usePortalAgents';
import type { PublicListing } from '@/hooks/usePublicListings';

interface Props {
  agent: PortalAgent | undefined;
  agentName: string;
  listings: PublicListing[];
}

export const AgentHeroSection = ({ agent, agentName, listings }: Props) => {
  const isPremium = agent?.plan_agente === 'premium' || agent?.plan_agente === 'elite';
  const hasVideo = listings.some(p => p.video_url);
  const hasTour = listings.some(p => p.tour_360_url);

  const whatsappUrl = agent?.public_phone_whatsapp
    ? `https://wa.me/${agent.public_phone_whatsapp.replace(/\D/g, '')}`
    : null;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-[hsl(207,100%,20%)] to-[hsl(209,100%,14%)] text-white">
      {/* Decorative orbs */}
      <div className="absolute -top-20 -right-20 w-60 h-60 bg-secondary/20 rounded-full blur-3xl" />
      <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-accent/15 rounded-full blur-3xl" />
      <div className="absolute top-1/2 right-1/4 w-32 h-32 bg-white/5 rounded-full blur-2xl" />

      <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 md:gap-10 p-8 md:p-12">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <div className="w-28 h-28 md:w-36 md:h-36 rounded-full overflow-hidden ring-4 ring-white/20 shadow-2xl">
            {agent?.public_photo_url_webp ? (
              <img src={agent.public_photo_url_webp} alt={agentName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-white/10 flex items-center justify-center">
                <User className="w-14 h-14 text-white/60" />
              </div>
            )}
          </div>
          {isPremium && (
            <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-amber-400 to-yellow-300 rounded-full p-1.5 shadow-lg shadow-amber-500/40 animate-[pulse_3s_ease-in-out_infinite]">
              <BadgeCheck className="w-5 h-5 text-amber-900" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="text-center md:text-left flex-1">
          <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
            {isPremium && (
              <span className="relative inline-flex items-center gap-1 bg-gradient-to-r from-amber-400/90 to-yellow-300/90 text-amber-900 text-[10px] font-bold px-3 py-1 rounded-full overflow-hidden">
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
                <span className="relative">⭐ AGENTE VERIFICADO</span>
              </span>
            )}
          </div>
          <h1 className="text-3xl md:text-4xl font-bold font-display tracking-tight">{agentName}</h1>
          {agent?.areas && (
            <p className="text-white/70 text-sm mt-2 max-w-md">{agent.areas}</p>
          )}
          {agent?.bio && (
            <p className="text-white/50 text-xs mt-2 max-w-lg line-clamp-2">{agent.bio}</p>
          )}

          {/* Quick badges */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mt-4">
            {listings.length > 0 && (
              <span className="bg-white/10 backdrop-blur-sm text-white/90 text-xs px-3 py-1.5 rounded-full border border-white/10">
                {listings.length} propiedad{listings.length !== 1 ? 'es' : ''}
              </span>
            )}
            {hasVideo && (
              <span className="bg-white/10 backdrop-blur-sm text-white/90 text-xs px-3 py-1.5 rounded-full border border-white/10">
                🎬 Con video
              </span>
            )}
            {hasTour && (
              <span className="bg-white/10 backdrop-blur-sm text-white/90 text-xs px-3 py-1.5 rounded-full border border-white/10">
                🌐 Tour 360°
              </span>
            )}
          </div>
        </div>

        {/* CTA */}
        {whatsappUrl && (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-white font-semibold px-6 py-3 rounded-full shadow-lg shadow-[#25D366]/30 transition-all hover:scale-105 hover:shadow-xl flex-shrink-0"
          >
            <Phone className="w-4 h-4" />
            Contactar
          </a>
        )}
      </div>
    </div>
  );
};
