/**
 * CanonSettingsSection — Sección en Configuración para que SuperAdmin
 * gestione los parámetros globales del canon mensual de agentes.
 */
import { useState, useEffect } from 'react';
import { useCanonSettings, useUpdateCanonSettings } from '@/hooks/useCanonSettings';
import { useAuth } from '@/contexts/AuthContext';
import { Coins, Save, Loader2, Settings2 } from 'lucide-react';

const fmt = (n: number) =>
  new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', minimumFractionDigits: 0 }).format(n);

export const CanonSettingsSection = () => {
  const { role } = useAuth();
  const isSuperAdmin = role === 'superadmin';
  const { data: settings, isLoading } = useCanonSettings();
  const updateMutation = useUpdateCanonSettings();

  const [canonBase, setCanonBase] = useState('');
  const [dueDay, setDueDay] = useState('');
  const [dailyInterest, setDailyInterest] = useState('');
  const [gracePeriod, setGracePeriod] = useState('');

  useEffect(() => {
    if (settings) {
      setCanonBase(String(settings.canon_base_amount));
      setDueDay(String(settings.due_day));
      setDailyInterest(String(settings.daily_interest_amount));
      setGracePeriod(String(settings.grace_period_days));
    }
  }, [settings]);

  if (!isSuperAdmin) return null;

  const handleSave = async () => {
    await updateMutation.mutateAsync({
      canon_base_amount: Number(canonBase),
      due_day: Number(dueDay),
      daily_interest_amount: Number(dailyInterest),
      grace_period_days: Number(gracePeriod),
    });
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6 animate-slide-up opacity-0"
      style={{ animationDelay: '50ms', animationFillMode: 'forwards' }}>
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-primary/10">
          <Coins className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-display text-lg font-semibold text-foreground">Canon de Agentes</h3>
          <p className="text-sm text-muted-foreground">Configuración global del canon mensual (Solo SuperAdmin)</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground py-4">
          <Loader2 className="w-4 h-4 animate-spin" /> Cargando…
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Canon base */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Canon mensual base
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-sm">₲</span>
                <input
                  type="number"
                  min="0"
                  value={canonBase}
                  onChange={e => setCanonBase(e.target.value)}
                  className="input-field pl-8"
                  placeholder="64000"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Valor actual: <strong>{settings ? fmt(settings.canon_base_amount) : '–'}</strong>
              </p>
            </div>

            {/* Día de vencimiento */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Día de vencimiento mensual
              </label>
              <input
                type="number"
                min="1"
                max="28"
                value={dueDay}
                onChange={e => setDueDay(e.target.value)}
                className="input-field"
                placeholder="5"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Del 1 al {dueDay || '5'} se considera AL DÍA.
              </p>
            </div>

            {/* Interés diario */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Interés diario por atraso
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-sm">₲</span>
                <input
                  type="number"
                  min="0"
                  value={dailyInterest}
                  onChange={e => setDailyInterest(e.target.value)}
                  className="input-field pl-8"
                  placeholder="2000"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Se suma por cada día de atraso a partir del vencimiento.
              </p>
            </div>

            {/* Período de gracia para MOROSO */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Días para estado MOROSO
              </label>
              <input
                type="number"
                min="1"
                value={gracePeriod}
                onChange={e => setGracePeriod(e.target.value)}
                className="input-field"
                placeholder="30"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Si supera este atraso, pasa a MOROSO con restricciones.
              </p>
            </div>
          </div>

          {/* Moneda fija */}
          <div className="mt-5 p-3 bg-muted/50 rounded-lg flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Moneda: <strong className="text-foreground">Guaraní paraguayo (₲ PYG)</strong> — fija, no editable.
            </p>
          </div>

          <div className="flex justify-end mt-6">
            <button
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
            >
              {updateMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Guardar configuración
            </button>
          </div>
        </>
      )}
    </div>
  );
};
