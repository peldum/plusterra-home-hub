import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, ToggleLeft, ToggleRight, ChevronsUpDown, Check, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const QuickCommissionDialog = ({ open, onOpenChange }: Props) => {
  const { user, role } = useAuth();
  const qc = useQueryClient();
  const [isPending, setIsPending] = useState(false);
  const [propertyOpen, setPropertyOpen] = useState(false);
  const canAssignAgent = role === 'admin' || role === 'superadmin' || role === 'accounting' || role === 'secretaria';

  const today = new Date().toISOString().split('T')[0];
  const currentPeriod = new Date().toISOString().slice(0, 7);

  const [form, setForm] = useState({
    operation_type: 'rental' as 'rental' | 'sale',
    property_source: 'external' as 'internal' | 'external',
    property_id: '',
    property_address: '',
    gross_amount: 0,
    currency: 'PYG',
    operation_date: today,
    is_cobroker: false,
    cobroker_name: '',
    cobroker_company: '',
    is_co_agent: false,
    co_agent_id: '',
    is_recurring_rental: false,
    recurring_period: currentPeriod,
    notes: '',
    agent_id: '',
  });

  const { data: properties } = useQuery({
    queryKey: ['quick-comm-properties'],
    queryFn: async () => {
      const { data } = await supabase
        .from('properties')
        .select('id, title, property_code')
        .order('title');
      return data || [];
    },
    enabled: open && form.property_source === 'internal',
  });

  const { data: agentsList } = useQuery({
    queryKey: ['quick-comm-agents'],
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

  const split = useMemo(() => {
    const gross = form.gross_amount || 0;
    const companyPct = 15;

    if (form.is_co_agent && form.co_agent_id) {
      // Each agent gets 50% of gross, then 15% company from each
      const halfGross = gross / 2;
      const companyPerAgent = Math.round(halfGross * companyPct / 100);
      const netPerAgent = Math.round(halfGross - companyPerAgent);
      const totalCompany = companyPerAgent * 2;
      return {
        companyPct,
        companyAmt: totalCompany,
        agentAmt: netPerAgent,
        coAgentAmt: netPerAgent,
        agentPct: 85,
        isCoAgent: true,
        halfGross: Math.round(halfGross),
      };
    }

    const companyAmt = Math.round(gross * companyPct / 100);
    const agentAmt = gross - companyAmt;
    return {
      companyPct,
      companyAmt,
      agentAmt,
      coAgentAmt: 0,
      agentPct: 85,
      isCoAgent: false,
      halfGross: 0,
    };
  }, [form.gross_amount, form.is_co_agent, form.co_agent_id]);

  const formatAmount = (n: number) => {
    if (form.currency === 'USD') {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n);
    }
    return new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', maximumFractionDigits: 0 }).format(n);
  };

  const resetForm = () => {
    setForm({
      operation_type: 'rental', property_source: 'external', property_id: '',
      property_address: '', gross_amount: 0, currency: 'PYG', operation_date: today,
      is_cobroker: false, cobroker_name: '', cobroker_company: '',
      is_co_agent: false, co_agent_id: '',
      is_recurring_rental: false, recurring_period: currentPeriod, notes: '', agent_id: '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.gross_amount <= 0) {
      toast.error('Ingresá un monto válido');
      return;
    }

    const agentId = canAssignAgent ? form.agent_id : user!.id;
    if (!agentId) {
      toast.error('Seleccioná un agente');
      return;
    }

    if (form.is_co_agent && !form.co_agent_id) {
      toast.error('Seleccioná el co-agente');
      return;
    }

    if (form.is_co_agent && form.co_agent_id === agentId) {
      toast.error('El co-agente debe ser diferente al agente principal');
      return;
    }

    setIsPending(true);

    const { error } = await supabase.from('quick_commissions' as any).insert({
      agent_id: agentId,
      created_by: user!.id,
      operation_type: form.operation_type,
      property_source: form.property_source,
      property_id: form.property_source === 'internal' && form.property_id ? form.property_id : null,
      property_address: form.property_source === 'external' ? form.property_address : null,
      gross_amount: form.gross_amount,
      company_pct: split.companyPct,
      company_amount: split.companyAmt,
      net_amount: split.agentAmt,
      currency: form.currency,
      operation_date: form.operation_date,
      is_cobroker: form.is_cobroker,
      cobroker_name: form.is_cobroker ? form.cobroker_name : null,
      cobroker_company: form.is_cobroker ? form.cobroker_company : null,
      is_co_agent: form.is_co_agent,
      co_agent_id: form.is_co_agent ? form.co_agent_id : null,
      agent_net_amount: form.is_co_agent ? split.agentAmt : null,
      co_agent_net_amount: form.is_co_agent ? split.coAgentAmt : null,
      is_recurring_rental: form.is_recurring_rental,
      recurring_period: form.is_recurring_rental ? form.recurring_period : null,
      notes: form.notes || null,
    });

    setIsPending(false);
    if (error) {
      toast.error('Error al registrar comisión: ' + error.message);
      return;
    }

    toast.success('Comisión rápida registrada exitosamente');
    qc.invalidateQueries({ queryKey: ['quick-commissions'] });
    qc.invalidateQueries({ queryKey: ['agent-my-commissions'] });
    resetForm();
    onOpenChange(false);
  };

  const set = (patch: Partial<typeof form>) => setForm(f => ({ ...f, ...patch }));

  const selectedProperty = properties?.find(p => p.id === form.property_id);

  const mainAgentName = agentsList?.find(a => a.id === (canAssignAgent ? form.agent_id : user?.id))?.full_name;
  const coAgentName = agentsList?.find(a => a.id === form.co_agent_id)?.full_name;

  // Filter co-agent list to exclude the main agent
  const coAgentOptions = (agentsList || []).filter(a => a.id !== (canAssignAgent ? form.agent_id : user?.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="font-display text-xl">Registrar Comisión Rápida</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-5">
          {/* Admin: agent selector */}
          {canAssignAgent && (
            <div className="space-y-1.5">
              <Label>Agente principal <span className="text-destructive">*</span></Label>
              <Select value={form.agent_id} onValueChange={v => set({ agent_id: v, co_agent_id: form.co_agent_id === v ? '' : form.co_agent_id })}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar agente..." />
                </SelectTrigger>
                <SelectContent>
                  {(agentsList || []).map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Operation type + currency */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tipo de operación</Label>
              <Select value={form.operation_type} onValueChange={v => set({ operation_type: v as any })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rental">Alquiler</SelectItem>
                  <SelectItem value="sale">Venta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Moneda</Label>
              <Select value={form.currency} onValueChange={v => set({ currency: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PYG">Guaraníes (₲)</SelectItem>
                  <SelectItem value="USD">Dólares (USD)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Property source toggle + selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Propiedad</Label>
              <button
                type="button"
                onClick={() => set({ property_source: form.property_source === 'internal' ? 'external' : 'internal', property_id: '', property_address: '' })}
                className="flex items-center gap-1.5 text-xs text-primary hover:underline"
              >
                {form.property_source === 'internal' ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                {form.property_source === 'internal' ? 'Interna' : 'Externa'}
              </button>
            </div>

            {form.property_source === 'internal' ? (
              <Popover open={propertyOpen} onOpenChange={setPropertyOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={propertyOpen}
                    className="w-full justify-between h-10 font-normal"
                  >
                    {selectedProperty ? (
                      <span className="flex items-center gap-2 truncate">
                        <Badge variant="secondary" className="shrink-0 text-[10px] px-1.5 py-0">
                          {selectedProperty.property_code}
                        </Badge>
                        <span className="truncate">{selectedProperty.title}</span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Buscar propiedad...</span>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[var(--radix-popover-trigger-width)] p-0"
                  align="start"
                  onWheel={(e) => e.stopPropagation()}
                  onTouchMove={(e) => e.stopPropagation()}
                >
                  <Command>
                    <CommandInput placeholder="Buscar por código o título..." />
                    <CommandList className="max-h-[240px] overflow-y-auto overscroll-contain">
                      <CommandEmpty>No se encontró la propiedad.</CommandEmpty>
                      <CommandGroup>
                        {(properties || []).map(p => (
                          <CommandItem
                            key={p.id}
                            value={`${p.property_code} ${p.title}`}
                            onSelect={() => {
                              set({ property_id: p.id });
                              setPropertyOpen(false);
                            }}
                            className="flex items-center gap-2"
                          >
                            <Check className={cn("h-4 w-4 shrink-0", form.property_id === p.id ? "opacity-100" : "opacity-0")} />
                            <Badge variant="outline" className="shrink-0 text-[10px] px-1.5 py-0 font-mono">
                              {p.property_code}
                            </Badge>
                            <span className="truncate text-sm">{p.title}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            ) : (
              <Input
                value={form.property_address}
                onChange={e => set({ property_address: e.target.value })}
                placeholder="Ej: Av. España 1234, Asunción"
              />
            )}
          </div>

          {/* Amount */}
          <div className="space-y-1.5">
            <Label>Comisión bruta cobrada <span className="text-destructive">*</span></Label>
            <p className="text-xs text-muted-foreground -mt-1">
              Ingresá el monto total de comisión que se cobró por la operación (antes del split 85/15).
            </p>
            <Input
              type="number"
              min={1}
              value={form.gross_amount || ''}
              onChange={e => set({ gross_amount: +e.target.value })}
              placeholder="0"
              required
            />
          </div>

          {/* Co-agent interno */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="co_agent"
                checked={form.is_co_agent}
                onCheckedChange={v => set({ is_co_agent: !!v, co_agent_id: '' })}
              />
              <Label htmlFor="co_agent" className="cursor-pointer text-sm flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                Operación compartida con otro agente interno
              </Label>
            </div>
            {form.is_co_agent && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Co-agente de la empresa</Label>
                <Select value={form.co_agent_id} onValueChange={v => set({ co_agent_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar co-agente..." />
                  </SelectTrigger>
                  <SelectContent>
                    {coAgentOptions.map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Split preview */}
          {form.gross_amount > 0 && (
            <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
              <p className="text-sm font-semibold text-foreground">
                Desglose automático {split.isCoAgent ? '(50/50 entre agentes, 15% retención c/u)' : '(85/15)'}
              </p>

              {split.isCoAgent ? (
                <>
                  <div className="text-xs text-muted-foreground mb-1">
                    Bruto por agente: {formatAmount(split.halfGross)}
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-success font-medium truncate">
                      {mainAgentName || 'Agente 1'} (85%)
                    </span>
                    <span className="font-bold text-success">{formatAmount(split.agentAmt)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-success font-medium truncate">
                      {coAgentName || 'Agente 2'} (85%)
                    </span>
                    <span className="font-bold text-success">{formatAmount(split.coAgentAmt)}</span>
                  </div>
                  <div className="flex justify-between text-sm pt-1 border-t border-border/50">
                    <span className="text-muted-foreground">Retención Plusterra (15% × 2)</span>
                    <span className="font-semibold text-foreground">{formatAmount(split.companyAmt)}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-success font-medium">
                      {canAssignAgent ? 'Comisión agente' : 'Tu comisión'} ({split.agentPct}%)
                    </span>
                    <span className="font-bold text-success">{formatAmount(split.agentAmt)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Retención Plusterra ({split.companyPct}%)</span>
                    <span className="font-semibold text-foreground">{formatAmount(split.companyAmt)}</span>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Operation date */}
          <div className="space-y-1.5">
            <Label>Fecha de operación</Label>
            <Input
              type="date"
              value={form.operation_date}
              onChange={e => set({ operation_date: e.target.value })}
            />
          </div>

          {/* Co-broker externo */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="cobroker"
                checked={form.is_cobroker}
                onCheckedChange={v => set({ is_cobroker: !!v })}
              />
              <Label htmlFor="cobroker" className="cursor-pointer text-sm">Co-broker externo (otra inmobiliaria)</Label>
            </div>
            {form.is_cobroker && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Nombre del colega</Label>
                  <Input value={form.cobroker_name} onChange={e => set({ cobroker_name: e.target.value })} placeholder="Nombre" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Inmobiliaria</Label>
                  <Input value={form.cobroker_company} onChange={e => set({ cobroker_company: e.target.value })} placeholder="Nombre empresa" />
                </div>
              </div>
            )}
          </div>

          {/* Recurring rental */}
          {form.operation_type === 'rental' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="recurring"
                  checked={form.is_recurring_rental}
                  onCheckedChange={v => set({ is_recurring_rental: !!v })}
                />
                <Label htmlFor="recurring" className="cursor-pointer text-sm">Comisión recurrente mensual</Label>
              </div>
              <p className="text-xs text-muted-foreground -mt-1 ml-6">
                Marcá esto si el agente cobra comisión cada mes por este alquiler (ej: administración de propiedad).
              </p>
              {form.is_recurring_rental && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Mes correspondiente</Label>
                  <Input type="month" value={form.recurring_period} onChange={e => set({ recurring_period: e.target.value })} />
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>Observaciones</Label>
            <Textarea
              value={form.notes}
              onChange={e => set({ notes: e.target.value })}
              placeholder="Detalles adicionales..."
              className="min-h-[60px] resize-y"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending || form.gross_amount <= 0 || (canAssignAgent && !form.agent_id) || (form.is_co_agent && !form.co_agent_id)}>
              {isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Registrar Comisión
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
