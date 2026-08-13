import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMarkReceivablePaid } from '@/hooks/useReceivables';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { MoneyInput } from '@/components/ui/money-input';
import { Card, CardContent } from '@/components/ui/card';
import { DualScrollArea } from '@/components/ui/dual-scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, CheckCircle2, Loader2, Plus, Search } from 'lucide-react';
import { toast } from 'sonner';

interface OtraDeuda {
  id: string;
  debtor_name: string | null;
  debtor_role: string;
  concept: string;
  description: string | null;
  amount: number;
  currency: string;
  due_date: string;
  status: string;
  notes: string | null;
}

const fmtMoney = (n: number, currency: string) =>
  currency === 'USD'
    ? `USD ${Math.round(n).toLocaleString('en-US')}`
    : `₲ ${Math.round(n).toLocaleString('es-PY')}`;

const CONCEPTS = ['Pagaré', 'Alquiler atrasado', 'Expensas', 'Energía', 'Daños / reparaciones', 'Multa', 'Otro'];

const daysLate = (due: string) => {
  const diff = Math.floor((Date.now() - new Date(`${due}T00:00:00`).getTime()) / 86400000);
  return diff > 0 ? diff : 0;
};

/** Deudas sueltas de inquilinos / terceros, sin unidad ni edificio asociado. */
export const OtrasDeudasTab = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const markPaid = useMarkReceivablePaid();

  const [search, setSearch] = useState('');
  const [openNew, setOpenNew] = useState(false);
  const [target, setTarget] = useState<OtraDeuda | null>(null);

  const [form, setForm] = useState({
    debtor_name: '',
    concept: 'Pagaré',
    amount: '' as number | '',
    currency: 'PYG',
    due_date: '',
    notes: '',
  });

  const { data: rows, isLoading, isError, refetch } = useQuery({
    queryKey: ['otras-deudas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('receivables')
        .select('id, debtor_name, debtor_role, concept, description, amount, currency, due_date, status, notes')
        .is('building_id', null)
        .is('unit_code', null)
        .is('agent_id', null)
        .in('status', ['pending', 'overdue'])
        .order('due_date', { ascending: true })
        .returns<OtraDeuda[]>();
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const createDeuda = useMutation({
    mutationFn: async () => {
      if (!form.debtor_name.trim()) throw new Error('Indicá el nombre del deudor');
      if (!form.amount || Number(form.amount) <= 0) throw new Error('Indicá un monto válido');
      if (!form.due_date) throw new Error('Indicá la fecha de vencimiento');
      const { error } = await supabase.from('receivables').insert({
        debtor_name: form.debtor_name.trim(),
        debtor_role: 'tenant',
        concept: form.concept,
        description: form.concept,
        amount: Number(form.amount),
        currency: form.currency,
        due_date: form.due_date,
        status: 'pending',
        source_type: 'manual',
        notes: form.notes.trim() || null,
        created_by: user?.id as string,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Deuda registrada');
      qc.invalidateQueries({ queryKey: ['otras-deudas'] });
      qc.invalidateQueries({ queryKey: ['receivables'] });
      setOpenNew(false);
      setForm({ debtor_name: '', concept: 'Pagaré', amount: '', currency: 'PYG', due_date: '', notes: '' });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows || [];
    return (rows || []).filter(r =>
      [r.debtor_name, r.concept, r.notes].filter(Boolean).some(v => String(v).toLowerCase().includes(q)),
    );
  }, [rows, search]);

  const stats = useMemo(() => {
    const all = rows || [];
    const overdue = all.filter(r => daysLate(r.due_date) > 0);
    return {
      total: all.length,
      overdue: overdue.length,
      amount: overdue.filter(r => r.currency !== 'USD').reduce((s, r) => s + Number(r.amount), 0),
    };
  }, [rows]);

  const handleCobrado = async () => {
    if (!target) return;
    try {
      await markPaid.mutateAsync({ id: target.id, paidAmount: Number(target.amount) });
      qc.invalidateQueries({ queryKey: ['otras-deudas'] });
      toast.success(`Deuda de ${target.debtor_name} marcada como cobrada`);
      setTarget(null);
    } catch {
      toast.error('No se pudo registrar el cobro');
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <p className="text-xs text-muted-foreground max-w-xl">
          Deudas de inquilinos o terceros que no están atadas a una unidad administrada (pagarés, alquileres
          atrasados, daños, acuerdos de pago). No afectan la liquidación de ningún edificio.
        </p>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar deudor o concepto..."
              className="h-8 pl-8 text-xs w-[240px]"
            />
          </div>
          <Button size="sm" className="h-8 text-xs gap-1" onClick={() => setOpenNew(true)}>
            <Plus className="w-3.5 h-3.5" /> Nueva deuda
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-destructive" /> Vencidas
            </p>
            <p className="text-2xl font-bold text-destructive">{stats.overdue}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total abiertas</p>
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Monto vencido (Gs.)</p>
            <p className="text-2xl font-bold text-foreground">₲ {stats.amount.toLocaleString('es-PY')}</p>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : isError ? (
        <div className="text-center py-12">
          <p className="text-sm text-muted-foreground mb-3">No se pudo cargar la lista de deudas.</p>
          <Button size="sm" onClick={() => refetch()}>Reintentar</Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 mb-3" />
          <p className="text-sm font-medium">No hay otras deudas registradas</p>
        </div>
      ) : (
        <DualScrollArea>
          <div className="min-w-[900px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Deudor</TableHead>
                  <TableHead className="text-xs">Concepto</TableHead>
                  <TableHead className="text-xs">Vence</TableHead>
                  <TableHead className="text-xs">Mora</TableHead>
                  <TableHead className="text-xs">Observación</TableHead>
                  <TableHead className="text-xs text-right">Monto</TableHead>
                  <TableHead className="text-xs text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(r => {
                  const late = daysLate(r.due_date);
                  return (
                    <TableRow key={r.id} className={late > 0 ? 'bg-destructive/5 hover:bg-destructive/10' : ''}>
                      <TableCell className="text-xs font-medium">{r.debtor_name || '—'}</TableCell>
                      <TableCell className="text-xs">{r.concept}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(`${r.due_date}T00:00:00`).toLocaleDateString('es-PY')}
                      </TableCell>
                      <TableCell>
                        {late > 0 ? (
                          <Badge variant="outline" className="bg-destructive/15 text-destructive border-destructive/30 text-[10px] gap-1">
                            <AlertTriangle className="w-3 h-3" /> {late} días
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-amber-500/15 text-amber-700 border-amber-300 text-[10px]">
                            Pendiente
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[240px] truncate" title={r.notes || ''}>
                        {r.notes || '—'}
                      </TableCell>
                      <TableCell className="text-xs text-right font-medium">{fmtMoney(Number(r.amount), r.currency)}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" className="h-7 text-xs gap-1" onClick={() => setTarget(r)}>
                          <CheckCircle2 className="w-3.5 h-3.5" /> Cobrado
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </DualScrollArea>
      )}

      {/* Nueva deuda */}
      <Dialog open={openNew} onOpenChange={setOpenNew}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Nueva deuda</DialogTitle>
            <DialogDescription>
              Para inquilinos o terceros que quedaron con deuda sin unidad administrada asociada.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-medium">Deudor *</label>
              <Input
                value={form.debtor_name}
                onChange={e => setForm(f => ({ ...f, debtor_name: e.target.value }))}
                placeholder="Nombre y apellido"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium">Concepto</label>
                <Select value={form.concept} onValueChange={v => setForm(f => ({ ...f, concept: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONCEPTS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Moneda</label>
                <Select value={form.currency} onValueChange={v => setForm(f => ({ ...f, currency: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PYG">Guaraníes</SelectItem>
                    <SelectItem value="USD">Dólares</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium">Monto *</label>
                <MoneyInput
                  value={form.amount}
                  onChange={v => setForm(f => ({ ...f, amount: v }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Vence *</label>
                <Input
                  type="date"
                  value={form.due_date}
                  onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Observación</label>
              <Textarea
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Ej: pagaré firmado, C.I., teléfono, acuerdo de pago..."
                className="min-h-[70px] text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenNew(false)}>Cancelar</Button>
            <Button onClick={() => createDeuda.mutate()} disabled={createDeuda.isPending}>
              {createDeuda.isPending ? 'Guardando...' : 'Registrar deuda'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmar cobro */}
      <AlertDialog open={!!target} onOpenChange={open => !open && setTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar cobro</AlertDialogTitle>
            <AlertDialogDescription>
              {target && (
                <>
                  Se registrará como cobrada la deuda de <strong>{target.debtor_name}</strong> por{' '}
                  <strong>{fmtMoney(Number(target.amount), target.currency)}</strong> ({target.concept}) y pasará a
                  Finanzas como ingreso.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleCobrado} disabled={markPaid.isPending}>
              {markPaid.isPending ? 'Guardando...' : 'Confirmar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};