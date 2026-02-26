import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Eye, EyeOff, Camera, Globe } from 'lucide-react';
import { useCreateAgent, useUpdateAgent, AgentProfile } from '@/hooks/useAgents';
import { supabase } from '@/integrations/supabase/client';
import { compressToWebP } from '@/lib/imageOptimizer';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const roleOptions = [
  { value: 'agent', label: 'Agente' },
  { value: 'secretaria', label: 'Secretaría' },
  { value: 'admin', label: 'Administrador' },
  { value: 'accounting', label: 'Gerente' },
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

// ── Portal profile sub-form ──
const PortalProfileSection = ({ agentId }: { agentId: string }) => {
  const qc = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['portal-agent-profile', agentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('portal_agent_profiles')
        .select('*')
        .eq('agent_id', agentId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!agentId,
  });

  const [form, setForm] = useState({
    public_name: '',
    public_phone_whatsapp: '',
    public_email: '',
    bio: '',
    areas: '',
    show_in_portal: false,
    is_featured: false,
  });
  const [uploading, setUploading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setForm({
        public_name: profile.public_name || '',
        public_phone_whatsapp: profile.public_phone_whatsapp || '',
        public_email: profile.public_email || '',
        bio: profile.bio || '',
        areas: profile.areas || '',
        show_in_portal: profile.show_in_portal ?? false,
        is_featured: profile.is_featured ?? false,
      });
      setPhotoUrl(profile.public_photo_url_webp);
    }
  }, [profile]);

  const handlePhotoUpload = async (file: File) => {
    setUploading(true);
    try {
      const webpBlob = await compressToWebP(file, 800, 0.8);
      const path = `agents/${agentId}_${Date.now()}.webp`;
      const { error } = await supabase.storage.from('portal-assets').upload(path, webpBlob, {
        contentType: 'image/webp',
        upsert: true,
      });
      if (error) throw error;
      const { data } = supabase.storage.from('portal-assets').getPublicUrl(path);
      setPhotoUrl(data.publicUrl);
      toast.success('Foto subida correctamente');
    } catch {
      toast.error('Error al subir foto');
    } finally {
      setUploading(false);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        agent_id: agentId,
        public_name: form.public_name,
        public_phone_whatsapp: form.public_phone_whatsapp || null,
        public_email: form.public_email || null,
        bio: form.bio || null,
        areas: form.areas || null,
        show_in_portal: form.show_in_portal,
        is_featured: form.is_featured,
        public_photo_url_webp: photoUrl || null,
      };

      if (profile?.id) {
        const { error } = await supabase
          .from('portal_agent_profiles')
          .update(payload)
          .eq('id', profile.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('portal_agent_profiles')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portal-agent-profile', agentId] });
      qc.invalidateQueries({ queryKey: ['portal-agents'] });
      toast.success('Perfil portal guardado');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Photo */}
      <div className="flex items-center gap-4">
        <div className="relative w-20 h-20 rounded-full overflow-hidden bg-muted flex-shrink-0">
          {photoUrl ? (
            <img src={photoUrl} alt="Foto" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <Camera className="w-8 h-8" />
            </div>
          )}
          {uploading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-white" />
            </div>
          )}
        </div>
        <div>
          <label className="inline-flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg cursor-pointer hover:bg-primary/90 transition-colors">
            <Camera className="w-4 h-4" />
            {photoUrl ? 'Cambiar foto' : 'Subir foto'}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploading}
              onChange={e => e.target.files?.[0] && handlePhotoUpload(e.target.files[0])}
            />
          </label>
          <p className="text-xs text-muted-foreground mt-1">Se convierte a WebP automáticamente</p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Nombre público *</label>
        <input
          value={form.public_name}
          onChange={e => setForm(f => ({ ...f, public_name: e.target.value }))}
          className="input-field"
          placeholder="Nombre que verán los visitantes"
          maxLength={100}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">WhatsApp</label>
          <input
            value={form.public_phone_whatsapp}
            onChange={e => setForm(f => ({ ...f, public_phone_whatsapp: e.target.value }))}
            className="input-field"
            placeholder="+595981..."
            maxLength={20}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Email público</label>
          <input
            type="email"
            value={form.public_email}
            onChange={e => setForm(f => ({ ...f, public_email: e.target.value }))}
            className="input-field"
            placeholder="email@ejemplo.com"
            maxLength={100}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Zonas / Especialidades</label>
        <input
          value={form.areas}
          onChange={e => setForm(f => ({ ...f, areas: e.target.value }))}
          className="input-field"
          placeholder="Ej: Centro, San Isidro, Alquileres"
          maxLength={200}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Bio / Descripción</label>
        <textarea
          value={form.bio}
          onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
          className="input-field resize-none"
          placeholder="Breve presentación del agente..."
          rows={3}
          maxLength={500}
        />
      </div>

      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.show_in_portal}
            onChange={e => setForm(f => ({ ...f, show_in_portal: e.target.checked }))}
            className="rounded border-border"
          />
          <span className="text-sm">Visible en portal</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.is_featured}
            onChange={e => setForm(f => ({ ...f, is_featured: e.target.checked }))}
            className="rounded border-border"
          />
          <span className="text-sm">Destacado</span>
        </label>
      </div>

      <button
        type="button"
        onClick={() => saveMutation.mutate()}
        disabled={!form.public_name.trim() || saveMutation.isPending}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        {saveMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
        Guardar Perfil Portal
      </button>
    </div>
  );
};

// ── Main dialog ──
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
    monthly_fee: '0',
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
        monthly_fee: String(agent.monthly_fee || 0),
      });
    } else {
      setForm({ full_name: '', email: '', phone: '', password: '', role: 'agent', status: 'active', monthly_fee: '0' });
    }
  }, [agent, open]);

  const [passwordError, setPasswordError] = useState('');

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
                <GeneralFields form={form} setForm={setForm} isEditing={isEditing} />
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
              <PortalProfileSection agentId={agent.id} />
            </TabsContent>
          </Tabs>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <GeneralFields form={form} setForm={setForm} isEditing={false} showPassword showPasswordState={showPassword} setShowPassword={setShowPassword} passwordError={passwordError} setPasswordError={setPasswordError} />
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
  form, setForm, isEditing,
  showPassword, showPasswordState, setShowPassword,
  passwordError, setPasswordError,
}: {
  form: any; setForm: any; isEditing: boolean;
  showPassword?: boolean; showPasswordState?: boolean; setShowPassword?: any;
  passwordError?: string; setPasswordError?: any;
}) => (
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
    <div>
      <label className="block text-sm font-medium text-foreground mb-1">Canon mensual (USD)</label>
      <input type="number" value={form.monthly_fee} onChange={e => setForm((f: any) => ({ ...f, monthly_fee: e.target.value }))} className="input-field" placeholder="0" min="0" step="1" />
      <p className="text-xs text-muted-foreground mt-1">Cuota mensual por uso del sistema</p>
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Rol</label>
        <select value={form.role} onChange={e => setForm((f: any) => ({ ...f, role: e.target.value }))} className="input-field">
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
