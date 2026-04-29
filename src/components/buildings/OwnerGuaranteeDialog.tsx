import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { MoneyInput } from '@/components/ui/money-input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { OwnerGuaranteeRow } from '@/hooks/useOwnerGuarantees';
import { ShieldCheck, X } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  record: OwnerGuaranteeRow | null;
}

export const OwnerGuaranteeDialog = ({ open, onOpenChange, record }: Props) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [monto, setMonto] = useState<number | ''>('');
  const [pct, setPct] = useState<number>(50);
  const [fecha, setFecha] = useState<string>(new Date().toISOString().slice(0, 10));
  const [obs, setObs] = useState<string>('');
  const [motivo, setMotivo] = useState<string>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (record) {
      setMonto(record.monto_garantia_total > 0 ? record.monto_garantia_total : '');
      setPct(Number(record.porcentaje_propietario) || 50);
      setFecha(record.fecha_cobro || new Date().toISOString().slice(0, 10));
      setObs(record.observacion || '');
      setMotivo(record.motivo_no_aplica || '');
    }
  }, [record]);

  if (!record) return null;

  const montoNum = typeof monto === 'number' ? monto : 0;
  const ownerAmount = Math.round((montoNum * pct) / 100);

  const save = async (status: 'registered' | 'no_aplica') => {
    if (status === 'registered') {
      if (!montoNum || montoNum <= 0) { toast.error('Ingresá el monto de la garantía'); return; }
      if (pct < 0 || pct > 100) { toast.error('Porcentaje inválido (0-100)'); return; }
    } else if (!motivo.trim()) {
      toast.error('Indicá el motivo'); return;
    }

    setSaving(true);
    const payload: any = {
      status,
      registered_by: user?.id,
      observacion: obs || null,
    };
    if (status === 'registered') {
      payload.monto_garantia_total = montoNum;
      payload.porcentaje_propietario = pct;
      payload.fecha_cobro = fecha;
      payload.motivo_no_aplica = null;
    } else {
      payload.motivo_no_aplica = motivo;
    }

    const { error } = await (supabase as any)
      .from('owner_guarantee_records')
      .update(payload)
      .eq('id', record.id);
    setSaving(false);
    if (error) { toast.error('Error al guardar: ' + error.message); return; }
    toast.success(status === 'registered' ? 'Garantía registrada' : 'Marcada como sin aplicar');
    qc.invalidateQueries({ queryKey: ['owner-guarantees'] });
    qc.invalidateQueries({ queryKey: ['owner-guarantees-pending-count'] });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            Registrar Garantía del Propietario
          </DialogTitle>
          <DialogDescription>
            {record.building_name} — Unidad {record.unit_code} · {record.property_code}
            <br />
            <span className="text-xs">Propietario: {record.owner_name} · Período: {record.period}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label htmlFor="monto">Monto total de garantía cobrada al inquilino *</Label>
            <MoneyInput id="monto" value={monto} onChange={setMonto} currency="Gs." placeholder="0" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="pct">% para propietario *</Label>
              <div className="relative">
                <Input
                  id="pct"
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={pct}
                  onChange={(e) => setPct(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
              </div>
            </div>
            <div className="rounded-md border bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground">Monto al propietario</p>
              <p className="text-lg font-bold text-primary">
                Gs. {ownerAmount.toLocaleString('es-PY')}
              </p>
            </div>
          </div>

          <div>
            <Label htmlFor="fecha">Fecha de cobro</Label>
            <Input id="fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </div>

          <div>
            <Label htmlFor="obs">Observación (opcional)</Label>
            <Textarea id="obs" value={obs} onChange={(e) => setObs(e.target.value)} rows={2} />
          </div>

          <details className="rounded-md border p-3 text-sm">
            <summary className="cursor-pointer text-muted-foreground">Marcar sin garantía (renovación, exoneración, etc.)</summary>
            <div className="pt-3 space-y-2">
              <Label htmlFor="motivo">Motivo</Label>
              <Textarea id="motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={2} placeholder="Ej: contrato de renovación, exoneración acordada..." />
              <Button variant="outline" size="sm" onClick={() => save('no_aplica')} disabled={saving}>
                <X className="w-4 h-4 mr-1" /> Marcar sin garantía
              </Button>
            </div>
          </details>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={() => save('registered')} disabled={saving}>
            <ShieldCheck className="w-4 h-4 mr-1" /> Confirmar registro
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};