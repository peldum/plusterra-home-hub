import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Loader2, Eye, EyeOff, Globe, Crown, ShieldOff } from 'lucide-react';
import { useCreateAgent, useUpdateAgent, useSetAgentPlan, AgentProfile } from '@/hooks/useAgents';
import { useAuth } from '@/contexts/AuthContext';
import { usePlanPricing } from '@/hooks/usePlanPricing';
import { PortalProfileForm } from './PortalProfileForm';
import { MoneyInput } from '@/components/ui/money-input';

const allRoleOptions = [
  { value: 'agent', label: 'Agente' },
  { value: 'secretaria', label: 'Secretaría' },
  { value: 'admin', label: 'Administrador' },
  { value: 'accounting', label: 'Gerente' },
  { value: 'superadmin', label: 'SuperAdmin' },
];

/** Filter roles the caller is allowed to assign */
const getRoleOptionsForCaller = (callerRole: string | null) => {
  if (callerRole === 'superadmin') return allRoleOptions;
  if (callerRole === 'admin') return allRoleOptions.filter(r => !['superadmin', 'admin'].includes(r.value));
  if (callerRole === 'accounting') return allRoleOptions.filter(r => ['agent', 'secretaria'].includes(r.value));
  if (callerRole === 'secretaria') return allRoleOptions.filter(r => r.value === 'agent');
  return [];
};

const statusOptions = [
  { value: 'active', label: 'Activo' },
  { value: 'blocked', label: 'Bloqueado' },
];

interface AgentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent?: AgentProfile | null;
}

