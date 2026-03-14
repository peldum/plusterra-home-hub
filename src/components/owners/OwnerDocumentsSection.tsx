import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Upload, Trash2, Loader2, FileText, Image, File, ExternalLink } from 'lucide-react';

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

const tipoDocumentoLabels: Record<string, string> = {
  cedula_anverso: 'Cédula (Anverso)',
  cedula_reverso: 'Cédula (Reverso)',
  telefono: 'Teléfono',
  contrato: 'Contrato',
  otro: 'Otro',
};

const tipoDocumentoOptions = Object.entries(tipoDocumentoLabels);

const getFileIcon = (url: string) => {
  if (url.match(/\.pdf/i)) return <FileText className="w-4 h-4 text-red-500" />;
  if (url.match(/\.(jpg|jpeg|png|webp)/i)) return <Image className="w-4 h-4 text-blue-500" />;
  return <File className="w-4 h-4 text-muted-foreground" />;
};

interface OwnerDocumentsSectionProps {
  ownerId: string;
}

export const OwnerDocumentsSection = ({ ownerId }: OwnerDocumentsSectionProps) => {
  const { user, role } = useAuth();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [tipoDoc, setTipoDoc] = useState('otro');
  const [descripcion, setDescripcion] = useState('');
  const [uploading, setUploading] = useState(false);

  const isAdminLike = role === 'superadmin' || role === 'admin' || role === 'accounting' || role === 'secretaria';

  const { data: docs, isLoading } = useQuery({
    queryKey: ['owner-documents', ownerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('propietario_documentos' as any)
        .select('*')
        .eq('propietario_id', ownerId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!ownerId && !!user,
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ id, storagePath }: { id: string; storagePath: string }) => {
      await supabase.storage.from('documentos-propietarios').remove([storagePath]);
      const { error } = await supabase.from('propietario_documentos' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['owner-documents', ownerId] });
      toast.success('Documento eliminado');
    },
    onError: (err: Error) => toast.error('Error: ' + err.message),
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('Tipo de archivo no permitido. Use PDF, JPG, PNG o WebP.');
      return;
    }
    if (file.size > MAX_SIZE) {
      toast.error('El archivo excede 10MB.');
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'bin';
      const storagePath = `${user.id}/${ownerId}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('documentos-propietarios')
        .upload(storagePath, file, { upsert: false });
      if (uploadError) throw uploadError;

      // We store the storage path, not a public URL (bucket is private)
      const { error: insertError } = await supabase
        .from('propietario_documentos' as any)
        .insert({
          propietario_id: ownerId,
          agente_id: user.id,
          tipo_documento: tipoDoc,
          archivo_url: storagePath, // we'll use signed URLs to view
          storage_path: storagePath,
          descripcion: descripcion.trim() || null,
        } as any);
      if (insertError) throw insertError;

      qc.invalidateQueries({ queryKey: ['owner-documents', ownerId] });
      toast.success('Documento subido correctamente');
      setDescripcion('');
      setTipoDoc('otro');
    } catch (err: any) {
      toast.error('Error al subir: ' + err.message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleView = async (storagePath: string) => {
    const { data, error } = await supabase.storage
      .from('documentos-propietarios')
      .createSignedUrl(storagePath, 3600); // 1 hour
    if (error || !data?.signedUrl) {
      toast.error('No se pudo generar el enlace');
      return;
    }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="p-4 border-t border-border">
      <h3 className="font-semibold text-sm text-foreground flex items-center gap-2 mb-3">
        <FileText className="w-4 h-4 text-primary" />
        Documentos del Propietario
      </h3>

      {/* Upload form */}
      <div className="space-y-2 mb-4 p-3 rounded-lg bg-muted/50 border border-border">
        <div className="grid grid-cols-2 gap-2">
          <select
            value={tipoDoc}
            onChange={e => setTipoDoc(e.target.value)}
            className="text-sm rounded-lg border border-border bg-background px-2 py-1.5"
          >
            {tipoDocumentoOptions.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Descripción (opcional)"
            value={descripcion}
            onChange={e => setDescripcion(e.target.value)}
            className="text-sm rounded-lg border border-border bg-background px-2 py-1.5"
            maxLength={200}
          />
        </div>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border-2 border-dashed border-border hover:border-primary/50 text-sm text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {uploading ? 'Subiendo...' : 'Subir documento (PDF, JPG, PNG, WebP · máx 10MB)'}
        </button>
        <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden" onChange={handleUpload} />
      </div>

      {/* Documents list */}
      {isLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : !docs || docs.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">Sin documentos cargados</p>
      ) : (
        <div className="space-y-2">
          {docs.map((doc: any) => {
            const canDelete = doc.agente_id === user?.id || isAdminLike;
            return (
              <div key={doc.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-border bg-card hover:shadow-sm transition-shadow">
                {getFileIcon(doc.storage_path)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {tipoDocumentoLabels[doc.tipo_documento] || doc.tipo_documento}
                  </p>
                  {doc.descripcion && (
                    <p className="text-xs text-muted-foreground truncate">{doc.descripcion}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(doc.created_at).toLocaleDateString('es-PY')}
                    {isAdminLike && doc.agente_id && ` · Subido por: ${doc.agente_id.substring(0, 8)}…`}
                  </p>
                </div>
                <button
                  onClick={() => handleView(doc.storage_path)}
                  className="p-1.5 rounded-lg hover:bg-primary/10 text-primary transition-colors"
                  title="Ver documento"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>
                {canDelete && (
                  <button
                    onClick={() => deleteMutation.mutate({ id: doc.id, storagePath: doc.storage_path })}
                    className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
