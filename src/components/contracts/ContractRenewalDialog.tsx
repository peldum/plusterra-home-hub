import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useCreateContract, useUpdateContract, type ContractWithRelations } from '@/hooks/useContracts';
import { useAuth } from '@/contexts/AuthContext';
import { RefreshCw, ArrowRight, Building2, Users, Calendar, DollarSign, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface ContractRenewalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: ContractWithRelations;
}

export const ContractRenewalDialog = ({ open, onOpenChange, contract }: ContractRenewalDialogProps) => {
  const { user } = useAuth();
  const createContract = useCreateContract();
  const updateContract = useUpdateContract();

  // Pre-fill from original contract
  const contractData = (contract.contract_data as any) || {};

  const [startDate, setStartDate] = useState(() => {
    // Default: day after original end date
    if (contract.end_date) {
      const d = new Date(contract.end_date + 'T12:00:00');
      d.setDate(d.getDate() + 1);
      return d.toISOString().split('T')[0];
    }
    return new Date().toISOString().split('T')[0];
  });

  const [endDate, setEndDate] = useState(() => {
    // Default: same duration as original
    if (contract.start_date && contract.end_date) {
      const start = new Date(contract.start_date + 'T12:00:00');
      const end = new Date(contract.end_date + 'T12:00:00');
      const durationMs = end.getTime() - start.getTime();
      const newStart = contract.end_date
        ? new Date(new Date(contract.end_date + 'T12:00:00').getTime() + 86400000)
        : new Date();
      const newEnd = new Date(newStart.getTime() + durationMs);
      return newEnd.toISOString().split('T')[0];
    }
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split('T')[0];
  });

  const [monthlyRent, setMonthlyRent] = useState(String(contract.monthly_rent || ''));
  const [currency, setCurrency] = useState<string>(contract.currency || 'PYG');
  const [status, setStatus] = useState<'draft' | 'active'>('active');

  // Conditional fields from contract_data
  const [hasDeposit, setHasDeposit] = useState(contractData.has_deposit || false);
  const [depositAmount, setDepositAmount] = useState(contractData.deposit_amount || '');
  const [parkingOption, setParkingOption] = useState(contractData.parking_option || 'not_included');
  const [parkingCost, setParkingCost] = useState(contractData.parking_monthly_cost || '');
  const [petsOption, setPetsOption] = useState(contractData.pets_option || 'not_allowed');
  const [petDeposit, setPetDeposit] = useState(contractData.pet_deposit_amount || '');
  const [petPenalty, setPetPenalty] = useState(contractData.pet_penalty_amount || '');
  const [petNotes, setPetNotes] = useState(contractData.pet_notes || '');
  const [notes, setNotes] = useState('');

  const [step, setStep] = useState(1);

  const propertyTitle = contract.properties?.title || 'Sin propiedad';
  const propertyAddress = contract.properties?.address || contract.property_address || '';
  const clientName = contract.clients?.full_name || contract.tenant_name || 'Sin cliente';

  const formatDate = (d: string) =>
    d ? new Date(d + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  const handleConfirm = () => {
    // Build renewed contract_data merging original with updated conditional fields
    const renewedData = {
      ...contractData,
      start_date: startDate,
      end_date: endDate,
      rent_amount: monthlyRent,
      has_deposit: hasDeposit,
      deposit_amount: hasDeposit ? depositAmount : '',
      parking_option: parkingOption,
      parking_monthly_cost: parkingOption === 'optional' ? parkingCost : '',
      pets_option: petsOption,
      pet_deposit_amount: petsOption === 'allowed_with_conditions' ? petDeposit : '',
      pet_penalty_amount: petsOption === 'allowed_with_conditions' ? petPenalty : '',
      pet_notes: petsOption === 'allowed_with_conditions' ? petNotes : '',
    };

    const payload: any = {
      contract_type: contract.contract_type,
      property_id: contract.property_id,
      client_id: contract.client_id || undefined,
      tenant_name: contract.tenant_name,
      tenant_document: contract.tenant_document,
      landlord_name: contract.landlord_name,
      landlord_document: contract.landlord_document,
      start_date: startDate,
      end_date: endDate,
      monthly_rent: Number(String(monthlyRent).replace(/\./g, '') || 0),
      currency,
      has_garage: contract.has_garage,
      garage_details: contract.garage_details,
      nis_ande: contract.nis_ande,
      property_address: contract.property_address,
      services_included: contract.services_included,
      notes: notes || `Renovación del contrato anterior.`,
      contract_data: renewedData,
      status,
      responsible_agent_id: contract.responsible_agent_id || user?.id,
      periodicity: contract.periodicity,
      expenses_included: contract.expenses_included,
      deposit_amount: hasDeposit ? Number(String(depositAmount).replace(/\./g, '') || 0) : null,
      previous_contract_id: contract.id,
    };

    createContract.mutate(payload, {
      onSuccess: () => {
        // Mark old contract as renewed
        updateContract.mutate({ id: contract.id, status: 'renewed' } as any);
        toast.success('Contrato renovado exitosamente');
        onOpenChange(false);
        setStep(1);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-primary" />
            Renovar Contrato
          </DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-4">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                step >= s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                {step > s ? <CheckCircle className="w-4 h-4" /> : s}
              </div>
              {s < 3 && <ArrowRight className="w-4 h-4 text-muted-foreground" />}
            </div>
          ))}
          <span className="text-xs text-muted-foreground ml-2">
            {step === 1 ? 'Revisar datos' : step === 2 ? 'Nuevas condiciones' : 'Confirmar'}
          </span>
        </div>

        <ScrollArea className="max-h-[55vh] pr-2">
          {/* STEP 1: Review original contract */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Se creará un nuevo contrato basado en el actual. Los datos originales se mantienen.
              </p>

              <div className="rounded-lg border border-border p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">{propertyTitle}</span>
                  <span className="text-xs text-muted-foreground">{propertyAddress}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-info" />
                  <span className="text-sm text-foreground">{clientName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-foreground">
                    {formatDate(contract.start_date)} — {formatDate(contract.end_date || '')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-success" />
                  <span className="text-sm text-foreground">
                    {currency === 'PYG' ? 'Gs.' : 'USD'} {Number(contract.monthly_rent || 0).toLocaleString('es-PY')}/mes
                  </span>
                </div>
              </div>

              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">
                  Al confirmar la renovación, el contrato original pasará a estado <Badge variant="outline" className="text-xs mx-1">Renovado</Badge> y se creará uno nuevo con los datos actualizados.
                </p>
              </div>
            </div>
          )}

          {/* STEP 2: Edit dates, amount, conditions */}
          {step === 2 && (
            <div className="space-y-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nuevas Fechas y Monto</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Fecha Inicio *</Label>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div>
                  <Label>Fecha Fin *</Label>
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Monto Alquiler Mensual *</Label>
                  <Input value={monthlyRent} onChange={(e) => setMonthlyRent(e.target.value)} placeholder="1.920.000" />
                  {/* Price change indicator */}
                  {(() => {
                    const prev = Number(contract.monthly_rent || 0);
                    const next = Number(String(monthlyRent).replace(/\./g, '').replace(',', '.') || 0);
                    if (!prev || !next || prev === next) return null;
                    const pct = (((next - prev) / prev) * 100).toFixed(1);
                    const isIncrease = next > prev;
                    return (
                      <p className={`text-xs mt-1 font-medium ${isIncrease ? 'text-warning' : 'text-success'}`}>
                        {isIncrease ? '▲' : '▼'} {isIncrease ? '+' : ''}{pct}% vs canon anterior ({currency === 'PYG' ? 'Gs.' : 'USD'} {prev.toLocaleString('es-PY')})
                      </p>
                    );
                  })()}
                </div>
                <div>
                  <Label>Moneda</Label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PYG">Guaraníes (Gs.)</SelectItem>
                      <SelectItem value="USD">Dólares (USD)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Estado inicial</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as 'draft' | 'active')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Activo</SelectItem>
                    <SelectItem value="draft">Borrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-2">Condiciones Opcionales</p>

              {/* Deposit */}
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <Label>¿Requiere depósito?</Label>
                </div>
                <Switch checked={hasDeposit} onCheckedChange={(v) => { setHasDeposit(v); if (!v) setDepositAmount(''); }} />
              </div>
              {hasDeposit && (
                <div>
                  <Label>Monto Depósito</Label>
                  <Input value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} placeholder="1.920.000" />
                </div>
              )}

              {/* Parking */}
              <div className="space-y-2">
                <Label>Estacionamiento</Label>
                <RadioGroup value={parkingOption} onValueChange={(v) => { setParkingOption(v); if (v !== 'optional') setParkingCost(''); }} className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="included" id="r-park-inc" />
                    <Label htmlFor="r-park-inc" className="font-normal">Incluido</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="optional" id="r-park-opt" />
                    <Label htmlFor="r-park-opt" className="font-normal">Opcional con costo</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="not_included" id="r-park-no" />
                    <Label htmlFor="r-park-no" className="font-normal">No incluido</Label>
                  </div>
                </RadioGroup>
              </div>
              {parkingOption === 'optional' && (
                <div>
                  <Label>Costo mensual estacionamiento</Label>
                  <Input value={parkingCost} onChange={(e) => setParkingCost(e.target.value)} placeholder="300.000" />
                </div>
              )}

              {/* Pets */}
              <div className="space-y-2">
                <Label>Mascotas</Label>
                <RadioGroup value={petsOption} onValueChange={(v) => { setPetsOption(v); if (v === 'not_allowed') { setPetDeposit(''); setPetPenalty(''); setPetNotes(''); } }} className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="not_allowed" id="r-pet-no" />
                    <Label htmlFor="r-pet-no" className="font-normal">No permitido</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="allowed_with_conditions" id="r-pet-yes" />
                    <Label htmlFor="r-pet-yes" className="font-normal">Permitido con condiciones</Label>
                  </div>
                </RadioGroup>
              </div>
              {petsOption === 'allowed_with_conditions' && (
                <div className="space-y-3 rounded-lg border border-border p-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Depósito mascota</Label>
                      <Input value={petDeposit} onChange={(e) => setPetDeposit(e.target.value)} placeholder="500.000" />
                    </div>
                    <div>
                      <Label>Penalidad daños</Label>
                      <Input value={petPenalty} onChange={(e) => setPetPenalty(e.target.value)} placeholder="1.000.000" />
                    </div>
                  </div>
                  <div>
                    <Label>Condiciones</Label>
                    <Textarea value={petNotes} onChange={(e) => setPetNotes(e.target.value)} rows={2} />
                  </div>
                </div>
              )}

              <div>
                <Label>Notas de renovación</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observaciones sobre esta renovación..." rows={2} />
              </div>
            </div>
          )}

          {/* STEP 3: Confirm */}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Confirmá los datos de la renovación:</p>

              <div className="rounded-lg border border-border p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Propiedad</span>
                  <span className="font-medium text-foreground">{propertyTitle}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Cliente</span>
                  <span className="font-medium text-foreground">{clientName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Nuevas fechas</span>
                  <span className="font-medium text-foreground">{formatDate(startDate)} — {formatDate(endDate)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Monto mensual</span>
                  <span className="font-medium text-foreground">
                    {currency === 'PYG' ? 'Gs.' : 'USD'} {monthlyRent}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Estado inicial</span>
                  <Badge variant="outline" className="text-xs">{status === 'active' ? 'Activo' : 'Borrador'}</Badge>
                </div>
                {hasDeposit && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Depósito</span>
                    <span className="font-medium text-foreground">{currency === 'PYG' ? 'Gs.' : 'USD'} {depositAmount}</span>
                  </div>
                )}
              </div>

              <div className="bg-warning/5 border border-warning/30 rounded-lg p-3">
                <p className="text-xs text-warning flex items-center gap-1">
                  <RefreshCw className="w-3.5 h-3.5" />
                  El contrato original pasará automáticamente a estado "Renovado".
                </p>
              </div>
            </div>
          )}
        </ScrollArea>

        <div className="flex items-center justify-between pt-4 border-t border-border">
          <Button variant="outline" onClick={() => step > 1 ? setStep(step - 1) : onOpenChange(false)}>
            {step > 1 ? '← Atrás' : 'Cancelar'}
          </Button>
          {step < 3 ? (
            <Button onClick={() => setStep(step + 1)} disabled={step === 2 && (!startDate || !endDate || !monthlyRent)}>
              Siguiente →
            </Button>
          ) : (
            <Button onClick={handleConfirm} disabled={createContract.isPending}>
              <RefreshCw className="w-4 h-4 mr-1" />
              {createContract.isPending ? 'Renovando...' : 'Confirmar Renovación'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
