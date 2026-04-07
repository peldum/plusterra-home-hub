import { useState, useMemo } from 'react';
import { ModuleGuide } from '@/components/layout/ModuleGuide';
import { MainLayout } from '@/components/layout/MainLayout';
import { ClientFormDialog } from '@/components/clients/ClientFormDialog';
import { ClientCardView } from '@/components/clients/ClientCardView';
import { ClientListView } from '@/components/clients/ClientListView';
import { useClients, useDeleteClient, type UnifiedClient } from '@/hooks/useClients';
import { useAgentSoftLock } from '@/hooks/useAgentSoftLock';
import { useClientFinancialStatus, type FinancialStatus } from '@/hooks/useClientFinancialStatus';
import { SoftLockBanner } from '@/components/softlock/SoftLockBanner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { DisplayClient } from '@/components/clients/clientTypes';
import {
  Search,
  Loader2,
  LayoutGrid,
  List,
  Building2,
  AlertTriangle,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';

const Clients = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedBuilding, setSelectedBuilding] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    return (localStorage.getItem('clients_view_mode') as 'grid' | 'list') || 'grid';
  });
  const [clientFormOpen, setClientFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<{ id: string; full_name: string; email?: string; phone?: string; birth_date?: string; client_type?: string; notes?: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<DisplayClient | null>(null);

  const { data: dbClients, isLoading } = useClients();
  const { isLocked } = useAgentSoftLock();
  const { data: financialMap } = useClientFinancialStatus();
  const deleteMutation = useDeleteClient();

  const toggleView = (mode: 'grid' | 'list') => {
    setViewMode(mode);
    localStorage.setItem('clients_view_mode', mode);
  };

  const displayClients: DisplayClient[] = useMemo(() => {
    return (dbClients || []).map((c: UnifiedClient) => {
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
        buildingId: c.building_id,
        buildingName: c.building_name,
        contractId: c.contract_id || null,
      };
    });
  }, [dbClients, financialMap]);

  const buildings = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of displayClients) {
      if (c.buildingId && c.buildingName) map.set(c.buildingId, c.buildingName);
    }
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [displayClients]);

  const filteredClients = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return displayClients.filter((client) => {
      const matchesSearch = !term || client.name.toLowerCase().includes(term) ||
        client.email.toLowerCase().includes(term) ||
        client.phone.replace(/\s/g, '').includes(term.replace(/\s/g, ''));
      const matchesType = selectedType === 'all' || client.type === selectedType;
      const matchesBuilding = selectedBuilding === 'all' || client.buildingId === selectedBuilding;
      return matchesSearch && matchesType && matchesBuilding;
    });
  }, [displayClients, searchTerm, selectedType, selectedBuilding]);

  const showBuildingFilter = selectedType === 'all' || selectedType === 'Inquilino';

  const handleEdit = (client: DisplayClient) => {
    // Fetch full client data for editing
    const raw = dbClients?.find(c => c.id === client.id);
    if (!raw || raw.source !== 'clients') return;
    setEditingClient({
      id: raw.id,
      full_name: raw.full_name,
      email: raw.email || '',
      phone: raw.phone || '',
      client_type: raw.client_type || 'inquilino',
    });
    setClientFormOpen(true);
  };

  const handleDelete = (client: DisplayClient) => {
    setDeleteConfirm(client);
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    await deleteMutation.mutateAsync(deleteConfirm.id);
    setDeleteConfirm(null);
  };

  return (
    <MainLayout
      title="Clientes"
      subtitle={`${filteredClients.length} clientes registrados`}
      action={isLocked ? undefined : {
        label: 'Nuevo Cliente',
        onClick: () => { setEditingClient(null); setClientFormOpen(true); },
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

      {/* Filters Row */}
      <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar nombre, email o teléfono..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {['all', 'Inquilino', 'Propietario', 'Comprador'].map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                selectedType === type
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {type === 'all' ? 'Todos' : type}
            </button>
          ))}
        </div>

        {showBuildingFilter && buildings.length > 0 && (
          <Select value={selectedBuilding} onValueChange={setSelectedBuilding}>
            <SelectTrigger className="w-full sm:w-[200px] h-10">
              <Building2 className="w-4 h-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Edificio" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los edificios</SelectItem>
              {buildings.map(([id, name]) => (
                <SelectItem key={id} value={id}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* View mode toggle — hidden on mobile (always cards) */}
        <TooltipProvider>
          <div className="hidden sm:flex items-center border border-border rounded-lg overflow-hidden ml-auto shrink-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => toggleView('grid')}
                  className={`p-2.5 transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Vista cuadrícula</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => toggleView('list')}
                  className={`p-2.5 transition-colors ${
                    viewMode === 'list'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <List className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Vista lista</TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      )}

      {!isLoading && filteredClients.length > 0 && (
        viewMode === 'grid'
          ? <ClientCardView clients={filteredClients} onEdit={handleEdit} onDelete={handleDelete} />
          : <ClientListView clients={filteredClients} onEdit={handleEdit} onDelete={handleDelete} />
      )}

      {filteredClients.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
            <Search className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">No se encontraron clientes</h3>
          <p className="text-muted-foreground">Intenta ajustar los filtros de búsqueda</p>
        </div>
      )}

      <ClientFormDialog open={clientFormOpen} onOpenChange={setClientFormOpen} editData={editingClient} />

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Eliminar cliente
            </DialogTitle>
            <DialogDescription>
              ¿Estás seguro de eliminar a <strong>{deleteConfirm?.name}</strong>? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default Clients;
