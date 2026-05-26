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
import { RentalContractTemplate } from './RentalContractTemplate';
import { ContractCommissionDialog } from './ContractCommissionDialog';
import { MoneyInput } from '@/components/ui/money-input';
import { FileText, Home, CalendarDays, CheckCircle, ArrowRight, ArrowLeft, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ContractFormWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const contractTypes = [
  { value: 'rental', label: 'Alquiler', description: 'Contrato de alquiler con plantilla legal Paraguay', icon: '🏠', hasTemplate: true },
  { value: 'temporary_rental', label: 'Alquiler Temporal', description: 'Alquiler por período corto', icon: '🏖️', hasTemplate: false },
  { value: 'sale', label: 'Venta', description: 'Contrato de compraventa', icon: '💰', hasTemplate: false },
  { value: 'property_management', label: 'Administración', description: 'Contrato de administración de propiedad', icon: '📋', hasTemplate: false },
  { value: 'exclusivity', label: 'Exclusividad', description: 'Contrato de exclusividad de venta', icon: '⭐', hasTemplate: false },
];

const steps = [
  { label: 'Tipo', icon: FileText },
  { label: 'Propiedad', icon: Home },
  { label: 'Fechas', icon: CalendarDays },
  { label: 'Confirmar', icon: CheckCircle },
];

export const ContractFormWizard = ({ open, onOpenChange }: ContractFormWizardProps) => {
  const [step, setStep] = useState(0);
  const [showRentalTemplate, setShowRentalTemplate] = useState(false);
  const [form, setForm] = useState({
    contract_type: '' as string,
    property_id: '',
    is_external_property: false,
    external_property_address: '',
    client_id: '',
    tenant_name: '',
    tenant_document: '',
    start_date: '',
    end_date: '',
    monthly_rent: '',
    total_amount: '',
    deposit_amount: '',
    currency: 'PYG' as string,
    periodicity: 'monthly',
    notes: '',
    status: 'active' as string,
    responsible_agent_id: '',
    external_broker_name: '',
    external_broker_phone: '',
    external_broker_company: '',
  });

  const { data: properties } = useProperties();
  const { data: clients } = useClients();
  const createContract = useCreateContract();

  // Check if selected property already has an active contract
  const { data: activeContractForProperty } = useQuery({
    queryKey: ['active-contract-check', form.property_id],
    queryFn: async () => {
      const { data } = await supabase
        .from('contracts')
        .select('id, tenant_name, start_date, end_date')
        .eq('property_id', form.property_id)
        .eq('status', 'active')
        .limit(1);
      return data?.[0] || null;
    },
    enabled: !!form.property_id,
  });
  const { user, role, isAdmin } = useAuth();

  // Fetch agents list for assignment (only for admin/superadmin/secretaria)
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

  const updateForm = (key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleTypeSelect = (value: string) => {
    updateForm('contract_type', value);
    const type = contractTypes.find((t) => t.value === value);
    if (type?.hasTemplate) {
      setShowRentalTemplate(true);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 0: return !!form.contract_type;
      case 1: return form.is_external_property ? !!form.external_property_address.trim() : !!form.property_id;
      case 2: return !!form.start_date && (form.contract_type === 'sale' ? !!form.total_amount : !!form.monthly_rent);
      default: return true;
    }
  };

  const resetAndClose = () => {
    onOpenChange(false);
    setStep(0);
    setShowRentalTemplate(false);
    setForm({
      contract_type: '', property_id: '', is_external_property: false, external_property_address: '',
      client_id: '', tenant_name: '', tenant_document: '',
      start_date: '', end_date: '', monthly_rent: '', total_amount: '', deposit_amount: '',
      currency: 'PYG', periodicity: 'monthly', notes: '', status: 'active', responsible_agent_id: '',
      external_broker_name: '', external_broker_phone: '', external_broker_company: '',
    });
  };

  const [commissionContract, setCommissionContract] = useState<any>(null);

  const handleSubmit = () => {
    // For admin/secretaria: use selected agent; for agents: use themselves
    const agentId = canAssignAgent
      ? (form.responsible_agent_id || user?.id)
      : user?.id;

    // Build notes with external broker info if applicable
    let notesText = form.notes || '';
    if (form.is_external_property && form.external_broker_name) {
      const brokerInfo = `Propiedad externa — Captador: ${form.external_broker_name}${form.external_broker_company ? ` (${form.external_broker_company})` : ''}${form.external_broker_phone ? ` Tel: ${form.external_broker_phone}` : ''}`;
      notesText = notesText ? `${brokerInfo}\n${notesText}` : brokerInfo;
    }

    const payload: any = {
      contract_type: form.contract_type,
      property_id: form.is_external_property ? undefined : form.property_id,
      property_address: form.is_external_property ? form.external_property_address : undefined,
      client_id: form.client_id || undefined,
      tenant_name: form.tenant_name || undefined,
      tenant_document: form.tenant_document || undefined,
      start_date: form.start_date,
      end_date: form.end_date || undefined,
      monthly_rent: form.monthly_rent ? Number(form.monthly_rent) : undefined,
      total_amount: form.total_amount ? Number(form.total_amount) : undefined,
      deposit_amount: form.deposit_amount ? Number(form.deposit_amount) : undefined,
      currency: form.currency,
      periodicity: form.contract_type === 'sale' ? 'one_time' : form.periodicity,
      notes: notesText || undefined,
      status: form.status,
      responsible_agent_id: agentId,
    };

    createContract.mutate(payload, {
      onSuccess: (data) => {
        // For rental contracts, offer commission registration
        if (['rental', 'temporary_rental'].includes(form.contract_type) && data) {
          setCommissionContract(data);
          resetAndClose();
        } else {
          resetAndClose();
        }
      },
    });
  };

  const selectedProperty = properties?.find((p) => p.id === form.property_id);
  const selectedClient = clients?.find((c) => c.id === form.client_id);
  const selectedType = contractTypes.find((t) => t.value === form.contract_type);

  // Rental template flow
  if (showRentalTemplate) {
    return (
      <RentalContractTemplate
        open={open}
        onOpenChange={(v) => { if (!v) resetAndClose(); }}
        onBack={() => {
          setShowRentalTemplate(false);
          updateForm('contract_type', '');
        }}
      />
    );
  }

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[95vh] flex flex-col p-0">
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-0 shrink-0">
          <DialogTitle>Nuevo Contrato</DialogTitle>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center justify-between px-4 sm:px-6 pt-4 shrink-0">
          {steps.map((s, i) => (
            <div key={s.label} className="flex items-center gap-1 sm:gap-2">
              <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium transition-colors ${
                i <= step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                {i + 1}
              </div>
              <span className={`text-xs hidden sm:inline ${i <= step ? 'text-foreground' : 'text-muted-foreground'}`}>
                {s.label}
              </span>
              {i < steps.length - 1 && <div className={`w-4 sm:w-8 h-px ${i < step ? 'bg-primary' : 'bg-border'}`} />}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-4">
          {step === 0 && (
            <div className="grid grid-cols-1 gap-3">
              {contractTypes.map((t) => (
                <button
                  key={t.value}
                  onClick={() => handleTypeSelect(t.value)}
                  className={`flex items-center gap-4 p-4 rounded-xl border text-left transition-all ${
                    form.contract_type === t.value
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                      : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <span className="text-2xl">{t.icon}</span>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{t.label}</p>
                    <p className="text-sm text-muted-foreground">{t.description}</p>
                  </div>
                  {t.hasTemplate && (
                    <span className="text-xs bg-success/10 text-success px-2 py-0.5 rounded-full font-medium">
                      Plantilla
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              {/* Toggle: propiedad interna vs externa */}
              <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={form.is_external_property}
                    onChange={(e) => {
                      setForm(f => ({ ...f, is_external_property: e.target.checked, property_id: '' }));
                    }}
                    className="rounded border-border"
                  />
                  <span className="font-medium">Propiedad externa</span>
                  <span className="text-xs text-muted-foreground">(no está en nuestro sistema)</span>
                </label>
              </div>

              {!form.is_external_property ? (
                <div>
                  <Label>Propiedad *</Label>
                  <Select value={form.property_id} onValueChange={(v) => updateForm('property_id', v)}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar propiedad" /></SelectTrigger>
                    <SelectContent>
                    {properties?.map((p) => {
                      const code = (p as any).property_code || '';
                      const label = ((p as any).internal_title?.trim() || p.title || '').slice(0, 45);
                      return (
                        <SelectItem key={p.id} value={p.id}>
                          <span className="font-mono text-xs text-muted-foreground mr-2">{code}</span>
                          <span className="font-medium">{label}</span>
                        </SelectItem>
                      );
                    })}
                    </SelectContent>
                  </Select>
                  {activeContractForProperty && (
                    <Alert variant="destructive" className="mt-2">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        Esta propiedad ya tiene un contrato activo
                        {activeContractForProperty.tenant_name && ` (${activeContractForProperty.tenant_name})`}.
                        No podrás crear otro contrato con estado "Activo". Usá el flujo de renovación o cambiá el estado a "Borrador".
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              ) : (
                <>
                  <div>
                    <Label>Dirección de la propiedad *</Label>
                    <Input
                      value={form.external_property_address}
                      onChange={(e) => updateForm('external_property_address', e.target.value)}
                      placeholder="Ej: Av. Mariscal López 1234, Asunción"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <Label>Captador externo</Label>
                      <Input
                        value={form.external_broker_name}
                        onChange={(e) => updateForm('external_broker_name', e.target.value)}
                        placeholder="Nombre del colega"
                      />
                    </div>
                    <div>
                      <Label>Inmobiliaria</Label>
                      <Input
                        value={form.external_broker_company}
                        onChange={(e) => updateForm('external_broker_company', e.target.value)}
                        placeholder="Nombre inmobiliaria"
                      />
                    </div>
                    <div>
                      <Label>Teléfono</Label>
                      <Input
                        value={form.external_broker_phone}
                        onChange={(e) => updateForm('external_broker_phone', e.target.value)}
                        placeholder="+595..."
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <Label>Cliente</Label>
                <Select value={form.client_id} onValueChange={(v) => updateForm('client_id', v)}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar cliente" /></SelectTrigger>
                  <SelectContent>
                    {clients?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nombre Inquilino/Comprador</Label>
                  <Input value={form.tenant_name} onChange={(e) => updateForm('tenant_name', e.target.value)} placeholder="Nombre completo" />
                </div>
                <div>
                  <Label>Documento</Label>
                  <Input value={form.tenant_document} onChange={(e) => updateForm('tenant_document', e.target.value)} placeholder="CI / RUC" />
                </div>
              </div>
              {canAssignAgent && (
                <div>
                  <Label>Agente Responsable *</Label>
                  <Select value={form.responsible_agent_id} onValueChange={(v) => updateForm('responsible_agent_id', v)}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar agente..." /></SelectTrigger>
                    <SelectContent>
                      {(agentsList || []).map((a) => (
                        <SelectItem key={a.id} value={a.id}>{a.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Fecha Inicio *</Label>
                  <Input type="date" value={form.start_date} onChange={(e) => updateForm('start_date', e.target.value)} />
                </div>
                <div>
                  <Label>Fecha Fin</Label>
                  <Input type="date" value={form.end_date} onChange={(e) => updateForm('end_date', e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Moneda</Label>
                  <Select value={form.currency} onValueChange={(v) => updateForm('currency', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PYG">Guaraníes (PYG)</SelectItem>
                      <SelectItem value="USD">Dólares (USD)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {form.contract_type === 'sale' ? (
                  <div>
                    <Label>Monto Total *</Label>
                    <MoneyInput value={form.total_amount || ''} onChange={(v) => updateForm('total_amount', v === '' ? '' : String(v))} />
                  </div>
                ) : (
                  <div>
                    <Label>Monto Mensual *</Label>
                    <MoneyInput value={form.monthly_rent || ''} onChange={(v) => updateForm('monthly_rent', v === '' ? '' : String(v))} />
                  </div>
                )}
              </div>
              <div>
                <Label>Depósito / Garantía</Label>
                <MoneyInput value={form.deposit_amount || ''} onChange={(v) => updateForm('deposit_amount', v === '' ? '' : String(v))} />
                <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                  ⚠️ Cargá un monto <strong>solo si la garantía se cobra AHORA</strong> al inquilino. Si el contrato viene de antes y el depósito ya fue pagado a otra inmobiliaria/propietario, dejá en <strong>0</strong> para no generar garantías duplicadas.
                </p>
                {Number(form.deposit_amount || 0) > 0 && selectedProperty?.unit_id && (
                  <div className="mt-2 flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning-foreground">
                    <span className="text-base leading-none">⚠️</span>
                    <span>
                      Este contrato genera una <strong>garantía del propietario</strong>. Se creará automáticamente una tarea pendiente en{' '}
                      <strong>Edificios → Garantías</strong> para que Administración la confirme y aplique el % al propietario.
                    </span>
                  </div>
                )}
              </div>
              <div>
                <Label>Estado Inicial</Label>
                <Select value={form.status} onValueChange={(v) => updateForm('status', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Borrador</SelectItem>
                    <SelectItem value="active">Activo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Notas</Label>
                <Textarea value={form.notes} onChange={(e) => updateForm('notes', e.target.value)} placeholder="Notas adicionales..." rows={2} />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-xl p-5 space-y-3">
                <h3 className="font-semibold text-foreground">Resumen del Contrato</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Tipo:</span>
                    <p className="font-medium">{selectedType?.icon} {selectedType?.label}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Propiedad:</span>
                    <p className="font-medium">
                      {form.is_external_property
                        ? `📍 ${form.external_property_address} (externa)`
                        : (selectedProperty?.title || '—')}
                    </p>
                  </div>
                  {form.is_external_property && form.external_broker_name && (
                    <div>
                      <span className="text-muted-foreground">Captador externo:</span>
                      <p className="font-medium">{form.external_broker_name}{form.external_broker_company ? ` — ${form.external_broker_company}` : ''}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">Cliente:</span>
                    <p className="font-medium">{selectedClient?.full_name || form.tenant_name || '—'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Período:</span>
                    <p className="font-medium">{form.start_date} → {form.end_date || 'Sin fin'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Monto:</span>
                    <p className="font-medium">
                      {form.currency} {form.contract_type === 'sale' ? form.total_amount : form.monthly_rent}
                      {form.contract_type !== 'sale' && '/mes'}
                    </p>
                  </div>
                  {form.deposit_amount && (
                    <div>
                      <span className="text-muted-foreground">Depósito:</span>
                      <p className="font-medium">{form.currency} {form.deposit_amount}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">Estado:</span>
                    <p className="font-medium">{form.status === 'active' ? '✅ Activo' : '📝 Borrador'}</p>
                  </div>
                  {canAssignAgent && form.responsible_agent_id && (
                    <div>
                      <span className="text-muted-foreground">Agente Responsable:</span>
                      <p className="font-medium">{agentsList?.find(a => a.id === form.responsible_agent_id)?.full_name || '—'}</p>
                    </div>
                  )}
                </div>
                {form.notes && (
                  <div>
                    <span className="text-sm text-muted-foreground">Notas:</span>
                    <p className="text-sm">{form.notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between px-4 sm:px-6 pt-4 pb-4 sm:pb-6 border-t border-border shrink-0">
          <Button variant="outline" size="sm" onClick={() => step > 0 ? setStep(step - 1) : onOpenChange(false)}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            {step === 0 ? 'Cancelar' : 'Anterior'}
          </Button>
          {step < 3 ? (
            <Button size="sm" onClick={() => setStep(step + 1)} disabled={!canProceed()}>
              Siguiente <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button size="sm" onClick={handleSubmit} disabled={createContract.isPending || (!!activeContractForProperty && form.status === 'active')}>
              {createContract.isPending ? 'Creando...' : 'Crear Contrato'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>

    {commissionContract && (
      <ContractCommissionDialog
        open={!!commissionContract}
        onOpenChange={(v) => { if (!v) setCommissionContract(null); }}
        contract={commissionContract}
      />
    )}
    </>
  );
};
