/**
 * PendingCommissionsDialog
 * Lista propiedades en estado "Alquilada" o "Vendida" que NO tienen
 * comisión registrada (ni en quick_commissions ni en commissions del deal).
 * Permite registrar la comisión faltante en un click, abriendo el
 * QuickCommissionDialog con la propiedad pre-seleccionada.
 *
 * Visible solo para roles administrativos (admin / superadmin / accounting / secretaria).
 */
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, AlertTriangle, Search, CheckCircle2, ArrowRight } from 'lucide-react';
import { QuickCommissionDialog } from '@/components/commissions/QuickCommissionDialog';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Solo mostramos pendientes desde mayo 2026 en adelante (los de marzo/abril ya están regularizados).
const SYSTEM_START = '2026-05-01';

const fmtDate = (d: string | null) => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('es-PY', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return d.slice(0, 10);
  }
};

const statusLabel = (s: string) => (s === 'rented' ? 'Alquilada' : s === 'sold' ? 'Vendida' : s);

export const PendingCommissionsDialog = ({ open, onOpenChange }: Props) => {
  const [search, setSearch] = useState('');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [selectedDefaults, setSelectedDefaults] = useState<{
    agentId?: string;
    type?: 'rental' | 'sale';
    currency?: string;
    date?: string;
    amount?: number;
  }>({});

  // 1) Properties Alquiladas / Vendidas (since SYSTEM_START)
  const { data: properties, isLoading: loadingProps } = useQuery({
    queryKey: ['pending-comm-properties'],
    queryFn: async () => {
      // Fecha real del cambio a rented/sold desde audit_logs (no updated_at,
      // que cambia con cualquier edición posterior).
      const { data: logs, error: logsErr } = await (supabase as any)
        .from('audit_logs')
        .select('target_id, new_data, created_at')
        .eq('target_table', 'properties')
        .gte('created_at', SYSTEM_START)
        .order('created_at', { ascending: false })
        .limit(2000);
      // Secretaria/Agente no tienen acceso a audit_logs por RLS (devuelven
      // array vacío sin error). Detectamos eso para hacer fallback a updated_at.
      const hasLogs = !logsErr && Array.isArray(logs) && logs.length > 0;

      // Primera fecha (más antigua) en que cada propiedad pasó a rented/sold dentro del rango
      const statusChangedAt = new Map<string, string>();
      (logs || [])
        .filter((l: any) => l?.new_data?.status === 'rented' || l?.new_data?.status === 'sold')
        .forEach((l: any) => {
          const prev = statusChangedAt.get(l.target_id);
          if (!prev || new Date(l.created_at) < new Date(prev)) {
            statusChangedAt.set(l.target_id, l.created_at);
          }
        });

      let propsQuery = supabase
        .from('properties')
        .select('id, title, property_code, status, captor_agent_id, updated_at, rental_price, sale_price, currency')
        .in('status', ['rented', 'sold'])
        .gte('updated_at', SYSTEM_START)
        .limit(500);

      if (hasLogs) {
        const ids = Array.from(statusChangedAt.keys());
        if (ids.length === 0) return [];
        propsQuery = supabase
          .from('properties')
          .select('id, title, property_code, status, captor_agent_id, updated_at, rental_price, sale_price, currency')
          .in('status', ['rented', 'sold'])
          .in('id', ids)
          .limit(500);
      }

      const { data, error } = await propsQuery;
      if (error) throw error;
      return (data || [])
        .map((p: any) => ({ ...p, _status_changed_at: statusChangedAt.get(p.id) || p.updated_at }))
        .sort((a: any, b: any) =>
          new Date(b._status_changed_at).getTime() - new Date(a._status_changed_at).getTime()
        );
    },
    enabled: open,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  // 2) IDs that already have a quick_commission (active)
  const { data: existingQuick } = useQuery({
    queryKey: ['pending-comm-existing-quick'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('quick_commissions')
        .select('property_id')
        .is('deleted_at', null)
        .not('property_id', 'is', null);
      if (error) throw error;
      return new Set<string>((data || []).map((r: any) => r.property_id));
    },
    enabled: open,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  // 3) IDs that already have a deal-based commission via deals.property_id
  const { data: existingDeal } = useQuery({
    queryKey: ['pending-comm-existing-deal'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('commissions')
        .select('deal:deal_id(property_id)');
      if (error) throw error;
      const set = new Set<string>();
      (data || []).forEach((r: any) => {
        const pid = r?.deal?.property_id;
        if (pid) set.add(pid);
      });
      return set;
    },
    enabled: open,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  // 4) Agent name resolution
  const { data: agents } = useQuery({
    queryKey: ['pending-comm-agents'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_agent_profiles');
      if (error) throw error;
      return (data || []) as { id: string; full_name: string }[];
    },
    enabled: open,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
  const agentName = (id: string | null) =>
    (agents || []).find(a => a.id === id)?.full_name || '—';

  // Pending = property without any commission
  const pending = useMemo(() => {
    if (!properties) return [];
    const quick = existingQuick || new Set<string>();
    const deal = existingDeal || new Set<string>();
    const list = properties.filter((p: any) => !quick.has(p.id) && !deal.has(p.id));
    if (!search.trim()) return list;
    const q = search.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return list.filter((p: any) => {
      const hay = [p.title, p.property_code, agentName(p.captor_agent_id)]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      return hay.includes(q);
    });
  }, [properties, existingQuick, existingDeal, search, agents]);

  const isLoading = loadingProps || !existingQuick || !existingDeal;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-3 border-b border-border">
            <DialogTitle className="font-display text-xl flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning" />
              Comisiones pendientes de registrar
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Propiedades marcadas como Alquiladas o Vendidas que aún no tienen su comisión 85/15
              cargada en el sistema. Hacé click en "Registrar" para completar los datos.
            </p>
          </DialogHeader>

          <div className="px-6 py-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por propiedad, código o agente..."
                className="pl-9"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : pending.length === 0 ? (
              <div className="text-center py-10">
                <CheckCircle2 className="w-10 h-10 text-success/40 mx-auto mb-2" />
                <p className="text-sm font-medium text-foreground">¡Todo al día!</p>
                <p className="text-xs text-muted-foreground mt-1">
                  No hay propiedades alquiladas o vendidas sin comisión registrada.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline" className="text-xs border-warning/40 text-warning">
                    {pending.length} pendiente{pending.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
                {pending.map((p: any) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            p.status === 'sold'
                              ? 'border-success/40 text-success'
                              : 'border-primary/40 text-primary'
                          }`}
                        >
                          {statusLabel(p.status)}
                        </Badge>
                        {p.property_code && (
                          <span className="text-[10px] font-mono text-muted-foreground">
                            {p.property_code}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-foreground truncate" title={p.title}>
                        {p.title || 'Sin título'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Agente: <span className="text-foreground">{agentName(p.captor_agent_id)}</span>
                        <span className="mx-1.5">·</span>
                        {p.status === 'sold' ? 'Vendida' : 'Alquilada'}: {fmtDate(p._status_changed_at)}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        const type: 'rental' | 'sale' = p.status === 'sold' ? 'sale' : 'rental';
                        const amount = type === 'sale' ? Number(p.sale_price) || 0 : Number(p.rental_price) || 0;
                        const date = p._status_changed_at ? String(p._status_changed_at).slice(0, 10) : undefined;
                        setSelectedDefaults({
                          agentId: p.captor_agent_id || undefined,
                          type,
                          currency: p.currency || 'PYG',
                          date,
                          amount: amount > 0 ? amount : undefined,
                        });
                        setSelectedPropertyId(p.id);
                      }}
                      className="shrink-0"
                    >
                      Registrar
                      <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Reuse the standard QuickCommissionDialog with the property pre-selected */}
      <QuickCommissionDialog
        open={!!selectedPropertyId}
        onOpenChange={o => {
          if (!o) {
            setSelectedPropertyId(null);
            setSelectedDefaults({});
          }
        }}
        defaultPropertyId={selectedPropertyId || undefined}
        defaultAgentId={selectedDefaults.agentId}
        defaultOperationType={selectedDefaults.type}
        defaultCurrency={selectedDefaults.currency}
        defaultOperationDate={selectedDefaults.date}
        defaultGrossAmount={selectedDefaults.amount}
      />
    </>
  );
};