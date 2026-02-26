import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { PortalProfileForm } from '@/components/agents/PortalProfileForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Globe } from 'lucide-react';

const MyPortalProfile = () => {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <MainLayout title="Mi Perfil Portal" subtitle="Configurá cómo aparecés en el portal público de propiedades">
      <div className="max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Globe className="w-4 h-4 text-primary" /> Perfil Público
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Esta información se muestra en la sección "Nuestros Agentes" del portal web y en las fichas de tus propiedades publicadas.
            </p>
          </CardHeader>
          <CardContent>
            <PortalProfileForm agentId={user.id} />
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default MyPortalProfile;
