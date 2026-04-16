import { AgentProfile } from '@/hooks/useAgents';
import {
  Building2, TrendingUp, MoreVertical, Mail,
  CheckCircle2, AlertTriangle, Ban, Pencil, Trash2,
  CircleDollarSign, Crown, Star, ChevronDown, ChevronUp, KeyRound,
} from 'lucide-react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useState } from 'react';

const roleConfig: Record<string, { label: string; color: string }> = {
  superadmin: { label: 'SuperAdmin', color: 'bg-secondary/10 text-secondary border-secondary/20' },
  admin: { label: 'Administrador', color: 'bg-primary/10 text-primary border-primary/20' },
  accounting: { label: 'Gerente', color: 'bg-warning/10 text-warning border-warning/20' },
  secretaria: { label: 'Secretaría', color: 'bg-info/10 text-info border-info/20' },
  agent: { label: 'Agente', color: 'bg-success/10 text-success border-success/20' },
};

const canonEstadoConfig: Record<string, { label: string; badgeClass: string }> = {
  AL_DIA: { label: 'Al día', badgeClass: 'bg-success/10 text-success border-success/20' },
  VENCIDO: { label: 'Vencido', badgeClass: 'bg-warning/10 text-warning border-warning/20' },
  MOROSO: { label: 'En mora', badgeClass: 'bg-destructive/10 text-destructive border-destructive/20' },
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount);

const getInitials = (name: string) =>
  name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();

interface Props {
  agents: (AgentProfile & {
    canon_estado?: string;
    canon_dias_atraso?: number;
    canon_monto_base?: number;
    canon_total_adeudado?: number;
    canon_interes_acumulado?: number;
    canon_periodo_actual?: string | null;
  })[];
  currentUserId?: string;
  onEdit: (agent: AgentProfile) => void;
  onBlock: (agent: AgentProfile) => void;
  onDelete: (agent: AgentProfile) => void;
  onMarkPaid: (agent: AgentProfile) => void;
  onTogglePaymentStatus: (agent: AgentProfile) => void;
  onTogglePlan: (agent: AgentProfile) => void;
  onResetPassword: (agent: AgentProfile) => void;
}

