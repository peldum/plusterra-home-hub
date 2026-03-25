import { useState, useMemo } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { CalendarPlus, Loader2 } from 'lucide-react';
import { format, addMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  buildingId: string;
  units: {
    id: string;
    unit_code: string;
    owners: { id: string; full_name: string }[];
    property?: { rental_price: number | null; currency: string | null } | null;
  }[];
}

const PAYMENT_METHODS = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'cheque', label: 'Cheque' },
];

export const PrepaidRentDialog = ({ open, onOpenChange, buildingId, units }: Props) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [selectedUnit, setSelectedUnit] = useState('');
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [paymentMethod, setPaymentMethod] = useState('efectivo');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const currentMonth = new Date();
  const availableMonths = useMemo(() => {
    const months: { value: string; label: string }[] = [];
    for (let i = 0; i < 12; i++) {
      const d = addMonths(currentMonth, i);
      months.push({
        value: format(d, 'yyyy-MM'),
        label: format(d, 'MMMM yyyy', { locale: es }),
      });
    }
    return months;
  }, []);

  const unit = units.find(u => u.id === selectedUnit);
  const rentalPrice = unit?.property?.rental_price ?? 0;
  const currency = unit?.property?.currency ?? 'PYG';
  const totalAmount = rentalPrice * selectedMonths.length;

  const toggleMonth = (month: string) => {
    setSelectedMonths(prev =>
      prev.includes(month) ? prev.filter(m => m !== month) : [...prev, month]
    );
  };

  const handleSave = async () => {
    if (!selectedUnit || selectedMonths.length === 0 || rentalPrice <= 0) return;
    setSaving(true);
    try {
      const debtorName = unit?.owners?.[0]?.full_name || 'Inquilino';

      // Create receivables for each month marked as paid
      for (const month of selectedMonths.sort()) {
        const dueDate = `${month}-05`; // standard due day

        // Check if receivable already exists
        const { data: existing } = await supabase
          .from('receivables')
          .select('id, status')
          .eq('building_id', buildingId)
          .eq('unit_code', unit!.unit_code)
          .eq('concept', 'alquiler')
          .gte('due_date', `${month}-01`)
          .lte('due_date', `${month}-28`)
          .maybeSingle();

        if (existing) {
          // Mark existing as paid
          if (existing.status !== 'paid') {
            await supabase.from('receivables').update({
              status: 'paid',
              paid_date: new Date().toISOString().split('T')[0],
              paid_amount: rentalPrice,
              total_cobrado: rentalPrice,
              confirmed_by: user?.id,
              payment_detail: {
                base: rentalPrice,
                mora_automatica: 0,
                mora_negociada: 0,
                descuento: 0,
                total: rentalPrice,
                payment_method: paymentMethod,
                reference_number: referenceNumber || null,
                confirmed_at: new Date().toISOString(),
                confirmed_by: user?.id,
                prepaid: true,
                prepaid_months: selectedMonths,
              },
            }).eq('id', existing.id);
          }
        } else {
          // Create new receivable already paid
          await supabase.from('receivables').insert({
            building_id: buildingId,
            unit_code: unit!.unit_code,
            debtor_name: debtorName,
            debtor_role: 'tenant',
            concept: 'alquiler',
            description: `Alquiler ${format(new Date(month + '-15'), 'MMMM yyyy', { locale: es })} (prepago)`,
            amount: rentalPrice,
            currency,
            due_date: dueDate,
            status: 'paid',
            paid_date: new Date().toISOString().split('T')[0],
            paid_amount: rentalPrice,
            total_cobrado: rentalPrice,
            confirmed_by: user?.id,
            source_type: 'prepaid',
            created_by: user!.id,
            notes: notes || `Prepago registrado junto con ${selectedMonths.length} meses`,
            payment_detail: {
              base: rentalPrice,
              payment_method: paymentMethod,
              reference_number: referenceNumber || null,
              prepaid: true,
              prepaid_months: selectedMonths,
            },
          });
        }
      }

      // Also update collection records
      for (const month of selectedMonths) {
        await supabase.from('unit_collection_records').upsert({
          unit_id: selectedUnit,
          building_id: buildingId,
          period: month,
          payment_status: 'paid',
          alquiler_check: true,
          observation: `Prepago ${selectedMonths.length} meses`,
          updated_by: user?.id,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'unit_id,period' });
      }

      qc.invalidateQueries({ queryKey: ['receivables'] });
      qc.invalidateQueries({ queryKey: ['collection-records'] });
      qc.invalidateQueries({ queryKey: ['building-receivables'] });
      toast.success(`${selectedMonths.length} meses registrados como pagados`);
      onOpenChange(false);
      setSelectedUnit('');
      setSelectedMonths([]);
      setNotes('');
      setReferenceNumber('');
    } catch (err: any) {
      toast.error('Error al registrar prepago: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const fmtAmount = (n: number) => {
    if (currency === 'USD') return `US$ ${n.toLocaleString('es-PY', { minimumFractionDigits: 2 })}`;
    return `₲ ${n.toLocaleString('es-PY')}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarPlus className="w-5 h-5 text-primary" />
            Registrar Pago Adelantado
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Unit selector */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Unidad</Label>
            <Select value={selectedUnit} onValueChange={v => { setSelectedUnit(v); setSelectedMonths([]); }}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Seleccionar unidad..." />
              </SelectTrigger>
              <SelectContent>
                {units.map(u => (
                  <SelectItem key={u.id} value={u.id} className="text-sm">
                    {u.unit_code} — {u.owners?.[0]?.full_name || 'Sin propietario'}
                    {u.property?.rental_price ? ` (${fmtAmount(u.property.rental_price)})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Month multi-select */}
          {selectedUnit && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Meses a cubrir</Label>
              <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto border border-border rounded-lg p-2">
                {availableMonths.map(m => (
                  <label key={m.value} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded p-1.5 text-sm capitalize">
                    <Checkbox
                      checked={selectedMonths.includes(m.value)}
                      onCheckedChange={() => toggleMonth(m.value)}
                      className="data-[state=checked]:bg-primary"
                    />
                    {m.label}
                  </label>
                ))}
              </div>
              {selectedMonths.length > 0 && (
                <Badge variant="outline" className="text-xs bg-primary/10 text-primary">
                  {selectedMonths.length} mes(es) × {fmtAmount(rentalPrice)} = {fmtAmount(totalAmount)}
                </Badge>
              )}
            </div>
          )}

          {/* Payment method */}
          {selectedMonths.length > 0 && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Método de pago</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map(m => (
                      <SelectItem key={m.value} value={m.value} className="text-sm">{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {paymentMethod === 'transferencia' && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Nro. Referencia</Label>
                  <Input
                    className="h-9 text-sm"
                    placeholder="Nro. de transferencia"
                    value={referenceNumber}
                    onChange={e => setReferenceNumber(e.target.value)}
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Observaciones</Label>
                <Textarea
                  className="text-sm min-h-[60px]"
                  placeholder="Notas opcionales..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={handleSave}
            disabled={saving || !selectedUnit || selectedMonths.length === 0 || rentalPrice <= 0}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
            Registrar Prepago
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
