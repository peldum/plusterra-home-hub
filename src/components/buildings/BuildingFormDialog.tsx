/**
 * BuildingFormDialog — Diálogo para crear o editar un edificio.
 * Incluye selección guiada del modelo de administración.
 */
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Building2, MapPin, Layers, Save, Loader2, CheckCircle2,
  Users, Percent, Info,
} from 'lucide-react';
import type { AdminModel } from './BuildingAdminConfig';

const MODEL_OPTIONS: { key: AdminModel; title: string; subtitle: string; color: string }[] = [
  {
    key: 'modelo_1',
    title: 'Administración Tercerizada',
    subtitle: 'Empresa externa administra (ej. Glosker), Plusterra co-gestiona',
    color: 'border-orange-300 dark:border-orange-700',
  },
  {
    key: 'modelo_2',
    title: 'Administración Directa',
    subtitle: 'Plusterra administra todo directamente, cobra y paga al propietario',
    color: 'border-blue-300 dark:border-blue-700',
  },
  {
    key: 'modelo_3',
    title: 'Propietario Cobra Directo',
    subtitle: 'Propietario único cobra alquiler, paga admin a Plusterra',
    color: 'border-green-300 dark:border-green-700',
  },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const BuildingFormDialog = ({ open, onOpenChange }: Props) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Asunción');
  const [floors, setFloors] = useState('');
  const [totalUnits, setTotalUnits] = useState('');
  const [category, setCategory] = useState('');
  const [notes, setNotes] = useState('');
  const [buildingType, setBuildingType] = useState<'edificio' | 'casas_particulares'>('edificio');

  // Admin model
  const [adminModel, setAdminModel] = useState<AdminModel>('modelo_2');
  const [totalPct, setTotalPct] = useState('5');
  const [internalPct, setInternalPct] = useState('5');
  const [externalCompany, setExternalCompany] = useState('');
  const [expensePayee, setExpensePayee] = useState('');

  const externalPct = Math.max(0, (Number(totalPct) || 0) - (Number(internalPct) || 0));

  const resetForm = () => {
    setName(''); setAddress(''); setCity('Asunción'); setFloors(''); setTotalUnits('');
    setCategory(''); setNotes(''); setAdminModel('modelo_2'); setTotalPct('5');
    setInternalPct('5'); setExternalCompany(''); setExpensePayee(''); setBuildingType('edificio');
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error('El nombre es obligatorio'); return; }
    if (!address.trim()) { toast.error('La dirección es obligatoria'); return; }
    if (!user) return;

    setSaving(true);
    try {
      const isThirdParty = adminModel === 'modelo_1';
      const { error } = await supabase.from('buildings').insert({
        name: name.trim(),
        address: address.trim(),
        city: city.trim() || 'Asunción',
        floors: floors ? Number(floors) : null,
        total_units: totalUnits ? Number(totalUnits) : null,
        category: category.trim() || null,
        notes: notes.trim() || null,
        created_by: user.id,
        admin_model: adminModel,
        is_third_party_admin: isThirdParty,
        admin_fee_total_pct: Number(totalPct) || 5,
        admin_fee_internal_pct: Number(internalPct) || 5,
        admin_fee_external_pct: isThirdParty ? externalPct : 0,
        external_admin_company: isThirdParty ? (externalCompany.trim() || null) : null,
        expense_payee_name: expensePayee.trim() || null,
      });
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ['buildings-list'] });
      toast.success('Edificio creado correctamente');
      resetForm();
      onOpenChange(false);
    } catch (err: any) {
      toast.error('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            Nuevo Edificio
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* ── Datos básicos ── */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" />
              Datos del edificio
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <Label className="text-xs">Nombre del edificio *</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Salto Grande IV" className="mt-1" />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs">Dirección *</Label>
                <Input value={address} onChange={e => setAddress(e.target.value)} placeholder="Ej: Av. España 1234" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Ciudad</Label>
                <Input value={city} onChange={e => setCity(e.target.value)} placeholder="Asunción" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Categoría</Label>
                <Input value={category} onChange={e => setCategory(e.target.value)} placeholder="Ej: Residencial" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Pisos</Label>
                <Input type="number" min="1" value={floors} onChange={e => setFloors(e.target.value)} placeholder="3" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Total de unidades</Label>
                <Input type="number" min="1" value={totalUnits} onChange={e => setTotalUnits(e.target.value)} placeholder="10" className="mt-1" />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs">Notas</Label>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observaciones..." className="mt-1" rows={2} />
              </div>
            </div>
          </div>

          {/* ── Modelo de administración ── */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Percent className="w-3.5 h-3.5" />
              Modelo de administración
            </h4>
            <p className="text-[11px] text-muted-foreground flex items-start gap-1.5">
              <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              Elegí cómo se gestionan los cobros y comisiones. Podés cambiarlo después desde la configuración del edificio.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {MODEL_OPTIONS.map(opt => (
                <div
                  key={opt.key}
                  onClick={() => setAdminModel(opt.key)}
                  className={`relative p-3 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${
                    adminModel === opt.key
                      ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
                      : `border-border hover:border-primary/30`
                  }`}
                >
                  {adminModel === opt.key && (
                    <CheckCircle2 className="absolute top-2 right-2 w-4 h-4 text-primary" />
                  )}
                  <h5 className="font-semibold text-xs text-foreground">{opt.title}</h5>
                  <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">{opt.subtitle}</p>
                </div>
              ))}
            </div>

            {/* Comisiones */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">
                  {adminModel === 'modelo_1' ? 'Comisión total (visible al propietario)' : 'Comisión de administración'}
                </Label>
                <div className="relative mt-1">
                  <Input
                    type="number" min="0" max="100" step="0.5"
                    value={totalPct}
                    onChange={e => setTotalPct(e.target.value)}
                    className="pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                </div>
              </div>
              <div>
                <Label className="text-xs">Parte Plusterra</Label>
                <div className="relative mt-1">
                  <Input
                    type="number" min="0" max="100" step="0.5"
                    value={internalPct}
                    onChange={e => setInternalPct(e.target.value)}
                    className="pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                </div>
              </div>
            </div>

            {/* Modelo 1 extras */}
            {adminModel === 'modelo_1' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Parte empresa externa</Label>
                  <div className="relative mt-1">
                    <Input type="number" value={externalPct} readOnly className="pr-8 bg-muted/50" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">Auto: Total − Plusterra</p>
                </div>
                <div>
                  <Label className="text-xs">Nombre empresa externa</Label>
                  <Input value={externalCompany} onChange={e => setExternalCompany(e.target.value)} placeholder="Ej: Glosker" className="mt-1" />
                </div>
              </div>
            )}

            {/* Expense payee for modelo 1 & 2 */}
            {(adminModel === 'modelo_1' || adminModel === 'modelo_2') && (
              <div>
                <Label className="text-xs flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  Responsable de expensas
                </Label>
                <Input value={expensePayee} onChange={e => setExpensePayee(e.target.value)} placeholder="Ej: Patricia" className="mt-1" />
                <p className="text-[10px] text-muted-foreground mt-1">Persona que cobra por limpieza y mantenimiento</p>
              </div>
            )}

            {/* Summary */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <Badge variant="outline" className="text-[10px]">
                {MODEL_OPTIONS.find(m => m.key === adminModel)?.title}
              </Badge>
              <Badge className="bg-primary/10 text-primary border-0 text-[10px]">
                Plusterra: {internalPct}%
              </Badge>
              {adminModel === 'modelo_1' && (
                <Badge className="bg-secondary/10 text-secondary border-0 text-[10px]">
                  {externalCompany || 'Externa'}: {externalPct}%
                </Badge>
              )}
              <Badge variant="outline" className="text-[10px]">
                Total: {totalPct}%
              </Badge>
            </div>
          </div>

          {/* ── Actions ── */}
          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving} className="gap-1.5">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Crear Edificio
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
