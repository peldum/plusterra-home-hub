import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { useCreateAgent, useUpdateAgent, AgentProfile } from '@/hooks/useAgents';

const roleOptions = [
  { value: 'agent', label: 'Agente' },
  { value: 'admin', label: 'Administrador' },
  { value: 'superadmin', label: 'SuperAdmin' },
];

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
  const createMutation = useCreateAgent();
  const updateMutation = useUpdateAgent();
  const isEditing = !!agent;

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    role: 'agent',
    status: 'active',
  });
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (agent) {
      setForm({
        full_name: agent.full_name,
        email: agent.email,
        phone: agent.phone || '',
        password: '',
        role: agent.role,
        status: agent.status,
      });
    } else {
      setForm({ full_name: '', email: '', phone: '', password: '', role: 'agent', status: 'active' });
    }
  }, [agent, open]);

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
      });
    } else {
      if (!form.password || form.password.length < 6) {
        return;
      }
      await createMutation.mutateAsync({
        email: form.email,
        password: form.password,
        full_name: form.full_name,
        role: form.role,
        phone: form.phone || undefined,
      });
    }
    onOpenChange(false);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {isEditing ? 'Editar Usuario' : 'Nuevo Usuario'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Nombre completo *</label>
            <input
              value={form.full_name}
              onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
              className="input-field"
              placeholder="Nombre y apellido"
              required
              maxLength={100}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Email *</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className="input-field"
              placeholder="usuario@plusterra.com"
              required
              disabled={isEditing}
              maxLength={255}
            />
            {isEditing && (
              <p className="text-xs text-muted-foreground mt-1">El email no puede ser modificado</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Teléfono</label>
            <input
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              className="input-field"
              placeholder="+595 981 123456"
              maxLength={30}
            />
          </div>

          {!isEditing && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Contraseña *</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  className="input-field pr-10"
                  placeholder="Mínimo 6 caracteres"
                  required
                  minLength={6}
                  maxLength={72}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Rol</label>
              <select
                value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                className="input-field"
              >
                {roleOptions.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
            {isEditing && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Estado</label>
                <select
                  value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  className="input-field"
                >
                  {statusOptions.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 rounded-lg bg-muted text-muted-foreground text-sm font-medium hover:bg-muted/80 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEditing ? 'Guardar Cambios' : 'Crear Usuario'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
