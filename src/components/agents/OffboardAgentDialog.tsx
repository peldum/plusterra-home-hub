import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, AlertTriangle, ArrowRightLeft, UserX, Building2, TrendingUp } from 'lucide-react';
import type { AgentProfile } from '@/hooks/useAgents';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent: AgentProfile;
  mode: 'transfer' | 'offboard';
  agents: AgentProfile[];
}

const ACTIVE_STATES = ['draft', 'available', 'reserved', 'reservation_request'];
const CLOSED_STATES = ['rented', 'sold', 'archived'];
const OPEN_PIPELINE_EXCLUDED = ['cerrado_ganado', 'cerrado_perdido'];

export const OffboardAgentDialog = ({ open, onOpenChange, agent, mode, agents }: Props) => {
  const qc = useQueryClient();
  const [receiverId, setReceiverId] = useState<string>('');
  const [transferActive, setTransferActive] = useState(true);
  const [transferClosed, setTransferClosed] = useState(false);
  const [transferPipeline, setTransferPipeline] = useState(true);
  const [reason, setReason] = useState('');

  // Counts of what will be transferred
  const { data: counts, isLoading: countsLoading } = useQuery({
    queryKey: ['agent-portfolio-summary', agent.id],
    queryFn: async () => {
      const [propsRes, dealsRes] = await Promise.all([
        supabase.from('properties').select('id, status').eq('captor_agent_id', agent.id),
        supabase.from('pipeline_deals').select('id, stage').eq('agent_id', agent.id),
      ]);
      const props = propsRes.data || [];
      const deals = dealsRes.data || [];
      return {
        active: props.filter((p: any) => ACTIVE_STATES.includes(p.status)).length,
        closed: props.filter((p: any) => CLOSED_STATES.includes(p.status)).length,
        pipelineOpen: deals.filter((d: any) => !OPEN_PIPELINE_EXCLUDED.includes(d.stage)).length,
      };
    },
    enabled: open,
  });

  const availableReceivers = useMemo(
    () => agents.filter(a => a.id !== agent.id && a.status === 'active'),
    [agents, agent.id]
  );

  const mutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('admin_offboard_agent', {
        _outgoing_agent_id: agent.id,
        _receiver_agent_id: receiverId,
        _transfer_active_listings: transferActive,
        _transfer_closed_listings: transferClosed,
        _transfer_pipeline: transferPipeline,
        _block_user: mode === 'offboard',
        _reason: reason || null,
      });
      if (error) throw error;

      // If offboarding, also block auth via edge function
      if (mode === 'offboard') {
        await supabase.functions.invoke('manage-user', {
          body: { action: 'update', user_id: agent.id, status: 'blocked' },
        });
      }
      return data;
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ['agents'] });
      qc.invalidateQueries({ queryKey: ['properties'] });
      qc.invalidateQueries({ queryKey: ['agent-portfolio-summary'] });
      const moved = (data?.active_listings_moved || 0) + (data?.closed_listings_moved || 0);
      const dealsMoved = data?.pipeline_deals_moved || 0;
      toast.success(
        mode === 'offboard'
          ? `${agent.full_name} dado de baja. ${moved} propiedades y ${dealsMoved} oportunidades transferidas.`
          : `Transferidas ${moved} propiedades y ${dealsMoved} oportunidades a ${data?.receiver_agent}.`
      );
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error('Error: ' + err.message),
  });

  const needsReceiver = transferActive || transferClosed || transferPipeline;
  const canSubmit =
    (!needsReceiver || !!receiverId) &&
    reason.trim().length >= 5 &&
    !mutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === 'offboard' ? (
              <><UserX className="w-5 h-5 text-destructive" /> Dar de baja: {agent.full_name}</>
            ) : (
              <><ArrowRightLeft className="w-5 h-5 text-primary" /> Transferir cartera: {agent.full_name}</>
            )}
          </DialogTitle>
          <DialogDescription>
            {mode === 'offboard'
              ? 'Bloqueará el acceso al sistema y reasignará la cartera al agente receptor. La acción queda registrada en auditoría.'
              : 'Reasigna propiedades y oportunidades activas a otro agente. La acción queda registrada en auditoría.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Resumen */}
          <div className="grid grid-cols-3 gap-2 p-3 bg-muted/50 rounded-lg">
            <div className="text-center">
              <Building2 className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
              <p className="text-lg font-bold text-foreground">
                {countsLoading ? '...' : counts?.active ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">En captación</p>
            </div>
            <div className="text-center">
              <Building2 className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
              <p className="text-lg font-bold text-foreground">
                {countsLoading ? '...' : counts?.closed ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">Cerradas</p>
            </div>
            <div className="text-center">
              <TrendingUp className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
              <p className="text-lg font-bold text-foreground">
                {countsLoading ? '...' : counts?.pipelineOpen ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">Pipeline abierto</p>
            </div>
          </div>

          {/* Receptor */}
          <div className="space-y-2">
            <Label>Agente receptor {needsReceiver && <span className="text-destructive">*</span>}</Label>
            <Select value={receiverId} onValueChange={setReceiverId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar agente receptor" />
              </SelectTrigger>
              <SelectContent>
                {availableReceivers.map(a => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Qué transferir */}
          <div className="space-y-2">
            <Label>Qué transferir</Label>
            <div className="space-y-2 p-3 border border-border rounded-lg">
              <label className="flex items-start gap-2 text-sm cursor-pointer">
                <Checkbox checked={transferActive} onCheckedChange={(c) => setTransferActive(!!c)} />
                <div>
                  <p className="font-medium">Propiedades en captación ({counts?.active ?? 0})</p>
                  <p className="text-xs text-muted-foreground">Borradores, disponibles, reservadas</p>
                </div>
              </label>
              <label className="flex items-start gap-2 text-sm cursor-pointer">
                <Checkbox checked={transferPipeline} onCheckedChange={(c) => setTransferPipeline(!!c)} />
                <div>
                  <p className="font-medium">Oportunidades del pipeline ({counts?.pipelineOpen ?? 0})</p>
                  <p className="text-xs text-muted-foreground">Leads y deals en estado abierto</p>
                </div>
              </label>
              <label className="flex items-start gap-2 text-sm cursor-pointer">
                <Checkbox checked={transferClosed} onCheckedChange={(c) => setTransferClosed(!!c)} />
                <div>
                  <p className="font-medium">Propiedades cerradas ({counts?.closed ?? 0})</p>
                  <p className="text-xs text-muted-foreground">Alquiladas/vendidas — normalmente quedan con histórico</p>
                </div>
              </label>
            </div>
          </div>

          {/* Motivo */}
          <div className="space-y-2">
            <Label>Motivo <span className="text-destructive">*</span></Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej: agente deja la oficina, reorganización de cartera, vacaciones prolongadas..."
              rows={3}
            />
            <p className="text-xs text-muted-foreground">Queda registrado en auditoría (mínimo 5 caracteres).</p>
          </div>

          {mode === 'offboard' && (
            <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">
                Esto bloqueará el acceso de <strong>{agent.full_name}</strong> al sistema permanentemente. Puede revertirse desde "Activar" si vuelve.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!canSubmit}
            variant={mode === 'offboard' ? 'destructive' : 'default'}
          >
            {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {mode === 'offboard' ? 'Dar de baja y transferir' : 'Transferir cartera'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};