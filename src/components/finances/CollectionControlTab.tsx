import { useState, useMemo } from 'react';
import {
  useReceivables,
  useGenerateReceivables,
  useMarkReceivablePaid,
  useRevertReceivablePaid,
  type Receivable,
} from '@/hooks/useReceivables';
import {
  Search, MessageCircle, CheckCircle2, Loader2,
  AlertTriangle, Clock, CircleDot, CalendarPlus, Undo2,
  Eye, FileText, Download,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { ReceivableDetailDialog } from './ReceivableDetailDialog';
import { GenerateReceivablesDialog } from './GenerateReceivablesDialog';
import { exportReceivablesPDF, exportReceivablesCSV } from '@/lib/receivablesExport';
import { useAuth } from '@/contexts/AuthContext';

const fmtGs = (n: number) =>
  'Gs. ' + new Intl.NumberFormat('es-PY', { minimumFractionDigits: 0 }).format(n);

const conceptLabels: Record<string, string> = {
  alquiler: 'Alquiler', canon: 'Canon', multa: 'Multa',
  servicio: 'Servicio', expensa: 'Expensa', deposito: 'Depósito de garantía',
  garantia: 'Garantía', llave_ingreso: 'Llave de ingreso', otro: 'Otro',
};

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  paid: { label: 'Pagado', color: 'bg-success/10 text-success', icon: CheckCircle2 },
  pending: { label: 'Al día', color: 'bg-success/10 text-success', icon: CircleDot },
  near_due: { label: 'Por vencer', color: 'bg-warning/10 text-warning', icon: Clock },
  overdue: { label: 'Vencido', color: 'bg-destructive/10 text-destructive', icon: AlertTriangle },
};

const NEAR_DUE_DAYS = 7;

