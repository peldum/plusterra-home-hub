import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Home, Building2, Map } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const NAV_ITEMS = [
  { label: 'Inicio', path: '/portal', icon: Home },
  { label: 'Propiedades', path: '/portal/propiedades', icon: Building2 },
  { label: 'Mapa', path: '/portal/mapa', icon: Map },
];

export const PortalHeader = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const { data: settings } = useQuery({
    queryKey: ['portal-header-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('portal_settings')
        .select('logo_url_webp, site_title')
        .limit(1)
        .single();
      if (error) throw error;
      return data as { logo_url_webp: string | null; site_title: string };
    },
    staleTime: 5 * 60 * 1000,
  });

  return (
    <header className="sticky top-0 z-50 bg-[#00447C] text-white shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 h-16">
        {/* Logo */}
        <Link to="/portal" className="flex items-center gap-2 font-bold text-xl tracking-tight">
          {settings?.logo_url_webp ? (
            <img src={settings.logo_url_webp} alt={settings.site_title || 'Logo'} className="h-9 object-contain" />
          ) : (
            <>
              <div className="w-8 h-8 rounded-lg bg-[#FC5100] flex items-center justify-center text-white font-black text-sm">
                P+
              </div>
              <span className="hidden sm:inline">Plusterra</span>
            </>
          )}
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.map(item => {
            const active = location.pathname === item.path ||
              (item.path !== '/portal' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-white/20 text-white'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Mobile toggle */}
        <button
          className="md:hidden p-2 rounded-lg hover:bg-white/10"
          onClick={() => setMobileOpen(v => !v)}
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <nav className="md:hidden border-t border-white/20 px-4 py-3 space-y-1">
          {NAV_ITEMS.map(item => {
            const active = location.pathname === item.path;
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
