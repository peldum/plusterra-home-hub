import {
  FileText, Clock, AlertTriangle, CheckCircle, XCircle, Eye, Download, MoreVertical, Edit, Trash2, RefreshCw,
} from 'lucide-react';
import { downloadContractPDF } from '@/lib/contractExport';
import { toast } from 'sonner';
import type { ContractWithRelations } from '@/hooks/useContracts';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { SoftLockGuard } from '@/components/softlock/SoftLockGuard';

const statusConfig: Record<string, { label: string; icon: typeof CheckCircle; className: string }> = {
  draft: { label: 'Borrador', icon: FileText, className: 'bg-muted text-muted-foreground border-border' },
  active: { label: 'Activo', icon: CheckCircle, className: 'bg-success/10 text-success border-success/20' },
  near_expiration: { label: 'Por vencer', icon: AlertTriangle, className: 'bg-warning/10 text-warning border-warning/20' },
  expired: { label: 'Expirado', icon: XCircle, className: 'bg-destructive/10 text-destructive border-destructive/20' },
  cancelled: { label: 'Cancelado', icon: XCircle, className: 'bg-muted text-muted-foreground border-border' },
  terminated: { label: 'Terminado', icon: XCircle, className: 'bg-destructive/10 text-destructive border-destructive/20' },
  renewed: { label: 'Renovado', icon: CheckCircle, className: 'bg-info/10 text-info border-info/20' },
};

const typeLabels: Record<string, { label: string; className: string }> = {
  rental: { label: 'Alquiler', className: 'bg-info/10 text-info' },
  temporary_rental: { label: 'Alq. Temporal', className: 'bg-accent/10 text-accent' },
  sale: { label: 'Venta', className: 'bg-success/10 text-success' },
  property_management: { label: 'Administración', className: 'bg-secondary/10 text-secondary' },
  exclusivity: { label: 'Exclusividad', className: 'bg-primary/10 text-primary' },
};

const formatCurrency = (amount: number, currency?: string | null) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: currency === 'PYG' ? 'PYG' : 'USD', minimumFractionDigits: 0 }).format(amount);

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });

interface ContractTableProps {
  contracts: ContractWithRelations[];
  onEdit?: (contract: ContractWithRelations) => void;
  onDelete?: (id: string) => void;
  onRenew?: (contract: ContractWithRelations) => void;
  onView?: (contract: ContractWithRelations) => void;
  isAdmin?: boolean;
  canRenew?: boolean;
}

export const ContractTable = ({ contracts, onEdit, onDelete, onRenew, onView, isAdmin, canRenew }: ContractTableProps) => {
  const calculateDaysRemaining = (endDate: string) => {
    const diff = Math.ceil((new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  if (contracts.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-12 text-center animate-slide-up opacity-0" style={{ animationFillMode: 'forwards' }}>
        <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-lg font-medium text-foreground">No hay contratos</p>
        <p className="text-sm text-muted-foreground mt-1">Creá un nuevo contrato para empezar.</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden animate-slide-up opacity-0" style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              {['Contrato', 'Cliente', 'Tipo', 'Vigencia', 'Estado', 'Monto', 'Acciones'].map((h) => (
                <th key={h} className={`text-${h === 'Acciones' ? 'right' : 'left'} text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {contracts.map((contract) => {
              const status = statusConfig[contract.status || 'draft'];
              const type = typeLabels[contract.contract_type] || { label: contract.contract_type, className: '' };
              const daysRemaining = contract.end_date ? calculateDaysRemaining(contract.end_date) : null;
              const clientName = contract.clients?.full_name || contract.tenant_name || '—';
              const propertyTitle = contract.properties?.title || '—';
              const propertyAddress = contract.properties?.address || contract.property_address || '';
              const amount = Number(contract.monthly_rent || contract.total_amount || contract.deposit_amount || 0);

              return (
                <tr key={contract.id} className="table-row-hover">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{propertyTitle}</p>
                        <p className="text-sm text-muted-foreground">{propertyAddress}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-foreground">{clientName}</td>
                  <td className="px-6 py-4">
                    <span className={`badge-status text-xs ${type.className}`}>{type.label}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      <p className="text-foreground">
                        {formatDate(contract.start_date)}
                        {contract.end_date && ` - ${formatDate(contract.end_date)}`}
                      </p>
                      {daysRemaining !== null && !['expired', 'cancelled', 'terminated'].includes(contract.status || '') && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <Clock className="w-3 h-3" />
                          {daysRemaining > 0 ? `${daysRemaining} días restantes` : 'Vencido'}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`badge-status text-xs border ${status.className}`}>
                      <status.icon className="w-3 h-3 mr-1" />
                      {status.label}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-semibold text-foreground">
                      {formatCurrency(amount, contract.currency)}
                      {['rental', 'temporary_rental', 'property_management'].includes(contract.contract_type) && (
                        <span className="text-xs font-normal text-muted-foreground">/mes</span>
                      )}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <button className="p-2 hover:bg-muted rounded-lg transition-colors" title="Ver contrato" onClick={() => onView?.(contract)}>
                        <Eye className="w-4 h-4 text-muted-foreground" />
                      </button>
                      <button
                        className="p-2 hover:bg-muted rounded-lg transition-colors"
                        title="Descargar PDF"
                        onClick={async () => {
                          try {
                            await downloadContractPDF(contract);
                            toast.success('PDF descargado');
                          } catch {
                            toast.error('Error al generar el PDF');
                          }
                        }}
                      >
                        <Download className="w-4 h-4 text-muted-foreground" />
                      </button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-2 hover:bg-muted rounded-lg transition-colors">
                            <MoreVertical className="w-4 h-4 text-muted-foreground" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onView?.(contract)}>
                            <Eye className="w-4 h-4 mr-2" /> Ver detalle
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={async () => {
                            try { await downloadContractPDF(contract); toast.success('PDF descargado'); } catch { toast.error('Error al generar el PDF'); }
                          }}>
                            <Download className="w-4 h-4 mr-2" /> Descargar PDF
                          </DropdownMenuItem>
                          {onEdit && (
                            <DropdownMenuItem onClick={() => onEdit(contract)}>
                              <Edit className="w-4 h-4 mr-2" /> Editar
                            </DropdownMenuItem>
                          )}
                          {onRenew && canRenew && ['active', 'near_expiration', 'expired'].includes(contract.status || '') && (
                            <SoftLockGuard>
                              <DropdownMenuItem onClick={() => onRenew(contract)}>
                                <RefreshCw className="w-4 h-4 mr-2" /> Renovar
                              </DropdownMenuItem>
                            </SoftLockGuard>
                          )}
                          {onDelete && isAdmin && (
                            <DropdownMenuItem onClick={() => onDelete(contract.id)} className="text-destructive">
                              <Trash2 className="w-4 h-4 mr-2" /> Eliminar
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
