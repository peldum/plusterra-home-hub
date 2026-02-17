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
import { FileText, Home, CalendarDays, CheckCircle, ArrowRight, ArrowLeft } from 'lucide-react';

interface ContractFormWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const contractTypes = [
  { value: 'rental', label: 'Alquiler', description: 'Contrato de alquiler mensual estándar', icon: '🏠' },
  { value: 'temporary_rental', label: 'Alquiler Temporal', description: 'Alquiler por período corto', icon: '🏖️' },
  { value: 'sale', label: 'Venta', description: 'Contrato de compraventa', icon: '💰' },
  { value: 'property_management', label: 'Administración', description: 'Contrato de administración de propiedad', icon: '📋' },
  { value: 'exclusivity', label: 'Exclusividad', description: 'Contrato de exclusividad de venta', icon: '⭐' },
];

const steps = [
  { label: 'Tipo', icon: FileText },
  { label: 'Propiedad', icon: Home },
  { label: 'Fechas', icon: CalendarDays },
  { label: 'Confirmar', icon: CheckCircle },
];

export const ContractFormWizard = ({ open, onOpenChange }: ContractFormWizardProps) => {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    contract_type: '' as string,
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
    periodicity: 'monthly',
    notes: '',
    status: 'active' as string,
  });

  const { data: properties, isLoading: loadingProperties } = useProperties();
  const { data: clients, isLoading: loadingClients } = useClients();
  const createContract = useCreateContract();
  const { user } = useAuth();

  const updateForm = (key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const canProceed = () => {
    switch (step) {
      case 0: return !!form.contract_type;
      case 1: return !!form.property_id;
      case 2: return !!form.start_date && (form.contract_type === 'sale' ? !!form.total_amount : !!form.monthly_rent);
      default: return true;
    }
  };

  const handleSubmit = () => {
    const payload: any = {
      contract_type: form.contract_type,
      property_id: form.property_id,
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
      notes: form.notes || undefined,
      status: form.status,
      responsible_agent_id: user?.id,
    };

    createContract.mutate(payload, {
      onSuccess: () => {
        onOpenChange(false);
        setStep(0);
        setForm({
          contract_type: '', property_id: '', client_id: '', tenant_name: '', tenant_document: '',
          start_date: '', end_date: '', monthly_rent: '', total_amount: '', deposit_amount: '',
          currency: 'PYG', periodicity: 'monthly', notes: '', status: 'active',
        });
      },
    });
  };

  const selectedProperty = properties?.find((p) => p.id === form.property_id);
  const selectedClient = clients?.find((c) => c.id === form.client_id);
  const selectedType = contractTypes.find((t) => t.value === form.contract_type);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Nuevo Contrato</DialogTitle>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center justify-between mb-6">
          {steps.map((s, i) => (
            <div key={s.label} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                i <= step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                {i + 1}
              </div>
              <span className={`text-xs hidden sm:inline ${i <= step ? 'text-foreground' : 'text-muted-foreground'}`}>
                {s.label}
              </span>
              {i < steps.length - 1 && <div className={`w-8 h-px ${i < step ? 'bg-primary' : 'bg-border'}`} />}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="min-h-[280px]">
          {step === 0 && (
            <div className="grid grid-cols-1 gap-3">
              {contractTypes.map((t) => (
                <button
                  key={t.value}
                  onClick={() => updateForm('contract_type', t.value)}
                  className={`flex items-center gap-4 p-4 rounded-xl border text-left transition-all ${
                    form.contract_type === t.value
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                      : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <span className="text-2xl">{t.icon}</span>
                  <div>
                    <p className="font-medium text-foreground">{t.label}</p>
                    <p className="text-sm text-muted-foreground">{t.description}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <Label>Propiedad *</Label>
                <Select value={form.property_id} onValueChange={(v) => updateForm('property_id', v)}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar propiedad" /></SelectTrigger>
                  <SelectContent>
                    {properties?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.title} - {p.address || 'Sin dirección'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
                    <Input type="number" value={form.total_amount} onChange={(e) => updateForm('total_amount', e.target.value)} placeholder="0" />
                  </div>
                ) : (
                  <div>
                    <Label>Monto Mensual *</Label>
                    <Input type="number" value={form.monthly_rent} onChange={(e) => updateForm('monthly_rent', e.target.value)} placeholder="0" />
                  </div>
                )}
              </div>
              <div>
                <Label>Depósito / Garantía</Label>
                <Input type="number" value={form.deposit_amount} onChange={(e) => updateForm('deposit_amount', e.target.value)} placeholder="0" />
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
                    <p className="font-medium">{selectedProperty?.title || '—'}</p>
                  </div>
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
        <div className="flex justify-between pt-4 border-t border-border">
          <Button variant="outline" onClick={() => step > 0 ? setStep(step - 1) : onOpenChange(false)}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            {step === 0 ? 'Cancelar' : 'Anterior'}
          </Button>
          {step < 3 ? (
            <Button onClick={() => setStep(step + 1)} disabled={!canProceed()}>
              Siguiente <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={createContract.isPending}>
              {createContract.isPending ? 'Creando...' : 'Crear Contrato'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
