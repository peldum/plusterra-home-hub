import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, MessageSquare, Save, Search, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { BuildingUnit } from '@/hooks/useBuildingDetail';
import { toast } from 'sonner';

const formatCurrency = (amount: number | null, currency: string | null = 'PYG') => {
  if (!amount) return '—';
  if (currency === 'USD') return `US$ ${amount.toLocaleString('es-PY', { minimumFractionDigits: 2 })}`;
  return `₲ ${amount.toLocaleString('es-PY')}`;
};

const formatDate = (date: string | null) => date ? new Date(`${date}T00:00:00`).toLocaleDateString('es-PY') : '—';

const statusLabel: Record<string, string> = {
  active: 'Activo',
  near_expiration: 'Por vencer',
  expired: 'Vencido',
  terminated: 'Finalizado',
  cancelled: 'Cancelado',
  renewed: 'Renovado',
  draft: 'Borrador',
};

interface TenantHistoryTabProps {
  buildingId: string;
  units: BuildingUnit[];
  unitsLoading: boolean;
}

export const TenantHistoryTab = ({ buildingId, units, unitsLoading }: TenantHistoryTabProps) => {
  const queryClient = useQueryClient();
  const [searchText, setSearchText] = useState('');
  const [draftNotes, setDraftNotes] = useState<Record<string, string>>({});

  const unitsByPropertyId = useMemo(() => {
    const map = new Map<string, BuildingUnit>();
    units.forEach(unit => {
      if (unit.property?.id) map.set(unit.property.id, unit);
    });
    return map;
  }, [units]);

  const propertyIds = useMemo(() => Array.from(unitsByPropertyId.keys()), [unitsByPropertyId]);

  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ['tenant-history', buildingId, propertyIds.join(',')],
    queryFn: async () => {
      if (propertyIds.length === 0) return [];
      const { data, error } = await supabase
        .from('contracts')
        .select('id, property_id, tenant_name, tenant_document, tenant_phone, monthly_rent, currency, start_date, end_date, status, notes, created_at')
        .in('property_id', propertyIds)
        .order('start_date', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!buildingId && propertyIds.length > 0,
  });

  const updateNotes = useMutation({
    mutationFn: async ({ contractId, notes }: { contractId: string; notes: string }) => {
      const { error } = await supabase
        .from('contracts')
        .update({ notes: notes.trim() || null } as any)
        .eq('id', contractId);
      if (error) throw error;
    },
    onSuccess: async (_, variables) => {
      toast.success('Comentario guardado');
      setDraftNotes(prev => {
        const next = { ...prev };
        delete next[variables.contractId];
        return next;
      });
      await queryClient.invalidateQueries({ queryKey: ['tenant-history', buildingId] });
      await queryClient.invalidateQueries({ queryKey: ['building-units', buildingId] });
    },
    onError: (error: any) => toast.error('Error al guardar comentario: ' + error.message),
  });

  const filteredContracts = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return contracts.filter(contract => {
      const unit = unitsByPropertyId.get(contract.property_id);
      if (!q) return true;
      return [
        contract.tenant_name,
        contract.tenant_document,
        contract.tenant_phone,
        contract.notes,
        unit?.unit_code,
        unit?.property?.property_code,
        unit?.owners.map(owner => owner.full_name).join(' '),
      ].some(value => (value || '').toLowerCase().includes(q));
    });
  }, [contracts, searchText, unitsByPropertyId]);

  if (unitsLoading || isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" /> Historial de inquilinos
          </h2>
          <p className="text-xs text-muted-foreground">Contratos activos y anteriores del edificio, con comentarios por inquilino.</p>
        </div>
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            placeholder="Buscar nombre, cédula, teléfono o unidad..."
            className="pl-9"
          />
        </div>
      </div>

      {filteredContracts.length === 0 ? (
        <div className="text-center py-12 border border-border rounded-xl bg-card">
          <Users className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground">
            {searchText ? 'No se encontraron inquilinos con ese filtro' : 'Todavía no hay historial de inquilinos'}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="font-semibold">Unidad</TableHead>
                <TableHead className="font-semibold">Inquilino</TableHead>
                <TableHead className="font-semibold">CI / Teléfono</TableHead>
                <TableHead className="font-semibold">Período</TableHead>
                <TableHead className="font-semibold text-right">Alquiler</TableHead>
                <TableHead className="font-semibold">Comentario</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContracts.map(contract => {
                const unit = unitsByPropertyId.get(contract.property_id);
                const currentNote = draftNotes[contract.id] ?? contract.notes ?? '';
                const hasChanged = currentNote !== (contract.notes ?? '');
                return (
                  <TableRow key={contract.id} className="hover:bg-muted/30 align-top">
                    <TableCell>
                      <div className="font-mono font-semibold text-primary text-sm">{unit?.unit_code || '—'}</div>
                      <div className="text-[11px] text-muted-foreground">{unit?.property?.property_code || ''}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium text-foreground">{contract.tenant_name || 'Sin nombre'}</div>
                      <Badge variant="secondary" className="mt-1 text-[10px]">{statusLabel[contract.status || ''] || contract.status || '—'}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <div>{contract.tenant_document || 'Sin cédula'}</div>
                      <div>{contract.tenant_phone || 'Sin teléfono'}</div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <div>{formatDate(contract.start_date)}</div>
                      <div>hasta {formatDate(contract.end_date)}</div>
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium">
                      {formatCurrency(contract.monthly_rent, contract.currency)}
                    </TableCell>
                    <TableCell className="min-w-[260px]">
                      <div className="flex items-start gap-2">
                        <MessageSquare className="w-4 h-4 text-muted-foreground mt-2 flex-shrink-0" />
                        <div className="flex-1 space-y-2">
                          <Textarea
                            value={currentNote}
                            onChange={e => setDraftNotes(prev => ({ ...prev, [contract.id]: e.target.value }))}
                            placeholder="Agregar comentario sobre este inquilino..."
                            rows={2}
                            className="min-h-[64px] text-xs"
                          />
                          {hasChanged && (
                            <Button
                              size="sm"
                              className="h-7 text-xs gap-1.5"
                              onClick={() => updateNotes.mutate({ contractId: contract.id, notes: currentNote })}
                              disabled={updateNotes.isPending}
                            >
                              {updateNotes.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                              Guardar comentario
                            </Button>
                          )}
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};