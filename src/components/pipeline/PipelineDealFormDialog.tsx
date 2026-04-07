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
import { Search } from 'lucide-react';

const SERVICE_REASONS = [
  'Reunión / Consulta',
  'Captación de propiedad',
  'Tasación',
  'Búsqueda personalizada',
  'Administración',
  'Otro',
];

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

  const [clientType, setClientType] = useState<string>('ALQUILER');
  const [opportunityType, setOpportunityType] = useState<string>('with_property');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [propertySnap, setPropertySnap] = useState('');
  const [propertyId, setPropertyId] = useState<string | null>(null);
  const [propertySearch, setPropertySearch] = useState('');
  const [agentId, setAgentId] = useState('');
  const [notes, setNotes] = useState('');
  const [serviceReason, setServiceReason] = useState('');
  const [serviceReasonOther, setServiceReasonOther] = useState('');
  const [nextStep, setNextStep] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [estimatedCommission, setEstimatedCommission] = useState('');
  const [agents, setAgents] = useState<{ id: string; full_name: string }[]>([]);
  const [properties, setProperties] = useState<{ id: string; title: string; property_code: string }[]>([]);

  useEffect(() => {
    if (!open) return;

    if (canReassign) {
      supabase
        .from('profiles')
        .select('id, full_name')
        .then(({ data }) => setAgents(data ?? []));
    }

    supabase
      .from('properties')
      .select('id, title, property_code')
      .order('title')
      .then(({ data }) => setProperties(data ?? []));

    if (deal) {
      setClientType(deal.pipeline_type ?? 'ALQUILER');
      setOpportunityType(deal.opportunity_type ?? 'with_property');
      setClientName(deal.client_name ?? '');
      setClientPhone(deal.client_phone ?? '');
      setPropertySnap(deal.property_title_snap ?? '');
      setPropertyId(deal.property_id);
      setPropertySearch(deal.property_title_snap ?? '');
      setAgentId(deal.agent_id);
      setNotes(deal.notes ?? '');
      setServiceReason(deal.service_reason ?? '');
      setServiceReasonOther(SERVICE_REASONS.includes(deal.service_reason ?? '') ? '' : (deal.service_reason ?? ''));
      if (deal.service_reason && !SERVICE_REASONS.includes(deal.service_reason)) {
        setServiceReason('Otro');
        setServiceReasonOther(deal.service_reason);
      }
      setNextStep(deal.next_step ?? '');
      setFollowUpDate(deal.follow_up_date ?? '');
      setEstimatedCommission(deal.estimated_commission?.toString() ?? '');
    } else {
      setClientType(pipelineType);
      setOpportunityType('with_property');
      setClientName('');
      setClientPhone('');
      setPropertySnap('');
      setPropertyId(null);
      setPropertySearch('');
      setAgentId(user?.id ?? '');
      setNotes('');
      setServiceReason('');
      setServiceReasonOther('');
      setNextStep('');
      setFollowUpDate('');
      setEstimatedCommission('');
    }
  }, [open, deal]);

  const filteredProperties = properties.filter(p => {
    if (!propertySearch.trim()) return true;
    const q = propertySearch.toLowerCase();
    return p.title.toLowerCase().includes(q) || p.property_code.toLowerCase().includes(q);
  }).slice(0, 20);

  const handlePropertySelect = (prop: { id: string; title: string; property_code: string }) => {
    setPropertyId(prop.id);
    setPropertySnap(`${prop.property_code} – ${prop.title}`);
    setPropertySearch(`${prop.property_code} – ${prop.title}`);
  };

  const clearProperty = () => {
    setPropertyId(null);
    setPropertySnap('');
    setPropertySearch('');
  };

  const isExternal = opportunityType === 'external';

  const handleSubmit = () => {
    if (!clientName.trim()) return;

    const finalServiceReason = serviceReason === 'Otro' ? serviceReasonOther.trim() : serviceReason;

    const payload: any = {
      pipeline_type: clientType,
      client_name: clientName.trim(),
      client_phone: clientPhone.trim() || null,
      property_id: isExternal ? null : propertyId,
      property_title_snap: isExternal ? null : (propertySnap.trim() || null),
      agent_id: agentId || user!.id,
      notes: notes.trim() || null,
      opportunity_type: opportunityType,
      service_reason: isExternal ? (finalServiceReason || null) : null,
      next_step: isExternal ? (nextStep.trim() || null) : null,
      follow_up_date: isExternal ? (followUpDate || null) : null,
      estimated_commission: estimatedCommission ? parseFloat(estimatedCommission) : null,
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
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar cliente' : 'Nuevo cliente'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Client type (Alquiler / Venta / Ambos) */}
          <div className="space-y-1">
            <Label className="text-xs">Tipo de cliente *</Label>
            <Select value={clientType} onValueChange={setClientType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALQUILER">🔑 Alquiler</SelectItem>
                <SelectItem value="VENTA">🏷️ Venta</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Opportunity type */}
          <div className="space-y-1">
            <Label className="text-xs">Tipo de oportunidad</Label>
            <Select value={opportunityType} onValueChange={setOpportunityType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="with_property">Con Propiedad</SelectItem>
                <SelectItem value="external">Cliente externo (sin propiedad)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Nombre del cliente *</Label>
            <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Nombre del cliente" />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Teléfono</Label>
            <Input value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} placeholder="+595..." />
          </div>

          {/* Property - search-based instead of dropdown */}
          {!isExternal && (
            <div className="space-y-1">
              <Label className="text-xs">Propiedad (buscar)</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={propertySearch}
                  onChange={e => { setPropertySearch(e.target.value); if (propertyId) clearProperty(); }}
                  placeholder="Buscar por código o nombre..."
                  className="pl-8 text-xs"
                />
              </div>
              {propertySearch.trim() && !propertyId && (
                <div className="border rounded-md max-h-32 overflow-y-auto bg-popover">
                  {filteredProperties.length > 0 ? filteredProperties.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent transition-colors truncate"
                      onClick={() => handlePropertySelect(p)}
                    >
                      {p.property_code} – {p.title}
                    </button>
                  )) : (
                    <p className="px-3 py-2 text-xs text-muted-foreground">Sin resultados</p>
                  )}
                </div>
              )}
              {propertyId && (
                <button type="button" onClick={clearProperty} className="text-[10px] text-destructive hover:underline">
                  ✕ Quitar propiedad
                </button>
              )}
            </div>
          )}

          {/* External fields */}
          {isExternal && (
            <>
              <div className="space-y-1">
                <Label className="text-xs">Motivo / Servicio *</Label>
                <Select value={serviceReason} onValueChange={setServiceReason}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar motivo" />
                  </SelectTrigger>
                  <SelectContent>
                    {SERVICE_REASONS.map(r => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {serviceReason === 'Otro' && (
                  <Input
                    className="mt-1"
                    value={serviceReasonOther}
                    onChange={e => setServiceReasonOther(e.target.value)}
                    placeholder="Especificar motivo..."
                  />
                )}
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Próximo paso</Label>
                <Input value={nextStep} onChange={e => setNextStep(e.target.value)} placeholder="Ej: Enviar propuesta" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Fecha de seguimiento</Label>
                <Input type="date" value={followUpDate} onChange={e => setFollowUpDate(e.target.value)} />
              </div>
            </>
          )}

          {/* Commission estimate */}
          <div className="space-y-1">
            <Label className="text-xs">Comisión estimada (Gs.) – opcional</Label>
            <Input type="number" min={0} value={estimatedCommission} onChange={e => setEstimatedCommission(e.target.value)} placeholder="0" />
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
            {isPending ? 'Guardando...' : isEdit ? 'Guardar' : 'Registrar cliente'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
