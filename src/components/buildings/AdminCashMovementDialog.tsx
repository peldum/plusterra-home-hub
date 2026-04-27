import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { MoneyInput } from '@/components/ui/money-input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Loader2, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import {
  ADMIN_CASH_CATEGORIES,
  useCreateAdminCashMovement,
  useUpdateAdminCashMovement,
  type AdminCashMovement,
} from '@/hooks/useAdminCashMovements';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing?: AdminCashMovement | null;
}

const today = () => new Date().toISOString().split('T')[0];

export const AdminCashMovementDialog = ({ open, onOpenChange, editing }: Props) => {
  const create = useCreateAdminCashMovement();
  const update = useUpdateAdminCashMovement();

  const [type, setType] = useState<'ingreso' | 'egreso'>('egreso');
  const [amount, setAmount] = useState<number | ''>('');
  const [category, setCategory] = useState('movilidad');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(today());
  const [paymentMethod, setPaymentMethod] = useState('efectivo');
  const [buildingId, setBuildingId] = useState<string>('none');
  const [propertyId, setPropertyId] = useState<string>('none');
  const [notes, setNotes] = useState('');

  const { data: buildings } = useQuery({
    queryKey: ['buildings-min-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('buildings')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data || [];
    },
    staleTime: 60_000,
  });

  const { data: buildingProperties } = useQuery({
    queryKey: ['admin-cash-properties-by-building', buildingId],
    queryFn: async () => {
      if (buildingId === 'none') return [];
      const { data, error } = await supabase
        .from('properties')
        .select('id, title, property_code, units!inner(unit_code, building_id)')
        .eq('units.building_id', buildingId)
        .order('property_code');
      if (error) throw error;
      return data || [];
    },
    enabled: buildingId !== 'none',
    staleTime: 60_000,
  });

  useEffect(() => {
    if (editing) {
      setType(editing.movement_type);
      setAmount(Number(editing.amount));
      setCategory(editing.category);
      setDescription(editing.description);
      setDate(editing.movement_date);
      setPaymentMethod(editing.payment_method);
      setBuildingId(editing.building_id || 'none');
      setPropertyId(editing.property_id || 'none');
      setNotes(editing.notes || '');
    } else if (open) {
      setType('egreso');
      setAmount('');
      setCategory('movilidad');
      setDescription('');
      setDate(today());
      setPaymentMethod('efectivo');
      setBuildingId('none');
      setPropertyId('none');
      setNotes('');
    }
  }, [editing, open]);

  // Si cambia el edificio, resetear propiedad
  useEffect(() => {
    if (!editing) setPropertyId('none');
  }, [buildingId, editing]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = amount === '' ? 0 : Number(amount);
    if (num <= 0 || !description.trim()) return;
    const payload = {
      movement_type: type,
      amount: num,
      description: description.trim(),
      category,
      movement_date: date,
      payment_method: paymentMethod,
      building_id: buildingId === 'none' ? null : buildingId,
      property_id: propertyId === 'none' ? null : propertyId,
      notes: notes.trim() || null,
    };
    if (editing) {
      await update.mutateAsync({ id: editing.id, ...payload });
    } else {
      await create.mutateAsync(payload);
    }
    onOpenChange(false);
  };

  const isPending = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {editing ? 'Editar movimiento de Administración' : 'Nuevo movimiento — Caja Administración'}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Caja independiente de Finanzas. Aquí se registran los movimientos propios de la operación de Administración (uber, taxis, viáticos, etc.).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label className="text-sm">Tipo</Label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <button
                type="button"
                onClick={() => setType('ingreso')}
                className={`px-3 py-2 rounded-lg border text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                  type === 'ingreso'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
                    : 'border-border text-muted-foreground hover:bg-muted/60'
                }`}
              >
                <ArrowDownCircle className="w-4 h-4" />
                Ingreso
              </button>
              <button
                type="button"
                onClick={() => setType('egreso')}
                className={`px-3 py-2 rounded-lg border text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                  type === 'egreso'
                    ? 'border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400'
                    : 'border-border text-muted-foreground hover:bg-muted/60'
                }`}
              >
                <ArrowUpCircle className="w-4 h-4" />
                Egreso
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm">Monto (Gs.) *</Label>
              <MoneyInput value={amount} onChange={setAmount} placeholder="Ej: 50.000" />
            </div>
            <div>
              <Label className="text-sm">Categoría</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ADMIN_CASH_CATEGORIES.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-sm">Descripción *</Label>
            <Input
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder={type === 'egreso' ? 'Ej: Uber a edificio Salto Grande' : 'Ej: Reembolso de propietario'}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm">Fecha</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div>
              <Label className="text-sm">Método de pago</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="efectivo">Efectivo</SelectItem>
                  <SelectItem value="transferencia">Transferencia</SelectItem>
                  <SelectItem value="tarjeta">Tarjeta</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-sm">Edificio asociado (opcional)</Label>
            <Select value={buildingId} onValueChange={setBuildingId}>
              <SelectTrigger><SelectValue placeholder="Sin edificio" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Sin edificio —</SelectItem>
                {(buildings || []).map(b => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {buildingId !== 'none' && (
            <div>
              <Label className="text-sm">Propiedad asociada (opcional)</Label>
              <Select value={propertyId} onValueChange={setPropertyId}>
                <SelectTrigger><SelectValue placeholder="Sin propiedad específica" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Sin propiedad específica —</SelectItem>
                  {(buildingProperties || []).map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.units?.unit_code ? `${p.units.unit_code} · ` : ''}{p.title}
                      {p.property_code ? ` (${p.property_code})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground mt-1">
                Si imputás el gasto a una propiedad, aparecerá en el reporte <strong>Ganancia Plusterra</strong>.
              </p>
            </div>
          )}

          <div>
            <Label className="text-sm">Notas</Label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Observaciones..."
              className="min-h-[60px]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {editing ? 'Guardar cambios' : 'Registrar movimiento'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};