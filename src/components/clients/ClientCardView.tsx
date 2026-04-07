import { Mail, Phone, MapPin, DollarSign, CalendarClock, FileText, Building2, Edit, Trash2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon';
import { useNavigate } from 'react-router-dom';
import type { DisplayClient } from './clientTypes';
import { formatCurrency, formatDate, typeColors, paymentColors, cleanPhone } from './clientUtils';

interface Props {
  clients: DisplayClient[];
  onEdit?: (client: DisplayClient) => void;
  onDelete?: (client: DisplayClient) => void;
}

export const ClientCardView = ({ clients, onEdit, onDelete }: Props) => {
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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
      {clients.map((client, index) => (
        <div
          key={client.id}
          className="bg-card border border-border rounded-xl p-5 md:p-6 hover:shadow-lg transition-all duration-300 animate-scale-in opacity-0"
          style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'forwards' }}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 md:w-12 md:h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-sm font-semibold text-primary">{client.avatar}</span>
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-foreground text-base truncate">{client.name}</h3>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  <span className={`badge-status text-xs border ${typeColors[client.type] || 'bg-muted text-muted-foreground'}`}>
                    {client.type}
                  </span>
                  {client.source === 'contract' && (
                    <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Contrato</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2 mb-3">
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
            {client.buildingName && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Building2 className="w-4 h-4 shrink-0" />
                <span className="truncate">{client.buildingName}</span>
              </div>
            )}
          </div>

          {client.source === 'contract' && (
            <div className="space-y-1.5 mb-3 p-3 rounded-lg bg-muted/50 border border-border">
              <div className="flex items-center gap-2 text-sm">
                <DollarSign className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="font-medium text-foreground">
                  {formatCurrency(client.monthlyRent, client.currency)}
                </span>
                <span className="text-muted-foreground text-xs">/mes</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CalendarClock className="w-3.5 h-3.5 shrink-0" />
                <span>{formatDate(client.startDate)} → {formatDate(client.endDate)}</span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-3 border-t border-border">
            <div>
              <p className="text-xs text-muted-foreground">Estado financiero</p>
              <span className={`inline-flex items-center gap-1 badge-status text-xs mt-1 ${paymentColors[client.paymentStatus]?.class || paymentColors.na.class}`}>
                {paymentColors[client.paymentStatus]?.icon || '⚪'} {paymentColors[client.paymentStatus]?.label || 'Sin cobros'}
              </span>
            </div>
            <TooltipProvider>
              <div className="flex items-center gap-1">
                {client.phone && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={(e) => handleWhatsApp(e, client.phone)}
                        className="p-2 bg-[#25D366]/10 text-[#25D366] rounded-lg hover:bg-[#25D366]/20 transition-colors"
                      >
                        <WhatsAppIcon className="w-4 h-4" />
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
                        className="p-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
                      >
                        <FileText className="w-4 h-4" />
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
                        className="p-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/80 transition-colors"
                      >
                        <Edit className="w-4 h-4" />
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
                        className="p-2 bg-destructive/10 text-destructive rounded-lg hover:bg-destructive/20 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Eliminar</TooltipContent>
                  </Tooltip>
                )}
              </div>
            </TooltipProvider>
          </div>
        </div>
      ))}
    </div>
  );
};
