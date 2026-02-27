import type { ContentBlock } from './ContentBlockEditor';

const getVideoEmbed = (url: string) => {
  if (!url) return null;
  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  // Matterport
  const mpMatch = url.match(/my\.matterport\.com\/show\/\?m=([a-zA-Z0-9]+)/);
  if (mpMatch) return `https://my.matterport.com/show/?m=${mpMatch[1]}`;
  return null;
};

interface Props {
  blocks: ContentBlock[];
}

export const ContentBlockRenderer = ({ blocks }: Props) => {
  if (!blocks || blocks.length === 0) return null;

  return (
    <div className="space-y-6">
      {blocks.map((block) => {
        switch (block.type) {
          case 'heading':
            return (
              <h2 key={block.id} className="text-2xl font-bold text-gray-900 mt-2">
                {block.content}
              </h2>
            );

          case 'text':
            return (
              <div key={block.id} className="prose prose-gray max-w-none text-gray-700 leading-relaxed whitespace-pre-line">
                {block.content}
              </div>
            );

          case 'image': {
            if (!block.content) return null;
            return (
              <figure key={block.id} className="my-4">
                <img
                  src={block.content}
                  alt={block.caption || 'Imagen del contenido'}
                  className="w-full rounded-xl object-cover max-h-[500px]"
                  loading="lazy"
                />
                {block.caption && (
                  <figcaption className="text-sm text-gray-500 text-center mt-2 italic">
                    {block.caption}
                  </figcaption>
                )}
              </figure>
            );
          }

          case 'video': {
            const embedUrl = getVideoEmbed(block.content);
            if (!embedUrl) return null;
            return (
              <div key={block.id} className="aspect-video rounded-xl overflow-hidden my-4">
                <iframe
                  src={embedUrl}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title="Video"
                />
              </div>
            );
          }

          default:
            return null;
        }
      })}
    </div>
  );
};
