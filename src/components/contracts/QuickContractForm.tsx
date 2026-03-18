import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useProperties } from '@/hooks/useProperties';
import { useClients } from '@/hooks/useClients';
import { useCreateContract } from '@/hooks/useContracts';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Zap, FileText } from 'lucide-react';

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

  const update = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  const isSale = form.contract_type === 'sale';
  const canSubmit = form.start_date && (isSale ? form.total_amount : form.monthly_rent) && (form.property_id || form.tenant_name);

  const resetAndClose = () => {
    onOpenChange(false);
    setForm({
      contract_type: 'rental', property_id: '', client_id: '',
      tenant_name: '', tenant_document: '', start_date: '', end_date: '',
      monthly_rent: '', total_amount: '', deposit_amount: '',
      currency: 'PYG', notes: '', status: 'active', responsible_agent_id: '',
    });
  };

  const handleSubmit = () => {
    const agentId = canAssignAgent ? (form.responsible_agent_id || user?.id) : user?.id;

    createContract.mutate({
      contract_type: form.contract_type as any,
      property_id: form.property_id || undefined,
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
    }, { onSuccess: resetAndClose });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            Registro Rápido
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Row 1: Type + Property */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Tipo</Label>
              <Select value={form.contract_type} onValueChange={v => update('contract_type', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {contractTypes.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Propiedad</Label>
              <Select value={form.property_id} onValueChange={v => update('property_id', v)}>
                <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  {properties?.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.title} - {p.address || 'S/D'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

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
              <SelectContent>
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
                <SelectContent>
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
                <SelectContent>
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

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={resetAndClose}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={!canSubmit || createContract.isPending}>
              <Zap className="w-4 h-4 mr-1" />
              {createContract.isPending ? 'Guardando...' : 'Registrar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
