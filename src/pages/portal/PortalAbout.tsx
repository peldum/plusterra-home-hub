import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MapPin, Phone, Mail, Loader2 } from 'lucide-react';

const PortalAbout = () => {
  const { data: settings, isLoading } = useQuery({
    queryKey: ['portal-about-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('portal_settings')
        .select('about_company_text, about_company_image_url, company_address, company_phone, company_email, facebook_url, instagram_url')
        .limit(1)
        .single();
      if (error) throw error;
      return data as any;
    },
    staleTime: 5 * 60_000,
  });

  if (isLoading) return (
    <div className="flex justify-center items-center min-h-[60vh]">
      <Loader2 className="w-8 h-8 animate-spin text-[#00447C]" />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Nuestra Empresa</h1>

      {settings?.about_company_image_url && (
        <div className="rounded-xl overflow-hidden mb-8">
          <img
            src={settings.about_company_image_url}
            alt="Plusterra Inmobiliaria"
            className="w-full max-h-[400px] object-cover"
          />
        </div>
      )}

      <div className="prose prose-gray max-w-none mb-10">
        {settings?.about_company_text ? (
          <div className="whitespace-pre-line text-gray-700 leading-relaxed">
            {settings.about_company_text}
          </div>
        ) : (
          <p className="text-gray-500">
            En <strong>PLUSTERRA Inmobiliaria</strong> somos una empresa joven de Encarnación, Paraguay, con el propósito de ayudarte a encontrar ese lugar especial donde los sueños se hacen realidad: hogares que inspiran amor y proyectos que impulsan crecimiento.
          </p>
        )}
      </div>

      {/* Contact info */}
      <div className="bg-gray-50 rounded-xl p-6 space-y-4">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Datos de Contacto</h2>
        {settings?.company_address && (
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-[#FC5100] mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-gray-900">Ubicación</p>
              <p className="text-gray-600 text-sm">{settings.company_address}</p>
            </div>
          </div>
        )}
        {settings?.company_phone && (
          <div className="flex items-start gap-3">
            <Phone className="w-5 h-5 text-[#FC5100] mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-gray-900">Teléfono</p>
              <a href={`tel:${settings.company_phone}`} className="text-[#00447C] hover:underline text-sm">
                {settings.company_phone}
              </a>
            </div>
          </div>
        )}
        {settings?.company_email && (
          <div className="flex items-start gap-3">
            <Mail className="w-5 h-5 text-[#FC5100] mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-gray-900">Email</p>
              <a href={`mailto:${settings.company_email}`} className="text-[#00447C] hover:underline text-sm">
                {settings.company_email}
              </a>
            </div>
          </div>
        )}
        {(settings?.facebook_url || settings?.instagram_url) && (
          <div className="flex gap-3 pt-2">
            {settings.facebook_url && (
              <a href={settings.facebook_url} target="_blank" rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-[#1877F2] text-white flex items-center justify-center hover:opacity-80 transition-opacity">
                <span className="text-sm font-bold">f</span>
              </a>
            )}
            {settings.instagram_url && (
              <a href={settings.instagram_url} target="_blank" rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-gradient-to-br from-[#f09433] via-[#e6683c] to-[#bc1888] text-white flex items-center justify-center hover:opacity-80 transition-opacity">
                <span className="text-sm font-bold">ig</span>
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PortalAbout;
