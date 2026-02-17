import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAgents, useDeleteAgent, useUpdateAgent, useMarkFeePaid, AgentProfile } from '@/hooks/useAgents';
import { AgentFormDialog } from '@/components/agents/AgentFormDialog';
import { useAuth } from '@/contexts/AuthContext';
import {
  Shield, Building2, TrendingUp, MoreVertical, Mail, Phone,
  Loader2, Pencil, Trash2, Ban, CheckCircle2, DollarSign, CircleDollarSign,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

const roleConfig: Record<string, { label: string; color: string; level: number }> = {
  superadmin: { label: 'SuperAdmin', color: 'bg-secondary/10 text-secondary border-secondary/20', level: 1 },
  admin: { label: 'Administrador', color: 'bg-primary/10 text-primary border-primary/20', level: 2 },
  accounting: { label: 'Contabilidad', color: 'bg-warning/10 text-warning border-warning/20', level: 3 },
  agent: { label: 'Agente', color: 'bg-success/10 text-success border-success/20', level: 4 },
};

const feeStatusConfig: Record<string, { label: string; color: string }> = {
  up_to_date: { label: 'Al día', color: 'bg-success/10 text-success border-success/20' },
  due: { label: 'Por vencer', color: 'bg-warning/10 text-warning border-warning/20' },
  overdue: { label: 'Vencido', color: 'bg-destructive/10 text-destructive border-destructive/20' },
};

const filterRoles = [
  { key: 'all', label: 'Todos' },
  { key: 'superadmin', label: 'SuperAdmin' },
  { key: 'admin', label: 'Administrador' },
  { key: 'accounting', label: 'Contabilidad' },
  { key: 'agent', label: 'Agente' },
];

const getInitials = (name: string) => {
  return name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount);
};

