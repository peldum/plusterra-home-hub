import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import type { ContractWithRelations } from '@/hooks/useContracts';
import { useContractHistory } from '@/hooks/useContractHistory';
import {
  FileText, Building2, Users, Calendar, DollarSign, Clock, CheckCircle, XCircle,
  AlertTriangle, RefreshCw, ArrowDown,
} from 'lucide-react';

const statusConfig: Record<string, { label: string; icon: typeof CheckCircle; className: string }> = {
  draft: { label: 'Borrador', icon: FileText, className: 'bg-muted text-muted-foreground' },
  active: { label: 'Activo', icon: CheckCircle, className: 'bg-success/10 text-success' },
  near_expiration: { label: 'Por vencer', icon: AlertTriangle, className: 'bg-warning/10 text-warning' },
  expired: { label: 'Expirado', icon: XCircle, className: 'bg-destructive/10 text-destructive' },
  cancelled: { label: 'Cancelado', icon: XCircle, className: 'bg-muted text-muted-foreground' },
  terminated: { label: 'Terminado', icon: XCircle, className: 'bg-destructive/10 text-destructive' },
  renewed: { label: 'Renovado', icon: RefreshCw, className: 'bg-info/10 text-info' },
};

const formatDate = (d: string) =>
  new Date(d + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });

const formatCurrency = (amount: number, currency?: string | null) =>
  `${currency === 'USD' ? 'USD' : 'Gs.'} ${Number(amount).toLocaleString('es-PY')}`;

interface ContractDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: ContractWithRelations;
}

export const ContractDetailDialog = ({ open, onOpenChange, contract }: ContractDetailDialogProps) => {
  const { data: history, isLoading: historyLoading } = useContractHistory(open ? contract.id : null);

  const propertyTitle = contract.properties?.title || 'Sin propiedad';
  const clientName = contract.clients?.full_name || contract.tenant_name || 'Sin cliente';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Detalle del Contrato
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-2">
          <div className="space-y-6">
            {/* Contract Info */}
            <div className="rounded-lg border border-border p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-foreground">{propertyTitle}</span>
                {contract.properties?.address && (
                  <span className="text-xs text-muted-foreground">· {contract.properties.address}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-info" />
                <span className="text-sm text-foreground">{clientName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-foreground">
                  {formatDate(contract.start_date)} — {contract.end_date ? formatDate(contract.end_date) : 'Sin fecha fin'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-success" />
                <span className="text-sm text-foreground">
                  {formatCurrency(Number(contract.monthly_rent || 0), contract.currency)}/mes
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Estado:</span>
                {(() => {
                  const s = statusConfig[contract.status || 'draft'];
                  return (
                    <Badge variant="outline" className={`text-xs ${s.className}`}>
                      <s.icon className="w-3 h-3 mr-1" />
                      {s.label}
                    </Badge>
                  );
                })()}
              </div>
              {contract.notes && (
                <div className="pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground">{contract.notes}</p>
                </div>
              )}
            </div>

            {/* Renewal History */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <RefreshCw className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Historial de Renovaciones</h3>
              </div>

              {historyLoading ? (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">Cargando historial...</p>
                </div>
              ) : !history || history.length <= 1 ? (
                <div className="rounded-lg border border-dashed border-border p-4 text-center">
                  <p className="text-sm text-muted-foreground">Este contrato no tiene historial de renovaciones.</p>
                </div>
              ) : (
                <div className="space-y-0">
                  {history.map((item, index) => {
                    const isCurrentContract = item.id === contract.id;
                    const s = statusConfig[item.status || 'draft'];
                    const isLast = index === history.length - 1;

                    return (
                      <div key={item.id}>
                        <div
                          className={`rounded-lg border p-3 transition-colors ${
                            isCurrentContract
                              ? 'border-primary bg-primary/5'
                              : 'border-border'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                isCurrentContract
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted text-muted-foreground'
                              }`}>
                                {index + 1}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-foreground">
                                  {formatDate(item.start_date)} — {item.end_date ? formatDate(item.end_date) : '—'}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {formatCurrency(Number(item.monthly_rent || 0), item.currency)}/mes
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className={`text-xs ${s.className}`}>
                                <s.icon className="w-3 h-3 mr-1" />
                                {s.label}
                              </Badge>
                              {isCurrentContract && (
                                <Badge className="text-xs bg-primary text-primary-foreground">
                                  Actual
                                </Badge>
                              )}
                            </div>
                          </div>
                          {item.notes && (
                            <p className="text-xs text-muted-foreground mt-2 pl-8">{item.notes}</p>
                          )}
                        </div>
                        {!isLast && (
                          <div className="flex justify-center py-1">
                            <ArrowDown className="w-4 h-4 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
