import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Loader2, Calendar, User } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const PortalBlogPost = () => {
  const { slug } = useParams<{ slug: string }>();

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

  // Extract video embed
  const getVideoEmbed = (url: string) => {
    if (!url) return null;
    const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    return null;
  };

  const videoEmbed = post.video_url ? getVideoEmbed(post.video_url) : null;

  return (
    <article className="max-w-4xl mx-auto px-4 py-8">
      <Link to="/portal/blog" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[#00447C] mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Volver al blog
      </Link>

      {post.cover_image_url && (
        <div className="rounded-xl overflow-hidden mb-6">
          <img src={post.cover_image_url} alt={post.title} className="w-full max-h-[450px] object-cover" />
        </div>
      )}

      <h1 className="text-3xl font-bold text-gray-900 mb-4">{post.title}</h1>

      <div className="flex items-center gap-4 text-sm text-gray-500 mb-8">
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

      <div className="prose prose-gray max-w-none text-gray-700 leading-relaxed whitespace-pre-line">
        {post.content}
      </div>
    </article>
  );
};

export default PortalBlogPost;
