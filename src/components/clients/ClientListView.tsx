import { FileText, Building2, Edit, Trash2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon';
import { useNavigate } from 'react-router-dom';
import type { DisplayClient } from './clientTypes';
import { formatCurrency, formatDate, typeColors, paymentColors, cleanPhone } from './clientUtils';

interface Props {
  clients: DisplayClient[];
  onEdit?: (client: DisplayClient) => void;
  onDelete?: (client: DisplayClient) => void;
}

export const ClientListView = ({ clients, onEdit, onDelete }: Props) => {
  const navigate = useNavigate();

  const handleWhatsApp = (e: React.MouseEvent, phone: string) => {
    e.stopPropagation();
    window.location.href = `https://wa.me/${cleanPhone(phone)}`;
  };

  const handleContract = (e: React.MouseEvent, client: DisplayClient) => {
    e.stopPropagation();
    if (client.contractId) navigate('/contratos');
  };

  return (
    <TooltipProvider>
      <div className="rounded-xl border border-border overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="w-[220px]">Cliente</TableHead>
              <TableHead className="w-[100px]">Tipo</TableHead>
              <TableHead>Edificio / Unidad</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead className="text-right">Monto/mes</TableHead>
              <TableHead>Vencimiento</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-[140px] text-center">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.map((client, index) => (
              <TableRow
                key={client.id}
                className={`transition-colors hover:bg-muted/40 ${index % 2 === 0 ? '' : 'bg-muted/10'}`}
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-xs font-semibold text-primary">{client.avatar}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground text-sm truncate">{client.name}</p>
                      {client.email && (
                        <p className="text-xs text-muted-foreground truncate">{client.email}</p>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className={`badge-status text-xs border ${typeColors[client.type] || 'bg-muted text-muted-foreground'}`}>
                    {client.type}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {client.buildingName ? (
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="truncate">{client.buildingName}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground truncate block">{client.property}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">{client.phone || '—'}</span>
                </TableCell>
                <TableCell className="text-right">
                  <span className="text-sm font-medium">
                    {client.source === 'contract' ? formatCurrency(client.monthlyRent, client.currency) : '—'}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {client.source === 'contract' ? formatDate(client.endDate) : '—'}
                  </span>
                </TableCell>
                <TableCell>
                  <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${paymentColors[client.paymentStatus]?.class || paymentColors.na.class}`}>
                    {paymentColors[client.paymentStatus]?.icon || '⚪'} {paymentColors[client.paymentStatus]?.label || 'Sin cobros'}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-center gap-1">
                    {client.phone && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={(e) => handleWhatsApp(e, client.phone)}
                            className="p-1.5 bg-[#25D366]/10 text-[#25D366] rounded-md hover:bg-[#25D366]/20 transition-colors"
                          >
                            <WhatsAppIcon className="w-3.5 h-3.5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>WhatsApp</TooltipContent>
                      </Tooltip>
                    )}
                    {client.contractId && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={(e) => handleContract(e, client)}
                            className="p-1.5 bg-primary/10 text-primary rounded-md hover:bg-primary/20 transition-colors"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>Ver contrato</TooltipContent>
                      </Tooltip>
                    )}
                    {client.source === 'clients' && onEdit && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={(e) => { e.stopPropagation(); onEdit(client); }}
                            className="p-1.5 bg-accent text-accent-foreground rounded-md hover:bg-accent/80 transition-colors"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>Editar</TooltipContent>
                      </Tooltip>
                    )}
                    {client.source === 'clients' && onDelete && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={(e) => { e.stopPropagation(); onDelete(client); }}
                            className="p-1.5 bg-destructive/10 text-destructive rounded-md hover:bg-destructive/20 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>Eliminar</TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  );
};
