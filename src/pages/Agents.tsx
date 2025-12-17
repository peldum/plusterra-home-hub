import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import {
  Shield,
  Building2,
  DollarSign,
  TrendingUp,
  MoreVertical,
  Mail,
  Phone,
  Star,
} from 'lucide-react';

const agents = [
  {
    id: 1,
    name: 'Juan Díaz',
    email: 'juan.diaz@plusterra.com',
    phone: '+54 11 1234-5678',
    role: 'SuperAdmin',
    properties: 0,
    sales: 0,
    commission: 0,
    rating: 5.0,
    status: 'activo',
    avatar: 'JD',
  },
  {
    id: 2,
    name: 'Carlos Méndez',
    email: 'carlos.mendez@plusterra.com',
    phone: '+54 11 2345-6789',
    role: 'Gerente',
    properties: 12,
    sales: 8,
    commission: 125000,
    rating: 4.9,
    status: 'activo',
    avatar: 'CM',
  },
  {
    id: 3,
    name: 'Laura Fernández',
    email: 'laura.fernandez@plusterra.com',
    phone: '+54 11 3456-7890',
    role: 'Agente',
    properties: 9,
    sales: 5,
    commission: 78500,
    rating: 4.8,
    status: 'activo',
    avatar: 'LF',
  },
  {
    id: 4,
    name: 'Miguel Torres',
    email: 'miguel.torres@plusterra.com',
    phone: '+54 11 4567-8901',
    role: 'Agente',
    properties: 7,
    sales: 4,
    commission: 52000,
    rating: 4.6,
    status: 'activo',
    avatar: 'MT',
  },
  {
    id: 5,
    name: 'Ana Rodríguez',
    email: 'ana.rodriguez@plusterra.com',
    phone: '+54 11 5678-9012',
    role: 'Agente',
    properties: 5,
    sales: 2,
    commission: 28000,
    rating: 4.5,
    status: 'activo',
    avatar: 'AR',
  },
  {
    id: 6,
    name: 'Pedro Gómez',
    email: 'pedro.gomez@plusterra.com',
    phone: '+54 11 6789-0123',
    role: 'Administrador',
    properties: 0,
    sales: 0,
    commission: 0,
    rating: 0,
    status: 'activo',
    avatar: 'PG',
  },
];

const roleConfig = {
  SuperAdmin: { color: 'bg-secondary/10 text-secondary border-secondary/20', icon: Shield, level: 1 },
  Administrador: { color: 'bg-primary/10 text-primary border-primary/20', icon: Shield, level: 2 },
  Gerente: { color: 'bg-info/10 text-info border-info/20', icon: Shield, level: 3 },
  Agente: { color: 'bg-success/10 text-success border-success/20', icon: Building2, level: 4 },
};

const Agents = () => {
  const [selectedRole, setSelectedRole] = useState<string>('all');

  const filteredAgents = selectedRole === 'all'
    ? agents
    : agents.filter(a => a.role === selectedRole);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <MainLayout
      title="Agentes y Roles"
      subtitle="Gestión del equipo y permisos"
      action={{
        label: 'Nuevo Usuario',
        onClick: () => console.log('Nuevo usuario'),
      }}
    >
      {/* Role hierarchy info */}
      <div className="bg-card border border-border rounded-xl p-6 mb-6 animate-slide-up opacity-0" style={{ animationDelay: '0ms', animationFillMode: 'forwards' }}>
        <h3 className="font-display text-lg font-semibold text-foreground mb-4">
          Jerarquía de Roles
        </h3>
        <div className="flex flex-wrap items-center gap-4">
          {Object.entries(roleConfig).map(([role, config], index) => (
            <div key={role} className="flex items-center gap-2">
              <div className={`p-2 rounded-lg ${config.color}`}>
                <config.icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{role}</p>
                <p className="text-xs text-muted-foreground">Nivel {config.level}</p>
              </div>
              {index < Object.entries(roleConfig).length - 1 && (
                <div className="w-8 h-px bg-border mx-2" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-6">
        {['all', 'SuperAdmin', 'Administrador', 'Gerente', 'Agente'].map((role) => (
          <button
            key={role}
            onClick={() => setSelectedRole(role)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedRole === role
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {role === 'all' ? 'Todos' : role}
          </button>
        ))}
      </div>

      {/* Agents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAgents.map((agent, index) => {
          const config = roleConfig[agent.role as keyof typeof roleConfig];
          return (
            <div
              key={agent.id}
              className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-all duration-300 animate-scale-in opacity-0"
              style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'forwards' }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-lg font-semibold text-primary">{agent.avatar}</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{agent.name}</h3>
                    <span className={`badge-status text-xs border mt-1 ${config.color}`}>
                      {agent.role}
                    </span>
                  </div>
                </div>
                <button className="p-2 hover:bg-muted rounded-lg transition-colors">
                  <MoreVertical className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="w-4 h-4" />
                  <span className="truncate">{agent.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="w-4 h-4" />
                  <span>{agent.phone}</span>
                </div>
              </div>

              {agent.role === 'Agente' || agent.role === 'Gerente' ? (
                <>
                  <div className="grid grid-cols-3 gap-4 py-4 border-t border-border">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <p className="text-lg font-bold text-foreground">{agent.properties}</p>
                      <p className="text-xs text-muted-foreground">Props.</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                        <TrendingUp className="w-4 h-4" />
                      </div>
                      <p className="text-lg font-bold text-foreground">{agent.sales}</p>
                      <p className="text-xs text-muted-foreground">Ventas</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                        <Star className="w-4 h-4" />
                      </div>
                      <p className="text-lg font-bold text-foreground">{agent.rating}</p>
                      <p className="text-xs text-muted-foreground">Rating</p>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-border">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Comisión acumulada</span>
                      <span className="font-semibold text-success">{formatCurrency(agent.commission)}</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="pt-4 border-t border-border">
                  <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                    <Shield className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {agent.role === 'SuperAdmin' 
                        ? 'Acceso total al sistema'
                        : 'Acceso administrativo'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </MainLayout>
  );
};

export default Agents;
