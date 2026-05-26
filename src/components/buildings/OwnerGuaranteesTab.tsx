import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShieldCheck, Loader2, Calendar, Plus, Trash2 } from 'lucide-react';
import { useOwnerGuarantees, type OwnerGuaranteeRow } from '@/hooks/useOwnerGuarantees';
import { OwnerGuaranteeDialog } from './OwnerGuaranteeDialog';
import { ManualGuaranteeCreateDialog } from './ManualGuaranteeCreateDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const fmt = (n: number) => 'Gs. ' + Math.round(n || 0).toLocaleString('es-PY');

export const OwnerGuaranteesTab = () => {
  const [statusFilter, setStatusFilter] = useState<'pending' | 'registered' | 'no_aplica' | 'all'>('pending');
  const { data, isLoading } = useOwnerGuarantees(statusFilter);
  const [selected, setSelected] = useState<OwnerGuaranteeRow | null>(null);
  const [open, setOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [toDelete, setToDelete] = useState<OwnerGuaranteeRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const qc = useQueryClient();

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    const { error } = await (supabase as any)
      .from('owner_guarantee_records')
      .delete()
      .eq('id', toDelete.id);
    setDeleting(false);
    if (error) { toast.error('Error al eliminar: ' + error.message); return; }
    toast.success('Garantía eliminada');
    qc.invalidateQueries({ queryKey: ['owner-guarantees'] });
    qc.invalidateQueries({ queryKey: ['owner-guarantees-pending-count'] });
    setToDelete(null);
  };

  const rows = data || [];
  const totals = useMemo(() => {
    const reg = rows.filter(r => r.status === 'registered');
    return {
      countPending: rows.filter(r => r.status === 'pending').length,
      countRegistered: reg.length,
      sumPropietario: reg.reduce((s, r) => s + Number(r.monto_propietario || 0), 0),
    };
  }, [rows]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            Garantías de Propietario
          </h2>
          <p className="text-sm text-muted-foreground">
            Solo se generan automáticamente al alquilar unidades de edificios administrados.
            La parte del propietario se suma a su informe mensual.
          </p>
        </div>
        <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
          <TabsList>
            <TabsTrigger value="pending">Pendientes</TabsTrigger>
            <TabsTrigger value="registered">Registradas</TabsTrigger>
            <TabsTrigger value="no_aplica">Sin aplicar</TabsTrigger>
            <TabsTrigger value="all">Todas</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex justify-end">
        <Button size="sm" onClick={() => setManualOpen(true)}>
          <Plus className="w-4 h-4 mr-1" /> Generar garantía manual
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Pendientes</p>
          <p className="text-2xl font-bold text-amber-600">{totals.countPending}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Registradas (filtro actual)</p>
          <p className="text-2xl font-bold text-emerald-600">{totals.countRegistered}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Total para propietarios</p>
          <p className="text-2xl font-bold text-primary">{fmt(totals.sumPropietario)}</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center"><Loader2 className="w-5 h-5 animate-spin inline" /></div>
          ) : rows.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No hay garantías {statusFilter === 'pending' ? 'pendientes' : statusFilter === 'registered' ? 'registradas' : ''}.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Edificio</TableHead>
                  <TableHead>Unidad</TableHead>
                  <TableHead>Propietario</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead className="text-right">Garantía total</TableHead>
                  <TableHead className="text-right">% prop.</TableHead>
                  <TableHead className="text-right">Para propietario</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.building_name}</TableCell>
                    <TableCell>{r.unit_code}</TableCell>
                    <TableCell>{r.owner_name}</TableCell>
                    <TableCell><Calendar className="w-3 h-3 inline mr-1" />{r.period}</TableCell>
                    <TableCell className="text-right">{r.status === 'pending' ? '—' : fmt(r.monto_garantia_total)}</TableCell>
                    <TableCell className="text-right">{r.status === 'pending' ? '—' : `${r.porcentaje_propietario}%`}</TableCell>
                    <TableCell className="text-right font-semibold text-primary">
                      {r.status === 'registered' ? fmt(r.monto_propietario) : '—'}
                    </TableCell>
                    <TableCell>
                      {r.status === 'pending' && <Badge variant="outline" className="border-amber-500 text-amber-700">Pendiente</Badge>}
                      {r.status === 'registered' && <Badge className="bg-emerald-600">Registrada</Badge>}
                      {r.status === 'no_aplica' && <Badge variant="secondary">Sin aplicar</Badge>}
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant={r.status === 'pending' ? 'default' : 'outline'}
                        onClick={() => { setSelected(r); setOpen(true); }}>
                        {r.status === 'pending' ? 'Registrar' : 'Editar'}
                      </Button>
                      <Button size="sm" variant="ghost" className="ml-1 text-destructive hover:text-destructive"
                        onClick={() => setToDelete(r)}
                        title="Eliminar garantía">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <OwnerGuaranteeDialog open={open} onOpenChange={setOpen} record={selected} />
      <ManualGuaranteeCreateDialog open={manualOpen} onOpenChange={setManualOpen} />

      <AlertDialog open={!!toDelete} onOpenChange={(v) => !v && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta garantía?</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete && (
                <>
                  Se eliminará permanentemente la garantía de <b>{toDelete.building_name}</b> — Unidad {toDelete.unit_code} ({toDelete.property_code}), período <b>{toDelete.period}</b>.
                  <br /><br />
                  Usalo cuando la garantía fue generada por error (ej: propiedad cargada nueva pero ya estaba alquilada, duplicados, no corresponde cobrar). Esta acción no se puede deshacer.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive hover:bg-destructive/90">
              {deleting ? 'Eliminando...' : 'Eliminar definitivamente'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};