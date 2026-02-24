import { PipelineDeal, getStageLabel, PipelineType } from '@/hooks/usePipelineDeals';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageCircle, Calendar, ArrowRightLeft, Pencil, User } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';

interface Props {
  deal: PipelineDeal;
  pipelineType: PipelineType;
  onEdit: (deal: PipelineDeal) => void;
  onChangeStage: (deal: PipelineDeal) => void;
}

export const PipelineDealCard = ({ deal, pipelineType, onEdit, onChangeStage }: Props) => {
  const { profile, role } = useAuth();
  const agentName = profile?.full_name ?? 'Agente';
  const isAdminView = role === 'admin' || role === 'superadmin';

  const whatsappMsg = encodeURIComponent(
    `Hola ${deal.client_name ?? ''}, soy ${agentName}. Coordinamos sobre ${deal.property_title_snap ?? 'la propiedad'}.`
  );
  const whatsappUrl = deal.client_phone
    ? `https://wa.me/${deal.client_phone.replace(/\D/g, '')}?text=${whatsappMsg}`
    : null;

  return (
    <Card className="p-3 space-y-2 shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing">
      {/* Client */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm truncate">{deal.client_name || 'Sin cliente'}</p>
          {deal.client_phone && (
            <p className="text-xs text-muted-foreground truncate">{deal.client_phone}</p>
          )}
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(deal)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 md:hidden" onClick={() => onChangeStage(deal)}>
            <ArrowRightLeft className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Property */}
      {deal.property_title_snap && (
        <p className="text-xs text-muted-foreground truncate">🏠 {deal.property_title_snap}</p>
      )}

      {/* Next action */}
      {deal.next_action_date && (
        <div className="flex items-center gap-1 text-xs text-primary">
          <Calendar className="h-3 w-3" />
          <span>{format(new Date(deal.next_action_date), 'dd MMM yyyy', { locale: es })}</span>
        </div>
      )}

      {/* Agent name (admin/superadmin only) */}
      {isAdminView && deal.agent_name && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <User className="h-3 w-3" />
          <span className="truncate">{deal.agent_name}</span>
        </div>
      )}

      {/* Chips */}
      <div className="flex flex-wrap gap-1">
        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
          {pipelineType === 'ALQUILER' ? '🔑 Alquiler' : '🏷️ Venta'}
        </Badge>
        {deal.property_id && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Propiedad</Badge>
        )}
      </div>

      {/* WhatsApp */}
      {whatsappUrl && (
        <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
          <Button variant="outline" size="sm" className="w-full h-7 text-xs gap-1">
            <MessageCircle className="h-3 w-3" /> WhatsApp
          </Button>
        </a>
      )}
    </Card>
  );
};
