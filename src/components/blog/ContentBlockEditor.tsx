import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { compressToWebP } from '@/lib/imageOptimizer';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Type, Image as ImageIcon, Video, GripVertical, Trash2, Plus, Loader2, ArrowUp, ArrowDown, Heading2,
} from 'lucide-react';
import { toast } from 'sonner';

export interface ContentBlock {
  id: string;
  type: 'text' | 'heading' | 'image' | 'video';
  content: string; // text/heading = text, image = url, video = embed url
  caption?: string;
}

const generateId = () => Math.random().toString(36).slice(2, 10);

interface Props {
  blocks: ContentBlock[];
  onChange: (blocks: ContentBlock[]) => void;
}

export const ContentBlockEditor = ({ blocks, onChange }: Props) => {
  const [uploading, setUploading] = useState<string | null>(null);

  const addBlock = (type: ContentBlock['type']) => {
    onChange([...blocks, { id: generateId(), type, content: '', caption: '' }]);
  };

  const updateBlock = (id: string, updates: Partial<ContentBlock>) => {
    onChange(blocks.map(b => b.id === id ? { ...b, ...updates } : b));
  };

  const removeBlock = (id: string) => {
    onChange(blocks.filter(b => b.id !== id));
  };

  const moveBlock = (index: number, dir: -1 | 1) => {
    const newIdx = index + dir;
    if (newIdx < 0 || newIdx >= blocks.length) return;
    const copy = [...blocks];
    [copy[index], copy[newIdx]] = [copy[newIdx], copy[index]];
    onChange(copy);
  };

  const handleImageUpload = async (blockId: string, file: File) => {
    setUploading(blockId);
    try {
      const webpBlob = await compressToWebP(file, 1200, 0.82);
      const path = `blog/block_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.webp`;
      const { error } = await supabase.storage.from('portal-assets').upload(path, webpBlob, {
        contentType: 'image/webp', upsert: true,
      });
      if (error) throw error;
      const { data } = supabase.storage.from('portal-assets').getPublicUrl(path);
      updateBlock(blockId, { content: data.publicUrl });
      toast.success('Imagen subida');
    } catch {
      toast.error('Error al subir imagen');
    } finally {
      setUploading(null);
    }
  };

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Contenido por bloques</Label>

      {blocks.length === 0 && (
        <div className="border-2 border-dashed rounded-lg p-8 text-center text-muted-foreground">
          <p className="text-sm mb-3">Agregá bloques de contenido para armar tu publicación</p>
        </div>
      )}

      {blocks.map((block, idx) => (
        <div
          key={block.id}
          className="border rounded-lg p-3 bg-card space-y-2 group relative"
        >
          {/* Controls */}
          <div className="flex items-center gap-1 text-muted-foreground">
            <GripVertical className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wider flex-1">
              {block.type === 'text' && 'Texto'}
              {block.type === 'heading' && 'Subtítulo'}
              {block.type === 'image' && 'Imagen'}
              {block.type === 'video' && 'Video'}
            </span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveBlock(idx, -1)} disabled={idx === 0}>
              <ArrowUp className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveBlock(idx, 1)} disabled={idx === blocks.length - 1}>
              <ArrowDown className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeBlock(block.id)}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>

          {/* Block content */}
          {block.type === 'text' && (
            <Textarea
              value={block.content}
              onChange={e => updateBlock(block.id, { content: e.target.value })}
              rows={4}
              placeholder="Escribí el texto aquí..."
              className="text-sm"
            />
          )}

          {block.type === 'heading' && (
            <Input
              value={block.content}
              onChange={e => updateBlock(block.id, { content: e.target.value })}
              placeholder="Subtítulo de sección"
              className="font-semibold text-base"
            />
          )}

          {block.type === 'image' && (
            <div className="space-y-2">
              {block.content ? (
                <img src={block.content} alt="Bloque" className="w-full max-h-48 object-cover rounded" />
              ) : null}
              <Input
                type="file"
                accept="image/*"
                disabled={uploading === block.id}
                onChange={e => e.target.files?.[0] && handleImageUpload(block.id, e.target.files[0])}
              />
              {uploading === block.id && (
                <p className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Subiendo en WebP...</p>
              )}
              <Input
                value={block.caption ?? ''}
                onChange={e => updateBlock(block.id, { caption: e.target.value })}
                placeholder="Pie de imagen (opcional)"
                className="text-xs"
              />
            </div>
          )}

          {block.type === 'video' && (
            <div className="space-y-2">
              <Input
                value={block.content}
                onChange={e => updateBlock(block.id, { content: e.target.value })}
                placeholder="https://youtube.com/watch?v=... o https://vimeo.com/..."
              />
              <p className="text-xs text-muted-foreground">YouTube, Vimeo o Matterport. No consume almacenamiento.</p>
            </div>
          )}
        </div>
      ))}

      {/* Add block buttons */}
      <div className="flex gap-2 flex-wrap">
        <Button type="button" variant="outline" size="sm" onClick={() => addBlock('text')} className="gap-1.5">
          <Type className="w-3.5 h-3.5" /> Texto
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => addBlock('heading')} className="gap-1.5">
          <Heading2 className="w-3.5 h-3.5" /> Subtítulo
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => addBlock('image')} className="gap-1.5">
          <ImageIcon className="w-3.5 h-3.5" /> Imagen
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => addBlock('video')} className="gap-1.5">
          <Video className="w-3.5 h-3.5" /> Video
        </Button>
      </div>
    </div>
  );
};
