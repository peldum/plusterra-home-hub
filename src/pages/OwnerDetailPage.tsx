import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { Owner } from '@/hooks/useOwners';
import { PropertyDetailDialog } from '@/components/properties/PropertyDetailDialog';
import { useOwnerStatement } from '@/hooks/useOwnerStatement';
import { exportOwnerStatementPDF } from '@/lib/ownerStatementExport';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  ArrowLeft, Mail, Phone, MapPin, Building2, Loader2,
  FileText, Wrench, ReceiptText, Home, DollarSign,
  ArrowUpCircle, ArrowDownCircle, Calendar as CalendarIcon, ClipboardList,
  ChevronLeft, ChevronRight, X, TrendingUp, TrendingDown, Download,
} from 'lucide-react';
import { format, isAfter, isBefore, startOfDay, endOfDay, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  available: { label: 'Disponible', variant: 'default' },
  rented: { label: 'Alquilado', variant: 'secondary' },
  sold: { label: 'Vendido', variant: 'outline' },
  reserved: { label: 'Reservado', variant: 'secondary' },
  draft: { label: 'Borrador', variant: 'outline' },
  archived: { label: 'Archivado', variant: 'destructive' },
};

const typeLabels: Record<string, string> = {
  apartment: 'Departamento', house: 'Casa', land: 'Terreno',
  office: 'Oficina', commercial: 'Comercial', other: 'Otro',
};

const maintenanceStatusLabels: Record<string, { label: string; color: string }> = {
  open: { label: 'Abierto', color: 'bg-warning/10 text-warning border-warning/20' },
  in_progress: { label: 'En Progreso', color: 'bg-primary/10 text-primary border-primary/20' },
  completed: { label: 'Completado', color: 'bg-success/10 text-success border-success/20' },
  cancelled: { label: 'Cancelado', color: 'bg-muted text-muted-foreground border-border' },
};

const formatCurrency = (amount: number, currency: string = 'PYG') => {
  if (currency === 'USD') return `US$ ${amount.toLocaleString('es-PY', { minimumFractionDigits: 2 })}`;
  return `₲ ${amount.toLocaleString('es-PY')}`;
};

const ITEMS_PER_PAGE = 10;

interface DateRangeFilterProps {
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
  onDateFromChange: (d: Date | undefined) => void;
  onDateToChange: (d: Date | undefined) => void;
  onClear: () => void;
}

