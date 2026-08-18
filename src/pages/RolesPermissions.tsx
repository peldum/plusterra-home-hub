/**
 * RolesPermissions — Matriz de referencia de acceso (solo lectura).
 * Documenta los accesos previstos por rol. No controla permisos reales.
 * Solo SuperAdmin puede ver esta página.
 */
import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useRolePermissions, RolePermission } from '@/hooks/useRolePermissions';
import { Shield, Check, X, Loader2, Info, Lock } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DualScrollArea } from '@/components/ui/dual-scroll-area';

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
}: {
  perm: RolePermission;
  field: 'can_view' | 'can_create' | 'can_edit' | 'can_delete';
}) => {
  const value = perm[field];
  return (
    <span
      className={`w-8 h-8 rounded-lg flex items-center justify-center ${
        value
          ? 'bg-primary/15 text-primary border border-primary/30'
          : 'bg-muted/50 text-muted-foreground/40 border border-transparent'
      }`}
      title={value ? 'Habilitado (referencia)' : 'Deshabilitado (referencia)'}
    >
      {value ? <Check className="w-4 h-4" /> : <X className="w-3.5 h-3.5" />}
    </span>
  );
};

const RolesPermissions = () => {
  const { data: permissions, isLoading } = useRolePermissions();
  const [activeRole, setActiveRole] = useState('admin');

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

  return (
    <MainLayout title="Matriz de referencia de acceso" subtitle="Consulta informativa de los accesos previstos por rol. No modifica permisos reales del sistema.">
      <div className="space-y-6 animate-slide-up opacity-0" style={{ animationDelay: '50ms', animationFillMode: 'forwards' }}>
        {/* Info banner */}
        <div className="flex items-start gap-3 p-4 rounded-xl bg-primary/5 border border-primary/10">
          <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">Esta matriz es informativa</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Documenta los accesos previstos por rol; <strong>no controla permisos reales</strong>.</li>
              <li>El acceso real a las pantallas depende de la autenticación y de las rutas protegidas (ProtectedRoute).</li>
              <li>El acceso a los datos depende de las políticas de seguridad (RLS) de la base de datos.</li>
              <li>Cambiar estos valores todavía no cambia el acceso efectivo, por eso la vista es de solo lectura.</li>
            </ul>
            <p className="mt-1 text-xs">SuperAdmin siempre tiene acceso total y no aparece en la matriz.</p>
          </div>
        </div>

        {/* Matrix card */}
        <div className="bg-card border border-border rounded-xl">
          <Tabs value={activeRole} onValueChange={setActiveRole}>
            <div className="border-b border-border px-4 pt-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
                    Matriz de referencia de acceso
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                      <Lock className="w-3 h-3" /> Solo lectura
                    </span>
                  </h2>
                  <p className="text-sm text-muted-foreground">Seleccioná un rol para consultar los accesos documentados.</p>
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
                  <DualScrollArea>
                    {/* Summary bar */}
                    <div className="flex items-center justify-between px-6 py-3 bg-muted/30 border-b border-border">
                      <span className="text-sm text-muted-foreground">
                        Rol: <strong className="text-foreground">{ROLES.find(x => x.key === activeRole)?.label}</strong>
                      </span>
                      <span className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary font-semibold">
                        {totalPerms}/{maxPerms} accesos documentados
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
                                    <PermissionCheck perm={perm} field={a.key} />
                                  </div>
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </DualScrollArea>
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
