import { useRef, useState, useCallback } from 'react';
import { usePropertyPhotos, useUploadPropertyPhoto, useDeletePropertyPhoto, useReorderPropertyPhotos } from '@/hooks/usePropertyPhotos';
import { ImagePlus, Trash2, Loader2, GripVertical, Star } from 'lucide-react';

interface PropertyPhotosSectionProps {
  propertyId: string;
  readonly?: boolean;
}

export const PropertyPhotosSection = ({ propertyId, readonly = false }: PropertyPhotosSectionProps) => {
  const { data: photos, isLoading } = usePropertyPhotos(propertyId);
  const uploadMutation = useUploadPropertyPhoto();
  const deleteMutation = useDeletePropertyPhoto();
  const reorderMutation = useReorderPropertyPhotos();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      await uploadMutation.mutateAsync({ propertyId, file });
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleDragStart = useCallback((index: number) => {
    setDragIndex(index);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    setOverIndex(index);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === dropIndex || !photos) return;

    const reordered = [...photos];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(dropIndex, 0, moved);

    const orderedIds = reordered.map(p => p.id);
    reorderMutation.mutate({ propertyId, orderedIds });

    setDragIndex(null);
    setOverIndex(null);
  }, [dragIndex, photos, propertyId, reorderMutation]);

  const handleDragEnd = useCallback(() => {
    setDragIndex(null);
    setOverIndex(null);
  }, []);

  const canUpload = !readonly;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-foreground">
          Fotos de referencia – uso interno
        </label>
        <span className="text-xs text-muted-foreground">{photos?.length ?? 0} fotos</span>
      </div>

      {!readonly && photos && photos.length > 1 && (
        <p className="text-xs text-muted-foreground">Arrastrá las fotos para reordenar. La primera es la portada.</p>
      )}

      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
        {isLoading ? (
          <div className="col-span-full flex justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {photos?.map((photo, index) => (
              <div
                key={photo.id}
                draggable={!readonly}
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                className={`relative group aspect-square rounded-lg overflow-hidden border bg-muted transition-all ${
                  dragIndex === index ? 'opacity-40 scale-95' : ''
                } ${overIndex === index && dragIndex !== index ? 'border-primary ring-2 ring-primary/30' : 'border-border'} ${
                  !readonly ? 'cursor-grab active:cursor-grabbing' : ''
                }`}
              >
                <img
                  src={photo.thumbnail_url ?? photo.photo_url}
                  alt="Referencia"
                  className="w-full h-full object-cover pointer-events-none"
                  loading="lazy"
                />

                {/* Cover badge on first photo */}
                {index === 0 && (
                  <div className="absolute top-1 left-1 flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-500/90 text-white text-[9px] font-bold leading-none">
                    <Star className="w-2.5 h-2.5 fill-current" />
                    Portada
                  </div>
                )}

                {/* Drag handle indicator */}
                {!readonly && (
                  <div className="absolute bottom-1 left-1 p-0.5 rounded bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    <GripVertical className="w-3 h-3" />
                  </div>
                )}

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
