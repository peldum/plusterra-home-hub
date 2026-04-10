/**
 * BuildingAdminConfig — Panel de configuración del modelo de administración
 * de un edificio. Solo visible para admin/superadmin.
 */
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Settings2, Save, Loader2, Building2, Users, Percent, Info, CheckCircle2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export type AdminModel = 'modelo_1' | 'modelo_2' | 'modelo_3';

const MODEL_INFO: Record<AdminModel, {
  title: string;
  subtitle: string;
  description: string;
  flow: string[];
  example: string;
  color: string;
}> = {
  modelo_1: {
    title: 'Modelo 1 — Administración Tercerizada',
    subtitle: 'Empresa externa administra, Plusterra co-gestiona',
    description: 'El inquilino paga el alquiler directamente a la empresa administradora externa (ej. Glosker). Las expensas se pagan a un responsable designado (ej. Patricia). Plusterra actúa como co-administrador y genera reportes para ambas partes.',
    flow: [
      'Inquilino paga alquiler → cuenta de empresa externa',
      'Inquilino paga expensas → responsable de expensas',
      'Plusterra controla y verifica comprobantes',
      'Plusterra genera rendición para propietario (ve % total)',
      'Plusterra genera reporte para empresa externa (ve desglose)',
    ],
    example: 'Ej: Edificio Salto IV — Glosker cobra 8% total (5% Plusterra + 3% Glosker). Patricia cobra expensas.',
    color: 'border-orange-300 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/30',
  },
  modelo_2: {
    title: 'Modelo 2 — Administración Directa',
    subtitle: 'Plusterra administra todo directamente',
    description: 'El inquilino paga el alquiler y servicios directamente a Plusterra. Plusterra registra pagos, deduce su comisión de administración, y transfiere el saldo neto al propietario.',
    flow: [
      'Inquilino paga alquiler → cuenta de Plusterra',
      'Inquilino envía comprobantes de servicios',
      'Plusterra registra pagos y gastos',
      'Plusterra descuenta comisión de administración',
      'Plusterra rinde cuentas y paga al propietario',
    ],
    example: 'Ej: Edificio con múltiples propietarios. Plusterra cobra 5% de administración y gestiona quejas, contratos, etc.',
    color: 'border-blue-300 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30',
  },
  modelo_3: {
    title: 'Modelo 3 — Propietario Cobra Directo',
    subtitle: 'Propietario único cobra alquiler, paga admin a Plusterra',
    description: 'El inquilino paga el alquiler directamente al propietario. El propietario paga la comisión de administración a Plusterra por separado. Ideal para edificios de un solo dueño.',
    flow: [
      'Inquilino paga alquiler → cuenta del propietario',
      'Inquilino envía comprobantes de servicios a Plusterra',
      'Plusterra registra pagos y coordina mantenimiento',
      'Plusterra rinde cuentas al propietario',
      'Propietario paga comisión a Plusterra',
    ],
    example: 'Ej: Edificio de un solo propietario que prefiere recibir pagos directo y luego pagar la administración.',
    color: 'border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950/30',
  },
};

interface Props {
  building: any;
}

