import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePublicListings } from '@/hooks/usePublicListings';
import { usePortalSettings, PortalBlockConfig } from '@/hooks/usePortalSettings';
import { Sparkles, ChevronRight, Home, Building2, MapPin, DollarSign, Bed, Loader2 } from 'lucide-react';

const DEFAULT_EMOJIS: Record<string, string> = {
  businessType_rent: '🔑', businessType_sale: '🏠', businessType_temporary: '🏖️', businessType_any: '✨',
  propertyType_apartment: '🏢', propertyType_house: '🏡', propertyType_office: '💼', propertyType_any: '🤷',
  bedrooms_1: '1️⃣', bedrooms_2: '2️⃣', bedrooms_3: '3️⃣', bedrooms_any: '🔢',
  budget_low: '💰', budget_mid: '💰💰', budget_high: '💰💰💰', budget_any: '♾️',
};

const buildSteps = (emojis: Record<string, string>) => {
  const e = (key: string) => emojis[key] || DEFAULT_EMOJIS[key] || '❓';
  return [
    {
      question: '¿Qué tipo de operación buscás?',
      key: 'businessType',
      icon: DollarSign,
      options: [
        { value: 'rent', label: 'Alquiler', emoji: e('businessType_rent') },
        { value: 'sale', label: 'Compra', emoji: e('businessType_sale') },
        { value: 'temporary', label: 'Temporal', emoji: e('businessType_temporary') },
        { value: 'any', label: 'Cualquiera', emoji: e('businessType_any') },
      ],
    },
    {
      question: '¿Qué tipo de propiedad preferís?',
      key: 'propertyType',
      icon: Building2,
      options: [
        { value: 'apartment', label: 'Departamento', emoji: e('propertyType_apartment') },
        { value: 'house', label: 'Casa', emoji: e('propertyType_house') },
        { value: 'office', label: 'Oficina', emoji: e('propertyType_office') },
        { value: 'any', label: 'Me da igual', emoji: e('propertyType_any') },
      ],
    },
    {
      question: '¿Cuántos dormitorios necesitás?',
      key: 'bedrooms',
      icon: Bed,
      options: [
        { value: '1', label: '1', emoji: e('bedrooms_1') },
        { value: '2', label: '2', emoji: e('bedrooms_2') },
        { value: '3', label: '3+', emoji: e('bedrooms_3') },
        { value: 'any', label: 'No importa', emoji: e('bedrooms_any') },
      ],
    },
    {
      question: '¿Cuál es tu presupuesto mensual/total?',
      key: 'budget',
      icon: DollarSign,
      options: [
        { value: 'low', label: 'Hasta 3M Gs.', emoji: e('budget_low') },
        { value: 'mid', label: '3M - 8M Gs.', emoji: e('budget_mid') },
        { value: 'high', label: 'Más de 8M Gs.', emoji: e('budget_high') },
        { value: 'any', label: 'Sin límite', emoji: e('budget_any') },
      ],
    },
  ];
};

