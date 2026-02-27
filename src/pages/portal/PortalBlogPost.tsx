import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Loader2, Calendar, User, Download } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ContentBlockRenderer } from '@/components/blog/ContentBlockRenderer';
import { BrochureDownloadDialog } from '@/components/blog/BrochureDownloadDialog';
import type { ContentBlock } from '@/components/blog/ContentBlockEditor';

const PortalBlogPost = () => {
  const { slug } = useParams<{ slug: string }>();
  const [brochureOpen, setBrochureOpen] = useState(false);

  const { data: post, isLoading } = useQuery({
    queryKey: ['portal-blog-post', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('slug', slug!)
        .eq('is_published', true)
        .single();
      if (error) throw error;
      return data as any;
    },
    enabled: !!slug,
    staleTime: 2 * 60_000,
  });

  if (isLoading) return (
    <div className="flex justify-center items-center min-h-[60vh]">
      <Loader2 className="w-8 h-8 animate-spin text-[#00447C]" />
    </div>
  );

  if (!post) return (
    <div className="max-w-4xl mx-auto px-4 py-16 text-center">
      <h2 className="text-xl font-semibold text-gray-700 mb-4">Artículo no encontrado</h2>
      <Link to="/portal/blog" className="text-[#00447C] hover:underline">← Volver al blog</Link>
    </div>
  );

  const getVideoEmbed = (url: string) => {
    if (!url) return null;
    const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    return null;
  };

  const videoEmbed = post.video_url ? getVideoEmbed(post.video_url) : null;
  const isProject = post.slug?.startsWith('proyecto-');
  const backLink = isProject ? '/portal/proyectos' : '/portal/blog';
  const backLabel = isProject ? 'Volver a proyectos' : 'Volver al blog';
  const contentBlocks: ContentBlock[] = Array.isArray(post.content_blocks) && post.content_blocks.length > 0
    ? post.content_blocks
    : [];

  return (
    <article className="max-w-4xl mx-auto px-4 py-8">
      <Link to={backLink} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[#00447C] mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> {backLabel}
      </Link>

      {post.cover_image_url && (
        <div className="rounded-xl overflow-hidden mb-6">
          <img src={post.cover_image_url} alt={post.title} className="w-full max-h-[450px] object-cover" />
        </div>
      )}

      <h1 className="text-3xl font-bold text-gray-900 mb-4">{post.title}</h1>

      <div className="flex items-center gap-4 text-sm text-gray-500 mb-6">
        <div className="flex items-center gap-1.5">
          <User className="w-4 h-4" />
          {post.author_name}
        </div>
        {post.published_at && (
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4" />
            {format(new Date(post.published_at), "d 'de' MMMM, yyyy", { locale: es })}
          </div>
        )}
      </div>

      {/* Brochure download CTA */}
      {post.brochure_url && (
        <div className="bg-gradient-to-r from-[#00447C] to-[#005a9e] rounded-xl p-5 mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-white font-semibold text-lg">📄 Brochure disponible</p>
            <p className="text-white/80 text-sm">Descargá toda la información en PDF</p>
          </div>
          <button
            onClick={() => setBrochureOpen(true)}
            className="flex items-center gap-2 bg-[#FC5100] hover:bg-[#e04800] text-white font-semibold px-5 py-2.5 rounded-lg transition-colors shadow-lg hover:shadow-xl"
          >
            <Download className="w-4 h-4" />
            Descargar
          </button>
        </div>
      )}

      {videoEmbed && (
        <div className="aspect-video rounded-xl overflow-hidden mb-8">
          <iframe
            src={videoEmbed}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="Video"
          />
        </div>
      )}

      {/* Block-based content (priority) or legacy text fallback */}
      {contentBlocks.length > 0 ? (
        <ContentBlockRenderer blocks={contentBlocks} />
      ) : post.content ? (
        <div className="prose prose-gray max-w-none text-gray-700 leading-relaxed whitespace-pre-line">
          {post.content}
        </div>
      ) : null}

      {/* Brochure download dialog */}
      {post.brochure_url && (
        <BrochureDownloadDialog
          open={brochureOpen}
          onOpenChange={setBrochureOpen}
          brochureUrl={post.brochure_url}
          postId={post.id}
          postTitle={post.title}
        />
      )}
    </article>
  );
};

export default PortalBlogPost;
