/**
 * QuickTenantDialog — Permite agregar un inquilino rápidamente a una unidad
 * creando un contrato de alquiler activo vinculado a la propiedad.
 * Si la unidad no tiene propiedad vinculada, la crea automáticamente.
 */
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type DealType = Database['public']['Enums']['deal_type'];

interface QuickTenantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** If null, a property will be auto-created */
  propertyId: string | null;
  propertyTitle: string;
  unitCode: string;
  unitId: string;
  buildingId: string;
  existingContractId?: string | null;
  existingTenantName?: string | null;
  existingTenantPhone?: string | null;
}

export const QuickTenantDialog = ({
  open, onOpenChange, propertyId, propertyTitle, unitCode, unitId, buildingId,
  existingContractId, existingTenantName, existingTenantPhone,
}: QuickTenantDialogProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  const [tenantName, setTenantName] = useState(existingTenantName || '');
  const [tenantDocument, setTenantDocument] = useState('');
  const [tenantPhone, setTenantPhone] = useState(existingTenantPhone || '');
  const [monthlyRent, setMonthlyRent] = useState('');
  const [currency, setCurrency] = useState<string>('PYG');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [notes, setNotes] = useState('');

  const isEditing = !!existingContractId;

  const handleSave = async () => {
    if (!tenantName.trim()) {
      toast.error('El nombre del inquilino es obligatorio');
      return;
    }
    if (!monthlyRent && !isEditing) {
      toast.error('El monto de alquiler es obligatorio');
      return;
    }

    setSaving(true);
    try {
      let finalPropertyId = propertyId;

      // Auto-create property if none exists
      if (!finalPropertyId) {
        const { data: codeData, error: codeError } = await supabase.rpc('generate_property_code');
        if (codeError) throw codeError;

        const { data: newProp, error: propError } = await supabase
          .from('properties')
          .insert({
            property_code: codeData,
            title: `${unitCode} — Auto`,
            address: propertyTitle,
            status: 'rented',
            unit_id: unitId,
            created_by: user!.id,
            captor_agent_id: user!.id,
          })
          .select('id')
          .single();
        if (propError) throw propError;
        finalPropertyId = newProp.id;
      }

      if (isEditing && existingContractId) {
        const { error } = await supabase
          .from('contracts')
          .update({
            tenant_name: tenantName.trim(),
            tenant_document: tenantDocument || null,
            tenant_phone: tenantPhone || null,
            monthly_rent: monthlyRent ? parseFloat(monthlyRent) : undefined,
            currency: currency as any,
            end_date: endDate || null,
            deposit_amount: depositAmount ? parseFloat(depositAmount) : null,
            notes: notes || null,
          })
          .eq('id', existingContractId);
        if (error) throw error;
        toast.success('Inquilino actualizado');
      } else {
        const { error } = await supabase
          .from('contracts')
          .insert({
            contract_type: 'rental' as DealType,
            property_id: finalPropertyId,
            tenant_name: tenantName.trim(),
            tenant_document: tenantDocument || null,
            tenant_phone: tenantPhone || null,
            monthly_rent: parseFloat(monthlyRent),
            currency: currency as any,
            start_date: startDate,
            end_date: endDate || null,
            deposit_amount: depositAmount ? parseFloat(depositAmount) : null,
            status: 'active' as any,
            notes: notes || null,
            created_by: user!.id,
          });
        if (error) throw error;

        // Update property status to rented
        await supabase
          .from('properties')
          .update({ status: 'rented' })
          .eq('id', finalPropertyId!);

        toast.success(`Inquilino "${tenantName.trim()}" agregado a ${unitCode}`);
      }

      queryClient.invalidateQueries({ queryKey: ['building-units', buildingId] });
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      onOpenChange(false);
    } catch (err: any) {
      toast.error('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            {isEditing ? 'Editar Inquilino' : 'Agregar Inquilino'}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Unidad <span className="font-semibold text-foreground">{unitCode}</span>
            {propertyTitle && ` — ${propertyTitle}`}
          </p>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Nombre del inquilino */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Nombre completo *</Label>
            <Input
              value={tenantName}
              onChange={e => setTenantName(e.target.value)}
              placeholder="Nombre y apellido del inquilino"
              autoFocus
            />
          </div>

          {/* Documento + Teléfono */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">CI / RUC</Label>
              <Input
                value={tenantDocument}
                onChange={e => setTenantDocument(e.target.value)}
                placeholder="Nro. de documento"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Teléfono</Label>
              <Input
                value={tenantPhone}
                onChange={e => setTenantPhone(e.target.value)}
                placeholder="+595 9XX XXX XXX"
              />
            </div>
          </div>

          {/* Alquiler + Moneda */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label className="text-sm font-medium">Alquiler mensual *</Label>
              <Input
                type="number"
                value={monthlyRent}
                onChange={e => setMonthlyRent(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Moneda</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PYG">₲ PYG</SelectItem>
                  <SelectItem value="USD">US$ USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Depósito */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Depósito / Garantía</Label>
            <Input
              type="number"
              value={depositAmount}
              onChange={e => setDepositAmount(e.target.value)}
              placeholder="0"
            />
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Inicio de contrato *</Label>
              <Input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Fin de contrato</Label>
              <Input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {/* Notas */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Notas</Label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Observaciones opcionales..."
              rows={2}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving} className="gap-1.5">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            {isEditing ? 'Guardar cambios' : 'Agregar inquilino'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
