import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { Owner } from '@/hooks/useOwners';
import { PropertyDetailDialog } from '@/components/properties/PropertyDetailDialog';
import { OwnerStatementDialog } from '@/components/owners/OwnerStatementDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft, Mail, Phone, MapPin, Building2, Loader2,
  FileText, Wrench, ReceiptText, Home, DollarSign,
  ArrowUpCircle, ArrowDownCircle, Calendar, ClipboardList,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

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

const OwnerDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [statementOpen, setStatementOpen] = useState(false);

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

  // Fetch payments for owner's properties
  const { data: payments, isLoading: paymentsLoading } = useQuery({
    queryKey: ['owner-payments', id, propertyIds],
    queryFn: async () => {
      if (propertyIds.length === 0) return [];
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .in('property_id', propertyIds)
        .order('payment_date', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: propertyIds.length > 0,
  });

  // Fetch maintenance tickets for owner's properties
  const { data: tickets, isLoading: ticketsLoading } = useQuery({
    queryKey: ['owner-maintenance', id, propertyIds],
    queryFn: async () => {
      if (propertyIds.length === 0) return [];
      const { data, error } = await supabase
        .from('maintenance_tickets')
        .select('*, properties(property_code, title)')
        .in('property_id', propertyIds)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: propertyIds.length > 0,
  });

  // Fetch contracts for owner's properties
  const { data: contracts, isLoading: contractsLoading } = useQuery({
    queryKey: ['owner-contracts', id, propertyIds],
    queryFn: async () => {
      if (propertyIds.length === 0) return [];
      const { data, error } = await supabase
        .from('contracts')
        .select('*, properties(property_code, title)')
        .in('property_id', propertyIds)
        .order('start_date', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: propertyIds.length > 0,
  });

  if (ownerLoading) {
    return (
      <MainLayout title="Propietario">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!owner) {
    return (
      <MainLayout title="Propietario no encontrado">
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
    <MainLayout title="">
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
          <button
            onClick={() => setStatementOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors self-start"
          >
            <ReceiptText className="w-4 h-4" />
            Estado de Cuenta
          </button>
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
          {paymentsLoading && <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>}
          {!paymentsLoading && (!payments || payments.length === 0) && (
            <div className="text-center py-12">
              <DollarSign className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">Sin cobros registrados</p>
            </div>
          )}
          {!paymentsLoading && payments && payments.length > 0 && (
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
                  {payments.map(p => (
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
          )}
        </TabsContent>

        {/* Maintenance Tab */}
        <TabsContent value="maintenance">
          {ticketsLoading && <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>}
          {!ticketsLoading && (!tickets || tickets.length === 0) && (
            <div className="text-center py-12">
              <Wrench className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">Sin tickets de mantenimiento</p>
            </div>
          )}
          {!ticketsLoading && tickets && tickets.length > 0 && (
            <div className="space-y-3">
              {tickets.map(t => {
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
                          <Calendar className="w-3 h-3" />
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
      </Tabs>

      {/* Property detail dialog */}
      <PropertyDetailDialog
        open={!!selectedProperty}
        onOpenChange={v => { if (!v) setSelectedProperty(null); }}
        property={selectedProperty}
      />

      {/* Owner statement dialog */}
      <OwnerStatementDialog
        open={statementOpen}
        onOpenChange={setStatementOpen}
        owner={owner}
      />
    </MainLayout>
  );
};

export default OwnerDetailPage;