const DateRangeFilter = ({ dateFrom, dateTo, onDateFromChange, onDateToChange, onClear }: DateRangeFilterProps) => {
  const hasFilter = dateFrom || dateTo;
  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className={cn("gap-1.5 text-xs h-8", dateFrom && "border-primary text-primary")}>
            <CalendarIcon className="w-3.5 h-3.5" />
            {dateFrom ? format(dateFrom, 'dd/MM/yyyy') : 'Desde'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={dateFrom}
            onSelect={onDateFromChange}
            initialFocus
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className={cn("gap-1.5 text-xs h-8", dateTo && "border-primary text-primary")}>
            <CalendarIcon className="w-3.5 h-3.5" />
            {dateTo ? format(dateTo, 'dd/MM/yyyy') : 'Hasta'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={dateTo}
            onSelect={onDateToChange}
            initialFocus
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>
      {hasFilter && (
        <Button variant="ghost" size="sm" className="h-8 text-xs gap-1 text-muted-foreground" onClick={onClear}>
          <X className="w-3 h-3" /> Limpiar
        </Button>
      )}
    </div>
  );
};

interface PaginationControlsProps {
  page: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (p: number) => void;
}

const PaginationControls = ({ page, totalPages, totalItems, onPageChange }: PaginationControlsProps) => {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
      <span className="text-xs text-muted-foreground">{totalItems} resultado{totalItems !== 1 ? 's' : ''}</span>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="text-xs text-muted-foreground px-2">{page} / {totalPages}</span>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

const OwnerDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [selectedProperty, setSelectedProperty] = useState<any>(null);

  // Statement month navigation
  const [statementMonthDate, setStatementMonthDate] = useState(new Date());

  // Date filters
  const [paymentDateFrom, setPaymentDateFrom] = useState<Date | undefined>();
  const [paymentDateTo, setPaymentDateTo] = useState<Date | undefined>();
  const [maintenanceDateFrom, setMaintenanceDateFrom] = useState<Date | undefined>();
  const [maintenanceDateTo, setMaintenanceDateTo] = useState<Date | undefined>();

  // Pagination
  const [paymentPage, setPaymentPage] = useState(1);
  const [maintenancePage, setMaintenancePage] = useState(1);

  // Fetch owner
  const { data: owner, isLoading: ownerLoading } = useQuery({
    queryKey: ['owner-detail', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('owners').select('*').eq('id', id!).single();
      if (error) throw error;
      return data as Owner;
    },
    enabled: !!id,
  });

  // Fetch properties
  const { data: properties, isLoading: propsLoading } = useQuery({
    queryKey: ['owner-properties', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('properties').select('*').eq('owner_id', id!).order('property_code');
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const propertyIds = properties?.map(p => p.id) ?? [];

  // Fetch payments
  const { data: payments, isLoading: paymentsLoading } = useQuery({
    queryKey: ['owner-payments', id, propertyIds],
    queryFn: async () => {
      if (propertyIds.length === 0) return [];
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .in('property_id', propertyIds)
        .order('payment_date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: propertyIds.length > 0,
  });

  // Fetch maintenance tickets
  const { data: tickets, isLoading: ticketsLoading } = useQuery({
    queryKey: ['owner-maintenance', id, propertyIds],
    queryFn: async () => {
      if (propertyIds.length === 0) return [];
      const { data, error } = await supabase
        .from('maintenance_tickets')
        .select('*, properties(property_code, title)')
        .in('property_id', propertyIds)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: propertyIds.length > 0,
  });

  // Fetch contracts
  const { data: contracts, isLoading: contractsLoading } = useQuery({
    queryKey: ['owner-contracts', id, propertyIds],
    queryFn: async () => {
      if (propertyIds.length === 0) return [];
      const { data, error } = await supabase
        .from('contracts')
        .select('*, properties(property_code, title)')
        .in('property_id', propertyIds)
        .order('start_date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: propertyIds.length > 0,
  });

  // Filtered & paginated payments
  const filteredPayments = useMemo(() => {
    if (!payments) return [];
    return payments.filter(p => {
      const d = new Date(p.payment_date + 'T12:00:00');
      if (paymentDateFrom && isBefore(d, startOfDay(paymentDateFrom))) return false;
      if (paymentDateTo && isAfter(d, endOfDay(paymentDateTo))) return false;
      return true;
    });
  }, [payments, paymentDateFrom, paymentDateTo]);

  const paymentTotalPages = Math.max(1, Math.ceil(filteredPayments.length / ITEMS_PER_PAGE));
  const paginatedPayments = filteredPayments.slice((paymentPage - 1) * ITEMS_PER_PAGE, paymentPage * ITEMS_PER_PAGE);

  // Filtered & paginated maintenance
  const filteredTickets = useMemo(() => {
    if (!tickets) return [];
    return tickets.filter(t => {
      const d = new Date(t.created_at);
      if (maintenanceDateFrom && isBefore(d, startOfDay(maintenanceDateFrom))) return false;
      if (maintenanceDateTo && isAfter(d, endOfDay(maintenanceDateTo))) return false;
      return true;
    });
  }, [tickets, maintenanceDateFrom, maintenanceDateTo]);

  const maintenanceTotalPages = Math.max(1, Math.ceil(filteredTickets.length / ITEMS_PER_PAGE));
  const paginatedTickets = filteredTickets.slice((maintenancePage - 1) * ITEMS_PER_PAGE, maintenancePage * ITEMS_PER_PAGE);

  // Reset page when filters change
  const clearPaymentFilters = () => { setPaymentDateFrom(undefined); setPaymentDateTo(undefined); setPaymentPage(1); };
  const clearMaintenanceFilters = () => { setMaintenanceDateFrom(undefined); setMaintenanceDateTo(undefined); setMaintenancePage(1); };

  // Statement
  const statementMonth = format(statementMonthDate, 'yyyy-MM');
  const { data: statementData, isLoading: statementLoading } = useOwnerStatement(id ?? null, statementMonth);
  const statementLines = statementData?.lines ?? [];
  const statementIncome = statementLines.filter(l => l.type === 'income').reduce((s, l) => s + l.amount, 0);
  const statementExpense = statementLines.filter(l => l.type === 'expense').reduce((s, l) => s + l.amount, 0);
  const statementBalance = statementIncome - statementExpense;
  const prevStatementMonth = () => setStatementMonthDate(prev => subMonths(prev, 1));
  const nextStatementMonth = () => setStatementMonthDate(prev => {
    const next = new Date(prev);
    next.setMonth(next.getMonth() + 1);
    return next > new Date() ? prev : next;
  });

  if (ownerLoading) {
    return (
      <MainLayout title="Propietario" showBack backTo="/propietarios">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!owner) {
    return (
      <MainLayout title="Propietario no encontrado" showBack backTo="/propietarios">
        <div className="text-center py-16">
          <p className="text-muted-foreground mb-4">El propietario solicitado no existe.</p>
          <button onClick={() => navigate('/propietarios')} className="text-primary hover:underline text-sm">
            Volver a Propietarios
          </button>
        </div>
      </MainLayout>
    );
  }

  const initials = owner.full_name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
  const propMap = Object.fromEntries((properties ?? []).map(p => [p.id, `${p.property_code} - ${p.title}`]));

  return (
    <MainLayout title="" showBack backTo="/propietarios">
      {/* Back + header */}
      <div className="mb-6">
        <button onClick={() => navigate('/propietarios')} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" />
          Volver a Propietarios
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <span className="text-xl font-bold text-primary">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-foreground">{owner.full_name}</h1>
            <div className="flex flex-wrap items-center gap-3 mt-1">
              {owner.document_number && (
                <span className="text-sm text-muted-foreground">{owner.document_type || 'CI'}: {owner.document_number}</span>
              )}
              {properties && (
                <Badge variant="secondary" className="text-xs">
                  <Building2 className="w-3 h-3 mr-1" />
                  {properties.length} propiedad{properties.length !== 1 ? 'es' : ''}
                </Badge>
              )}
            </div>
          </div>
{/* Removed: Estado de Cuenta button - now a tab */}
        </div>

        {/* Contact info */}
        <div className="flex flex-wrap gap-4 mt-4">
          {owner.email && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="w-4 h-4 text-primary/60" />
              <span>{owner.email}</span>
            </div>
          )}
          {owner.phone && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="w-4 h-4 text-primary/60" />
              <span>{owner.phone}</span>
            </div>
          )}
          {owner.address && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4 text-primary/60" />
              <span>{owner.address}</span>
            </div>
          )}
        </div>
        {owner.notes && (
          <p className="text-sm text-muted-foreground mt-2 bg-muted/50 rounded-lg px-3 py-2">{owner.notes}</p>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="properties" className="w-full">
        <TabsList className="w-full justify-start bg-muted/50 mb-4">
          <TabsTrigger value="properties" className="gap-1.5">
            <Building2 className="w-3.5 h-3.5" />
            Propiedades
            {properties && <Badge variant="secondary" className="ml-1 text-[10px] px-1.5">{properties.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="payments" className="gap-1.5">
            <DollarSign className="w-3.5 h-3.5" />
            Cobros
            {payments && <Badge variant="secondary" className="ml-1 text-[10px] px-1.5">{payments.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="maintenance" className="gap-1.5">
            <Wrench className="w-3.5 h-3.5" />
            Mantenimiento
            {tickets && <Badge variant="secondary" className="ml-1 text-[10px] px-1.5">{tickets.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="contracts" className="gap-1.5">
            <FileText className="w-3.5 h-3.5" />
            Contratos
            {contracts && <Badge variant="secondary" className="ml-1 text-[10px] px-1.5">{contracts.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="statement" className="gap-1.5">
            <ReceiptText className="w-3.5 h-3.5" />
            Estado de Cuenta
          </TabsTrigger>
        </TabsList>

        {/* Properties Tab */}
        <TabsContent value="properties">
          {propsLoading && <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>}
          {!propsLoading && (!properties || properties.length === 0) && (
            <div className="text-center py-12">
              <Home className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">Sin propiedades asignadas</p>
            </div>
          )}
          {!propsLoading && properties && properties.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {properties.map(prop => {
                const st = statusLabels[prop.status] || { label: prop.status, variant: 'outline' as const };
                return (
                  <div
                    key={prop.id}
                    className="bg-card border border-border rounded-xl p-4 hover:shadow-md hover:border-primary/30 transition-all cursor-pointer"
                    onClick={() => setSelectedProperty(prop)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono font-semibold text-primary">{prop.property_code}</span>
                      <Badge variant={st.variant} className="text-[10px]">{st.label}</Badge>
                    </div>
                    <h4 className="font-semibold text-foreground text-sm leading-tight mb-1">{prop.title}</h4>
                    {prop.address && (
                      <p className="text-xs text-muted-foreground truncate">{prop.address}{prop.city ? `, ${prop.city}` : ''}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        {typeLabels[prop.property_type] || prop.property_type}
                      </span>
                      {prop.rental_price && (
                        <span className="text-[10px] font-medium text-primary">
                          {formatCurrency(prop.rental_price, prop.currency || 'PYG')}/mes
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments">
          <DateRangeFilter
            dateFrom={paymentDateFrom}
            dateTo={paymentDateTo}
            onDateFromChange={(d) => { setPaymentDateFrom(d); setPaymentPage(1); }}
            onDateToChange={(d) => { setPaymentDateTo(d); setPaymentPage(1); }}
            onClear={clearPaymentFilters}
          />
          {paymentsLoading && <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>}
          {!paymentsLoading && filteredPayments.length === 0 && (
            <div className="text-center py-12">
              <DollarSign className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">
                {payments && payments.length > 0 ? 'Sin resultados para el rango seleccionado' : 'Sin cobros registrados'}
              </p>
            </div>
          )}
          {!paymentsLoading && paginatedPayments.length > 0 && (
            <>
              <div className="border border-border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Fecha</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Descripción</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Propiedad</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Categoría</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {paginatedPayments.map(p => (
                      <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                          {format(new Date(p.payment_date + 'T12:00:00'), 'dd/MM/yyyy')}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            {p.payment_type === 'income' ? (
                              <ArrowUpCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                            ) : (
                              <ArrowDownCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                            )}
                            <span className="truncate max-w-[200px]">{p.description}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground truncate max-w-[150px]">
                          {propMap[p.property_id!] || '—'}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{p.category}</td>
                        <td className={`px-4 py-3 text-right font-medium whitespace-nowrap ${
                          p.payment_type === 'income' ? 'text-emerald-600' : 'text-red-600'
                        }`}>
                          {p.payment_type === 'income' ? '+' : '-'}{formatCurrency(p.amount, p.currency || 'PYG')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <PaginationControls
                page={paymentPage}
                totalPages={paymentTotalPages}
                totalItems={filteredPayments.length}
                onPageChange={setPaymentPage}
              />
            </>
          )}
        </TabsContent>

        {/* Maintenance Tab */}
        <TabsContent value="maintenance">
          <DateRangeFilter
            dateFrom={maintenanceDateFrom}
            dateTo={maintenanceDateTo}
            onDateFromChange={(d) => { setMaintenanceDateFrom(d); setMaintenancePage(1); }}
            onDateToChange={(d) => { setMaintenanceDateTo(d); setMaintenancePage(1); }}
            onClear={clearMaintenanceFilters}
          />
          {ticketsLoading && <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>}
          {!ticketsLoading && filteredTickets.length === 0 && (
            <div className="text-center py-12">
              <Wrench className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">
                {tickets && tickets.length > 0 ? 'Sin resultados para el rango seleccionado' : 'Sin tickets de mantenimiento'}
              </p>
            </div>
          )}
          {!ticketsLoading && paginatedTickets.length > 0 && (
            <>
              <div className="space-y-3">
                {paginatedTickets.map(t => {
                  const mst = maintenanceStatusLabels[t.status || 'open'];
                  const propInfo = (t as any).properties;
                  return (
                    <div key={t.id} className="bg-card border border-border rounded-xl p-4 hover:shadow-sm transition-all">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={`text-[10px] px-1.5 py-0 border ${mst.color}`}>
                              {mst.label}
                            </Badge>
                            {t.priority === 'high' && (
                              <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Urgente</Badge>
                            )}
                          </div>
                          <p className="text-sm font-medium text-foreground leading-tight">{t.description}</p>
                          {propInfo && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {propInfo.property_code} - {propInfo.title}
                            </p>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(t.created_at), 'dd/MM/yyyy')}
                          </p>
                          {t.actual_cost != null && (
                            <p className="text-sm font-semibold text-foreground mt-0.5">
                              {formatCurrency(t.actual_cost, t.currency || 'PYG')}
                            </p>
                          )}
                          {t.actual_cost == null && t.estimated_cost != null && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Est. {formatCurrency(t.estimated_cost, t.currency || 'PYG')}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <PaginationControls
                page={maintenancePage}
                totalPages={maintenanceTotalPages}
                totalItems={filteredTickets.length}
                onPageChange={setMaintenancePage}
              />
            </>
          )}
        </TabsContent>

        {/* Contracts Tab */}
        <TabsContent value="contracts">
          {contractsLoading && <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>}
          {!contractsLoading && (!contracts || contracts.length === 0) && (
            <div className="text-center py-12">
              <FileText className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">Sin contratos asociados</p>
            </div>
          )}
          {!contractsLoading && contracts && contracts.length > 0 && (
            <div className="space-y-3">
              {contracts.map(c => {
                const contractStatus: Record<string, { label: string; color: string }> = {
                  draft: { label: 'Borrador', color: 'bg-muted text-muted-foreground' },
                  active: { label: 'Activo', color: 'bg-success/10 text-success' },
                  expired: { label: 'Vencido', color: 'bg-destructive/10 text-destructive' },
                  cancelled: { label: 'Cancelado', color: 'bg-muted text-muted-foreground' },
                  renewed: { label: 'Renovado', color: 'bg-primary/10 text-primary' },
                  near_expiration: { label: 'Por Vencer', color: 'bg-warning/10 text-warning' },
                  terminated: { label: 'Terminado', color: 'bg-destructive/10 text-destructive' },
                };
                const cst = contractStatus[c.status || 'draft'];
                const propInfo = (c as any).properties;
                const dealTypeLabels: Record<string, string> = {
                  rental: 'Alquiler', temporary_rental: 'Alq. Temporal', sale: 'Venta',
                  property_management: 'Administración', exclusivity: 'Exclusividad',
                };
                return (
                  <div key={c.id} className="bg-card border border-border rounded-xl p-4 hover:shadow-sm transition-all">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={`text-[10px] px-1.5 py-0 ${cst.color}`}>
                            {cst.label}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            {dealTypeLabels[c.contract_type] || c.contract_type}
                          </span>
                        </div>
                        {c.tenant_name && (
                          <p className="text-sm font-medium text-foreground leading-tight">
                            Inquilino: {c.tenant_name}
                          </p>
                        )}
                        {propInfo && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {propInfo.property_code} - {propInfo.title}
                          </p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <CalendarIcon className="w-3 h-3" />
                          {format(new Date(c.start_date + 'T12:00:00'), 'dd/MM/yy')}
                          {c.end_date && ` — ${format(new Date(c.end_date + 'T12:00:00'), 'dd/MM/yy')}`}
                        </div>
                        {c.monthly_rent != null && (
                          <p className="text-sm font-semibold text-foreground mt-0.5">
                            {formatCurrency(c.monthly_rent, c.currency || 'PYG')}/mes
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Statement Tab */}
        <TabsContent value="statement">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button onClick={prevStatementMonth} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm font-semibold capitalize min-w-[140px] text-center">
                {format(statementMonthDate, 'MMMM yyyy', { locale: es })}
              </span>
              <button onClick={nextStatementMonth} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            {statementLines.length > 0 && (
              <Button
                size="sm"
                className="gap-1.5"
                onClick={async () => {
                  try {
                    await exportOwnerStatementPDF(
                      owner.full_name,
                      statementMonth,
                      statementLines,
                      statementData?.properties?.length ?? 0,
                    );
                    toast.success('PDF descargado');
                  } catch {
                    toast.error('Error al generar PDF');
                  }
                }}
              >
                <Download className="w-3.5 h-3.5" />
                Exportar PDF
              </Button>
            )}
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-xl p-4 text-center">
              <TrendingUp className="w-4 h-4 mx-auto mb-1 text-emerald-600" />
              <p className="text-xs text-muted-foreground">Ingresos</p>
              <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                {formatCurrency(statementIncome, 'PYG')}
              </p>
            </div>
            <div className="bg-red-50 dark:bg-red-950/30 rounded-xl p-4 text-center">
              <TrendingDown className="w-4 h-4 mx-auto mb-1 text-red-600" />
              <p className="text-xs text-muted-foreground">Gastos</p>
              <p className="text-sm font-bold text-red-700 dark:text-red-400">
                {formatCurrency(statementExpense, 'PYG')}
              </p>
            </div>
            <div className={`rounded-xl p-4 text-center ${statementBalance >= 0 ? 'bg-blue-50 dark:bg-blue-950/30' : 'bg-orange-50 dark:bg-orange-950/30'}`}>
              <p className="text-xs text-muted-foreground">Balance</p>
              <p className={`text-sm font-bold mt-1 ${statementBalance >= 0 ? 'text-blue-700 dark:text-blue-400' : 'text-orange-700 dark:text-orange-400'}`}>
                {formatCurrency(statementBalance, 'PYG')}
              </p>
            </div>
          </div>

          {/* Loading */}
          {statementLoading && (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          )}

          {/* Movements table */}
          {!statementLoading && statementLines.length > 0 && (
            <div className="border border-border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Fecha</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Descripción</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Propiedad</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Monto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {statementLines.map(line => (
                    <tr key={`${line.source}-${line.id}`} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {format(new Date(line.date + 'T12:00:00'), 'dd/MM')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {line.source === 'maintenance' ? (
                            <Wrench className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                          ) : line.type === 'income' ? (
                            <ArrowUpCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                          ) : (
                            <ArrowDownCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                          )}
                          <span className="truncate max-w-[200px]">{line.description}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{line.category}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground truncate max-w-[150px]">
                        {line.property_title}
                      </td>
                      <td className={`px-4 py-3 text-right font-medium whitespace-nowrap ${
                        line.type === 'income' ? 'text-emerald-600' : 'text-red-600'
                      }`}>
                        {line.type === 'income' ? '+' : '-'}{formatCurrency(line.amount, line.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Empty state */}
          {!statementLoading && statementLines.length === 0 && (
            <div className="text-center py-12">
              <ReceiptText className="w-10 h-10 mx-auto mb-2 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                {(statementData?.properties?.length ?? 0) === 0
                  ? 'Este propietario no tiene propiedades asociadas'
                  : 'Sin movimientos en este período'}
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Property detail dialog */}
      <PropertyDetailDialog
        open={!!selectedProperty}
        onOpenChange={v => { if (!v) setSelectedProperty(null); }}
        property={selectedProperty}
      />
    </MainLayout>
  );
};

export default OwnerDetailPage;
