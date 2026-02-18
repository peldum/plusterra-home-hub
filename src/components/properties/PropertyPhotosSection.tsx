import { useRef } from 'react';
import { usePropertyPhotos, useUploadPropertyPhoto, useDeletePropertyPhoto } from '@/hooks/usePropertyPhotos';
import { ImagePlus, Trash2, Loader2 } from 'lucide-react';

interface PropertyPhotosSectionProps {
  propertyId: string;
  readonly?: boolean;
}

export const PropertyPhotosSection = ({ propertyId, readonly = false }: PropertyPhotosSectionProps) => {
  const { data: photos, isLoading } = usePropertyPhotos(propertyId);
  const uploadMutation = useUploadPropertyPhoto();
  const deleteMutation = useDeletePropertyPhoto();
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      await uploadMutation.mutateAsync({ propertyId, file });
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  const canUpload = !readonly && (photos?.length ?? 0) < 5;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-foreground">
          Fotos de referencia – uso interno
        </label>
        <span className="text-xs text-muted-foreground">{photos?.length ?? 0}/5</span>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
        {isLoading ? (
          <div className="col-span-full flex justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {photos?.map(photo => (
              <div key={photo.id} className="relative group aspect-square rounded-lg overflow-hidden border border-border bg-muted">
                <img src={photo.thumbnail_url ?? photo.photo_url} alt="Referencia" className="w-full h-full object-cover" loading="lazy" />
                {!readonly && (
                  <button
                    type="button"
                    onClick={() => deleteMutation.mutate({ id: photo.id, storagePath: photo.storage_path, propertyId, thumbnailPath: photo.thumbnail_path })}
                    className="absolute top-1 right-1 p-1 rounded-md bg-destructive/90 text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
            {canUpload && (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploadMutation.isPending}
                className="aspect-square rounded-lg border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary transition-colors"
              >
                {uploadMutation.isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <ImagePlus className="w-5 h-5" />
                    <span className="text-[10px]">Agregar</span>
                  </>
                )}
              </button>
            )}
          </>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleUpload}
      />
    </div>
  );
};
