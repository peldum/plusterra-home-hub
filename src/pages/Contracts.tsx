import { useState, useMemo } from 'react';
import { ModuleGuide } from '@/components/layout/ModuleGuide';
import { Plus, Zap, FileText } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { ContractStats } from '@/components/contracts/ContractStats';
import { ContractTable } from '@/components/contracts/ContractTable';
import { ContractFilters } from '@/components/contracts/ContractFilters';
import { ContractForecast } from '@/components/contracts/ContractForecast';
import { QuickContractForm } from '@/components/contracts/QuickContractForm';
import { ContractFormWizard } from '@/components/contracts/ContractFormWizard';
import { ContractRenewalDialog } from '@/components/contracts/ContractRenewalDialog';
import { ContractDetailDialog } from '@/components/contracts/ContractDetailDialog';
import { useContracts, useDeleteContract, type ContractWithRelations } from '@/hooks/useContracts';
import { useAuth } from '@/contexts/AuthContext';
import { useAgentSoftLock } from '@/hooks/useAgentSoftLock';
import { SoftLockBanner } from '@/components/softlock/SoftLockBanner';
import { SoftLockGuard } from '@/components/softlock/SoftLockGuard';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

const Contracts = () => {
  const [quickFormOpen, setQuickFormOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [renewalContract, setRenewalContract] = useState<ContractWithRelations | null>(null);
  const [detailContract, setDetailContract] = useState<ContractWithRelations | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const { data: contracts, isLoading } = useContracts();
  const deleteContract = useDeleteContract();
  const { isAdmin, role } = useAuth();
  const { isLocked } = useAgentSoftLock();

  const filteredContracts = useMemo(() => {
    if (!contracts) return [];
    return contracts.filter((c) => {
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (typeFilter !== 'all' && c.contract_type !== typeFilter) return false;
      return true;
    });
  }, [contracts, statusFilter, typeFilter]);

  const handleExport = (format: 'xlsx' | 'ods' | 'pdf') => {
    toast.info(`Exportación a ${format.toUpperCase()} en desarrollo`);
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Estás seguro de eliminar este contrato?')) {
      deleteContract.mutate(id);
    }
  };

  const newContractButton = (
    <SoftLockGuard>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nuevo Registro</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setQuickFormOpen(true)}>
            <Zap className="w-4 h-4 mr-2 text-primary" />
            Registro Rápido
            <span className="ml-auto text-xs text-muted-foreground">Recomendado</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setWizardOpen(true)}>
            <FileText className="w-4 h-4 mr-2" />
            Contrato Completo
            <span className="ml-auto text-xs text-muted-foreground">Con plantilla</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SoftLockGuard>
  );

  return (
    <MainLayout
      title="Contratos"
      subtitle="Gestión de alquileres, ventas y documentación"
      actionNode={newContractButton}
    >
      <ModuleGuide
        moduleKey="contracts"
        tips={[
          'Usá "Registro Rápido" para cargar un contrato en segundos con los datos esenciales.',
          'El "Contrato Completo" genera el documento PDF listo para firma.',
          'Podés renovar contratos existentes desde el menú de acciones de cada contrato.',
          'Filtrá por estado (Activo, Vencido, Cancelado) para control de vigencia.',
        ]}
      />
      <SoftLockBanner />
      <ContractStats />
      <ContractForecast />
      <ContractFilters
        statusFilter={statusFilter}
        typeFilter={typeFilter}
        onStatusChange={setStatusFilter}
        onTypeChange={setTypeFilter}
        onExport={handleExport}
      />

      {isLoading ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <p className="text-muted-foreground">Cargando contratos...</p>
        </div>
      ) : (
        <ContractTable
          contracts={filteredContracts}
          onDelete={handleDelete}
          onRenew={(contract) => setRenewalContract(contract)}
          onView={(contract) => setDetailContract(contract)}
          isAdmin={isAdmin}
          canRenew={isAdmin}
        />
      )}

      <QuickContractForm open={quickFormOpen} onOpenChange={setQuickFormOpen} />
      <ContractFormWizard open={wizardOpen} onOpenChange={setWizardOpen} />
      {renewalContract && (
        <ContractRenewalDialog
          open={!!renewalContract}
          onOpenChange={(open) => { if (!open) setRenewalContract(null); }}
          contract={renewalContract}
        />
      )}
      {detailContract && (
        <ContractDetailDialog
          open={!!detailContract}
          onOpenChange={(open) => { if (!open) setDetailContract(null); }}
          contract={detailContract}
        />
      )}
    </MainLayout>
  );
};

export default Contracts;
