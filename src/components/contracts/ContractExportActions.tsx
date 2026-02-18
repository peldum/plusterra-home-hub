import { Download, Printer, MessageCircle, Lock } from 'lucide-react';
import { printContractPDF, downloadContractPDF, buildContractWhatsAppMessage, canExportContract } from '@/lib/contractExport';
import { useAuth } from '@/contexts/AuthContext';
import type { ContractWithRelations } from '@/hooks/useContracts';
import { toast } from 'sonner';

interface ContractExportActionsProps {
  contract: ContractWithRelations;
}

export const ContractExportActions = ({ contract }: ContractExportActionsProps) => {
  const { user, role } = useAuth();
  const canExport = canExportContract(contract, user?.id, role);

  if (!canExport) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-muted text-muted-foreground text-xs">
        <Lock className="w-3.5 h-3.5" />
        Sin permiso para exportar
      </div>
    );
  }

  const handleDownload = () => {
    downloadContractPDF(contract);
    toast.success('Contrato descargado');
  };

  const handlePrint = () => {
    printContractPDF(contract);
  };

  const handleWhatsApp = () => {
    const msg = buildContractWhatsAppMessage(contract);
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleDownload}
        title="Descargar PDF"
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
      >
        <Download className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Descargar</span>
      </button>

      <button
        onClick={handlePrint}
        title="Imprimir"
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-muted text-foreground text-xs font-medium hover:bg-muted/70 transition-colors"
      >
        <Printer className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Imprimir</span>
      </button>

      <button
        onClick={handleWhatsApp}
        title="Compartir por WhatsApp"
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[hsl(142,70%,45%)]/10 text-[hsl(142,70%,35%)] text-xs font-medium hover:bg-[hsl(142,70%,45%)]/20 transition-colors"
      >
        <MessageCircle className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">WhatsApp</span>
      </button>
    </div>
  );
};
