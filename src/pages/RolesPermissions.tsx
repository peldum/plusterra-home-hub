/**
 * RolesPermissions — Matriz visual de permisos por rol y módulo.
 * Solo SuperAdmin puede ver y editar esta página.
 */
import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useRolePermissions, useUpdateRolePermission, RolePermission } from '@/hooks/useRolePermissions';
import { Shield, Check, X, Loader2, Info } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

const ROLES = [
  { key: 'admin', label: 'Administrador' },
  { key: 'accounting', label: 'Gerente' },
  { key: 'secretaria', label: 'Secretaría' },
  { key: 'agent', label: 'Agente' },
] as const;

const ACTIONS = [
  { key: 'can_view' as const, label: 'Ver' },
  { key: 'can_create' as const, label: 'Crear' },
  { key: 'can_edit' as const, label: 'Editar' },
  { key: 'can_delete' as const, label: 'Eliminar' },
];

// Module display order
const MODULE_ORDER = [
  'dashboard', 'properties', 'contracts', 'clients', 'finances', 'cobros',
  'pipeline', 'agents', 'buildings', 'owners', 'maintenance', 'keys',
  'inventory', 'providers', 'portal_web', 'blog', 'leads', 'settings',
];

const PermissionCheck = ({
  perm,
  field,
  onToggle,
  isPending,
}: {
  perm: RolePermission;
  field: 'can_view' | 'can_create' | 'can_edit' | 'can_delete';
  onToggle: () => void;
  isPending: boolean;
}) => {
  const value = perm[field];
  return (
    <button
      onClick={onToggle}
      disabled={isPending}
      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 ${
        value
          ? 'bg-primary/15 text-primary hover:bg-primary/25 border border-primary/30'
          : 'bg-muted/50 text-muted-foreground/40 hover:bg-muted hover:text-muted-foreground/60 border border-transparent'
      } disabled:opacity-50`}
      title={value ? 'Habilitado — Click para deshabilitar' : 'Deshabilitado — Click para habilitar'}
    >
      {isPending ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : value ? (
        <Check className="w-4 h-4" />
      ) : (
        <X className="w-3.5 h-3.5" />
      )}
    </button>
  );
};

const RolesPermissions = () => {
  const { data: permissions, isLoading } = useRolePermissions();
  const updateMutation = useUpdateRolePermission();
  const [activeRole, setActiveRole] = useState('admin');
  const [pendingId, setPendingId] = useState<string | null>(null);

  const rolePerms = (permissions || [])
    .filter(p => p.role === activeRole)
    .sort((a, b) => {
      const ai = MODULE_ORDER.indexOf(a.module);
      const bi = MODULE_ORDER.indexOf(b.module);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });

  const totalPerms = rolePerms.reduce((acc, p) => {
    return acc + (p.can_view ? 1 : 0) + (p.can_create ? 1 : 0) + (p.can_edit ? 1 : 0) + (p.can_delete ? 1 : 0);
  }, 0);
  const maxPerms = rolePerms.length * 4;

  const handleToggle = async (perm: RolePermission, field: 'can_view' | 'can_create' | 'can_edit' | 'can_delete') => {
    setPendingId(`${perm.id}-${field}`);
    const newValue = !perm[field];

    // If disabling "view", disable all others too
    if (field === 'can_view' && !newValue) {
      for (const action of ACTIONS) {
        if (action.key !== 'can_view' && perm[action.key]) {
          await updateMutation.mutateAsync({ id: perm.id, field: action.key, value: false });
        }
      }
    }

    // If enabling create/edit/delete, also enable view
    if (field !== 'can_view' && newValue && !perm.can_view) {
      await updateMutation.mutateAsync({ id: perm.id, field: 'can_view', value: true });
    }

    await updateMutation.mutateAsync({ id: perm.id, field, value: newValue });
    setPendingId(null);
    toast.success(`${perm.module_label}: ${field.replace('can_', '')} ${newValue ? 'habilitado' : 'deshabilitado'}`);
  };

  return (
    <MainLayout title="Roles y Permisos" subtitle="Configura los permisos de cada rol por módulo. SuperAdmin siempre tiene acceso total.">
      <div className="space-y-6 animate-slide-up opacity-0" style={{ animationDelay: '50ms', animationFillMode: 'forwards' }}>
        {/* Info banner */}
        <div className="flex items-start gap-3 p-4 rounded-xl bg-primary/5 border border-primary/10">
          <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">¿Cómo funciona?</p>
            <p>Esta matriz controla <strong>qué ve y puede hacer cada rol</strong> en la interfaz. Los permisos de seguridad de la base de datos siguen activos como respaldo.</p>
            <p className="mt-1 text-xs">SuperAdmin siempre tiene acceso total y no aparece en la matriz.</p>
          </div>
        </div>

        {/* Matrix card */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <Tabs value={activeRole} onValueChange={setActiveRole}>
            <div className="border-b border-border px-4 pt-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-display text-lg font-semibold text-foreground">Matriz de Permisos</h2>
                  <p className="text-sm text-muted-foreground">Seleccioná un rol para ver y modificar sus permisos.</p>
                </div>
              </div>

              <TabsList className="w-full justify-start bg-transparent gap-1 p-0 h-auto pb-0">
                {ROLES.map(r => (
                  <TabsTrigger
                    key={r.key}
                    value={r.key}
                    className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-t-lg rounded-b-none px-5 py-2.5 text-sm font-medium border border-b-0 border-transparent data-[state=active]:border-border"
                  >
                    {r.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {ROLES.map(r => (
              <TabsContent key={r.key} value={r.key} className="mt-0">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    {/* Summary bar */}
                    <div className="flex items-center justify-between px-6 py-3 bg-muted/30 border-b border-border">
                      <span className="text-sm text-muted-foreground">
                        Rol: <strong className="text-foreground">{ROLES.find(x => x.key === activeRole)?.label}</strong>
                      </span>
                      <span className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary font-semibold">
                        {totalPerms}/{maxPerms} permisos activos
                      </span>
                    </div>

                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-3 w-[260px]">Módulo</th>
                          {ACTIONS.map(a => (
                            <th key={a.key} className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 w-[100px]">
                              {a.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rolePerms.map((perm, idx) => {
                          const activeCount = ACTIONS.filter(a => perm[a.key]).length;
                          return (
                            <tr
                              key={perm.id}
                              className={`border-b border-border/50 hover:bg-muted/20 transition-colors ${idx % 2 === 0 ? 'bg-background' : 'bg-muted/10'}`}
                            >
                              <td className="px-6 py-3">
                                <div className="flex items-center gap-2.5">
                                  <span className="text-sm font-medium text-foreground">{perm.module_label}</span>
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                    activeCount === 4 ? 'bg-success/15 text-success' :
                                    activeCount === 0 ? 'bg-muted text-muted-foreground' :
                                    'bg-warning/15 text-warning'
                                  }`}>
                                    {activeCount}/{ACTIONS.length}
                                  </span>
                                </div>
                              </td>
                              {ACTIONS.map(a => (
                                <td key={a.key} className="text-center px-4 py-3">
                                  <div className="flex justify-center">
                                    <PermissionCheck
                                      perm={perm}
                                      field={a.key}
                                      onToggle={() => handleToggle(perm, a.key)}
                                      isPending={pendingId === `${perm.id}-${a.key}`}
                                    />
                                  </div>
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </div>
    </MainLayout>
  );
};

export default RolesPermissions;