function getDisplayStatus(r: Receivable): string {
  if (r.status === 'paid') return 'paid';
  if (r.status === 'overdue') return 'overdue';
  const dueDate = new Date(r.due_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'overdue';
  if (diffDays <= NEAR_DUE_DAYS) return 'near_due';
  return 'pending';
}

function getDiasMora(r: Receivable): number {
  if (r.status === 'paid') return 0;
  const dueDate = new Date(r.due_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
}

function buildWhatsAppMessage(r: Receivable): string {
  const name = r.debtor_name || 'Cliente';
  const concept = conceptLabels[r.concept] || r.concept;
  const amount = fmtGs(r.amount);
  const date = new Date(r.due_date).toLocaleDateString('es-PY');
  return encodeURIComponent(
    `Hola ${name}, te escribimos de Plusterra.\n` +
    `Tenés pendiente el pago de ${concept} por ${amount}, con vencimiento ${date}.\n` +
    `Quedamos atentos.`
  );
}

export const CollectionControlTab = () => {
  const { data: receivables, isLoading } = useReceivables();
  const generateMut = useGenerateReceivables();
  const markPaidMut = useMarkReceivablePaid();
  const revertPaidMut = useRevertReceivablePaid();
  const { role } = useAuth();

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterConcept, setFilterConcept] = useState<string>('all');
  const [selectedReceivable, setSelectedReceivable] = useState<Receivable | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [generateResult, setGenerateResult] = useState<{ count: number; period: string } | null>(null);

  const enriched = useMemo(() => {
    return (receivables || []).map(r => ({
      ...r,
      displayStatus: getDisplayStatus(r),
      diasMora: getDiasMora(r),
    }));
  }, [receivables]);

  const filtered = useMemo(() => {
    return enriched.filter(r => {
      if (search) {
        const s = search.toLowerCase();
        const matchesName = r.debtor_name?.toLowerCase().includes(s);
        const matchesProp = r.property_title?.toLowerCase().includes(s);
        const matchesUnit = r.unit_code?.toLowerCase().includes(s);
        if (!matchesName && !matchesProp && !matchesUnit) return false;
      }
      if (filterStatus !== 'all' && r.displayStatus !== filterStatus) return false;
      if (filterConcept !== 'all' && r.concept !== filterConcept) return false;
      return true;
    });
  }, [enriched, search, filterStatus, filterConcept]);

  const stats = useMemo(() => {
    const all = enriched.filter(r => r.status !== 'paid');
    return {
      nearDue: all.filter(r => r.displayStatus === 'near_due').length,
      overdue: all.filter(r => r.displayStatus === 'overdue').length,
      totalPending: all.reduce((s, r) => s + Number(r.amount), 0),
    };
  }, [enriched]);

  const openDetail = (r: Receivable) => {
    setSelectedReceivable(r);
    setDialogOpen(true);
  };

  const handleConfirmPayment = (data: {
    id: string;
    paidAmount: number;
    mora_automatica: number;
    mora_negociada: number;
    descuento: number;
    total_cobrado: number;
    payment_method: string;
    reference_number?: string;
  }) => {
    markPaidMut.mutate(data, {
      onSuccess: () => setDialogOpen(false),
    });
  };

  return (
    <div className="space-y-6">
      {/* Stats banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="flex items-center gap-3 bg-warning/5 border border-warning/20 rounded-xl p-4">
          <Clock className="w-8 h-8 text-warning" />
          <div>
            <p className="text-2xl font-bold text-foreground">{stats.nearDue}</p>
            <p className="text-xs text-muted-foreground">Por vencer (≤7 días)</p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-destructive/5 border border-destructive/20 rounded-xl p-4">
          <AlertTriangle className="w-8 h-8 text-destructive" />
          <div>
            <p className="text-2xl font-bold text-foreground">{stats.overdue}</p>
            <p className="text-xs text-muted-foreground">Vencidos</p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-xl p-4">
          <CircleDot className="w-8 h-8 text-primary" />
          <div>
            <p className="text-2xl font-bold text-foreground">{fmtGs(stats.totalPending)}</p>
            <p className="text-xs text-muted-foreground">Total pendiente</p>
          </div>
        </div>
      </div>

      {/* Filters & actions */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar cliente, propiedad..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className={`px-3 py-2 rounded-lg border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring transition-colors ${
            filterStatus !== 'all'
              ? 'border-orange-400 bg-orange-50 text-orange-700 ring-1 ring-orange-300 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-600'
              : 'border-input bg-background'
          }`}
        >
          <option value="all">Todos los estados</option>
          <option value="pending">🟢 Al día</option>
          <option value="near_due">🟡 Por vencer</option>
          <option value="overdue">🔴 Vencido</option>
          <option value="paid">✅ Pagado</option>
        </select>
        <select
          value={filterConcept}
          onChange={e => setFilterConcept(e.target.value)}
          className={`px-3 py-2 rounded-lg border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring transition-colors ${
            filterConcept !== 'all'
              ? 'border-orange-400 bg-orange-50 text-orange-700 ring-1 ring-orange-300 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-600'
              : 'border-input bg-background'
          }`}
        >
          <option value="all">Todos los conceptos</option>
          <option value="alquiler">Alquiler</option>
          <option value="canon">Canon</option>
          <option value="multa">Multa</option>
          <option value="servicio">Servicio</option>
          <option value="expensa">Expensa</option>
          <option value="deposito">Depósito de garantía</option>
          <option value="otro">Otro</option>
        </select>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setGenerateResult(null);
            setGenerateDialogOpen(true);
          }}
        >
          <CalendarPlus className="w-4 h-4 mr-1.5" />
          Generar cobros del mes
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => exportReceivablesPDF(filtered)}
          disabled={!filtered.length}
        >
          <FileText className="w-4 h-4 mr-1.5" />
          PDF
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => exportReceivablesCSV(filtered)}
          disabled={!filtered.length}
        >
          <Download className="w-4 h-4 mr-1.5" />
          CSV
        </Button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : !filtered.length ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          Sin cobros registrados. Presioná "Generar cobros" para crear automáticamente desde contratos activos.
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="font-semibold">Cliente / Agente</TableHead>
                  <TableHead className="font-semibold">Rol</TableHead>
                  <TableHead className="font-semibold">Propiedad</TableHead>
                  <TableHead className="font-semibold">Concepto</TableHead>
                  <TableHead className="font-semibold">Vencimiento</TableHead>
                  <TableHead className="font-semibold text-right">Monto</TableHead>
                  <TableHead className="font-semibold text-center">Días de mora</TableHead>
                  <TableHead className="font-semibold text-center">Estado</TableHead>
                  <TableHead className="font-semibold text-center">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(r => {
                  const st = statusConfig[r.displayStatus] || statusConfig.pending;
                  const Icon = st.icon;
                  const phone = r.client_phone || '';
                  const cleanPhone = phone.replace(/\D/g, '');

                  return (
                    <TableRow key={r.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-medium text-sm">
                        {r.debtor_name || '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs capitalize">
                          {r.debtor_role === 'tenant' ? 'Inquilino' : 'Agente'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        <div>{r.property_title || '—'}</div>
                        {r.unit_code && (
                          <span className="text-xs text-muted-foreground">Unidad: {r.unit_code}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                          {conceptLabels[r.concept] || r.concept}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(r.due_date).toLocaleDateString('es-PY')}
                      </TableCell>
                      <TableCell className="text-right text-sm font-semibold">
                        {fmtGs(r.amount)}
                      </TableCell>
                      <TableCell className="text-center">
                        {r.diasMora > 0 ? (
                          <span className="text-sm font-semibold text-destructive">{r.diasMora}</span>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${st.color}`}>
                          <Icon className="w-3 h-3" />
                          {st.label}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          {r.status !== 'paid' && cleanPhone && (
                            <a
                              href={`https://wa.me/${cleanPhone}?text=${buildWhatsAppMessage(r)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg bg-success/10 text-success hover:bg-success/20 transition-colors"
                              title="Enviar WhatsApp"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </a>
                          )}
                          {r.status !== 'paid' ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-primary hover:text-primary hover:bg-primary/10"
                              title="Ver detalle"
                              onClick={() => openDetail(r)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted"
                              title="Ver comprobante"
                              onClick={() => openDetail(r)}
                            >
                              <FileText className="w-4 h-4" />
                            </Button>
                          )}
                          {r.status === 'paid' && (role === 'superadmin' || role === 'admin' || role === 'accounting') && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-warning hover:text-warning hover:bg-warning/10"
                              title="Revertir pago"
                              disabled={revertPaidMut.isPending}
                              onClick={() => revertPaidMut.mutate(r.id)}
                            >
                              <Undo2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Detail / Payment dialog */}
      <ReceivableDetailDialog
        receivable={selectedReceivable}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onConfirmPayment={handleConfirmPayment}
        isPending={markPaidMut.isPending}
        readOnly={selectedReceivable?.status === 'paid'}
      />

      {/* Generate receivables dialog */}
      <GenerateReceivablesDialog
        open={generateDialogOpen}
        onOpenChange={setGenerateDialogOpen}
        isPending={generateMut.isPending}
        result={generateResult}
        onConfirm={(period) => {
          generateMut.mutate(period, {
            onSuccess: (count) => {
              setGenerateResult({ count, period });
            },
          });
        }}
      />
    </div>
  );
};