export const AgentFormDialog = ({ open, onOpenChange, agent }: AgentFormDialogProps) => {
  const { role: callerRole } = useAuth();
  const qc = useQueryClient();
  const createMutation = useCreateAgent();
  const updateMutation = useUpdateAgent();
  const setAgentPlanMutation = useSetAgentPlan();
  const { data: planPricing } = usePlanPricing();
  const isEditing = !!agent;
  const roleOptions = getRoleOptionsForCaller(callerRole);
  const fmtGs = (n: number) => n.toLocaleString('es-PY') + ' Gs';

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    birth_date: '',
    password: '',
    role: 'agent',
    status: 'active',
    monthly_fee: '0',
    plan_agente: 'basic',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    if (agent) {
      setForm({
        full_name: agent.full_name,
        email: agent.email,
        phone: agent.phone || '',
        birth_date: (agent as any).birth_date || '',
        password: '',
        role: agent.role,
        status: agent.status,
        monthly_fee: String(agent.monthly_fee || 0),
        plan_agente: agent.plan_agente || 'basic',
      });
    } else {
      const defaultFee = planPricing?.basic ?? 100000;
      setForm({ full_name: '', email: '', phone: '', birth_date: '', password: '', role: 'agent', status: 'active', monthly_fee: String(defaultFee), plan_agente: 'basic' });
    }
  }, [agent, open, planPricing]);

  const validatePassword = (pwd: string): string => {
    if (pwd.length < 8) return 'Mínimo 8 caracteres';
    if (!/[A-Z]/.test(pwd)) return 'Debe contener al menos una mayúscula';
    if (!/[a-z]/.test(pwd)) return 'Debe contener al menos una minúscula';
    if (!/[0-9]/.test(pwd)) return 'Debe contener al menos un número';
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim() || !form.email.trim()) return;

    if (isEditing) {
      await updateMutation.mutateAsync({
        user_id: agent.id,
        full_name: form.full_name,
        phone: form.phone,
        role: form.role,
        status: form.status,
        monthly_fee: parseFloat(form.monthly_fee) || 0,
        birth_date: form.birth_date || null,
      });
    } else {
      const pwdErr = validatePassword(form.password);
      if (pwdErr) {
        setPasswordError(pwdErr);
        return;
      }
      await createMutation.mutateAsync({
        email: form.email,
        password: form.password,
        full_name: form.full_name,
        role: form.role,
        phone: form.phone || undefined,
        ...(form.role === 'agent' ? {
          plan_agente: form.plan_agente,
          monthly_fee: parseFloat(form.monthly_fee) || 0,
        } : {}),
      });
    }
    onOpenChange(false);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {isEditing ? 'Editar Usuario' : 'Nuevo Usuario'}
          </DialogTitle>
        </DialogHeader>

        {isEditing ? (
          <Tabs defaultValue="general">
            <TabsList className="mb-4">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="portal" className="gap-1.5">
                <Globe className="w-3.5 h-3.5" /> Perfil Portal
              </TabsTrigger>
            </TabsList>

            <TabsContent value="general">
              <form onSubmit={handleSubmit} className="space-y-4">
                <GeneralFields form={form} setForm={setForm} isEditing roleOptions={roleOptions} planPricing={planPricing} />
                
                {/* Plan selector for agents */}
                {agent.role === 'agent' && (
                  <div className="pt-3 border-t border-border">
                    <label className="block text-sm font-medium text-foreground mb-2 flex items-center gap-1.5">
                      <Crown className="w-4 h-4 text-amber-500" /> Plan del Agente
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setAgentPlanMutation.mutateAsync({ agentId: agent.id, plan: 'basic', agentName: agent.full_name, monthlyFee: planPricing?.basic ?? 100000 })}
                        className={`p-3 rounded-xl border-2 text-left transition-all ${
                          agent.plan_agente === 'basic'
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-muted-foreground/30'
                        }`}
                      >
                        <p className="text-sm font-semibold text-foreground">Básico</p>
                        <p className="text-xs font-bold text-primary mt-1">{fmtGs(planPricing?.basic ?? 100000)}/mes</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Funciones estándar</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setAgentPlanMutation.mutateAsync({ agentId: agent.id, plan: 'premium', agentName: agent.full_name, monthlyFee: planPricing?.premium ?? 150000 })}
                        className={`p-3 rounded-xl border-2 text-left transition-all relative overflow-hidden ${
                          agent.plan_agente === 'premium'
                            ? 'border-amber-400 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/20'
                            : 'border-border hover:border-amber-300'
                        }`}
                      >
                        <div className="flex items-center gap-1">
                          <Crown className="w-3.5 h-3.5 text-amber-500" />
                          <p className="text-sm font-semibold text-foreground">Premium</p>
                        </div>
                        <p className="text-xs font-bold text-amber-600 mt-1">{fmtGs(planPricing?.premium ?? 150000)}/mes</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Destacados, video, tour 360°</p>
                      </button>
                    </div>
                  </div>
                )}

                {/* Aplica Canon toggle — SuperAdmin only */}
                {callerRole === 'superadmin' && agent.role === 'agent' && (
                  <div className="pt-3 border-t border-border">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ShieldOff className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium text-foreground">Aplica Canon</p>
                          <p className="text-xs text-muted-foreground">Si está desactivado, este agente no genera deuda de canon</p>
                        </div>
                      </div>
                      <Switch
                        checked={agent.aplica_canon !== false}
                        onCheckedChange={async (checked) => {
                          await supabase.from('profiles').update({ aplica_canon: checked } as any).eq('id', agent.id);
                          if (!checked) {
                            // Clean pending canon receivables
                            await supabase.from('receivables').delete().eq('agent_id', agent.id).eq('concept', 'canon').in('status', ['pending', 'overdue']);
                          }
                          toast.success(checked ? 'Canon activado para este agente' : 'Canon desactivado para este agente');
                          qc.invalidateQueries({ queryKey: ['agents'] });
                          qc.invalidateQueries({ queryKey: ['receivables'] });
                          qc.invalidateQueries({ queryKey: ['receivable-counters'] });
                        }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t border-border">
                  <button type="button" onClick={() => onOpenChange(false)} className="px-4 py-2 rounded-lg bg-muted text-muted-foreground text-sm font-medium hover:bg-muted/80 transition-colors">Cancelar</button>
                  <button type="submit" disabled={isPending} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
                    {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                    Guardar Cambios
                  </button>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="portal">
              <PortalProfileForm agentId={agent.id} />
            </TabsContent>
          </Tabs>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <GeneralFields form={form} setForm={setForm} isEditing={false} roleOptions={roleOptions} showPassword showPasswordState={showPassword} setShowPassword={setShowPassword} passwordError={passwordError} setPasswordError={setPasswordError} planPricing={planPricing} />
            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <button type="button" onClick={() => onOpenChange(false)} className="px-4 py-2 rounded-lg bg-muted text-muted-foreground text-sm font-medium hover:bg-muted/80 transition-colors">Cancelar</button>
              <button type="submit" disabled={isPending} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
                {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Crear Usuario
              </button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

// ── Shared form fields ──
const GeneralFields = ({
  form, setForm, isEditing, roleOptions,
  showPassword, showPasswordState, setShowPassword,
  passwordError, setPasswordError, planPricing,
}: {
  form: any; setForm: any; isEditing: boolean;
  roleOptions: { value: string; label: string }[];
  showPassword?: boolean; showPasswordState?: boolean; setShowPassword?: any;
  passwordError?: string; setPasswordError?: any;
  planPricing?: { basic: number; premium: number } | null;
}) => {
  const fmtGs = (n: number) => n.toLocaleString('es-PY') + ' Gs';
  const basicPrice = planPricing?.basic ?? 100000;
  const premiumPrice = planPricing?.premium ?? 150000;

  return (
    <>
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Nombre completo *</label>
        <input value={form.full_name} onChange={e => setForm((f: any) => ({ ...f, full_name: e.target.value }))} className="input-field" placeholder="Nombre y apellido" required maxLength={100} />
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Email *</label>
        <input type="email" value={form.email} onChange={e => setForm((f: any) => ({ ...f, email: e.target.value }))} className="input-field" placeholder="usuario@plusterra.com" required disabled={isEditing} maxLength={255} />
        {isEditing && <p className="text-xs text-muted-foreground mt-1">El email no puede ser modificado</p>}
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Teléfono</label>
        <input value={form.phone} onChange={e => setForm((f: any) => ({ ...f, phone: e.target.value }))} className="input-field" placeholder="+595 981 123456" maxLength={30} />
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Fecha de nacimiento</label>
        <input type="date" value={form.birth_date || ''} onChange={e => setForm((f: any) => ({ ...f, birth_date: e.target.value }))} className="input-field" />
      </div>
      {showPassword && (
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Contraseña *</label>
          <div className="relative">
            <input
              type={showPasswordState ? 'text' : 'password'}
              value={form.password}
              onChange={e => { setForm((f: any) => ({ ...f, password: e.target.value })); setPasswordError?.(''); }}
              className={`input-field pr-10 ${passwordError ? 'border-destructive' : ''}`}
              placeholder="Mín 8 caracteres, mayúscula, minúscula, número"
              required minLength={8} maxLength={128}
            />
            <button type="button" onClick={() => setShowPassword?.(!showPasswordState)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {showPasswordState ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {passwordError && <p className="text-xs text-destructive mt-1">{passwordError}</p>}
        </div>
      )}
      {/* Plan selector when role is agent */}
      {form.role === 'agent' ? (
        <div>
          <label className="block text-sm font-medium text-foreground mb-1 flex items-center gap-1.5">
            <Crown className="w-4 h-4 text-amber-500" /> Plan del Agente
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setForm((f: any) => ({ ...f, monthly_fee: String(basicPrice), plan_agente: 'basic' }))}
              className={`p-3 rounded-xl border-2 text-left transition-all ${
                form.plan_agente !== 'premium'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-muted-foreground/30'
              }`}
            >
              <p className="text-sm font-semibold text-foreground">Básico</p>
              <p className="text-xs font-bold text-primary mt-1">{fmtGs(basicPrice)}/mes</p>
            </button>
            <button
              type="button"
              onClick={() => setForm((f: any) => ({ ...f, monthly_fee: String(premiumPrice), plan_agente: 'premium' }))}
              className={`p-3 rounded-xl border-2 text-left transition-all ${
                form.plan_agente === 'premium'
                  ? 'border-amber-400 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/20'
                  : 'border-border hover:border-amber-300'
              }`}
            >
              <div className="flex items-center gap-1">
                <Crown className="w-3.5 h-3.5 text-amber-500" />
                <p className="text-sm font-semibold text-foreground">Premium</p>
              </div>
              <p className="text-xs font-bold text-amber-600 mt-1">{fmtGs(premiumPrice)}/mes</p>
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Canon mensual asignado: <strong>{fmtGs(Number(form.monthly_fee) || 0)}</strong></p>
        </div>
      ) : (
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Canon mensual (Gs.)</label>
          <MoneyInput value={form.monthly_fee || ''} onChange={v => setForm((f: any) => ({ ...f, monthly_fee: v === '' ? '' : String(v) }))} />
          <p className="text-xs text-muted-foreground mt-1">Cuota mensual por uso del sistema</p>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Rol</label>
          <select value={form.role} onChange={e => {
            const newRole = e.target.value;
            setForm((f: any) => ({
              ...f,
              role: newRole,
              ...(newRole === 'agent' ? { monthly_fee: String(basicPrice), plan_agente: 'basic' } : {}),
            }));
          }} className="input-field">
            {roleOptions.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
        {isEditing && (
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Estado</label>
            <select value={form.status} onChange={e => setForm((f: any) => ({ ...f, status: e.target.value }))} className="input-field">
              {statusOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        )}
      </div>
    </>
  );
};
