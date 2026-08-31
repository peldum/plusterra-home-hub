import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useShowroomProjects } from '@/hooks/useShowroomProjects';
import { Loader2, Building2, MapPin, Calendar, DollarSign, ArrowRight, FileText } from 'lucide-react';

const PortalShowroom = () => {
  const { data: projects, isLoading } = useShowroomProjects();

  const { data: posts, isLoading: loadingPosts } = useQuery({
    queryKey: ['portal-project-posts'],
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

  if (isLoading || loadingPosts) return (
    <div className="flex justify-center items-center min-h-[60vh]">
      <Loader2 className="w-8 h-8 animate-spin text-[#00447C]" />
    </div>
  );

  const hasContent = (projects && projects.length > 0) || (posts && posts.length > 0);

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="text-center mb-12">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Proyectos Inmobiliarios</h1>
        <p className="text-gray-500 mt-3 max-w-xl mx-auto">
          Desarrollos exclusivos de las mejores constructoras. Invertí en tu futuro.
        </p>
      </div>

      {!hasContent ? (

        <div className="text-center py-16">
          <Building2 className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 mb-2">No hay proyectos disponibles actualmente.</p>
          <p className="text-gray-400 text-sm">Próximamente agregaremos desarrollos inmobiliarios.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {(projects || []).map(project => {
            const coverImg = project.showroom_cover_url ||
              project.gallery.find(g => g.image_type === 'render')?.image_url;

            return (
              <Link
                key={project.id}
                to={`/portal/proyectos/${project.id}`}
                className="group bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-xl transition-all duration-300"
              >
                <div className="aspect-[16/9] overflow-hidden relative">
                  {coverImg ? (
                    <img
                      src={coverImg}
                      alt={project.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#00447C] to-[#003366] flex items-center justify-center">
                      <Building2 className="w-16 h-16 text-white/30" />
                    </div>
                  )}
                  {project.showroom_developer && (
                    <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full font-medium">
                      {project.showroom_developer}
                    </div>
                  )}
                </div>

                <div className="p-6">
                  <h2 className="text-xl font-bold text-gray-900 group-hover:text-[#00447C] transition-colors mb-2">
                    {project.name}
                  </h2>

                  <div className="flex flex-wrap gap-3 text-sm text-gray-500 mb-3">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" /> {project.city || project.address}
                    </span>
                    {project.showroom_delivery_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" /> Entrega: {project.showroom_delivery_date}
                      </span>
                    )}
                    {project.showroom_price_from && (
                      <span className="flex items-center gap-1 text-[#00447C] font-semibold">
                        <DollarSign className="w-3.5 h-3.5" />
                        Desde {project.showroom_currency} {project.showroom_price_from.toLocaleString()}
                      </span>
                    )}
                  </div>

                  {project.showroom_description && (
                    <p className="text-gray-500 text-sm line-clamp-2 mb-4">
                      {project.showroom_description}
                    </p>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex gap-2 text-xs text-gray-400">
                      {project.floors && <span>{project.floors} pisos</span>}
                      {project.total_units && <span>• {project.total_units} unidades</span>}
                    </div>
                    <span className="text-[#FC5100] text-sm font-semibold flex items-center gap-1 group-hover:gap-2 transition-all">
                      Ver proyecto <ArrowRight className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PortalShowroom;
