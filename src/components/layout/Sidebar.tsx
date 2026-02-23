import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useBrandingSettings } from '@/hooks/useBrandingSettings';
import { useActiveKeyMovements } from '@/hooks/useKeyMovements';
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
  Wrench,
  ClipboardList,
  Package,
  Crown,
  Brain,
  Eye,
  UserCheck,
  ShieldCheck,
  Star,
  Key,
  ScanLine,
} from 'lucide-react';
import { NotificationBell } from '@/components/notifications/NotificationBell';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Propiedades', href: '/propiedades', icon: Building2 },
  { name: 'Disponibles', href: '/disponibles', icon: Eye },
  { name: 'Mis Favoritos', href: '/mis-favoritos', icon: Star, agentOnly: true },
  { name: 'Control de Llaves', href: '/control-llaves', icon: Key, keyControlOnly: true },
  { name: 'Retiro de Llaves', href: '/retiro-llaves', icon: ScanLine, agentKeyOnly: true },
  { name: 'Clientes', href: '/clientes', icon: Users, agentHidden: true },
  { name: 'Propietarios', href: '/propietarios', icon: UserCheck, agentHidden: true },
  { name: 'Edificios', href: '/edificios', icon: Building2, agentHidden: true },
  { name: 'Finanzas', href: '/finanzas', icon: Wallet, secretariaHidden: true, agentHidden: true },
  { name: 'Mis Finanzas', href: '/mis-finanzas', icon: Wallet, agentOnly: true },
  { name: 'Contratos', href: '/contratos', icon: FileText },
  { name: 'Inventario', href: '/inventario', icon: Package, agentHidden: true },
  { name: 'Agentes', href: '/agentes', icon: UserCog, secretariaReadOnly: true },
  { name: 'Proveedores', href: '/proveedores', icon: Wrench, agentHidden: true },
  { name: 'Mantenimiento', href: '/mantenimiento', icon: ClipboardList, agentHidden: true },
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
  const showKeyBadge = role === 'admin' || role === 'superadmin' || role === 'secretaria' || role === 'accounting';
  const { data: activeKeys } = useActiveKeyMovements(showKeyBadge);
  const activeKeyCount = showKeyBadge ? (activeKeys?.length ?? 0) : 0;

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
    accounting: 'Gerente',
    secretaria: 'Secretaría',
  };

  // accounting (Gerente) now has same visibility as admin
  const isAdminLike = role === 'admin' || role === 'superadmin' || role === 'accounting';
  const filteredNav = navigation.filter((item) => {
    if ('superadminOnly' in item && item.superadminOnly && role !== 'superadmin') return false;
    if ('adminOnly' in item && item.adminOnly && !isAdminLike) return false;
    if ('agentOnly' in item && item.agentOnly && role !== 'agent') return false;
    if ('agentHidden' in item && item.agentHidden && (role === 'agent' || role === 'secretaria')) return false;
    if ('secretariaHidden' in item && item.secretariaHidden && role === 'secretaria') return false;
    // keyControlOnly: visible for admin-like, secretaria (NOT agents)
    if ('keyControlOnly' in item && item.keyControlOnly) {
      if (!isAdminLike && role !== 'secretaria') return false;
    }
    // agentKeyOnly: visible ONLY for agents
    if ('agentKeyOnly' in item && item.agentKeyOnly) {
      if (role !== 'agent') return false;
    }
    // secretariaReadOnly: visible for admin-like/secretaria, hidden for agent
    if ('secretariaReadOnly' in item && item.secretariaReadOnly) {
      if (role === 'agent') return false;
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
            const keyBadge = item.href === '/control-llaves' && activeKeyCount > 0;
            return (
              <NavLink
                key={item.name}
                to={item.href}
                className={`nav-item ${isActive ? 'active' : ''}`}
              >
                <div className="relative flex-shrink-0">
                  <item.icon className={`w-5 h-5 ${isActive ? 'text-sidebar-primary-foreground' : ''}`} />
                  {keyBadge && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold leading-none px-1">
                      {activeKeyCount}
                    </span>
                  )}
                </div>
                {!collapsed && (
                  <span className="flex-1 flex items-center justify-between">
                    {item.name}
                    {keyBadge && (
                      <span className="ml-auto bg-destructive/15 text-destructive text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
                        {activeKeyCount} fuera
                      </span>
                    )}
                  </span>
                )}
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
              <NotificationBell className="hover:bg-sidebar-accent text-sidebar-foreground/60" />
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