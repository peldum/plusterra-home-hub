import { PipelineDeal, PipelineType, getStageLabel } from '@/hooks/usePipelineDeals';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Normalize a Paraguayan phone number to +595 format.
 * Returns null if the number is invalid.
 */
export const normalizeParaguayPhone = (phone: string): string | null => {
  if (!phone) return null;
  let cleaned = phone.replace(/[\s\-().]/g, '');

  // Already has +595
  if (/^\+595\d{9,10}$/.test(cleaned)) return cleaned;

  // Has 595 without +
  if (/^595\d{9,10}$/.test(cleaned)) return `+${cleaned}`;

  // Starts with 0 (local format: 0981...)
  if (/^0\d{9,10}$/.test(cleaned)) return `+595${cleaned.substring(1)}`;

  // Just digits, likely missing prefix (981...)
  if (/^\d{9,10}$/.test(cleaned)) return `+595${cleaned}`;

  return null;
};

/**
 * Build a WhatsApp message based on deal stage and type.
 */
export const buildWhatsAppMessage = (
  deal: PipelineDeal,
  pipelineType: PipelineType,
  agentName: string
): string => {
  const name = deal.client_name ?? 'cliente';
  const isExternal = deal.opportunity_type === 'external';
  const propertyRef = deal.property_title_snap ?? 'la propiedad';
  const tipoOp = pipelineType === 'ALQUILER' ? 'alquiler' : 'venta';

  if (isExternal) {
    const motivo = deal.service_reason ?? 'tu consulta';
    const fecha = deal.follow_up_date
      ? new Date(deal.follow_up_date).toLocaleDateString('es-PY')
      : 'esta semana';
    return `Hola ${name}, soy ${agentName} de Plusterra. Sobre ${motivo}: ¿te parece si coordinamos una reunión para el ${fecha}?`;
  }

  switch (deal.stage) {
    case 'nuevo_lead':
      return `Hola ${name}, soy ${agentName} de Plusterra. Vi tu consulta y quería ayudarte. ¿Qué día/hora te queda bien para coordinar?`;

    case 'contactado':
      return `Hola ${name}, para avanzar te consulto: ¿buscás ${tipoOp}? ¿Preferís alguna zona o presupuesto? Así te paso opciones.`;

    case 'visita_agendada': {
      const fecha = deal.next_action_date
        ? new Date(deal.next_action_date).toLocaleDateString('es-PY')
        : 'pronto';
      return `Hola ${name}, confirmado: visita el ${fecha} para ${propertyRef}. Cualquier cosa me avisás por acá.`;
    }

    case 'en_negociacion':
    case 'oferta_negociacion':
      return `Hola ${name}, ¿cómo vamos? Si querés te envío el resumen de condiciones y los requisitos para cerrar.`;

    case 'reservado':
    case 'sena_reserva':
      return `Hola ${name}, tu reserva está registrada. Para confirmar necesitamos la documentación/seña. ¿Te paso los datos?`;

    case 'contrato_preparacion':
    case 'documentacion_credito':
      return `Hola ${name}, estamos preparando todo. Te aviso apenas tengamos las novedades. ¿Tenés alguna consulta?`;

    case 'cerrado':
      return `¡Felicitaciones ${name}! Ya quedó todo cerrado. Quedo atento por cualquier detalle. 🎉`;

    case 'caido':
      return `Hola ${name}, soy ${agentName} de Plusterra. Si en algún momento retomás la búsqueda, no dudes en escribirme.`;

    default:
      return `Hola ${name}, soy ${agentName} de Plusterra. ¿Podemos coordinar sobre ${propertyRef}?`;
  }
};

/**
 * Open WhatsApp for a deal. Returns false if phone is missing/invalid.
 */
export const openDealWhatsApp = async (
  deal: PipelineDeal,
  pipelineType: PipelineType,
  agentName: string,
  userId: string
): Promise<boolean> => {
  if (!deal.client_phone?.trim()) {
    toast.error('Falta teléfono del cliente');
    return false;
  }

  const normalized = normalizeParaguayPhone(deal.client_phone);
  if (!normalized) {
    toast.error('Número inválido – no se pudo normalizar');
    return false;
  }

  const message = buildWhatsAppMessage(deal, pipelineType, agentName);
  const url = `https://wa.me/${normalized.replace('+', '')}?text=${encodeURIComponent(message)}`;

  // Audit log (fire-and-forget)
  supabase
    .from('audit_logs')
    .insert({
      user_id: userId,
      action: 'open_whatsapp',
      target_table: 'pipeline_deals',
      target_id: deal.id,
      new_data: { stage: deal.stage, pipeline_type: pipelineType },
    } as any)
    .then(() => {});

  window.open(url, '_blank', 'noopener,noreferrer');
  return true;
};
