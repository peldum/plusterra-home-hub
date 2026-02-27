import { useState, useEffect } from 'react';
import { Loader2, Camera } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { compressToWebP } from '@/lib/imageOptimizer';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface PortalProfileFormProps {
  agentId: string;
}

export const PortalProfileForm = ({ agentId }: PortalProfileFormProps) => {
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

      // Also sync avatar_url to profiles table so sidebar shows the photo
      if (photoUrl) {
        await supabase
          .from('profiles')
          .update({ avatar_url: photoUrl })
          .eq('id', agentId);
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
