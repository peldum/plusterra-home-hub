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
  Kanban,
  Target,
  HelpCircle,
  Globe,
  Inbox,
  BookOpen,
  Megaphone,
  Gauge,
  FileSearch,
  ChevronLeft,
  ChevronRight,
  Briefcase,
  CalendarDays,
  GitCompareArrows,
  type LucideIcon,
} from 'lucide-react';
import { useUnreadNotificationCount } from '@/hooks/useNotifications';
import { usePendingSugerenciasCount } from '@/hooks/useSugerencias';
import { useOpenReportesCount } from '@/hooks/useReportesSoporte';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getNewArticleCount } from '@/pages/HelpCenter';

/* ------------------------------------------------------------------ */
/*  Navigation structure with role-based visibility                   */
/* ------------------------------------------------------------------ */

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  superadminOnly?: boolean;
  adminOnly?: boolean;
  agentOnly?: boolean;
  agentHidden?: boolean;
  /** @deprecated no longer used — secretaria has full admin access */
  secretariaHidden?: boolean;
  adminVisible?: boolean;
  keyControlOnly?: boolean;
  agentKeyOnly?: boolean;
  secretariaReadOnly?: boolean;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

/* ------------------------------------------------------------------ */
/*  Sections for ADMIN roles (superadmin, admin, accounting, secretaria) */
/* ------------------------------------------------------------------ */
const adminSections: NavSection[] = [
  {
    label: '',
    items: [
      { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    ],
  },
  {
    label: 'OPERACIONES',
    items: [
      { name: 'Propiedades', href: '/propiedades', icon: Building2 },
      { name: 'Catálogo', href: '/disponibles', icon: Eye },
      { name: 'Seguimiento de Clientes', href: '/pipeline', icon: Kanban },
      { name: 'Contratos', href: '/contratos', icon: FileText },
      { name: 'Pedidos Clientes', href: '/pedidos-clientes', icon: ClipboardList },
      { name: 'Retiro de Llaves', href: '/retiro-llaves', icon: ScanLine, agentKeyOnly: true },
    ],
  },
  {
    label: 'ADMINISTRACIÓN',
    items: [
      { name: 'Clientes', href: '/clientes', icon: Users },
      { name: 'Propietarios', href: '/propietarios', icon: UserCheck },
      { name: 'Administración', href: '/edificios', icon: Building2 },
      { name: 'Inventario', href: '/inventario', icon: Package },
      { name: 'Agentes', href: '/agentes', icon: UserCog, secretariaReadOnly: true },
      { name: 'Proveedores', href: '/proveedores', icon: Wrench },
      { name: 'Mantenimiento', href: '/mantenimiento', icon: ClipboardList },
    ],
  },
  {
    label: 'FINANZAS',
    items: [
      { name: 'Finanzas', href: '/finanzas', icon: Wallet },
      { name: 'Control de Llaves', href: '/control-llaves', icon: Key, keyControlOnly: true },
      { name: 'Auditoría Financiera', href: '/auditoria-financiera', icon: FileSearch },
      { name: 'Tareas Internas', href: '/tareas-internas', icon: ClipboardList },
    ],
  },
  {
    label: 'COMUNICACIÓN',
    items: [
      { name: 'Comunicaciones', href: '/comunicaciones', icon: Megaphone },
    ],
  },
  {
    label: 'PORTAL PÚBLICO',
    items: [
      { name: 'Portal Web', href: '/portal-admin', icon: Globe, adminOnly: true },
      { name: 'Blog & Proyectos', href: '/portal-admin/blog', icon: BookOpen, adminOnly: true },
      { name: 'Leads Portal', href: '/portal-admin/leads', icon: Inbox, adminVisible: true },
    ],
  },
  {
    label: 'SISTEMA',
    items: [
      { name: 'KPI Ejecutivo', href: '/kpi-ejecutivo', icon: Crown, superadminOnly: true },
      { name: 'Insight', href: '/insight', icon: Brain, superadminOnly: true },
      { name: 'Cartera Privada', href: '/cartera-privada', icon: Briefcase, superadminOnly: true },
      { name: 'Centro de Control', href: '/centro-control', icon: Gauge, superadminOnly: true },
      { name: 'QA Validación', href: '/qa', icon: ShieldCheck, superadminOnly: true },
      { name: 'Roles y Permisos', href: '/roles-permisos', icon: ShieldCheck, superadminOnly: true },
      { name: 'Reporte Actividad', href: '/reporte-actividad', icon: FileSearch, superadminOnly: true },
      { name: 'Historial Cambios', href: '/historial-actualizaciones', icon: ClipboardList, superadminOnly: true },
      { name: 'Configuración', href: '/configuracion', icon: Settings, adminOnly: true },
      { name: 'Centro de Ayuda', href: '/ayuda', icon: HelpCircle },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Sections for AGENT role — reorganized per PDF specification        */
/* ------------------------------------------------------------------ */
const agentSections: NavSection[] = [
  {
    label: '',
    items: [
      { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    ],
  },
  {
    label: 'OPERACIONES',
    items: [
      { name: 'Propiedades', href: '/propiedades', icon: Building2 },
      { name: 'Catálogo', href: '/disponibles', icon: Eye },
      { name: 'Seguimiento de Clientes', href: '/pipeline', icon: Kanban },
      { name: 'Contratos', href: '/contratos', icon: FileText },
      { name: 'Pedidos Clientes', href: '/pedidos-clientes', icon: ClipboardList },
      { name: 'Retiro de Llaves', href: '/retiro-llaves', icon: ScanLine },
      { name: 'Mis Favoritos', href: '/mis-favoritos', icon: Star },
    ],
  },
  {
    label: 'PRODUCTIVIDAD',
    items: [
      { name: 'Mi Agenda', href: '/mi-agenda', icon: CalendarDays },
      { name: 'Mis Metas', href: '/mis-metas', icon: Target },
      { name: 'Mis Finanzas', href: '/mis-finanzas', icon: Wallet },
      { name: 'Mis Herramientas', href: '/mi-plan', icon: Star },
    ],
  },
  {
    label: 'COMUNICACIÓN',
    items: [
      { name: 'Comunicaciones', href: '/comunicaciones', icon: Megaphone },
      { name: 'Mi Perfil Portal', href: '/mi-perfil-portal', icon: Globe },
    ],
  },
  {
    label: 'SISTEMA',
    items: [
      { name: 'Centro de Ayuda', href: '/ayuda', icon: HelpCircle },
    ],
  },
];

/* Pick sections based on role */
const getSections = (role: string | null): NavSection[] => {
  if (role === 'agent') return agentSections;
  return adminSections;
};

/* ------------------------------------------------------------------ */

interface SidebarProps {
  onNavigate?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar = ({ onNavigate, collapsed = false, onToggleCollapse }: SidebarProps) => {
  const location = useLocation();
  const { profile, role, signOut } = useAuth();
  const { settings } = useBrandingSettings();
  const showKeyBadge = role === 'admin' || role === 'superadmin' || role === 'secretaria' || role === 'accounting';
  const { data: activeKeys } = useActiveKeyMovements(showKeyBadge);
  const activeKeyCount = showKeyBadge ? (activeKeys?.length ?? 0) : 0;
  const { data: unreadComms = 0 } = useUnreadNotificationCount();
  const { data: pendingSug = 0 } = usePendingSugerenciasCount();
  const { data: openReports = 0 } = useOpenReportesCount();
  const controlBadge = role === 'superadmin' ? pendingSug + openReports : 0;
  const helpNewCount = getNewArticleCount(role || 'agent');
  const shouldInvertExpandedLogo = !settings.logo_light_url;
  const shouldInvertCollapsedLogo = !settings.logo_dark_url && !settings.logo_light_url;

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

  const isAdminLike = role === 'admin' || role === 'superadmin' || role === 'accounting' || role === 'secretaria';

  const filterItem = (item: NavItem): boolean => {
    if (item.superadminOnly && role !== 'superadmin') return false;
    if (item.adminOnly && !isAdminLike) return false;
    if (item.agentOnly && role !== 'agent') return false;
    if (item.agentHidden && role === 'agent') return false;
    if (item.secretariaHidden && role === 'secretaria') return false;
    if (item.adminVisible && role === 'agent') return false;
    if (item.keyControlOnly && !isAdminLike) return false;
    if (item.agentKeyOnly && role !== 'agent') return false;
    if (item.secretariaReadOnly && role === 'agent') return false;
    return true;
  };

  const getBadge = (href: string): number => {
    if (href === '/control-llaves') return activeKeyCount;
    if (href === '/comunicaciones') return unreadComms;
    if (href === '/centro-control') return controlBadge;
    if (href === '/ayuda') return helpNewCount;
    return 0;
  };

  const getBadgeLabel = (href: string, count: number): string => {
    if (href === '/control-llaves') return `${count} fuera`;
    if (href === '/comunicaciones') return `${count} nuevo${count > 1 ? 's' : ''}`;
    if (href === '/ayuda') return `${count} nuevo${count > 1 ? 's' : ''}`;
    return `${count}`;
  };

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={`fixed left-0 top-0 z-40 h-screen bg-sidebar transition-all duration-300 flex flex-col ${
          collapsed ? 'w-[68px]' : 'w-64'
        }`}
      >
        {/* Logo + collapse toggle */}
        <div className="flex h-16 items-center justify-between px-3 border-b border-sidebar-border shrink-0">
          {!collapsed ? (
            <img
              src={settings.logo_light_url || logoHorizontal}
              alt={settings.brand_name}
              className={`h-9 w-auto object-contain ${shouldInvertExpandedLogo ? 'brightness-0 invert' : ''}`}
            />
          ) : (
            <img
              src={settings.logo_dark_url || settings.logo_light_url || logoVertical}
              alt={settings.brand_name}
              className={`h-8 w-auto object-contain mx-auto ${shouldInvertCollapsedLogo ? 'brightness-0 invert' : ''}`}
            />
          )}
          {onToggleCollapse && !collapsed && (
            <button
              onClick={onToggleCollapse}
              className="p-1 rounded-md text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
            >
              <ChevronLeft className="w-4 h-4" strokeWidth={1.5} />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2 px-2 space-y-1 scrollbar-thin">
          {getSections(role).map((section) => {
            const visibleItems = section.items.filter(filterItem);
            if (visibleItems.length === 0) return null;

            return (
              <div key={section.label || 'top'} className="mb-1">
                {/* Section label */}
                {section.label && !collapsed && (
                  <p className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-sidebar-foreground/35 select-none">
                    {section.label}
                  </p>
                )}
                {section.label && collapsed && (
                  <div className="mx-auto w-8 border-t border-sidebar-foreground/10 mt-3 mb-2" />
                )}

                {/* Items */}
                {visibleItems.map((item) => {
                  const isActive = location.pathname === item.href;
                  const badge = getBadge(item.href);

                  const link = (
                    <NavLink
                      key={item.href}
                      to={item.href}
                      onClick={onNavigate}
                      className={`sidebar-nav-item group ${isActive ? 'active' : ''} ${collapsed ? 'justify-center px-0' : ''}`}
                    >
                      <div className="relative flex-shrink-0">
                        <item.icon
                          className={`w-[18px] h-[18px] transition-colors ${
                            isActive ? 'text-sidebar-primary' : 'text-sidebar-foreground/50 group-hover:text-sidebar-foreground/80'
                          }`}
                          strokeWidth={1.5}
                        />
                        {badge > 0 && collapsed && (
                          <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[8px] font-bold leading-none px-0.5">
                            {badge > 9 ? '9+' : badge}
                          </span>
                        )}
                      </div>
                      {!collapsed && (
                        <span className="flex-1 flex items-center justify-between min-w-0">
                          <span className={`text-[13px] truncate ${isActive ? 'font-medium text-sidebar-foreground' : 'text-sidebar-foreground/70'}`}>
                            {item.name}
                          </span>
                          {badge > 0 && (
                            <span className="ml-auto text-[10px] font-medium bg-destructive/15 text-destructive px-1.5 py-0.5 rounded-full shrink-0">
                              {getBadgeLabel(item.href, badge)}
                            </span>
                          )}
                        </span>
                      )}
                    </NavLink>
                  );

                  if (collapsed) {
                    return (
                      <Tooltip key={item.href}>
                        <TooltipTrigger asChild>{link}</TooltipTrigger>
                        <TooltipContent side="right" className="text-xs">
                          {item.name}
                          {badge > 0 && <span className="ml-1 text-destructive">({badge})</span>}
                        </TooltipContent>
                      </Tooltip>
                    );
                  }

                  return link;
                })}
              </div>
            );
          })}
        </nav>

        {/* User section */}
        <div className="border-t border-sidebar-border p-3 shrink-0" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}>
          {!collapsed ? (
            <>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center overflow-hidden flex-shrink-0">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs font-semibold text-sidebar-foreground">{initials}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-sidebar-foreground truncate">
                    {profile?.full_name || 'Usuario'}
                  </p>
                  <p className="text-[10px] text-sidebar-foreground/50 truncate">
                    {role ? roleLabel[role] || role : '...'}
                  </p>
                </div>
              </div>
              <button
                onClick={signOut}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sidebar-foreground/60 text-xs transition-colors hover:bg-destructive/15 hover:text-destructive"
              >
                <LogOut className="w-3.5 h-3.5" strokeWidth={1.5} />
                <span>Cerrar sesión</span>
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center overflow-hidden">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt={profile?.full_name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs font-semibold text-sidebar-foreground">{initials}</span>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">{profile?.full_name}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={signOut}
                    className="p-1.5 rounded-md text-sidebar-foreground/50 hover:text-destructive hover:bg-destructive/15 transition-colors"
                  >
                    <LogOut className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">Cerrar sesión</TooltipContent>
              </Tooltip>
              {onToggleCollapse && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={onToggleCollapse}
                      className="p-1.5 rounded-md text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="text-xs">Expandir menú</TooltipContent>
                </Tooltip>
              )}
            </div>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
};
