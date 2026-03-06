import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Building2, MapPin, Layers, Loader2, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BuildingFormDialog } from '@/components/buildings/BuildingFormDialog';

const Buildings = () => {
  const navigate = useNavigate();
  const { role } = useAuth();
  const canCreate = role === 'superadmin' || role === 'admin';
  const [showCreate, setShowCreate] = useState(false);

  const { data: buildings, isLoading } = useQuery({
    queryKey: ['buildings-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('buildings')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  return (
    <MainLayout title="Edificios">
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-muted-foreground">
          Gestión de edificios, unidades, propietarios y liquidaciones mensuales.
        </p>
        {canCreate && (
          <Button onClick={() => setShowCreate(true)} className="gap-1.5">
            <Plus className="w-4 h-4" />
            Nuevo Edificio
          </Button>
        )}
      </div>

      {isLoading && (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}

      {!isLoading && (!buildings || buildings.length === 0) && (
        <div className="text-center py-16">
          <Building2 className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground mb-4">No hay edificios registrados.</p>
          {canCreate && (
            <Button variant="outline" onClick={() => setShowCreate(true)} className="gap-1.5">
              <Plus className="w-4 h-4" />
              Crear tu primer edificio
            </Button>
          )}
        </div>
      )}

      {!isLoading && buildings && buildings.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {buildings.map(b => (
            <div
              key={b.id}
              onClick={() => navigate(`/edificios/${b.id}`)}
              className="bg-card border border-border rounded-xl p-5 hover:shadow-lg hover:border-primary/30 transition-all cursor-pointer group"
            >
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground text-sm leading-tight group-hover:text-primary transition-colors">
                    {b.name}
                  </h3>
                  {b.address && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1 truncate">
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      {b.address}{b.city ? `, ${b.city}` : ''}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                {b.total_units && (
                  <Badge variant="secondary" className="text-[10px]">
                    <Layers className="w-3 h-3 mr-1" />
                    {b.total_units} unidades
                  </Badge>
                )}
                {b.floors && (
                  <Badge variant="outline" className="text-[10px]">
                    {b.floors} pisos
                  </Badge>
                )}
                {b.category && (
                  <Badge variant="outline" className="text-[10px]">{b.category}</Badge>
                )}
                {b.admin_model === 'modelo_1' && (
                  <Badge className="bg-secondary/10 text-secondary border-0 text-[10px]">
                    Admin: {b.external_admin_company || 'Tercerizada'}
                  </Badge>
                )}
                {b.admin_model === 'modelo_3' && (
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 text-[10px]">
                    Prop. cobra directo
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create dialog */}
      <BuildingFormDialog open={showCreate} onOpenChange={setShowCreate} />
    </MainLayout>
  );
};

export default Buildings;
