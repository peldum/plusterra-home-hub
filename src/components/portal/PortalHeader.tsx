import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Home, Building2, Map, Users, Briefcase, BookOpen, Phone, Info, ShoppingCart, Key, Sparkles } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import logoDefault from '@/assets/logo-plusterra-horizontal.png';

const NAV_ITEMS_BASE = [
  { label: 'Inicio', path: '/portal', icon: Home },
  { label: 'Ventas', path: '/portal/propiedades?tipo=venta', icon: ShoppingCart },
  { label: 'Alquileres', path: '/portal/propiedades?tipo=alquiler', icon: Key },
  { label: 'Agentes', path: '/portal/agentes', icon: Users },
  { label: 'Nuestra Empresa', path: '/portal/nosotros', icon: Info },
  { label: 'Quiz', path: '/portal/quiz', icon: Sparkles, highlight: false },
  { label: 'Contáctenos', path: '/portal/contacto', icon: Phone, highlight: true },
];

export const PortalHeader = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const fullPath = location.pathname + location.search;

  const { data: settings } = useQuery({
    queryKey: ['portal-header-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('portal_settings')
        .select('logo_url_webp, site_title, blog_enabled, contact_email, contact_phone, showroom_enabled, blocks_config')
        .limit(1)
        .single();
      if (error) throw error;
      return data as { logo_url_webp: string | null; site_title: string; blog_enabled: boolean; contact_email: string | null; contact_phone: string | null; showroom_enabled: boolean; blocks_config: any[] };
    },
    staleTime: 5 * 60 * 1000,
  });

  const getBlockColor = (blockId: string, fallback: string) => {
    const blocks = (settings?.blocks_config || []) as any[];
    const block = blocks.find((b: any) => b.id === blockId);
    return block?.config?.bg_color || fallback;
  };

  // Favicon is set statically in index.html — no dynamic override needed

  const navItems = [...NAV_ITEMS_BASE];
  
  // Insert Proyectos after Alquileres if showroom enabled
  if (settings?.showroom_enabled) {
    const alquilerIdx = navItems.findIndex(i => i.path.includes('tipo=alquiler'));
    navItems.splice(alquilerIdx + 1, 0, { label: 'Proyectos', path: '/portal/proyectos', icon: Briefcase, highlight: false } as any);
  }
  
  if (settings?.blog_enabled) {
    const contactIdx = navItems.findIndex(i => i.path === '/portal/contacto');
    navItems.splice(contactIdx, 0, { label: 'Blog', path: '/portal/blog', icon: BookOpen, highlight: false } as any);
  }

  const isActive = (path: string) => {
    if (path === '/portal') return fullPath === '/portal' || fullPath === '/portal/';
    return fullPath.startsWith(path);
  };

  const hasCustomLogo = Boolean(settings?.logo_url_webp);

  return (
    <header className="sticky top-0 z-50 text-white shadow-lg" style={{ backgroundColor: getBlockColor('header', '#00447C') }}>
      {/* Top bar with contact info */}
      <div className="text-white/70 text-xs hidden md:block" style={{ backgroundColor: getBlockColor('header_top', '#003366') }}>
        <div className="max-w-7xl mx-auto px-4 py-1.5 flex items-center justify-end gap-4">
          {settings?.contact_email && <span>{settings.contact_email}</span>}
          {settings?.contact_phone && <span>{settings.contact_phone}</span>}
        </div>
      </div>

      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 h-16">
        {/* Logo */}
        <Link to="/portal" className="flex items-center gap-2 font-bold text-xl tracking-tight flex-shrink-0">
          <img
            src={settings?.logo_url_webp || logoDefault}
            alt={settings?.site_title || 'Plusterra'}
            className={`h-12 object-contain ${hasCustomLogo ? '' : 'brightness-0 invert'}`}
          />
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-0.5">
          {navItems.map(item => {
            const active = isActive(item.path);
            const isHighlight = (item as any).highlight;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  isHighlight
                    ? 'bg-[#FC5100] hover:bg-[#e54900] text-white'
                    : active
                      ? 'bg-white/20 text-white'
                      : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Mobile toggle */}
        <button
          className="lg:hidden p-2 rounded-lg hover:bg-white/10"
          onClick={() => setMobileOpen(v => !v)}
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <nav className="lg:hidden border-t border-white/20 px-4 py-3 space-y-1">
          {navItems.map(item => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active ? 'bg-white/20' : 'hover:bg-white/10'
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      )}
    </header>
  );
};
