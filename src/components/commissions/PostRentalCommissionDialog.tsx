/**
 * PostRentalCommissionDialog — Auto-opens after confirming a rental.
 * Pre-filled with property data, agent only enters gross commission amount.
 */
import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, Users, CheckCircle2 } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  property: {
    id: string;
    title: string;
    property_code?: string;
    rental_price?: number;
    currency?: string;
    reserved_by?: string;
    captor_agent_id?: string;
  };
}

export const PostRentalCommissionDialog = ({ open, onOpenChange, property }: Props) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [isPending, setIsPending] = useState(false);

  const now = new Date();
  const [grossAmount, setGrossAmount] = useState(0);
  const [currency, setCurrency] = useState(property.currency || 'PYG');
  const [isCoAgent, setIsCoAgent] = useState(false);
  const [coAgentId, setCoAgentId] = useState('');
  const [notes, setNotes] = useState('');
  const [periodoMes, setPeriodoMes] = useState(now.getMonth() + 1);
  const [periodoAnio, setPeriodoAnio] = useState(now.getFullYear());
  const mainAgentId = property.reserved_by || property.captor_agent_id || '';

  const { data: agentsList } = useQuery({
    queryKey: ['post-rental-agents'],
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
    enabled: open,
  });

  const mainAgentName = agentsList?.find(a => a.id === mainAgentId)?.full_name || 'Agente';
  const coAgentName = agentsList?.find(a => a.id === coAgentId)?.full_name;
  const coAgentOptions = (agentsList || []).filter(a => a.id !== mainAgentId);

  const split = useMemo(() => {
    const gross = grossAmount || 0;
    const companyPct = 15;

    if (isCoAgent && coAgentId) {
      const halfGross = gross / 2;
      const companyPerAgent = Math.round(halfGross * companyPct / 100);
      const netPerAgent = Math.round(halfGross - companyPerAgent);
      return {
        companyAmt: companyPerAgent * 2,
        agentAmt: netPerAgent,
        coAgentAmt: netPerAgent,
        halfGross: Math.round(halfGross),
        isCoAgent: true,
      };
    }

    const companyAmt = Math.round(gross * companyPct / 100);
    const agentAmt = gross - companyAmt;
    return { companyAmt, agentAmt, coAgentAmt: 0, halfGross: 0, isCoAgent: false };
  }, [grossAmount, isCoAgent, coAgentId]);

  const formatAmount = (n: number) => {
    if (currency === 'USD') {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n);
    }
    return new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', maximumFractionDigits: 0 }).format(n);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (grossAmount <= 0) {
      toast.error('Ingresá un monto válido');
      return;
    }
    if (isCoAgent && !coAgentId) {
      toast.error('Seleccioná el co-agente');
      return;
    }

    setIsPending(true);

    const { error } = await supabase.from('quick_commissions' as any).insert({
      agent_id: mainAgentId,
      created_by: user!.id,
      operation_type: 'rental',
      property_source: 'internal',
      property_id: property.id,
      property_address: null,
      gross_amount: grossAmount,
      company_pct: 15,
      company_amount: split.companyAmt,
      net_amount: split.agentAmt,
      currency,
      operation_date: new Date().toISOString().split('T')[0],
      is_cobroker: false,
      is_co_agent: isCoAgent,
      co_agent_id: isCoAgent ? coAgentId : null,
      agent_net_amount: isCoAgent ? split.agentAmt : null,
      co_agent_net_amount: isCoAgent ? split.coAgentAmt : null,
      is_recurring_rental: false,
      notes: notes || `Comisión auto-generada al confirmar alquiler de ${property.title}`,
      periodo_mes: periodoMes,
      periodo_anio: periodoAnio,
    });

    setIsPending(false);
    if (error) {
      toast.error('Error al registrar comisión: ' + error.message);
      return;
    }

    toast.success('✅ Comisión registrada exitosamente');
    qc.invalidateQueries({ queryKey: ['quick-commissions'] });
    qc.invalidateQueries({ queryKey: ['agent-my-commissions'] });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto overflow-x-visible">
        <DialogHeader>
          <DialogTitle className="font-display text-lg flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-success" />
            Registrar Comisión del Alquiler
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Property info */}
          <div className="bg-muted/50 border border-border rounded-xl p-3">
            <div className="flex items-center gap-2">
              {property.property_code && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">
                  {property.property_code}
                </Badge>
              )}
              <p className="text-sm font-medium text-foreground truncate">{property.title}</p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Agente: <span className="font-medium text-foreground">{mainAgentName}</span>
            </p>
          </div>

          {/* Gross amount + currency */}
          <div className="space-y-1.5">
            <Label>Comisión bruta cobrada <span className="text-destructive">*</span></Label>
            <p className="text-xs text-muted-foreground">
              Monto total de comisión cobrado por esta operación (antes del split 85/15).
            </p>
            <div className="flex gap-2">
              <Input
                type="number"
                min={1}
                value={grossAmount || ''}
                onChange={e => setGrossAmount(+e.target.value)}
                placeholder="0"
                required
                className="flex-1"
              />
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PYG">₲ PYG</SelectItem>
                  <SelectItem value="USD">$ USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Co-agent */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="post_co_agent"
                checked={isCoAgent}
                onCheckedChange={v => { setIsCoAgent(!!v); setCoAgentId(''); }}
              />
              <Label htmlFor="post_co_agent" className="cursor-pointer text-sm flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                Operación compartida con otro agente
              </Label>
            </div>
            {isCoAgent && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Co-agente de la empresa</Label>
                {coAgentOptions.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic py-2">No hay otros agentes disponibles</p>
                ) : (
                  <select
                    value={coAgentId}
                    onChange={e => setCoAgentId(e.target.value)}
                    className="flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <option value="">Seleccionar co-agente...</option>
                    {coAgentOptions.map(a => (
                      <option key={a.id} value={a.id}>{a.full_name}</option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>

          {/* Split preview */}
          {grossAmount > 0 && (
            <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
              <p className="text-sm font-semibold text-foreground">
                Desglose {split.isCoAgent ? '(85/15)' : '(85/15)'}
              </p>

              {split.isCoAgent ? (
                <>
                  <div className="text-xs text-muted-foreground mb-1">
                    Total agentes (85%): {formatAmount(split.agentAmt + split.coAgentAmt)} — dividido 50/50
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-success font-medium truncate">{mainAgentName} (42.5%)</span>
                    <span className="font-bold text-success">{formatAmount(split.agentAmt)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-success font-medium truncate">{coAgentName || 'Co-agente'} (42.5%)</span>
                    <span className="font-bold text-success">{formatAmount(split.coAgentAmt)}</span>
                  </div>
                  <div className="flex justify-between text-sm pt-1 border-t border-border/50">
                    <span className="text-muted-foreground">Retención Plusterra (15%)</span>
                    <span className="font-semibold text-foreground">{formatAmount(split.companyAmt)}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-success font-medium">{mainAgentName} (85%)</span>
                    <span className="font-bold text-success">{formatAmount(split.agentAmt)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Retención Plusterra (15%)</span>
                    <span className="font-semibold text-foreground">{formatAmount(split.companyAmt)}</span>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Period selector */}
          <div className="space-y-1.5">
            <Label>Período al que corresponde</Label>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={periodoMes}
                onChange={e => setPeriodoMes(+e.target.value)}
                className="flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                {['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'].map((m, i) => (
                  <option key={i+1} value={i+1}>{m}</option>
                ))}
              </select>
              <Input type="number" min={2024} max={2030} value={periodoAnio} onChange={e => setPeriodoAnio(+e.target.value)} />
            </div>
            <p className="text-xs text-muted-foreground">Indicá el mes real de la operación si estás registrando fuera de término.</p>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>Observaciones</Label>
            <Input
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Detalles adicionales..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2 border-t border-border">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Omitir
            </Button>
            <Button type="submit" disabled={isPending || grossAmount <= 0}>
              {isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Registrar Comisión
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
