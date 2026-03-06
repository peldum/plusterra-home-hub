/**
 * BuildingAdminConfig — Panel de configuración de administración tercerizada
 * en el detalle de un edificio. Solo visible para admin/superadmin.
 */
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Settings2, Save, Loader2, Building2, Users, Percent } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Props {
  building: any;
}

export const BuildingAdminConfig = ({ building }: Props) => {
  const { role } = useAuth();
  const qc = useQueryClient();
  const isAdmin = role === 'superadmin' || role === 'admin';

  const [isThirdParty, setIsThirdParty] = useState(false);
  const [totalPct, setTotalPct] = useState('5');
  const [internalPct, setInternalPct] = useState('5');
  const [externalPct, setExternalPct] = useState('0');
  const [externalCompany, setExternalCompany] = useState('');
  const [expensePayee, setExpensePayee] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (building) {
      setIsThirdParty(building.is_third_party_admin ?? false);
      setTotalPct(String(building.admin_fee_total_pct ?? 5));
      setInternalPct(String(building.admin_fee_internal_pct ?? 5));
      setExternalPct(String(building.admin_fee_external_pct ?? 0));
      setExternalCompany(building.external_admin_company ?? '');
      setExpensePayee(building.expense_payee_name ?? '');
    }
  }, [building]);

  // Auto-calculate external when total or internal changes
  const handleTotalChange = (val: string) => {
    setTotalPct(val);
    const t = Number(val) || 0;
    const i = Number(internalPct) || 0;
    setExternalPct(String(Math.max(0, t - i)));
  };

  const handleInternalChange = (val: string) => {
    setInternalPct(val);
    const t = Number(totalPct) || 0;
    const i = Number(val) || 0;
    setExternalPct(String(Math.max(0, t - i)));
  };

  if (!isAdmin) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('buildings')
        .update({
          is_third_party_admin: isThirdParty,
          admin_fee_total_pct: Number(totalPct),
          admin_fee_internal_pct: Number(internalPct),
          admin_fee_external_pct: Number(externalPct),
          external_admin_company: isThirdParty ? externalCompany || null : null,
          expense_payee_name: expensePayee || null,
        })
        .eq('id', building.id);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ['building-detail', building.id] });
      toast.success('Configuración de administración guardada');
    } catch (err: any) {
      toast.error('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5 mb-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-primary/10">
          <Settings2 className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-sm text-foreground">Configuración de Administración</h3>
          <p className="text-xs text-muted-foreground">Comisiones, tercerización y responsable de expensas</p>
        </div>
      </div>

      {/* Toggle tercerización */}
      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg mb-4">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium text-foreground">Administración tercerizada</p>
            <p className="text-xs text-muted-foreground">Activar si la administración se comparte con empresa externa</p>
          </div>
        </div>
        <Switch checked={isThirdParty} onCheckedChange={setIsThirdParty} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Fee total para propietario */}
        <div>
          <label className="block text-xs font-medium text-foreground mb-1.5">
            <Percent className="w-3 h-3 inline mr-1" />
            Comisión total (visible al propietario)
          </label>
          <div className="relative">
            <input
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={totalPct}
              onChange={e => handleTotalChange(e.target.value)}
              className="input-field pr-8"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
          </div>
        </div>

        {/* Fee interno Plusterra */}
        <div>
          <label className="block text-xs font-medium text-foreground mb-1.5">
            Parte Plusterra
          </label>
          <div className="relative">
            <input
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={internalPct}
              onChange={e => handleInternalChange(e.target.value)}
              className="input-field pr-8"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
          </div>
        </div>

        {/* Fee externo (read-only calculated) */}
        {isThirdParty && (
          <>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Parte empresa externa
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={externalPct}
                  readOnly
                  className="input-field pr-8 bg-muted/50"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Calculado: Total - Plusterra</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                <Building2 className="w-3 h-3 inline mr-1" />
                Nombre empresa externa
              </label>
              <input
                type="text"
                value={externalCompany}
                onChange={e => setExternalCompany(e.target.value)}
                className="input-field"
                placeholder="Ej: Glosker"
              />
            </div>
          </>
        )}

        {/* Expense payee */}
        <div>
          <label className="block text-xs font-medium text-foreground mb-1.5">
            <Users className="w-3 h-3 inline mr-1" />
            Responsable de expensas
          </label>
          <input
            type="text"
            value={expensePayee}
            onChange={e => setExpensePayee(e.target.value)}
            className="input-field"
            placeholder="Ej: Patricia"
          />
          <p className="text-[10px] text-muted-foreground mt-1">Persona que cobra por limpieza/mantenimiento del edificio</p>
        </div>
      </div>

      {/* Summary badge */}
      {isThirdParty && (
        <div className="mt-4 p-3 bg-muted/30 rounded-lg flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="text-xs">
            Total propietario: {totalPct}%
          </Badge>
          <Badge className="bg-primary/10 text-primary border-0 text-xs">
            Plusterra: {internalPct}%
          </Badge>
          <Badge className="bg-secondary/10 text-secondary border-0 text-xs">
            {externalCompany || 'Externa'}: {externalPct}%
          </Badge>
          {expensePayee && (
            <Badge variant="outline" className="text-xs">
              Expensas → {expensePayee}
            </Badge>
          )}
        </div>
      )}

      <div className="flex justify-end mt-4">
        <Button onClick={handleSave} disabled={saving} size="sm" className="gap-1.5">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Guardar configuración
        </Button>
      </div>
    </div>
  );
};
