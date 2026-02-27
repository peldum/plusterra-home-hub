import { Construction } from 'lucide-react';
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  whatsapp?: string;
}

export const PortalMaintenancePage = ({ whatsapp }: Props) => {
  const { data: settings } = useQuery({
    queryKey: ['portal-maintenance-logo'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('portal_settings')
        .select('logo_url_webp')
        .limit(1)
        .single();
      if (error) throw error;
      return data as { logo_url_webp: string | null };
    },
    staleTime: 5 * 60 * 1000,
  });

  const waLink = whatsapp
    ? `https://wa.me/${whatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent('Hola, tengo una consulta sobre propiedades.')}`
    : null;

  return (
    <div className="min-h-screen bg-[#00447C] flex flex-col items-center justify-center relative overflow-hidden px-4">
      {/* Animated background shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-white/5"
          animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-[#FC5100]/10"
          animate={{ scale: [1, 1.15, 1], rotate: [0, -60, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute top-1/4 right-1/4 w-64 h-64 rounded-full bg-white/[0.03]"
          animate={{ y: [0, -30, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* Content */}
      <motion.div
        className="relative z-10 text-center max-w-lg"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      >
        {/* Logo */}
        <motion.div
          className="mx-auto mb-8"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
        >
          {settings?.logo_url_webp ? (
            <img src={settings.logo_url_webp} alt="Logo" className="h-20 mx-auto object-contain drop-shadow-2xl" />
          ) : (
            <div className="w-20 h-20 mx-auto rounded-2xl bg-[#FC5100] flex items-center justify-center shadow-2xl shadow-[#FC5100]/30">
              <span className="text-white font-black text-2xl tracking-tight">P+</span>
            </div>
          )}
        </motion.div>

        <motion.h1
          className="text-white text-3xl sm:text-4xl font-bold tracking-tight mb-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          Sitio en Mantenimiento
        </motion.h1>

        <motion.div
          className="flex items-center justify-center gap-2 mb-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <div className="h-px w-12 bg-white/30" />
          <Construction className="w-5 h-5 text-[#FC5100]" />
          <div className="h-px w-12 bg-white/30" />
        </motion.div>

        <motion.p
          className="text-white/70 text-base sm:text-lg leading-relaxed mb-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          Estamos trabajando para ofrecerte una mejor experiencia.
          <br className="hidden sm:block" />
          Volveremos muy pronto con novedades.
        </motion.p>

        {/* Animated construction bars */}
        <motion.div
          className="flex items-end justify-center gap-1.5 mb-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
        >
          {[40, 60, 80, 55, 70, 45, 65].map((h, i) => (
            <motion.div
              key={i}
              className="w-3 rounded-t bg-gradient-to-t from-[#FC5100] to-[#FC5100]/60"
              initial={{ height: 0 }}
              animate={{ height: h }}
              transition={{ delay: 1 + i * 0.1, type: 'spring', stiffness: 100 }}
            />
          ))}
        </motion.div>

        {/* Contact info */}
        <motion.p
          className="text-white/60 text-sm sm:text-base mb-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.0 }}
        >
          Si necesitás atención o tenés alguna consulta,<br />
          comunicate con nosotros por WhatsApp:
        </motion.p>

        {/* WhatsApp CTA */}
        {waLink && (
          <motion.a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-[#25D366] hover:bg-[#20BD5A] text-white font-bold text-lg shadow-xl shadow-[#25D366]/30 transition-all"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
          >
            <WhatsAppIcon className="w-6 h-6" />
            Escribinos por WhatsApp
          </motion.a>
        )}

        {/* Footer brand */}
        <motion.p
          className="text-white/30 text-xs mt-16 tracking-wide"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
        >
          © {new Date().getFullYear()} Plusterra Inmobiliaria
        </motion.p>
      </motion.div>
    </div>
  );
};
