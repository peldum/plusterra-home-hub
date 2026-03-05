import { useState, useEffect } from 'react';
import { Crown, Save, History, User } from 'lucide-react';
import { usePlanPricing, useUpdatePlanPricing } from '@/hooks/usePlanPricing';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const formatGs = (n: number) => n.toLocaleString('es-PY') + ' Gs';

export const AgentPlanPricingSection = () => {
  const { data: pricing, isLoading } = usePlanPricing();
  const updatePricing = useUpdatePlanPricing();

  const [basicPrice, setBasicPrice] = useState(100000);
  const [premiumPrice, setPremiumPrice] = useState(150000);

  useEffect(() => {
    if (pricing) {
      setBasicPrice(pricing.basic);
      setPremiumPrice(pricing.premium);
    }
  }, [pricing]);

  // Audit history for plan-related changes
  const { data: history } = useQuery({
    queryKey: ['plan-audit-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('id, action, user_id, created_at, old_data, new_data, target_table')
        .or('action.eq.update_plan_pricing,action.eq.update_agent_plan')
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;

      // Get user names
      const userIds = [...new Set((data || []).map(d => d.user_id).filter(Boolean))];
      const { data: profiles } = userIds.length
        ? await supabase.from('profiles').select('id, full_name').in('id', userIds)
        : { data: [] };
      const nameMap = new Map((profiles || []).map(p => [p.id, p.full_name]));

      return (data || []).map(d => ({
        ...d,
        user_name: nameMap.get(d.user_id || '') || 'Sistema',
      }));
    },
    staleTime: 30_000,
  });

  const handleSave = () => {
    if (basicPrice <= 0 || premiumPrice <= 0) return;
    updatePricing.mutate({ basic: basicPrice, premium: premiumPrice });
  };

  const hasChanges = pricing && (basicPrice !== pricing.basic || premiumPrice !== pricing.premium);

  if (isLoading) return null;

  return (
    <div className="bg-card border border-border rounded-xl p-6 animate-slide-up opacity-0" style={{ animationDelay: '50ms', animationFillMode: 'forwards' }}>
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-amber-500/10">
          <Crown className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <h3 className="font-display text-lg font-semibold text-foreground">Planes de Agente</h3>
          <p className="text-sm text-muted-foreground">Precio mensual por tipo de plan</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="bg-muted/50 rounded-lg p-4">
          <label className="block text-sm font-medium text-foreground mb-2">Plan Básico</label>
          <div className="relative">
            <input
              type="number"
              value={basicPrice}
              onChange={e => setBasicPrice(Number(e.target.value))}
              className="input-field pr-10"
              min={0}
              step={1000}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">Gs</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Acceso estándar al sistema</p>
        </div>
        <div className="bg-amber-500/5 border border-amber-400/20 rounded-lg p-4">
          <label className="block text-sm font-medium text-foreground mb-2 flex items-center gap-1.5">
            Plan Premium <Crown className="w-3.5 h-3.5 text-amber-500" />
          </label>
          <div className="relative">
            <input
              type="number"
              value={premiumPrice}
              onChange={e => setPremiumPrice(Number(e.target.value))}
              className="input-field pr-10"
              min={0}
              step={1000}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">Gs</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Incluye verificación, destacados, video y más</p>
        </div>
      </div>

      {hasChanges && (
        <button
          onClick={handleSave}
          disabled={updatePricing.isPending}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {updatePricing.isPending ? 'Guardando...' : 'Guardar precios'}
        </button>
      )}

      {/* History section */}
      {history && history.length > 0 && (
        <div className="mt-6 border-t border-border pt-4">
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
            <History className="w-4 h-4 text-muted-foreground" />
            Historial de cambios
          </h4>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {history.map(h => {
              const newData = h.new_data as any;
              const oldData = h.old_data as any;
              let description = '';

              if (h.action === 'update_plan_pricing') {
                description = `Actualizó precios: Básico ${formatGs(newData?.basic || 0)}, Premium ${formatGs(newData?.premium || 0)}`;
              } else if (h.action === 'update_agent_plan') {
                const planLabel = newData?.new_plan === 'premium' ? 'Premium ⭐' : 'Básico';
                description = `Cambió plan de "${newData?.agent_name || 'agente'}" a ${planLabel}`;
              }

              return (
                <div key={h.id} className="flex items-start gap-3 text-xs bg-muted/30 rounded-lg px-3 py-2">
                  <User className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground">{description}</p>
                    <p className="text-muted-foreground">
                      por <span className="font-medium">{h.user_name}</span> · {format(new Date(h.created_at), "dd MMM yyyy HH:mm", { locale: es })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
