import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MapPin, Phone, Mail } from 'lucide-react';
import logoDefault from '@/assets/logo-plusterra-horizontal.png';
import logoBlancoDefault from '@/assets/plusterra-logo-blanco.png';
import plusterraIcon from '@/assets/plusterra-icon.png';

export const PortalFooter = () => {
  const { data: settings } = useQuery({
    queryKey: ['portal-footer-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('portal_settings')
        .select('company_address, company_phone, company_email, contact_phone, contact_email, facebook_url, instagram_url, blog_enabled, logo_url_webp, logo_dark_url, site_title, cta_icon_url, blocks_config, hero_title_font')
        .limit(1)
        .single();
      if (error) throw error;
      return data as any;
    },
    staleTime: 5 * 60_000,
  });

  const getBlockColor = (blockId: string, fallback: string) => {
    const blocks = (settings?.blocks_config || []) as any[];
    const block = blocks.find((b: any) => b.id === blockId);
    return block?.config?.bg_color || fallback;
  };

  const getBlockFont = (blockId: string) => {
    const blocks = (settings?.blocks_config || []) as any[];
    const block = blocks.find((b: any) => b.id === blockId);
    return block?.config?.font || settings?.hero_title_font || undefined;
  };

  const phone = settings?.company_phone || settings?.contact_phone;
  const email = settings?.company_email || settings?.contact_email;

  const hasCustomLogo = Boolean(settings?.logo_url_webp);

  return (
    <footer className="text-white/80 mt-auto" style={{ backgroundColor: getBlockColor('footer', '#00447C'), fontFamily: getBlockFont('footer') ? `'${getBlockFont('footer')}', sans-serif` : undefined }}>
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <img
                src={settings?.logo_url_webp || logoDefault}
                alt={settings?.site_title || 'Plusterra'}
                className={`h-10 object-contain ${hasCustomLogo ? '' : 'brightness-0 invert'}`}
              />
            </div>
            <p className="text-sm text-white/60">
              Nos dedicamos al servicio de compra, venta y alquiler de inmuebles. Apoyamos y damos seguimiento en todo el proceso.
            </p>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold text-white mb-3 text-sm uppercase tracking-wider">Ubicación y Contacto</h3>
            <div className="space-y-2 text-sm">
              {settings?.company_address && (
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 mt-0.5 text-[#FC5100] flex-shrink-0" />
                  <span className="text-white/70">{settings.company_address}</span>
                </div>
              )}
              {phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-[#FC5100] flex-shrink-0" />
                  <a href={`tel:${phone}`} className="text-white/70 hover:text-white">{phone}</a>
                </div>
              )}
              {email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[#FC5100] flex-shrink-0" />
                  <a href={`mailto:${email}`} className="text-white/70 hover:text-white">{email}</a>
                </div>
              )}
            </div>
          </div>

          {/* Links */}
          <div>
            <h3 className="font-semibold text-white mb-3 text-sm uppercase tracking-wider">Información</h3>
            <ul className="space-y-1.5 text-sm">
              <li><Link to="/portal" className="text-white/70 hover:text-white">Inicio</Link></li>
              <li><Link to="/portal/propiedades?tipo=venta" className="text-white/70 hover:text-white">Ventas</Link></li>
              <li><Link to="/portal/propiedades?tipo=alquiler" className="text-white/70 hover:text-white">Alquiler</Link></li>
              <li><Link to="/portal/proyectos" className="text-white/70 hover:text-white">Proyectos</Link></li>
              <li><Link to="/portal/nosotros" className="text-white/70 hover:text-white">Nuestra Empresa</Link></li>
              <li><Link to="/portal/agentes" className="text-white/70 hover:text-white">Agentes</Link></li>
              {settings?.blog_enabled && <li><Link to="/portal/blog" className="text-white/70 hover:text-white">Blog</Link></li>}
              <li><Link to="/portal/contacto" className="text-white/70 hover:text-white">Contáctenos</Link></li>
            </ul>
          </div>

          {/* CTA */}
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full border-2 border-[#FC5100] flex items-center justify-center mb-3 overflow-hidden bg-white">
              <img src={settings?.cta_icon_url?.trim() || plusterraIcon} alt="Plusterra" className="w-10 h-10 object-contain" />
            </div>
            <p className="text-white font-semibold mb-2">Oferte su inmueble con nosotros</p>
            <Link
              to="/portal/contacto"
              className="px-6 py-2 bg-[#00447C] hover:bg-[#003366] text-white font-medium rounded-lg transition-colors text-sm"
            >
              OFERTAR
            </Link>
          </div>
        </div>

        <div className="border-t border-white/20 mt-8 pt-4 flex flex-col md:flex-row items-center justify-between gap-2">
          <p className="text-xs text-white/50">
            © {new Date().getFullYear()} Plusterra. Todos los derechos reservados.
          </p>
          {(settings?.facebook_url || settings?.instagram_url) && (
            <div className="flex gap-2">
              {settings.facebook_url && (
                <a href={settings.facebook_url} target="_blank" rel="noopener noreferrer"
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-xs font-bold">f</a>
              )}
              {settings.instagram_url && (
                <a href={settings.instagram_url} target="_blank" rel="noopener noreferrer"
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-xs font-bold">ig</a>
              )}
            </div>
          )}
        </div>
      </div>
    </footer>
  );
};