const PropertyQuiz = () => {
  const navigate = useNavigate();
  const { settings } = usePortalSettings();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showResults, setShowResults] = useState(false);
  const { data: allListings, isLoading } = usePublicListings();

  const quizBlock = (settings?.blocks_config as PortalBlockConfig[] | undefined)?.find(b => b.id === 'quiz_cta');
  const customEmojis: Record<string, string> = quizBlock?.config?.emojis || {};
  const STEPS = useMemo(() => buildSteps(customEmojis), [JSON.stringify(customEmojis)]);

  const handleSelect = (key: string, value: string) => {
    const newAnswers = { ...answers, [key]: value };
    setAnswers(newAnswers);

    if (step < STEPS.length - 1) {
      setTimeout(() => setStep(s => s + 1), 300);
    } else {
      setTimeout(() => setShowResults(true), 300);
    }
  };

  const results = useMemo(() => {
    if (!allListings || !showResults) return [];
    let filtered = [...allListings];

    if (answers.businessType && answers.businessType !== 'any') {
      filtered = filtered.filter(p => {
        const hasRent = Number(p.rental_price) > 0;
        const hasSale = Number(p.sale_price) > 0;
        if (answers.businessType === 'rent') return hasRent && p.rental_period !== 'daily';
        if (answers.businessType === 'sale') return hasSale;
        if (answers.businessType === 'temporary') return hasRent && p.rental_period === 'daily';
        return true;
      });
    }

    if (answers.propertyType && answers.propertyType !== 'any') {
      filtered = filtered.filter(p => p.property_type === answers.propertyType);
    }

    if (answers.bedrooms && answers.bedrooms !== 'any') {
      const min = Number(answers.bedrooms);
      filtered = filtered.filter(p => (p.bedrooms || 0) >= min);
    }

    if (answers.budget && answers.budget !== 'any') {
      filtered = filtered.filter(p => {
        const price = Number(p.sale_price) > 0 ? Number(p.sale_price) : Number(p.rental_price);
        if (answers.budget === 'low') return price <= 3_000_000;
        if (answers.budget === 'mid') return price >= 3_000_000 && price <= 8_000_000;
        if (answers.budget === 'high') return price > 8_000_000;
        return true;
      });
    }

    return filtered.slice(0, 6);
  }, [allListings, answers, showResults]);

  const handleRestart = () => {
    setStep(0);
    setAnswers({});
    setShowResults(false);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-[#00447C]" />
      </div>
    );
  }

  if (showResults) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <Sparkles className="w-10 h-10 mx-auto text-[#FC5100] mb-3" />
          <h2 className="text-2xl font-bold text-gray-900">
            {results.length > 0 ? '¡Encontramos opciones para vos!' : 'No encontramos coincidencias exactas'}
          </h2>
          <p className="text-gray-500 mt-2 text-sm">
            {results.length > 0
              ? `${results.length} propiedad(es) coinciden con tu perfil.`
              : 'Probá ajustando tus preferencias o explorá todo el catálogo.'}
          </p>
        </div>

        {results.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {results.map(p => {
              const thumb = p.photos?.[0]?.thumbnail_url || p.photos?.[0]?.photo_url;
              const price = Number(p.sale_price) > 0 ? Number(p.sale_price) : Number(p.rental_price);
              return (
                <button
                  key={p.id}
                  onClick={() => navigate(`/portal/propiedades/${p.id}`)}
                  className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow text-left group"
                >
                  <div className="aspect-[4/3] overflow-hidden">
                    {thumb ? (
                      <img src={thumb} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" />
                    ) : (
                      <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400">Sin foto</div>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="text-sm font-semibold text-gray-900 line-clamp-1">{p.title}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{[p.neighborhood, p.city].filter(Boolean).join(', ')}</p>
                    <p className="text-lg font-bold text-[#00447C] mt-1">
                      Gs. {Math.round(price).toLocaleString('es-PY')}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        ) : null}

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={handleRestart}
            className="px-5 py-2.5 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Repetir quiz
          </button>
          <button
            onClick={() => navigate('/portal/propiedades')}
            className="px-5 py-2.5 bg-[#00447C] hover:bg-[#003366] text-white rounded-lg text-sm font-semibold transition-colors"
          >
            Ver catálogo completo
          </button>
        </div>
      </div>
    );
  }

  const currentStep = STEPS[step];

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      {/* Progress */}
      <div className="flex gap-1.5 mb-8">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i <= step ? 'bg-[#FC5100]' : 'bg-gray-200'
            }`}
          />
        ))}
      </div>

      <div className="text-center mb-8">
        <currentStep.icon className="w-10 h-10 mx-auto text-[#00447C] mb-3" />
        <h2 className="text-xl md:text-2xl font-bold text-gray-900">
          {currentStep.question}
        </h2>
        <p className="text-sm text-gray-500 mt-1">Paso {step + 1} de {STEPS.length}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {currentStep.options.map(opt => (
          <button
            key={opt.value}
            onClick={() => handleSelect(currentStep.key, opt.value)}
            className={`flex flex-col items-center gap-2 p-5 rounded-xl border-2 transition-all hover:shadow-md ${
              answers[currentStep.key] === opt.value
                ? 'border-[#FC5100] bg-orange-50'
                : 'border-gray-200 hover:border-[#00447C]/30 bg-white'
            }`}
          >
            <span className="text-3xl">{opt.emoji}</span>
            <span className="text-sm font-semibold text-gray-800">{opt.label}</span>
          </button>
        ))}
      </div>

      {step > 0 && (
        <button
          onClick={() => setStep(s => s - 1)}
          className="mt-4 text-sm text-gray-500 hover:text-gray-700 mx-auto block"
        >
          ← Volver
        </button>
      )}
    </div>
  );
};

export default PropertyQuiz;
