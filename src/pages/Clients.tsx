import { useState } from 'react';
import { ModuleGuide } from '@/components/layout/ModuleGuide';
import { MainLayout } from '@/components/layout/MainLayout';
import { ClientFormDialog } from '@/components/clients/ClientFormDialog';
import { useClients, type UnifiedClient } from '@/hooks/useClients';
import { useAgentSoftLock } from '@/hooks/useAgentSoftLock';
import { useClientFinancialStatus, type FinancialStatus } from '@/hooks/useClientFinancialStatus';
import { SoftLockBanner } from '@/components/softlock/SoftLockBanner';
import {
  Search,
  Mail,
  Phone,
  MapPin,
  FileText,
  MessageCircle,
  Loader2,
  CalendarClock,
  DollarSign,
} from 'lucide-react';

const typeColors: Record<string, string> = {
  inquilino: 'bg-info/10 text-info border-info/20',
  Inquilino: 'bg-info/10 text-info border-info/20',
  propietario: 'bg-secondary/10 text-secondary border-secondary/20',
  Propietario: 'bg-secondary/10 text-secondary border-secondary/20',
  comprador: 'bg-success/10 text-success border-success/20',
  Comprador: 'bg-success/10 text-success border-success/20',
};

const paymentColors: Record<string, { label: string; class: string; icon: string }> = {
  al_dia: { label: 'Al día', class: 'bg-success/10 text-success', icon: '🟢' },
  por_vencer: { label: 'Por vencer', class: 'bg-warning/10 text-warning', icon: '🟡' },
  vencido: { label: 'Vencido', class: 'bg-destructive/10 text-destructive', icon: '🔴' },
  na: { label: 'Sin cobros', class: 'bg-muted text-muted-foreground', icon: '⚪' },
};

const formatCurrency = (amount: number | null | undefined, currency: string | null | undefined) => {
  if (!amount) return '—';
  const sym = currency === 'USD' ? 'US$' : '₲';
  return `${sym} ${amount.toLocaleString('es-PY')}`;
};

const formatDate = (d: string | null | undefined) => {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
};

const Clients = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [clientFormOpen, setClientFormOpen] = useState(false);
  const { data: dbClients, isLoading } = useClients();
  const { isLocked } = useAgentSoftLock();
  const { data: financialMap } = useClientFinancialStatus();

  const displayClients: Array<{
    id: string;
    name: string;
    email: string;
    phone: string;
    type: string;
    property: string;
    paymentStatus: FinancialStatus;
    avatar: string;
    source: 'clients' | 'contract';
    monthlyRent?: number | null;
    currency?: string | null;
    startDate?: string | null;
    endDate?: string | null;
  }> = (dbClients || []).map((c: UnifiedClient) => {
    const fin = financialMap?.get(c.id);
    const paymentStatus: FinancialStatus = fin?.status || 'na';
    const typeLabel = c.client_type === 'inquilino' ? 'Inquilino'
      : c.client_type === 'propietario' ? 'Propietario'
      : c.client_type === 'comprador' ? 'Comprador'
      : (c.client_type || 'Inquilino');

    return {
      id: c.id,
      name: c.full_name,
      email: c.email || '',
      phone: c.phone || '',
      type: typeLabel,
      property: c.property_title || c.address || '—',
      paymentStatus,
      avatar: c.full_name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase(),
      source: c.source,
      monthlyRent: c.monthly_rent,
      currency: c.currency,
      startDate: c.start_date,
      endDate: c.end_date,
    };
  });

  const filteredClients = displayClients.filter((client) => {
    const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.phone.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'all' || client.type === selectedType;
    return matchesSearch && matchesType;
  });

  return (
    <MainLayout
      title="Clientes"
      subtitle={`${filteredClients.length} clientes registrados`}
      action={isLocked ? undefined : {
        label: 'Nuevo Cliente',
        onClick: () => setClientFormOpen(true),
      }}
    >
      <ModuleGuide
        moduleKey="clients"
        tips={[
          'Registrá inquilinos, compradores y propietarios con sus datos de contacto.',
          'Los inquilinos de contratos activos en edificios aparecen automáticamente aquí.',
          'El semáforo de pago (🟢🟡🔴) indica automáticamente el estado financiero de cada cliente.',
          'Usá el buscador para encontrar clientes por nombre, email o teléfono.',
        ]}
      />
      <SoftLockBanner />
      {isLocked && (
        <div className="flex items-center gap-2 px-4 py-3 mb-4 rounded-xl bg-warning/10 border border-warning/30 text-warning text-sm font-medium">
          🔒 Cuenta con pagos pendientes. Para continuar, regularice su canon mensual.
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por nombre, email o teléfono..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all"
          />
        </div>
        <div className="flex items-center gap-2">
          {['all', 'Inquilino', 'Propietario', 'Comprador'].map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedType === type
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {type === 'all' ? 'Todos' : type}
            </button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      )}

      {/* Clients Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredClients.map((client, index) => (
          <div
            key={client.id}
            className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-all duration-300 animate-scale-in opacity-0"
            style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'forwards' }}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-semibold text-primary">{client.avatar}</span>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{client.name}</h3>
                  <span className={`badge-status text-xs border mt-1 ${typeColors[client.type] || 'bg-muted text-muted-foreground'}`}>
                    {client.type}
                  </span>
                  {client.source === 'contract' && (
                    <span className="ml-1.5 text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      Contrato
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              {client.email && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="w-4 h-4 shrink-0" />
                  <span className="truncate">{client.email}</span>
                </div>
              )}
              {client.phone && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="w-4 h-4 shrink-0" />
                  <span>{client.phone}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4 shrink-0" />
                <span className="truncate">{client.property}</span>
              </div>
            </div>

            {/* Contract details for tenants */}
            {client.source === 'contract' && (
              <div className="space-y-1.5 mb-4 p-3 rounded-lg bg-muted/50 border border-border">
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="font-medium text-foreground">
                    {formatCurrency(client.monthlyRent, client.currency)}
                  </span>
                  <span className="text-muted-foreground text-xs">/mes</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CalendarClock className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {formatDate(client.startDate)} → {formatDate(client.endDate)}
                  </span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-border">
              <div>
                <p className="text-xs text-muted-foreground">Estado financiero</p>
                <span className={`inline-flex items-center gap-1 badge-status text-xs mt-1 ${paymentColors[client.paymentStatus]?.class || paymentColors.na.class}`}>
                  {paymentColors[client.paymentStatus]?.icon || '⚪'} {paymentColors[client.paymentStatus]?.label || 'Sin cobros'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {client.phone && (
                  <a
                    href={`https://wa.me/${client.phone.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-info/10 text-info rounded-lg hover:bg-info/20 transition-colors"
                    title="Enviar WhatsApp"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </a>
                )}
                <button className="p-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors" title="Ver contrato">
                  <FileText className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty state */}
      {filteredClients.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
            <Search className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">No se encontraron clientes</h3>
          <p className="text-muted-foreground">Intenta ajustar los filtros de búsqueda</p>
        </div>
      )}

      <ClientFormDialog open={clientFormOpen} onOpenChange={setClientFormOpen} />
    </MainLayout>
  );
};

export default Clients;
