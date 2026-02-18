import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { ClientFormDialog } from '@/components/clients/ClientFormDialog';
import { useClients } from '@/hooks/useClients';
import { useAgentSoftLock } from '@/hooks/useAgentSoftLock';
import { SoftLockBanner } from '@/components/softlock/SoftLockBanner';
import {
  Search,
  Filter,
  MoreVertical,
  Mail,
  Phone,
  MapPin,
  FileText,
  MessageCircle,
  Loader2,
} from 'lucide-react';

const clients = [
  {
    id: 1,
    name: 'María González',
    email: 'maria.gonzalez@email.com',
    phone: '+54 11 4567-8901',
    type: 'Inquilino',
    status: 'activo',
    property: 'Depto 3 Amb. Palermo',
    paymentStatus: 'al_dia',
    lastPayment: '01/12/2024',
    avatar: 'MG',
  },
  {
    id: 2,
    name: 'Roberto Sánchez',
    email: 'roberto.sanchez@email.com',
    phone: '+54 11 5678-9012',
    type: 'Propietario',
    status: 'activo',
    property: 'Casa Nordelta + 2 más',
    paymentStatus: 'pendiente',
    lastPayment: '15/11/2024',
    avatar: 'RS',
  },
  {
    id: 3,
    name: 'Ana Martínez',
    email: 'ana.martinez@email.com',
    phone: '+54 11 6789-0123',
    type: 'Inquilino',
    status: 'activo',
    property: 'Loft Belgrano',
    paymentStatus: 'al_dia',
    lastPayment: '28/11/2024',
    avatar: 'AM',
  },
  {
    id: 4,
    name: 'Carlos Ruiz',
    email: 'carlos.ruiz@email.com',
    phone: '+54 11 7890-1234',
    type: 'Comprador',
    status: 'prospecto',
    property: 'Interesado en Recoleta',
    paymentStatus: 'na',
    lastPayment: '-',
    avatar: 'CR',
  },
  {
    id: 5,
    name: 'Patricia López',
    email: 'patricia.lopez@email.com',
    phone: '+54 11 8901-2345',
    type: 'Propietario',
    status: 'activo',
    property: 'Oficina Puerto Madero',
    paymentStatus: 'atrasado',
    lastPayment: '01/10/2024',
    avatar: 'PL',
  },
  {
    id: 6,
    name: 'Fernando Castro',
    email: 'fernando.castro@email.com',
    phone: '+54 11 9012-3456',
    type: 'Inquilino',
    status: 'inactivo',
    property: 'Ex-inquilino Local Florida',
    paymentStatus: 'na',
    lastPayment: '01/09/2024',
    avatar: 'FC',
  },
];

const typeColors = {
  Inquilino: 'bg-info/10 text-info border-info/20',
  Propietario: 'bg-secondary/10 text-secondary border-secondary/20',
  Comprador: 'bg-success/10 text-success border-success/20',
};

const paymentColors = {
  al_dia: { label: 'Al día', class: 'bg-success/10 text-success' },
  pendiente: { label: 'Pendiente', class: 'bg-warning/10 text-warning' },
  atrasado: { label: 'Atrasado', class: 'bg-destructive/10 text-destructive' },
  na: { label: '-', class: 'bg-muted text-muted-foreground' },
};

const Clients = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [clientFormOpen, setClientFormOpen] = useState(false);
  const { data: dbClients, isLoading } = useClients();
  const { isLocked } = useAgentSoftLock();

  // Map DB clients to display format, fallback to hardcoded if no DB data yet
  const displayClients = dbClients && dbClients.length > 0
    ? dbClients.map(c => ({
        id: c.id,
        name: c.full_name,
        email: c.email || '',
        phone: c.phone || '',
        type: c.client_type === 'inquilino' ? 'Inquilino' : c.client_type === 'propietario' ? 'Propietario' : c.client_type === 'comprador' ? 'Comprador' : (c.client_type || 'Inquilino'),
        status: 'activo',
        property: c.address || '-',
        paymentStatus: 'na' as const,
        lastPayment: '-',
        avatar: c.full_name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase(),
      }))
    : clients;

  const filteredClients = displayClients.filter((client) => {
    const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email.toLowerCase().includes(searchTerm.toLowerCase());
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
            placeholder="Buscar por nombre o email..."
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
                  <span className={`badge-status text-xs border mt-1 ${typeColors[client.type as keyof typeof typeColors]}`}>
                    {client.type}
                  </span>
                </div>
              </div>
              <button className="p-2 hover:bg-muted rounded-lg transition-colors">
                <MoreVertical className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="w-4 h-4" />
                <span className="truncate">{client.email}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="w-4 h-4" />
                <span>{client.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4" />
                <span className="truncate">{client.property}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-border">
              <div>
                <p className="text-xs text-muted-foreground">Estado de pago</p>
                <span className={`badge-status text-xs mt-1 ${paymentColors[client.paymentStatus as keyof typeof paymentColors].class}`}>
                  {paymentColors[client.paymentStatus as keyof typeof paymentColors].label}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 bg-info/10 text-info rounded-lg hover:bg-info/20 transition-colors" title="Enviar WhatsApp">
                  <MessageCircle className="w-4 h-4" />
                </button>
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
