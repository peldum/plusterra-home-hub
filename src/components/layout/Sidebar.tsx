import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useBrandingSettings } from '@/hooks/useBrandingSettings';
import logoHorizontal from '@/assets/logo-plusterra-horizontal.png';
import logoVertical from '@/assets/logo-plusterra-vertical.png';
import {
  LayoutDashboard,
  Building2,
  Users,
  Wallet,
  FileText,
  UserCog,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Bell,
  Wrench,
  ClipboardList,
  Package,
  Crown,
  Brain,
  Eye,
  UserCheck,
  ShieldCheck,
  Star,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Propiedades', href: '/propiedades', icon: Building2 },
  { name: 'Disponibles', href: '/disponibles', icon: Eye },
  { name: 'Mis Favoritos', href: '/mis-favoritos', icon: Star, agentOnly: true },
  { name: 'Clientes', href: '/clientes', icon: Users, agentHidden: true },
  { name: 'Propietarios', href: '/propietarios', icon: UserCheck, agentHidden: true },
  { name: 'Finanzas', href: '/finanzas', icon: Wallet, secretariaHidden: true },
  { name: 'Contratos', href: '/contratos', icon: FileText },
  { name: 'Inventario', href: '/inventario', icon: Package, agentHidden: true },
  { name: 'Agentes', href: '/agentes', icon: UserCog, secretariaReadOnly: true },
  { name: 'Proveedores', href: '/proveedores', icon: Wrench, agentHidden: true },
  { name: 'Mantenimiento', href: '/mantenimiento', icon: ClipboardList },
  { name: 'KPI Ejecutivo', href: '/kpi-ejecutivo', icon: Crown, superadminOnly: true },
  { name: 'Insight', href: '/insight', icon: Brain, superadminOnly: true },
  { name: 'QA Validación', href: '/qa', icon: ShieldCheck, superadminOnly: true },
  { name: 'Configuración', href: '/configuracion', icon: Settings, adminOnly: true },
];

export const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { profile, role, signOut, isAdmin } = useAuth();
  const { settings } = useBrandingSettings();

  const initials = profile?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || '??';

  const roleLabel: Record<string, string> = {
    superadmin: 'SuperAdmin',
    admin: 'Administrador',
    agent: 'Agente',
    accounting: 'Contabilidad',
    secretaria: 'Secretaría',
  };

  const filteredNav = navigation.filter((item) => {
    if ('superadminOnly' in item && item.superadminOnly && role !== 'superadmin') return false;
    if ('adminOnly' in item && item.adminOnly && role !== 'superadmin' && role !== 'admin') return false;
    if ('agentOnly' in item && item.agentOnly && role !== 'agent') return false;
    if ('agentHidden' in item && item.agentHidden && (role === 'agent' || role === 'secretaria')) return false;
    if ('secretariaHidden' in item && item.secretariaHidden && role === 'secretaria') return false;
    // secretariaReadOnly: visible for admin/superadmin/secretaria, hidden for agent/accounting
    if ('secretariaReadOnly' in item && item.secretariaReadOnly) {
      if (role === 'agent' || role === 'accounting') return false;
    }
    return true;
  });

  return (
    <aside
      className={`fixed left-0 top-0 z-40 h-screen bg-sidebar transition-all duration-300 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-20 items-center justify-between px-4 border-b border-sidebar-border">
          {!collapsed && (
            <div className="flex items-center gap-3">
              <img
                src={settings.logo_light_url || logoHorizontal}
                alt={settings.brand_name}
                className="h-12 w-auto object-contain brightness-0 invert"
              />
            </div>
          )}
          {collapsed && (
            <div className="mx-auto">
              <img
                src={settings.logo_dark_url || settings.logo_light_url || logoVertical}
                alt={settings.brand_name}
                className="h-10 w-auto object-contain brightness-0 invert"
              />
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
          {filteredNav.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <NavLink
                key={item.name}
                to={item.href}
                className={`nav-item ${isActive ? 'active' : ''}`}
              >
                <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-sidebar-primary-foreground' : ''}`} />
                {!collapsed && <span>{item.name}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* User section */}
        <div className="border-t border-sidebar-border p-4">
          {!collapsed && (
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-sidebar-accent flex items-center justify-center">
                <span className="text-sm font-semibold text-sidebar-foreground">{initials}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">
                  {profile?.full_name || 'Usuario'}
                </p>
                <p className="text-xs text-sidebar-foreground/60 truncate">
                  {role ? roleLabel[role] || role : '...'}
                </p>
              </div>
              <button className="p-2 rounded-lg hover:bg-sidebar-accent transition-colors">
                <Bell className="w-4 h-4 text-sidebar-foreground/60" />
              </button>
            </div>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-sidebar-accent text-sidebar-foreground text-sm transition-colors hover:bg-sidebar-accent/80"
            >
              {collapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <>
                  <ChevronLeft className="w-4 h-4" />
                  <span>Colapsar</span>
                </>
              )}
            </button>
            {!collapsed && (
              <button
                onClick={signOut}
                className="p-2 rounded-lg hover:bg-sidebar-accent transition-colors text-sidebar-foreground/60 hover:text-destructive"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
};