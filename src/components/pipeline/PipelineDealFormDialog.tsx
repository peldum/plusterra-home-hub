import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PipelineDeal, PipelineType, useCreatePipelineDeal, useUpdatePipelineDeal } from '@/hooks/usePipelineDeals';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pipelineType: PipelineType;
  deal?: PipelineDeal | null;
}

export const PipelineDealFormDialog = ({ open, onOpenChange, pipelineType, deal }: Props) => {
  const { user, role } = useAuth();
  const createDeal = useCreatePipelineDeal();
  const updateDeal = useUpdatePipelineDeal();
  const isEdit = !!deal;
  const canReassign = role === 'admin' || role === 'superadmin';

  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [propertySnap, setPropertySnap] = useState('');
  const [propertyId, setPropertyId] = useState<string | null>(null);
  const [agentId, setAgentId] = useState('');
  const [notes, setNotes] = useState('');
  const [agents, setAgents] = useState<{ id: string; full_name: string }[]>([]);
  const [properties, setProperties] = useState<{ id: string; title: string; property_code: string }[]>([]);

  useEffect(() => {
    if (!open) return;

    // Load agents for reassign
    if (canReassign) {
      supabase
        .from('profiles')
        .select('id, full_name')
        .then(({ data }) => setAgents(data ?? []));
    }

    // Load available properties
    supabase
      .from('properties')
      .select('id, title, property_code')
      .order('title')
      .then(({ data }) => setProperties(data ?? []));

    if (deal) {
      setClientName(deal.client_name ?? '');
      setClientPhone(deal.client_phone ?? '');
      setPropertySnap(deal.property_title_snap ?? '');
      setPropertyId(deal.property_id);
      setAgentId(deal.agent_id);
      setNotes(deal.notes ?? '');
    } else {
      setClientName('');
      setClientPhone('');
      setPropertySnap('');
      setPropertyId(null);
      setAgentId(user?.id ?? '');
      setNotes('');
    }
  }, [open, deal]);

  const handlePropertySelect = (val: string) => {
    if (val === 'none') {
      setPropertyId(null);
      setPropertySnap('');
      return;
    }
    setPropertyId(val);
    const prop = properties.find((p) => p.id === val);
    if (prop) setPropertySnap(`${prop.property_code} – ${prop.title}`);
  };

  const handleSubmit = () => {
    if (!clientName.trim()) return;

    const payload: any = {
      pipeline_type: pipelineType,
      client_name: clientName.trim(),
      client_phone: clientPhone.trim() || null,
      property_id: propertyId,
      property_title_snap: propertySnap.trim() || null,
      agent_id: agentId || user!.id,
      notes: notes.trim() || null,
    };

    if (isEdit) {
      updateDeal.mutate({ id: deal!.id, ...payload }, { onSuccess: () => onOpenChange(false) });
    } else {
      createDeal.mutate(payload, { onSuccess: () => onOpenChange(false) });
    }
  };

  const isPending = createDeal.isPending || updateDeal.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Deal' : 'Nuevo Deal'} – {pipelineType === 'ALQUILER' ? 'Alquiler' : 'Venta'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Nombre del cliente *</Label>
            <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Nombre del cliente" />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Teléfono</Label>
            <Input value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} placeholder="+595..." />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Propiedad</Label>
            <Select value={propertyId ?? 'none'} onValueChange={handlePropertySelect}>
              <SelectTrigger>
                <SelectValue placeholder="Sin propiedad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin propiedad</SelectItem>
                {properties.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.property_code} – {p.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {canReassign && (
            <div className="space-y-1">
              <Label className="text-xs">Agente responsable</Label>
              <Select value={agentId} onValueChange={setAgentId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {agents.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1">
            <Label className="text-xs">Notas</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button size="sm" disabled={!clientName.trim() || isPending} onClick={handleSubmit}>
            {isPending ? 'Guardando...' : isEdit ? 'Guardar' : 'Crear'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
