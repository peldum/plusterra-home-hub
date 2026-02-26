import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePublicListings } from '@/hooks/usePublicListings';
import { PortalPropertyCard } from '@/components/portal/PortalPropertyCard';
import { Search, Building2, ArrowRight, Loader2 } from 'lucide-react';

const PortalHome = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const { data: featured, isLoading: loadingFeatured } = usePublicListings({ featuredOnly: true, limit: 6 });
  const { data: recent, isLoading: loadingRecent } = usePublicListings({ limit: 9 });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/portal/propiedades?q=${encodeURIComponent(search)}`);
  };

  return (
    <div>
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-[#00447C] via-[#003366] to-[#002244] text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-[#FC5100] rounded-full blur-[120px]" />
          <div className="absolute bottom-10 right-20 w-96 h-96 bg-blue-400 rounded-full blur-[150px]" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 py-20 md:py-28">
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight max-w-2xl">
            Encontrá tu próximo hogar con <span className="text-[#FC5100]">Plusterra</span>
          </h1>
          <p className="mt-4 text-white/70 text-lg max-w-xl">
            Alquileres, ventas y propiedades temporales en Paraguay. Buscá, explorá y contactá directamente.
          </p>

          {/* Search */}
          <form onSubmit={handleSearch} className="mt-8 flex max-w-xl">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Ciudad, zona o tipo de propiedad..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-l-xl text-gray-900 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#FC5100]"
              />
            </div>
            <button
              type="submit"
              className="px-6 bg-[#FC5100] hover:bg-[#e54900] text-white font-semibold rounded-r-xl transition-colors"
            >
              Buscar
            </button>
          </form>

          {/* Quick filters */}
          <div className="flex flex-wrap gap-2 mt-6">
            {['Alquiler', 'Venta', 'Temporal'].map(label => (
              <button
                key={label}
                onClick={() => navigate(`/portal/propiedades?tipo=${label.toLowerCase()}`)}
                className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-sm font-medium transition-colors backdrop-blur-sm border border-white/10"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Featured */}
      {(loadingFeatured || (featured && featured.length > 0)) && (
        <section className="max-w-7xl mx-auto px-4 py-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">⭐ Propiedades Destacadas</h2>
              <p className="text-gray-500 text-sm mt-1">Selección especial de nuestro equipo</p>
            </div>
            <button
              onClick={() => navigate('/portal/propiedades?destacados=true')}
              className="text-[#00447C] hover:text-[#FC5100] text-sm font-medium flex items-center gap-1 transition-colors"
            >
              Ver todas <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          {loadingFeatured ? (
            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-[#00447C]" /></div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {featured?.map(p => <PortalPropertyCard key={p.id} property={p} />)}
            </div>
          )}
        </section>
      )}

      {/* Recent */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Últimos Inmuebles</h2>
            <p className="text-gray-500 text-sm mt-1">Recién publicados</p>
          </div>
          <button
            onClick={() => navigate('/portal/propiedades')}
            className="text-[#00447C] hover:text-[#FC5100] text-sm font-medium flex items-center gap-1 transition-colors"
          >
            Ver catálogo <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        {loadingRecent ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-[#00447C]" /></div>
        ) : recent && recent.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {recent.map(p => <PortalPropertyCard key={p.id} property={p} />)}
          </div>
        ) : (
          <div className="text-center py-16">
            <Building2 className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No hay propiedades publicadas aún.</p>
          </div>
        )}
      </section>
    </div>
  );
};

export default PortalHome;
