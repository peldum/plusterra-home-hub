import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useProperties } from '@/hooks/useProperties';
import { useClients } from '@/hooks/useClients';
import { useCreateContract } from '@/hooks/useContracts';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Zap, ExternalLink } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface QuickContractFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const contractTypes = [
  { value: 'rental', label: '🏠 Alquiler' },
  { value: 'temporary_rental', label: '🏖️ Alq. Temporal' },
  { value: 'sale', label: '💰 Venta' },
  { value: 'property_management', label: '📋 Administración' },
  { value: 'exclusivity', label: '⭐ Exclusividad' },
];

export const QuickContractForm = ({ open, onOpenChange }: QuickContractFormProps) => {
  const [form, setForm] = useState({
    contract_type: 'rental' as string,
    property_id: '',
    client_id: '',
    tenant_name: '',
    tenant_document: '',
    start_date: '',
    end_date: '',
    monthly_rent: '',
    total_amount: '',
    deposit_amount: '',
    currency: 'PYG' as string,
    notes: '',
    status: 'active' as string,
    responsible_agent_id: '',
    is_external: false,
    property_address: '',
  });

  const { data: properties } = useProperties();
  const { data: clients } = useClients();
  const createContract = useCreateContract();
  const { user, isAdmin, role } = useAuth();

  const canAssignAgent = isAdmin || role === 'secretaria';
  const { data: agentsList } = useQuery({
    queryKey: ['agents-simple'],
    queryFn: async () => {
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'agent');
      if (!roles?.length) return [];
      const ids = roles.map(r => r.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', ids)
        .order('full_name');
      return profiles || [];
    },
    enabled: canAssignAgent,
  });

  const update = (key: string, value: string | boolean) => setForm(prev => ({ ...prev, [key]: value }));

  const isSale = form.contract_type === 'sale';
  const canSubmit = form.start_date && (isSale ? form.total_amount : form.monthly_rent) && (form.property_id || form.tenant_name || form.is_external);

  const resetAndClose = () => {
    onOpenChange(false);
    setForm({
      contract_type: 'rental', property_id: '', client_id: '',
      tenant_name: '', tenant_document: '', start_date: '', end_date: '',
      monthly_rent: '', total_amount: '', deposit_amount: '',
      currency: 'PYG', notes: '', status: 'active', responsible_agent_id: '',
      is_external: false, property_address: '',
    });
  };

  const handleSubmit = () => {
    const agentId = canAssignAgent ? (form.responsible_agent_id || user?.id) : user?.id;

    createContract.mutate({
      contract_type: form.contract_type as any,
      property_id: form.is_external ? undefined : (form.property_id || undefined),
      client_id: form.client_id || undefined,
      tenant_name: form.tenant_name || undefined,
      tenant_document: form.tenant_document || undefined,
      start_date: form.start_date,
      end_date: form.end_date || undefined,
      monthly_rent: form.monthly_rent ? Number(form.monthly_rent) : undefined,
      total_amount: form.total_amount ? Number(form.total_amount) : undefined,
      deposit_amount: form.deposit_amount ? Number(form.deposit_amount) : undefined,
      currency: form.currency as any,
      periodicity: isSale ? 'one_time' : 'monthly',
      notes: form.notes || undefined,
      status: form.status as any,
      responsible_agent_id: agentId,
      property_address: form.is_external ? form.property_address : undefined,
    }, { onSuccess: resetAndClose });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            Registro Rápido
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 px-4 sm:px-6">
          <div className="space-y-4 pt-2 pb-4">
            {/* Row 1: Type */}
            <div>
              <Label className="text-xs text-muted-foreground">Tipo</Label>
              <Select value={form.contract_type} onValueChange={v => update('contract_type', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent position="popper" className="max-h-[200px]">
                  {contractTypes.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* External property toggle */}
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div className="flex items-center gap-2">
                <ExternalLink className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-foreground">Propiedad externa</span>
              </div>
              <Switch
                checked={form.is_external}
                onCheckedChange={v => {
                  update('is_external', v);
                  if (v) update('property_id', '');
                }}
              />
            </div>

            {/* Property selector OR external address */}
            {form.is_external ? (
              <div>
                <Label className="text-xs text-muted-foreground">Dirección de la propiedad</Label>
                <Input
                  value={form.property_address}
                  onChange={e => update('property_address', e.target.value)}
                  placeholder="Ej: Av. San Martín 1234, Encarnación"
                />
              </div>
            ) : (
              <div>
                <Label className="text-xs text-muted-foreground">Propiedad</Label>
                <Select value={form.property_id} onValueChange={v => update('property_id', v)}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent position="popper" className="max-h-[200px]">
                    {properties?.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.title} - {p.address || 'S/D'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Row 2: Tenant + Document */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Inquilino / Comprador *</Label>
                <Input
                  value={form.tenant_name}
                  onChange={e => update('tenant_name', e.target.value)}
                  placeholder="Nombre completo"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Documento</Label>
                <Input
                  value={form.tenant_document}
                  onChange={e => update('tenant_document', e.target.value)}
                  placeholder="CI / RUC"
                />
              </div>
            </div>

            {/* Row 3: Client (optional) */}
            <div>
              <Label className="text-xs text-muted-foreground">Cliente registrado (opcional)</Label>
              <Select value={form.client_id} onValueChange={v => update('client_id', v)}>
                <SelectTrigger><SelectValue placeholder="Vincular a cliente existente..." /></SelectTrigger>
                <SelectContent position="popper" className="max-h-[200px]">
                  {clients?.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Divider */}
            <div className="border-t border-border" />

            {/* Row 4: Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Fecha inicio *</Label>
                <Input type="date" value={form.start_date} onChange={e => update('start_date', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Vencimiento</Label>
                <Input type="date" value={form.end_date} onChange={e => update('end_date', e.target.value)} />
              </div>
            </div>

            {/* Row 5: Amount + Currency */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Moneda</Label>
                <Select value={form.currency} onValueChange={v => update('currency', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent position="popper" className="max-h-[200px]">
                    <SelectItem value="PYG">₲ PYG</SelectItem>
                    <SelectItem value="USD">$ USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">{isSale ? 'Monto Total *' : 'Monto Mensual *'}</Label>
                <Input
                  type="number"
                  value={isSale ? form.total_amount : form.monthly_rent}
                  onChange={e => update(isSale ? 'total_amount' : 'monthly_rent', e.target.value)}
                  placeholder="0"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Depósito</Label>
                <Input
                  type="number"
                  value={form.deposit_amount}
                  onChange={e => update('deposit_amount', e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>

            {/* Agent assignment for admin/secretaria */}
            {canAssignAgent && (
              <div>
                <Label className="text-xs text-muted-foreground">Agente Responsable</Label>
                <Select value={form.responsible_agent_id} onValueChange={v => update('responsible_agent_id', v)}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar agente..." /></SelectTrigger>
                  <SelectContent position="popper" className="max-h-[200px]">
                    {(agentsList || []).map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Notes */}
            <div>
              <Label className="text-xs text-muted-foreground">Notas</Label>
              <Textarea
                value={form.notes}
                onChange={e => update('notes', e.target.value)}
                placeholder="Ej: Sin contrato formal, acuerdo verbal..."
                rows={2}
              />
            </div>
          </div>
        </ScrollArea>

        {/* Actions - fixed at bottom */}
        <div className="flex justify-end gap-2 px-4 sm:px-6 py-3 border-t border-border shrink-0">
          <Button variant="outline" onClick={resetAndClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || createContract.isPending}>
            <Zap className="w-4 h-4 mr-1" />
            {createContract.isPending ? 'Guardando...' : 'Registrar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
