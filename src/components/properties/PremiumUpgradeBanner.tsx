import { Crown, Video, Star, Globe } from 'lucide-react';

const benefits = [
  { icon: Star, label: 'Propiedades destacadas', desc: 'Aparecen primero en el portal' },
  { icon: Video, label: 'Video embebido', desc: 'YouTube o Vimeo en la ficha' },
  { icon: Globe, label: 'Tour virtual 360°', desc: 'Matterport, Kuula y más' },
];

export const PremiumUpgradeBanner = () => (
  <div className="relative overflow-hidden rounded-xl border-2 border-dashed border-amber-400/50 bg-gradient-to-br from-amber-50/80 via-yellow-50/60 to-orange-50/40 dark:from-amber-950/30 dark:via-yellow-950/20 dark:to-orange-950/10 p-5">
    <div className="absolute -top-6 -right-6 w-24 h-24 bg-amber-400/10 rounded-full blur-2xl" />
    <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-yellow-400/10 rounded-full blur-xl" />
    
    <div className="relative">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 rounded-lg bg-gradient-to-br from-amber-500 to-yellow-500 text-white shadow-lg shadow-amber-500/30">
          <Crown className="w-4 h-4" />
        </div>
        <h4 className="font-bold text-amber-800 dark:text-amber-300 text-sm">Plan Premium</h4>
        <span className="ml-auto px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 text-[10px] font-bold tracking-wide uppercase">
          Disponible
        </span>
      </div>

      <p className="text-xs text-amber-700/70 dark:text-amber-400/60 mb-3">
        Potenciá tus publicaciones con herramientas exclusivas:
      </p>

      <div className="space-y-2">
        {benefits.map(({ icon: Icon, label, desc }) => (
          <div key={label} className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center flex-shrink-0">
              <Icon className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <span className="text-xs font-semibold text-amber-900 dark:text-amber-200">{label}</span>
              <span className="text-[10px] text-amber-600/60 dark:text-amber-400/50 ml-1">— {desc}</span>
            </div>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-amber-600/50 dark:text-amber-500/40 mt-3 text-center">
        Contactá a tu administrador para activar el plan Premium
      </p>
    </div>
  </div>
);
