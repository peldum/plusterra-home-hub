import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { ContractStats } from '@/components/contracts/ContractStats';
import { ContractTable } from '@/components/contracts/ContractTable';
import { ContractFilters } from '@/components/contracts/ContractFilters';
import { ContractForecast } from '@/components/contracts/ContractForecast';
import { ContractFormWizard } from '@/components/contracts/ContractFormWizard';
import { ContractRenewalDialog } from '@/components/contracts/ContractRenewalDialog';
import { useContracts, useDeleteContract, type ContractWithRelations } from '@/hooks/useContracts';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const Contracts = () => {
  const [wizardOpen, setWizardOpen] = useState(false);
  const [renewalContract, setRenewalContract] = useState<ContractWithRelations | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const { data: contracts, isLoading } = useContracts();
  const deleteContract = useDeleteContract();
  const { isAdmin } = useAuth();

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

  return (
    <MainLayout
      title="Contratos"
      subtitle="Gestión de contratos y documentación"
      action={{
        label: 'Nuevo Contrato',
        onClick: () => setWizardOpen(true),
      }}
    >
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
          isAdmin={isAdmin}
        />
      )}

      <ContractFormWizard open={wizardOpen} onOpenChange={setWizardOpen} />
      {renewalContract && (
        <ContractRenewalDialog
          open={!!renewalContract}
          onOpenChange={(open) => { if (!open) setRenewalContract(null); }}
          contract={renewalContract}
        />
      )}
    </MainLayout>
  );
};

export default Contracts;
