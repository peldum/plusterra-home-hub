import { MessageCircle, FileText, Building2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import type { DisplayClient } from './clientTypes';
import { formatCurrency, formatDate, typeColors, paymentColors, cleanPhone } from './clientUtils';

interface Props {
  clients: DisplayClient[];
}

export const ClientListView = ({ clients }: Props) => (
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
            <TableHead className="w-[100px] text-center">Acciones</TableHead>
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
                <div className="flex items-center justify-center gap-1.5">
                  {client.phone && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <a
                          href={`https://wa.me/${cleanPhone(client.phone)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 bg-info/10 text-info rounded-md hover:bg-info/20 transition-colors"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </a>
                      </TooltipTrigger>
                      <TooltipContent>Contactar por WhatsApp</TooltipContent>
                    </Tooltip>
                  )}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="p-1.5 bg-primary/10 text-primary rounded-md hover:bg-primary/20 transition-colors">
                        <FileText className="w-3.5 h-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Ver contrato / ficha</TooltipContent>
                  </Tooltip>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  </TooltipProvider>
);
