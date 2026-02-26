import { X, ArrowLeftRight, Bed, Bath, Ruler, Car, MapPin } from 'lucide-react';
import { useCompareList } from './compareStore';
import { Link } from 'react-router-dom';

const formatPrice = (amount: number) =>
  'Gs. ' + Math.round(amount).toLocaleString('es-PY');

export const CompareBar = () => {
  const { items, remove, clear, count } = useCompareList();

  if (count === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t-2 border-[#00447C] shadow-2xl animate-in slide-in-from-bottom-4 duration-200">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
            <ArrowLeftRight className="w-4 h-4 text-[#FC5100]" />
            Comparar ({count}/3)
          </div>
          <div className="flex items-center gap-2">
            {count >= 2 && (
              <Link
                to="/portal/comparar"
                className="px-4 py-2 bg-[#FC5100] hover:bg-[#e54900] text-white text-sm font-semibold rounded-lg transition-colors"
              >
                Comparar ahora
              </Link>
            )}
            <button onClick={clear} className="text-xs text-gray-500 hover:text-gray-700">
              Limpiar
            </button>
          </div>
        </div>
        <div className="flex gap-3 overflow-x-auto">
          {items.map(p => (
            <div key={p.id} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 min-w-[200px]">
              <div className="w-12 h-12 rounded overflow-hidden flex-shrink-0">
                {p.photos?.[0]?.thumbnail_url ? (
                  <img src={p.photos[0].thumbnail_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gray-200" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-800 truncate">{p.title}</p>
                <p className="text-xs text-gray-500">{p.city}</p>
              </div>
              <button onClick={() => remove(p.id)} className="p-1 hover:bg-gray-200 rounded">
                <X className="w-3.5 h-3.5 text-gray-400" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const ComparePage = () => {
  const { items, remove } = useCompareList();

  if (items.length < 2) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <ArrowLeftRight className="w-12 h-12 mx-auto text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-700 mb-2">Comparador de Propiedades</h2>
        <p className="text-gray-500 mb-4">Seleccioná al menos 2 propiedades para comparar.</p>
        <Link to="/portal/propiedades" className="text-[#00447C] hover:underline">← Ir al catálogo</Link>
      </div>
    );
  }

  const rows = [
    { label: 'Precio Venta', render: (p: typeof items[0]) => Number(p.sale_price) > 0 ? formatPrice(Number(p.sale_price)) : '—' },
    { label: 'Precio Alquiler', render: (p: typeof items[0]) => Number(p.rental_price) > 0 ? formatPrice(Number(p.rental_price)) + (p.rental_period === 'daily' ? '/día' : '/mes') : '—' },
    { label: 'Ubicación', render: (p: typeof items[0]) => [p.neighborhood, p.city].filter(Boolean).join(', ') || '—' },
    { label: 'Tipo', render: (p: typeof items[0]) => {
      const types: Record<string, string> = { apartment: 'Depto', house: 'Casa', land: 'Terreno', office: 'Oficina', commercial: 'Local', other: 'Otro' };
      return types[p.property_type] || p.property_type;
    }},
    { label: 'Superficie', render: (p: typeof items[0]) => p.area_m2 ? `${p.area_m2} m²` : '—' },
    { label: 'Dormitorios', render: (p: typeof items[0]) => p.bedrooms != null ? String(p.bedrooms) : '—' },
    { label: 'Baños', render: (p: typeof items[0]) => p.bathrooms != null ? String(p.bathrooms) : '—' },
    { label: 'Cochera', render: (p: typeof items[0]) => p.has_garage ? 'Sí' : 'No' },
    { label: 'Amenities', render: (p: typeof items[0]) => p.amenities?.join(', ') || '—' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-6">
        <Link to="/portal/propiedades" className="text-sm text-gray-500 hover:text-[#00447C]">← Catálogo</Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-bold text-gray-900">Comparar Propiedades</h1>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse min-w-[600px]">
          <thead>
            <tr>
              <th className="w-36"></th>
              {items.map(p => (
                <th key={p.id} className="p-3 text-center">
                  <div className="relative">
                    <button
                      onClick={() => remove(p.id)}
                      className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-red-100 hover:bg-red-200 text-red-600 flex items-center justify-center text-xs"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <Link to={`/portal/propiedades/${p.id}`}>
                      <div className="w-full aspect-[4/3] rounded-xl overflow-hidden mb-2">
                        {p.photos?.[0] ? (
                          <img src={p.photos[0].thumbnail_url || p.photos[0].photo_url} alt={p.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400 text-xs">Sin foto</div>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-gray-900 hover:text-[#00447C] line-clamp-2">{p.title}</p>
                    </Link>
                    <p className="text-xs text-gray-500 mt-0.5">{p.property_code}</p>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.label} className={i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                <td className="px-3 py-3 text-sm font-medium text-gray-700 whitespace-nowrap">{row.label}</td>
                {items.map(p => (
                  <td key={p.id} className="px-3 py-3 text-sm text-gray-600 text-center">
                    {row.render(p)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
