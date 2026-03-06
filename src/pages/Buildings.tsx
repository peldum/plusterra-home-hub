import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { useNavigate } from 'react-router-dom';
import { Building2, MapPin, Layers, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const Buildings = () => {
  const navigate = useNavigate();

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
      <p className="text-sm text-muted-foreground mb-6">
        Gestión de edificios, unidades, propietarios y liquidaciones mensuales.
      </p>

      {isLoading && (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}

      {!isLoading && (!buildings || buildings.length === 0) && (
        <div className="text-center py-16">
          <Building2 className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">No hay edificios registrados.</p>
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
              <div className="flex items-center gap-2 mt-3">
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
                {b.is_third_party_admin && (
                  <Badge className="bg-secondary/10 text-secondary border-0 text-[10px]">
                    Admin: {b.external_admin_company || 'Tercerizada'}
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </MainLayout>
  );
};

export default Buildings;
