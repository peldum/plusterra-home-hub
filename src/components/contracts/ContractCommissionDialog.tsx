import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Users, UserPlus, User, DollarSign, Building2, CheckCircle } from 'lucide-react';
import type { ContractWithRelations } from '@/hooks/useContracts';

type SplitMode = 'solo' | 'co_internal' | 'co_external';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: ContractWithRelations;
}

export const ContractCommissionDialog = ({ open, onOpenChange, contract }: Props) => {
  const { user } = useAuth();
  const qc = useQueryClient();

  const [splitMode, setSplitMode] = useState<SplitMode>('solo');
  const [guaranteeBonus, setGuaranteeBonus] = useState(true);
  const [closerAgentId, setCloserAgentId] = useState('');
  const [externalName, setExternalName] = useState('');
  const [externalPhone, setExternalPhone] = useState('');

  const monthlyRent = Number(contract.monthly_rent || 0);
  const depositAmount = Number(contract.deposit_amount || 0);

  // Fetch internal agents
  const { data: agentsList } = useQuery({
    queryKey: ['agents-for-commission'],
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
    enabled: open && splitMode === 'co_internal',
  });

  // Commission calculation
  const calc = useMemo(() => {
    const commission = monthlyRent * 0.5; // 50% del alquiler = comisión inmobiliaria
    const bonus = guaranteeBonus ? depositAmount * 0.5 : 0; // mitad de garantía si aplica
    const grossTotal = commission + bonus; // ganancia bruta total

    if (splitMode === 'solo') {
      const companyFee = grossTotal * 0.15;
      return {
        grossTotal,
        captorGross: grossTotal,
        captorCompany: companyFee,
        captorNet: grossTotal - companyFee,
        closerGross: 0,
        closerCompany: 0,
        closerNet: 0,
      };
    }

    // Co-broker: 50/50 split
    const half = grossTotal / 2;
    const captorCompany = half * 0.15;
    const closerCompany = half * 0.15;
    return {
      grossTotal,
      captorGross: half,
      captorCompany,
      captorNet: half - captorCompany,
      closerGross: half,
      closerCompany,
      closerNet: half - closerCompany,
    };
  }, [monthlyRent, depositAmount, guaranteeBonus, splitMode]);

  const formatGs = (n: number) => `Gs. ${n.toLocaleString('es-PY')}`;

  const createCommission = useMutation({
    mutationFn: async () => {
      if (!contract.client_id && !contract.tenant_name) {
        throw new Error('El contrato necesita un cliente o inquilino');
      }

      // We need a client_id for the deal. If no client_id, we can't create a deal in the current schema.
      // Use a workaround: create deal with required fields
      const captorId = contract.responsible_agent_id || contract.created_by;

      // Create the deal
      const dealPayload: any = {
        deal_type: contract.contract_type,
        property_id: contract.property_id,
        client_id: contract.client_id || contract.created_by, // fallback
        captor_agent_id: captorId,
        closer_agent_id: splitMode !== 'solo' && splitMode === 'co_internal' ? closerAgentId : null,
        amount: monthlyRent,
        deposit_amount: guaranteeBonus ? depositAmount : 0,
        currency: contract.currency || 'PYG',
        status: 'active',
        start_date: contract.start_date,
        end_date: contract.end_date,
        notes: splitMode === 'co_external'
          ? `Co-broker externo: ${externalName} (${externalPhone})`
          : undefined,
        created_by: user!.id,
      };

      const { data: deal, error: dealErr } = await supabase
        .from('deals')
        .insert(dealPayload)
        .select()
        .single();
      if (dealErr) throw dealErr;

      // Link deal to contract
      await supabase
        .from('contracts')
        .update({ deal_id: deal.id })
        .eq('id', contract.id);

      // Create captor commission
      const commissions: any[] = [{
        deal_id: deal.id,
        agent_id: captorId,
        agent_role: 'captor',
        gross_amount: calc.captorGross,
        company_pct: 15,
        company_amount: calc.captorCompany,
        net_amount: calc.captorNet,
        currency: contract.currency || 'PYG',
        status: 'pending',
        created_by: user!.id,
        notes: splitMode === 'solo' ? 'Operación solo' : `Co-broker (${splitMode === 'co_internal' ? 'interno' : 'externo'})`,
      }];

      // Create closer commission
      if (splitMode === 'co_internal' && closerAgentId) {
        commissions.push({
          deal_id: deal.id,
          agent_id: closerAgentId,
          agent_role: 'closer',
          gross_amount: calc.closerGross,
          company_pct: 15,
          company_amount: calc.closerCompany,
          net_amount: calc.closerNet,
          currency: contract.currency || 'PYG',
          status: 'pending',
          created_by: user!.id,
          notes: 'Co-broker interno - cerrador',
        });
      } else if (splitMode === 'co_external') {
        // For external, we still register the captor's half.
        // The external agent's half is noted but not tracked in commissions table.
        commissions[0].notes = `Co-broker externo: ${externalName} (${externalPhone}). Mitad externa: ${formatGs(calc.closerGross)}`;
      }

      const { error: commErr } = await supabase
        .from('commissions')
        .insert(commissions);
      if (commErr) throw commErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contracts'] });
      qc.invalidateQueries({ queryKey: ['deals'] });
      qc.invalidateQueries({ queryKey: ['commissions'] });
      toast.success('Comisión registrada exitosamente');
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast.error('Error al registrar comisión: ' + err.message);
    },
  });

  const canSubmit = () => {
    if (splitMode === 'co_internal' && !closerAgentId) return false;
    if (splitMode === 'co_external' && (!externalName.trim() || !externalPhone.trim())) return false;
    return true;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-success" />
            Registrar Comisión
          </DialogTitle>
        </DialogHeader>

        {/* Contract summary */}
        <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" />
            <span className="font-medium">{contract.properties?.title || 'Propiedad'}</span>
          </div>
          <div className="flex gap-4 text-muted-foreground">
            <span>Alquiler: {formatGs(monthlyRent)}</span>
            <span>Garantía: {formatGs(depositAmount)}</span>
          </div>
        </div>

        {/* Split mode */}
        <div>
          <Label className="text-sm font-medium mb-3 block">¿Quién alquiló?</Label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: 'solo' as SplitMode, label: 'Solo yo', icon: User, desc: 'Captador = Cerrador' },
              { value: 'co_internal' as SplitMode, label: 'Co-broker', icon: Users, desc: 'Con agente interno' },
              { value: 'co_external' as SplitMode, label: 'Externo', icon: UserPlus, desc: 'Con agente externo' },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSplitMode(opt.value)}
                className={`p-3 rounded-xl border text-center transition-all ${
                  splitMode === opt.value
                    ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                    : 'border-border hover:bg-muted/50'
                }`}
              >
                <opt.icon className={`w-5 h-5 mx-auto mb-1 ${splitMode === opt.value ? 'text-primary' : 'text-muted-foreground'}`} />
                <p className="text-xs font-medium">{opt.label}</p>
                <p className="text-[10px] text-muted-foreground">{opt.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Co-broker internal agent selector */}
        {splitMode === 'co_internal' && (
          <div>
            <Label>Agente cerrador *</Label>
            <Select value={closerAgentId} onValueChange={setCloserAgentId}>
              <SelectTrigger><SelectValue placeholder="Seleccionar agente..." /></SelectTrigger>
              <SelectContent>
                {(agentsList || [])
                  .filter(a => a.id !== (contract.responsible_agent_id || contract.created_by))
                  .map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.full_name}</SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Co-broker external details */}
        {splitMode === 'co_external' && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Nombre agente externo *</Label>
              <Input value={externalName} onChange={e => setExternalName(e.target.value)} placeholder="Nombre completo" />
            </div>
            <div>
              <Label>Teléfono *</Label>
              <Input value={externalPhone} onChange={e => setExternalPhone(e.target.value)} placeholder="+595..." />
            </div>
          </div>
        )}

        {/* Guarantee bonus toggle */}
        <div className="flex items-center justify-between p-3 rounded-lg border border-border">
          <div>
            <p className="text-sm font-medium">Bonus de garantía</p>
            <p className="text-xs text-muted-foreground">¿El propietario otorga la mitad de la garantía?</p>
          </div>
          <Switch checked={guaranteeBonus} onCheckedChange={setGuaranteeBonus} />
        </div>

        <Separator />

        {/* Calculation breakdown */}
        <div className="bg-muted/30 rounded-xl p-4 space-y-3">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-success" />
            Desglose de comisión
          </h4>

          <div className="text-sm space-y-1.5">
            <div className="flex justify-between text-muted-foreground">
              <span>Comisión base (50% alquiler)</span>
              <span>{formatGs(monthlyRent * 0.5)}</span>
            </div>
            {guaranteeBonus && (
              <div className="flex justify-between text-muted-foreground">
                <span>Bonus garantía (50% depósito)</span>
                <span>{formatGs(depositAmount * 0.5)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-foreground border-t border-border pt-1.5">
              <span>Ganancia bruta total</span>
              <span>{formatGs(calc.grossTotal)}</span>
            </div>
          </div>

          <Separator />

          {/* Agent breakdown */}
          <div className="space-y-2">
            {/* Captor */}
            <div className="rounded-lg bg-background p-3 space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">Captador</Badge>
                <span className="text-xs text-muted-foreground">
                  {agentsList?.find(a => a.id === (contract.responsible_agent_id || contract.created_by))?.full_name || 'Tú'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Bruto</span>
                  <p className="font-medium">{formatGs(calc.captorGross)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">15% empresa</span>
                  <p className="font-medium text-destructive">-{formatGs(calc.captorCompany)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Neto</span>
                  <p className="font-bold text-success">{formatGs(calc.captorNet)}</p>
                </div>
              </div>
            </div>

            {/* Closer */}
            {splitMode !== 'solo' && (
              <div className="rounded-lg bg-background p-3 space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">Cerrador</Badge>
                  <span className="text-xs text-muted-foreground">
                    {splitMode === 'co_internal'
                      ? (agentsList?.find(a => a.id === closerAgentId)?.full_name || 'Seleccionar...')
                      : externalName || 'Externo'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Bruto</span>
                    <p className="font-medium">{formatGs(calc.closerGross)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">15% empresa</span>
                    <p className="font-medium text-destructive">-{formatGs(calc.closerCompany)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Neto</span>
                    <p className="font-bold text-success">{formatGs(calc.closerNet)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Company total */}
            <div className="flex justify-between text-sm pt-2 border-t border-border">
              <span className="text-muted-foreground">Total retención empresa (15%)</span>
              <span className="font-bold text-primary">{formatGs(calc.captorCompany + calc.closerCompany)}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Omitir</Button>
          <Button
            onClick={() => createCommission.mutate()}
            disabled={!canSubmit() || createCommission.isPending}
          >
            {createCommission.isPending ? 'Registrando...' : 'Registrar Comisión'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
