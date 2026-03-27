import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AlertTriangle, CheckCircle2, ArrowRight, Loader2 } from 'lucide-react';

const fmtGs = (n: number) => 'Gs. ' + Math.round(n).toLocaleString('es-PY');

export const RentCollectionWidget = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const now = new Date();
  const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const periodStart = `${period}-01`;
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const periodEnd = lastDay.toISOString().split('T')[0];

  const { data, isLoading } = useQuery({
    queryKey: ['rent-collection-widget', period],
    queryFn: async () => {
      const { data: recs, error } = await supabase
        .from('receivables')
        .select('id, amount, status, due_date, debtor_name, unit_code, total_cobrado, paid_amount, building_id')
        .eq('concept', 'alquiler')
        .gte('due_date', periodStart)
        .lte('due_date', periodEnd);
      if (error) throw error;
      return recs || [];
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  if (isLoading) return (
    <div className="bg-card border border-border rounded-2xl p-5 flex items-center justify-center h-[200px]">
      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
    </div>
  );

  const recs = data || [];
  if (recs.length === 0) return null;

  const total = recs.reduce((s, r) => s + Number(r.amount), 0);
  const cobrado = recs
    .filter(r => r.status === 'paid')
    .reduce((s, r) => s + Number(r.total_cobrado ?? r.paid_amount ?? r.amount), 0);
  const pendiente = total - cobrado;
  const pct = total > 0 ? Math.round((cobrado / total) * 100) : 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const urgent = recs
    .filter(r => r.status !== 'paid')
    .map(r => {
      const due = new Date(r.due_date);
      const diff = Math.ceil((today.getTime() - due.getTime()) / 86400000);
      return { ...r, daysLate: diff };
    })
    .filter(r => r.daysLate > 0)
    .sort((a, b) => b.daysLate - a.daysLate)
    .slice(0, 5);

  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide flex items-center gap-2">
          🏢 Cobros del mes
        </h3>
        <span className="text-xs text-muted-foreground capitalize">
          {now.toLocaleDateString('es-PY', { month: 'long', year: 'numeric' })}
        </span>
      </div>

      {/* Progress */}
      <div className="mb-4">
        <div className="flex items-end justify-between mb-2">
          <span className="text-3xl font-bold text-foreground tabular-nums">{pct}%</span>
          <span className="text-xs text-muted-foreground">
            {fmtGs(cobrado)} / {fmtGs(total)}
          </span>
        </div>
        <div className="h-3 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ease-out ${pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-destructive'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex justify-between mt-1.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> Cobrado</span>
          <span className="text-orange-600 dark:text-orange-400 font-medium">Pendiente: {fmtGs(pendiente)}</span>
        </div>
      </div>

      {/* Urgent list */}
      {urgent.length > 0 && (
        <div className="border-t border-border pt-3">
          <p className="text-xs font-semibold text-destructive mb-2 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Más urgentes
          </p>
          <div className="space-y-1.5">
            {urgent.map(r => (
              <div key={r.id} className="flex items-center justify-between text-xs">
                <span className="text-foreground truncate flex-1 mr-2">
                  {r.unit_code && <span className="font-mono text-primary mr-1">{r.unit_code}</span>}
                  {r.debtor_name || '—'}
                </span>
                <span className="text-destructive font-bold tabular-nums flex-shrink-0">{r.daysLate}d</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={() => navigate('/buildings')}
        className="mt-3 flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
      >
        Ver todos los cobros <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