export const AgentListView = ({
  agents, currentUserId, onEdit, onBlock, onDelete, onMarkPaid, onTogglePaymentStatus, onTogglePlan, onResetPassword,
}: Props) => {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="font-semibold min-w-[200px]">Nombre</TableHead>
              <TableHead className="font-semibold">Rol</TableHead>
              <TableHead className="font-semibold">Plan</TableHead>
              <TableHead className="font-semibold text-center">Estado Pago</TableHead>
              <TableHead className="font-semibold text-right">Canon USD</TableHead>
              <TableHead className="font-semibold text-center">Días atraso</TableHead>
              <TableHead className="font-semibold text-center">Props.</TableHead>
              <TableHead className="font-semibold text-center">Oper.</TableHead>
              <TableHead className="font-semibold text-center">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {agents.map((agent, index) => {
              const config = roleConfig[agent.role] || roleConfig.agent;
              const isBlocked = agent.status === 'blocked';
              const isSelf = agent.id === currentUserId;
              const showFee = agent.monthly_fee > 0;
              const canonEstado = (agent.canon_estado || 'AL_DIA') as keyof typeof canonEstadoConfig;
              const estadoCfg = canonEstadoConfig[canonEstado] || canonEstadoConfig.AL_DIA;
              const diasAtraso = Number(agent.canon_dias_atraso) || 0;

              return (
                <TableRow
                  key={agent.id}
                  className={`transition-colors ${
                    isBlocked ? 'opacity-60' : ''
                  } ${index % 2 === 1 ? 'bg-muted/10' : ''} hover:bg-muted/30`}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                        isBlocked ? 'bg-destructive/10' : agent.payment_status === 'MOROSO' ? 'bg-warning/10' : 'bg-primary/10'
                      }`}>
                        <span className={`text-xs font-semibold ${
                          isBlocked ? 'text-destructive' : agent.payment_status === 'MOROSO' ? 'text-warning' : 'text-primary'
                        }`}>
                          {getInitials(agent.full_name)}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-foreground truncate">{agent.full_name}</p>
                        <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                          <Mail className="w-3 h-3 shrink-0" />
                          {agent.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full border font-medium ${config.color}`}>
                      {config.label}
                    </span>
                  </TableCell>

                  <TableCell>
                    {agent.role === 'agent' ? (
                      agent.plan_agente === 'premium' ? (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border bg-gradient-to-r from-amber-500/20 to-yellow-400/20 text-amber-700 dark:text-amber-300 border-amber-400/30 font-medium">
                          <Crown className="w-3 h-3" /> Premium
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Básico</span>
                      )
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>

                  <TableCell className="text-center">
                    {agent.role === 'agent' ? (
                      <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border font-bold ${estadoCfg.badgeClass}`}>
                        {canonEstado === 'AL_DIA' && <CheckCircle2 className="w-3 h-3" />}
                        {(canonEstado === 'VENCIDO' || canonEstado === 'MOROSO') && <AlertTriangle className="w-3 h-3" />}
                        {estadoCfg.label}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>

                  <TableCell className="text-right text-sm font-semibold">
                    {showFee ? formatCurrency(agent.monthly_fee) : '—'}
                  </TableCell>

                  <TableCell className="text-center">
                    {agent.role === 'agent' && diasAtraso > 0 ? (
                      <span className="text-sm font-semibold text-destructive">{diasAtraso}</span>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>

                  <TableCell className="text-center text-sm font-semibold">
                    {agent.property_count || 0}
                  </TableCell>

                  <TableCell className="text-center text-sm font-semibold">
                    {agent.deal_count || 0}
                  </TableCell>

                  <TableCell className="text-center">
                    {!isSelf && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1.5 hover:bg-muted rounded-lg transition-colors">
                            <MoreVertical className="w-4 h-4 text-muted-foreground" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onEdit(agent)}>
                            <Pencil className="w-4 h-4 mr-2" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onBlock(agent)}>
                            {isBlocked ? (
                              <><CheckCircle2 className="w-4 h-4 mr-2" /> Activar</>
                            ) : (
                              <><Ban className="w-4 h-4 mr-2" /> Bloquear</>
                            )}
                          </DropdownMenuItem>
                          {showFee && (agent.canon_estado || 'AL_DIA') !== 'AL_DIA' && (
                            <DropdownMenuItem onClick={() => onMarkPaid(agent)}>
                              <CircleDollarSign className="w-4 h-4 mr-2" /> Marcar como al día
                            </DropdownMenuItem>
                          )}
                          {agent.role === 'agent' && (
                            <DropdownMenuItem
                              onClick={() => onTogglePaymentStatus(agent)}
                              className={agent.payment_status === 'MOROSO' ? 'text-success' : 'text-warning'}
                            >
                              {agent.payment_status === 'MOROSO' ? (
                                <><CheckCircle2 className="w-4 h-4 mr-2" /> Quitar soft-lock</>
                              ) : (
                                <><AlertTriangle className="w-4 h-4 mr-2" /> Marcar Moroso</>
                              )}
                            </DropdownMenuItem>
                          )}
                          {agent.role === 'agent' && (
                            <DropdownMenuItem onClick={() => onTogglePlan(agent)} className="text-amber-600">
                              {agent.plan_agente === 'premium' ? (
                                <><Star className="w-4 h-4 mr-2" /> Quitar Premium</>
                              ) : (
                                <><Crown className="w-4 h-4 mr-2" /> Subir a Premium ⭐</>
                              )}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => onResetPassword(agent)}>
                            <KeyRound className="w-4 h-4 mr-2" /> Resetear Contraseña
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => onDelete(agent)} className="text-destructive">
                            <Trash2 className="w-4 h-4 mr-2" /> Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};