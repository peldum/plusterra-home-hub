import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Calendar, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image_url: string | null;
  author_name: string;
  published_at: string | null;
}

const PortalBlog = () => {
  const { data: posts, isLoading } = useQuery({
    queryKey: ['portal-blog-posts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('id, title, slug, excerpt, cover_image_url, author_name, published_at')
        .eq('is_published', true)
        .order('published_at', { ascending: false });
      if (error) throw error;
      return (data || []) as BlogPost[];
    },
    staleTime: 2 * 60_000,
  });

  if (isLoading) return (
    <div className="flex justify-center items-center min-h-[60vh]">
      <Loader2 className="w-8 h-8 animate-spin text-[#00447C]" />
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-14">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-gray-900">Blog</h1>
        <p className="text-gray-500 mt-3">Noticias, consejos y novedades del mercado inmobiliario</p>
      </div>

      {!posts || posts.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500">No hay artículos publicados aún.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map(post => (
            <Link
              key={post.id}
              to={`/portal/blog/${post.slug}`}
              className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-shadow group"
            >
              {post.cover_image_url && (
                <div className="aspect-[16/9] overflow-hidden">
                  <img
                    src={post.cover_image_url}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                </div>
              )}
              <div className="p-5">
                <h2 className="font-semibold text-gray-900 text-lg mb-2 group-hover:text-[#00447C] transition-colors line-clamp-2">
                  {post.title}
                </h2>
                {post.excerpt && (
                  <p className="text-gray-500 text-sm line-clamp-3 mb-3">{post.excerpt}</p>
                )}
                <div className="flex items-center justify-between">
                  {post.published_at && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                      <Calendar className="w-3.5 h-3.5" />
                      {format(new Date(post.published_at), "d 'de' MMMM, yyyy", { locale: es })}
                    </div>
                  )}
                  <span className="text-[#FC5100] text-sm font-medium flex items-center gap-1">
                    Leer más <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default PortalBlog;
