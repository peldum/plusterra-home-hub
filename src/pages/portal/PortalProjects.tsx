import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, ArrowRight, Building2, FileText } from 'lucide-react';

const PortalProjects = () => {
  const { data: posts, isLoading } = useQuery({
    queryKey: ['portal-projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('id, title, slug, excerpt, cover_image_url, published_at, brochure_url')
        .eq('is_published', true)
        .like('slug', 'proyecto-%')
        .order('published_at', { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
    staleTime: 2 * 60_000,
  });

  if (isLoading) return (
    <div className="flex justify-center items-center min-h-[60vh]">
      <Loader2 className="w-8 h-8 animate-spin text-[#00447C]" />
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-gray-900">Proyectos</h1>
        <p className="text-gray-500 mt-2">Desarrollos inmobiliarios destacados</p>
      </div>

      {!posts || posts.length === 0 ? (
        <div className="text-center py-16">
          <Building2 className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 mb-2">No hay proyectos publicados actualmente.</p>
          <p className="text-gray-400 text-sm">Próximamente agregaremos desarrollos inmobiliarios aquí.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {posts.map(post => (
            <Link
              key={post.id}
              to={`/portal/blog/${post.slug}`}
              className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-shadow group"
            >
              {post.cover_image_url && (
                <div className="aspect-[16/9] overflow-hidden">
                  <img src={post.cover_image_url} alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                </div>
              )}
              <div className="p-5">
                <h2 className="font-semibold text-gray-900 text-lg group-hover:text-[#00447C] transition-colors mb-2">{post.title}</h2>
                {post.excerpt && <p className="text-gray-500 text-sm line-clamp-3 mb-3">{post.excerpt}</p>}
                <div className="flex items-center justify-between">
                  <span className="text-[#FC5100] text-sm font-medium flex items-center gap-1">
                    Ver detalle <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                  {post.brochure_url && (
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5" /> Brochure disponible
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default PortalProjects;