const Agents = () => {
  const { data: agents, isLoading } = useAgents();
  const deleteMutation = useDeleteAgent();
  const updateMutation = useUpdateAgent();
  const markFeePaidMutation = useMarkFeePaid();
  const { user } = useAuth();

  const [selectedRole, setSelectedRole] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<AgentProfile | null>(null);

  const filtered = (agents || []).filter(a => {
    if (selectedRole !== 'all' && a.role !== selectedRole) return false;
    return true;
  });

  const handleEdit = (agent: AgentProfile) => {
    setEditingAgent(agent);
    setFormOpen(true);
  };

  const handleBlock = async (agent: AgentProfile) => {
    const newStatus = agent.status === 'blocked' ? 'active' : 'blocked';
    const label = newStatus === 'blocked' ? 'bloquear' : 'activar';
    if (confirm(`¿Está seguro de ${label} a ${agent.full_name}?`)) {
      await updateMutation.mutateAsync({ user_id: agent.id, status: newStatus });
    }
  };

  const handleDelete = async (agent: AgentProfile) => {
    if (confirm(`¿Está seguro de eliminar a ${agent.full_name}? Esta acción no se puede deshacer.`)) {
      await deleteMutation.mutateAsync(agent.id);
    }
  };

  const handleMarkPaid = async (agent: AgentProfile) => {
    if (confirm(`¿Marcar como al día el canon de ${agent.full_name} por ${formatCurrency(agent.monthly_fee)}?`)) {
      await markFeePaidMutation.mutateAsync({ agentId: agent.id, amount: agent.monthly_fee });
    }
  };

  return (
    <MainLayout
      title="Agentes y Roles"
      subtitle="Gestión del equipo y permisos"
      action={{
        label: 'Nuevo Usuario',
        onClick: () => { setEditingAgent(null); setFormOpen(true); },
      }}
    >
      {/* Role hierarchy */}
      <div className="bg-card border border-border rounded-xl p-6 mb-6 animate-slide-up opacity-0" style={{ animationDelay: '0ms', animationFillMode: 'forwards' }}>
        <h3 className="font-display text-lg font-semibold text-foreground mb-4">Jerarquía de Roles</h3>
        <div className="flex flex-wrap items-center gap-4">
          {Object.entries(roleConfig).map(([role, config], index) => (
            <div key={role} className="flex items-center gap-2">
              <div className={`p-2 rounded-lg ${config.color}`}>
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{config.label}</p>
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
        {filterRoles.map(f => (
          <button
            key={f.key}
            onClick={() => setSelectedRole(f.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedRole === f.key
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Shield className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No hay usuarios</h3>
          <p className="text-muted-foreground">Cree un nuevo usuario para comenzar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((agent, index) => {
            const config = roleConfig[agent.role] || roleConfig.agent;
            const isBlocked = agent.status === 'blocked';
            const isSelf = agent.id === user?.id;
            const feeConfig = feeStatusConfig[agent.fee_status];
            const showFee = agent.monthly_fee > 0;

            return (
              <div
                key={agent.id}
                className={`bg-card border rounded-xl p-6 hover:shadow-lg transition-all duration-300 animate-scale-in opacity-0 ${
                  isBlocked ? 'border-destructive/30 opacity-70' : 'border-border'
                }`}
                style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'forwards' }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center ${isBlocked ? 'bg-destructive/10' : 'bg-primary/10'}`}>
                      <span className={`text-lg font-semibold ${isBlocked ? 'text-destructive' : 'text-primary'}`}>
                        {getInitials(agent.full_name)}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{agent.full_name}</h3>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className={`badge-status text-xs border ${config.color}`}>{config.label}</span>
                        {isBlocked && (
                          <span className="badge-status text-xs border bg-destructive/10 text-destructive border-destructive/20">Bloqueado</span>
                        )}
                        {showFee && (
                          <span className={`badge-status text-xs border ${feeConfig.color}`}>{feeConfig.label}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  {!isSelf && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-2 hover:bg-muted rounded-lg transition-colors">
                          <MoreVertical className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(agent)}>
                          <Pencil className="w-4 h-4 mr-2" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleBlock(agent)}>
                          {isBlocked ? (
                            <><CheckCircle2 className="w-4 h-4 mr-2" /> Activar</>
                          ) : (
                            <><Ban className="w-4 h-4 mr-2" /> Bloquear</>
                          )}
                        </DropdownMenuItem>
                        {showFee && agent.fee_status !== 'up_to_date' && (
                          <DropdownMenuItem onClick={() => handleMarkPaid(agent)}>
                            <CircleDollarSign className="w-4 h-4 mr-2" /> Marcar como al día
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleDelete(agent)} className="text-destructive">
                          <Trash2 className="w-4 h-4 mr-2" /> Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{agent.email}</span>
                  </div>
                  {agent.phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="w-4 h-4 flex-shrink-0" />
                      <span>{agent.phone}</span>
                    </div>
                  )}
                </div>

                {/* Fee info */}
                {showFee && (
                  <div className="flex items-center justify-between py-3 border-t border-border">
                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Canon:</span>
                      <span className="font-semibold text-foreground">{formatCurrency(agent.monthly_fee)}/mes</span>
                    </div>
                    {agent.last_paid_month && (
                      <span className="text-xs text-muted-foreground">Últ: {agent.last_paid_month}</span>
                    )}
                  </div>
                )}

                {(agent.role === 'agent' || agent.property_count > 0 || agent.deal_count > 0) ? (
                  <div className="grid grid-cols-3 gap-4 py-4 border-t border-border">
                    <div className="text-center">
                      <Building2 className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
                      <p className="text-lg font-bold text-foreground">{agent.property_count}</p>
                      <p className="text-xs text-muted-foreground">Props.</p>
                    </div>
                    <div className="text-center">
                      <TrendingUp className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
                      <p className="text-lg font-bold text-foreground">{agent.deal_count}</p>
                      <p className="text-xs text-muted-foreground">Operaciones</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-foreground">{agent.total_commission > 0 ? formatCurrency(agent.total_commission) : '-'}</p>
                      <p className="text-xs text-muted-foreground">Comisión</p>
                    </div>
                  </div>
                ) : (
                  <div className="pt-4 border-t border-border">
                    <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                      <Shield className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {agent.role === 'superadmin' ? 'Acceso total al sistema' : 'Acceso administrativo'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <AgentFormDialog open={formOpen} onOpenChange={setFormOpen} agent={editingAgent} />
    </MainLayout>
  );
};

export default Agents;