export const BuildingAdminConfig = ({ building }: Props) => {
  const { role } = useAuth();
  const qc = useQueryClient();
  const isAdmin = role === 'superadmin' || role === 'admin' || role === 'accounting';
  const canEdit = role === 'superadmin' || role === 'admin' || role === 'accounting' || role === 'secretaria';
  const [adminModel, setAdminModel] = useState<AdminModel>('modelo_2');
  const [tipoCalculo, setTipoCalculo] = useState<'sobre_total_neto' | 'sobre_pago_total_alquiler'>('sobre_total_neto');
  const [totalPct, setTotalPct] = useState('5');
  const [internalPct, setInternalPct] = useState('5');
  const [externalPct, setExternalPct] = useState('0');
  const [externalCompany, setExternalCompany] = useState('');
  const [expensePayee, setExpensePayee] = useState('');
  const [saving, setSaving] = useState(false);
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    if (building) {
      const model = (building.admin_model as AdminModel) || (building.is_third_party_admin ? 'modelo_1' : 'modelo_2');
      setAdminModel(model);
      setTotalPct(String(building.admin_fee_total_pct ?? 5));
      setInternalPct(String(building.admin_fee_internal_pct ?? 5));
      setExternalPct(String(building.admin_fee_external_pct ?? 0));
      setExternalCompany(building.external_admin_company ?? '');
      setExpensePayee(building.expense_payee_name ?? '');
    }
  }, [building]);

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
      if (!canEdit) return;
      setSaving(true);
    try {
      const isThirdParty = adminModel === 'modelo_1';
      const { error } = await supabase
        .from('buildings')
        .update({
          admin_model: adminModel,
          is_third_party_admin: isThirdParty,
          admin_fee_total_pct: Number(totalPct),
          admin_fee_internal_pct: Number(internalPct),
          admin_fee_external_pct: isThirdParty ? Number(externalPct) : 0,
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

  const currentInfo = MODEL_INFO[adminModel];

  return (
    <div className="bg-card border border-border rounded-xl p-5 mb-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Settings2 className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-foreground">Modelo de Administración</h3>
            <p className="text-xs text-muted-foreground">Define cómo se gestionan los cobros y comisiones de este edificio</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => setShowDetail(!showDetail)}>
          <Info className="w-3.5 h-3.5" />
          {showDetail ? 'Ocultar detalle' : 'Ver detalle'}
        </Button>
      </div>

      {/* Model selector cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        {(Object.entries(MODEL_INFO) as [AdminModel, typeof MODEL_INFO[AdminModel]][]).map(([key, info]) => (
          <div
            key={key}
            onClick={() => setAdminModel(key)}
            className={`relative p-3 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${
              adminModel === key
                ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
                : 'border-border hover:border-primary/30'
            }`}
          >
            {adminModel === key && (
              <CheckCircle2 className="absolute top-2 right-2 w-4 h-4 text-primary" />
            )}
            <h4 className="font-semibold text-xs text-foreground mb-1">{info.title.split('—')[0].trim()}</h4>
            <p className="text-[10px] text-primary font-medium mb-1">{info.title.split('—')[1]?.trim()}</p>
            <p className="text-[10px] text-muted-foreground leading-relaxed">{info.subtitle}</p>
          </div>
        ))}
      </div>

      {/* Detail panel */}
      {showDetail && (
        <div className={`rounded-lg border-2 p-4 mb-4 ${currentInfo.color}`}>
          <h4 className="font-semibold text-sm text-foreground mb-2">{currentInfo.title}</h4>
          <p className="text-xs text-muted-foreground mb-3">{currentInfo.description}</p>
          <div className="space-y-1.5 mb-3">
            <p className="text-[10px] font-semibold text-foreground uppercase tracking-wide">Flujo de trabajo:</p>
            {currentInfo.flow.map((step, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-[10px] font-bold text-primary bg-primary/10 rounded-full w-4 h-4 flex items-center justify-center flex-shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <span className="text-xs text-foreground">{step}</span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground italic">{currentInfo.example}</p>
        </div>
      )}

      {/* Configuration fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Fee total */}
        <div>
          <label className="block text-xs font-medium text-foreground mb-1.5">
            <Percent className="w-3 h-3 inline mr-1" />
            {adminModel === 'modelo_1' ? 'Comisión total (visible al propietario)' : 'Comisión de administración'}
          </label>
          <div className="relative">
            <input
              type="number" min="0" max="100" step="0.5"
              value={totalPct}
              onChange={e => handleTotalChange(e.target.value)}
              className="input-field pr-8"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
          </div>
        </div>

        {/* Internal fee (Plusterra) — always visible */}
        <div>
          <label className="block text-xs font-medium text-foreground mb-1.5">
            Parte Plusterra
          </label>
          <div className="relative">
            <input
              type="number" min="0" max="100" step="0.5"
              value={internalPct}
              onChange={e => handleInternalChange(e.target.value)}
              className="input-field pr-8"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
          </div>
        </div>

        {/* External fee + company — only Modelo 1 */}
        {adminModel === 'modelo_1' && (
          <>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Parte empresa externa
              </label>
              <div className="relative">
                <input type="number" value={externalPct} readOnly className="input-field pr-8 bg-muted/50" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Calculado automáticamente: Total − Plusterra</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                <Building2 className="w-3 h-3 inline mr-1" />
                Nombre empresa externa
              </label>
              <input
                type="text" value={externalCompany}
                onChange={e => setExternalCompany(e.target.value)}
                className="input-field" placeholder="Ej: Glosker"
              />
            </div>
          </>
        )}

        {/* Expense payee — Modelo 1 y 2 */}
        {(adminModel === 'modelo_1' || adminModel === 'modelo_2') && (
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              <Users className="w-3 h-3 inline mr-1" />
              Responsable de expensas
            </label>
            <input
              type="text" value={expensePayee}
              onChange={e => setExpensePayee(e.target.value)}
              className="input-field" placeholder="Ej: Patricia"
            />
            <p className="text-[10px] text-muted-foreground mt-1">Persona que cobra por limpieza y mantenimiento del edificio</p>
          </div>
        )}
      </div>

      {/* Summary badge */}
      <div className="mt-4 p-3 bg-muted/30 rounded-lg flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="text-xs">
          {currentInfo.title.split('—')[0].trim()}
        </Badge>
        <Badge className="bg-primary/10 text-primary border-0 text-xs">
          Plusterra: {internalPct}%
        </Badge>
        {adminModel === 'modelo_1' && (
          <Badge className="bg-secondary/10 text-secondary border-0 text-xs">
            {externalCompany || 'Externa'}: {externalPct}%
          </Badge>
        )}
        <Badge variant="outline" className="text-xs">
          Total propietario: {totalPct}%
        </Badge>
        {expensePayee && (
          <Badge variant="outline" className="text-xs">
            Expensas → {expensePayee}
          </Badge>
        )}
      </div>

      <div className="flex justify-end mt-4">
        <Button onClick={handleSave} disabled={saving || !canEdit} size="sm" className="gap-1.5">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          {canEdit ? 'Guardar configuración' : 'Solo lectura'}
        </Button>
      </div>
    </div>
  );
};
