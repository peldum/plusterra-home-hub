import { useState } from 'react';
import { PipelineDeal, getStageLabel, PipelineType, useDeletePipelineDeal } from '@/hooks/usePipelineDeals';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { MessageCircle, Calendar, ArrowRightLeft, Pencil, User, Trash2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { openDealWhatsApp } from '@/lib/pipelineWhatsApp';
import { toast } from 'sonner';

interface Props {
  deal: PipelineDeal;
  pipelineType: PipelineType;
  onEdit: (deal: PipelineDeal) => void;
  onChangeStage: (deal: PipelineDeal) => void;
}

export const PipelineDealCard = ({ deal, pipelineType, onEdit, onChangeStage }: Props) => {
  const { user, profile, role } = useAuth();
  const agentName = profile?.full_name ?? 'Agente';
  const isAdminView = role === 'admin' || role === 'superadmin' || role === 'accounting';
  const canDelete = role === 'admin' || role === 'superadmin' || role === 'accounting';
  const deleteMutation = useDeletePipelineDeal();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleWhatsApp = () => {
    if (!user) return;
    openDealWhatsApp(deal, pipelineType, agentName, user.id);
  };

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
        <div className="flex gap-0.5 flex-shrink-0">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleWhatsApp} title="WhatsApp">
            <MessageCircle className="h-3.5 w-3.5 text-green-600" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(deal)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 md:hidden" onClick={() => onChangeStage(deal)}>
            <ArrowRightLeft className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* External badge */}
      {deal.opportunity_type === 'external' && (
        <Badge className="text-[10px] px-1.5 py-0 bg-orange-500 hover:bg-orange-600 text-white">EXTERNO</Badge>
      )}

      {/* Property */}
      {deal.property_title_snap && (
        <p className="text-xs text-muted-foreground truncate">🏠 {deal.property_title_snap}</p>
      )}

      {/* Service reason for external */}
      {deal.opportunity_type === 'external' && deal.service_reason && (
        <p className="text-xs text-muted-foreground truncate">📋 {deal.service_reason}</p>
      )}

      {/* Next action */}
      {deal.next_action_date && (
        <div className="flex items-center gap-1 text-xs text-primary">
          <Calendar className="h-3 w-3" />
          <span>{format(new Date(deal.next_action_date), 'dd MMM yyyy', { locale: es })}</span>
        </div>
      )}

      {/* Follow-up date for external */}
      {deal.follow_up_date && !deal.next_action_date && (
        <div className="flex items-center gap-1 text-xs text-primary">
          <Calendar className="h-3 w-3" />
          <span>{format(new Date(deal.follow_up_date), 'dd MMM yyyy', { locale: es })}</span>
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
    </Card>
  );
};
