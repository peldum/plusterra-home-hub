import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
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
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Propiedades', href: '/propiedades', icon: Building2 },
  { name: 'Clientes', href: '/clientes', icon: Users },
  { name: 'Finanzas', href: '/finanzas', icon: Wallet },
  { name: 'Contratos', href: '/contratos', icon: FileText },
  { name: 'Agentes', href: '/agentes', icon: UserCog },
  { name: 'Configuración', href: '/configuracion', icon: Settings },
];

export const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

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
              <div className="w-10 h-10 rounded-lg bg-sidebar-primary flex items-center justify-center">
                <Building2 className="w-6 h-6 text-sidebar-primary-foreground" />
              </div>
              <div>
                <h1 className="font-display text-xl font-bold text-sidebar-foreground">
                  Plusterra
                </h1>
                <p className="text-xs text-sidebar-foreground/60">Gestión Inmobiliaria</p>
              </div>
            </div>
          )}
          {collapsed && (
            <div className="w-10 h-10 mx-auto rounded-lg bg-sidebar-primary flex items-center justify-center">
              <Building2 className="w-6 h-6 text-sidebar-primary-foreground" />
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
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
                <span className="text-sm font-semibold text-sidebar-foreground">JD</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">
                  Juan Díaz
                </p>
                <p className="text-xs text-sidebar-foreground/60 truncate">
                  SuperAdmin
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
              <button className="p-2 rounded-lg hover:bg-sidebar-accent transition-colors text-sidebar-foreground/60 hover:text-destructive">
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
};
