import { Mail, Phone, MapPin, DollarSign, CalendarClock, MessageCircle, FileText, Building2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import type { DisplayClient } from './clientTypes';
import { formatCurrency, formatDate, typeColors, paymentColors, cleanPhone } from './clientUtils';

interface Props {
  clients: DisplayClient[];
}

export const ClientCardView = ({ clients }: Props) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {clients.map((client, index) => (
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

        <div className="space-y-2 mb-4">
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
          <div className="space-y-1.5 mb-4 p-3 rounded-lg bg-muted/50 border border-border">
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

        <div className="flex items-center justify-between pt-4 border-t border-border">
          <div>
            <p className="text-xs text-muted-foreground">Estado financiero</p>
            <span className={`inline-flex items-center gap-1 badge-status text-xs mt-1 ${paymentColors[client.paymentStatus]?.class || paymentColors.na.class}`}>
              {paymentColors[client.paymentStatus]?.icon || '⚪'} {paymentColors[client.paymentStatus]?.label || 'Sin cobros'}
            </span>
          </div>
          <TooltipProvider>
            <div className="flex items-center gap-2">
              {client.phone && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <a
                      href={`https://wa.me/${cleanPhone(client.phone)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-info/10 text-info rounded-lg hover:bg-info/20 transition-colors"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </a>
                  </TooltipTrigger>
                  <TooltipContent>Contactar por WhatsApp</TooltipContent>
                </Tooltip>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="p-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors">
                    <FileText className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Ver contrato / ficha</TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        </div>
      </div>
    ))}
  </div>
);
