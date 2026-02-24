import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, MessageSquare, Globe, Share2, Wrench, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  PropertyReport,
  DiffusionData,
  AdjustmentsData,
  DEFAULT_DIFFUSION,
  DEFAULT_ADJUSTMENTS,
  useCreatePropertyReport,
  useUpdatePropertyReport,
  useReportComments,
  useAddReportComment,
  useDeleteReportComment,
} from '@/hooks/usePropertyReports';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report?: PropertyReport | null;
}

export const PropertyReportFormDialog = ({ open, onOpenChange, report }: Props) => {
  const { user, profile, role } = useAuth();
  const isEdit = !!report;
  const canEdit = role === 'agent' || role === 'admin' || role === 'superadmin';

  const createReport = useCreatePropertyReport();
  const updateReport = useUpdatePropertyReport();
  const { data: comments = [] } = useReportComments(report?.id ?? null);
  const addComment = useAddReportComment();
  const deleteComment = useDeleteReportComment();

  // Form state
  const [propertyId, setPropertyId] = useState('');
  const [period, setPeriod] = useState('');
  const [diffusion, setDiffusion] = useState<DiffusionData>(DEFAULT_DIFFUSION);
  const [adjustments, setAdjustments] = useState<AdjustmentsData>(DEFAULT_ADJUSTMENTS);
  const [agentRecommendation, setAgentRecommendation] = useState('');
  const [finalComment, setFinalComment] = useState('');
  const [newComment, setNewComment] = useState('');
  const [properties, setProperties] = useState<{ id: string; title: string; property_code: string }[]>([]);

  useEffect(() => {
    if (!open) return;

    supabase
      .from('properties')
      .select('id, title, property_code')
      .order('title')
      .then(({ data }) => setProperties(data ?? []));

    if (report) {
      setPropertyId(report.property_id);
      setPeriod(report.period);
      setDiffusion(report.diffusion);
      setAdjustments(report.adjustments);
      setAgentRecommendation(report.agent_recommendation ?? '');
      setFinalComment(report.final_comment ?? '');
    } else {
      setPropertyId('');
      setPeriod(format(new Date(), 'yyyy-MM'));
      setDiffusion(DEFAULT_DIFFUSION);
      setAdjustments(DEFAULT_ADJUSTMENTS);
      setAgentRecommendation('');
      setFinalComment('');
    }
    setNewComment('');
  }, [open, report]);

  const handleSubmit = () => {
    if (!propertyId || !period) return;

    const payload: any = {
      property_id: propertyId,
      agent_id: user!.id,
      period,
      diffusion,
      adjustments,
      agent_recommendation: agentRecommendation.trim() || null,
      final_comment: finalComment.trim() || null,
    };

    if (isEdit) {
      updateReport.mutate({ id: report!.id, ...payload }, { onSuccess: () => onOpenChange(false) });
    } else {
      createReport.mutate(payload, { onSuccess: () => onOpenChange(false) });
    }
  };

  const handleAddComment = () => {
    if (!newComment.trim() || !report?.id) return;
    addComment.mutate({
      report_id: report.id,
      comment_text: newComment.trim(),
      agent_id: user!.id,
      agent_name: profile?.full_name ?? '',
    });
    setNewComment('');
  };

  const isPending = createReport.isPending || updateReport.isPending;

  const updateDiffusion = (key: string, value: any) => {
    setDiffusion(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>{isEdit ? 'Editar Reporte Comercial' : 'Nuevo Reporte Comercial'}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-140px)] px-6">
          <div className="space-y-5 py-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Propiedad *</Label>
                <Select value={propertyId} onValueChange={setPropertyId} disabled={isEdit}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar propiedad" />
                  </SelectTrigger>
                  <SelectContent>
                    {properties.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.property_code} – {p.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Período *</Label>
                <Input type="month" value={period} onChange={e => setPeriod(e.target.value)} />
              </div>
            </div>

            {/* Section 1: Client Comments (only in edit mode) */}
            {isEdit && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Comentarios de Clientes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {comments.map(c => (
                    <div key={c.id} className="flex items-start gap-2 p-2 rounded bg-muted/40 text-sm">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">
                          {c.agent_name} · {format(new Date(c.comment_date), 'dd MMM yyyy', { locale: es })}
                        </p>
                        <p className="mt-0.5">{c.comment_text}</p>
                      </div>
                      {(c.agent_id === user?.id || role === 'admin' || role === 'superadmin') && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 flex-shrink-0"
                          onClick={() => deleteComment.mutate({ id: c.id, reportId: report!.id })}
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      )}
                    </div>
                  ))}
                  {comments.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-2">Sin comentarios aún</p>
                  )}
                  {canEdit && (
                    <div className="flex gap-2">
                      <Input
                        value={newComment}
                        onChange={e => setNewComment(e.target.value)}
                        placeholder="Agregar comentario de cliente..."
                        className="text-sm"
                        onKeyDown={e => e.key === 'Enter' && handleAddComment()}
                      />
                      <Button size="sm" onClick={handleAddComment} disabled={!newComment.trim()}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Section 2: Diffusion */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Acciones de Difusión
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Portales */}
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={diffusion.portales.active}
                    onCheckedChange={v => updateDiffusion('portales', { ...diffusion.portales, active: !!v })}
                  />
                  <Label className="text-xs flex-shrink-0 w-36">Portales inmobiliarios</Label>
                  <Input
                    value={diffusion.portales.url}
                    onChange={e => updateDiffusion('portales', { ...diffusion.portales, url: e.target.value })}
                    placeholder="URL (opcional)"
                    className="text-xs h-8"
                    disabled={!diffusion.portales.active}
                  />
                </div>

                {/* Web propia */}
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={diffusion.web_propia.active}
                    onCheckedChange={v => updateDiffusion('web_propia', { ...diffusion.web_propia, active: !!v })}
                  />
                  <Label className="text-xs flex-shrink-0 w-36">Página web propia</Label>
                  <Input
                    value={diffusion.web_propia.url}
                    onChange={e => updateDiffusion('web_propia', { ...diffusion.web_propia, url: e.target.value })}
                    placeholder="URL (opcional)"
                    className="text-xs h-8"
                    disabled={!diffusion.web_propia.active}
                  />
                </div>

                {/* Facebook */}
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={diffusion.facebook.active}
                    onCheckedChange={v => updateDiffusion('facebook', { ...diffusion.facebook, active: !!v })}
                  />
                  <Label className="text-xs flex-shrink-0 w-36">Facebook</Label>
                  <Input
                    value={diffusion.facebook.url}
                    onChange={e => updateDiffusion('facebook', { ...diffusion.facebook, url: e.target.value })}
                    placeholder="URL (opcional)"
                    className="text-xs h-8"
                    disabled={!diffusion.facebook.active}
                  />
                </div>

                {/* Instagram */}
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={diffusion.instagram.active}
                    onCheckedChange={v => updateDiffusion('instagram', { ...diffusion.instagram, active: !!v })}
                  />
                  <Label className="text-xs flex-shrink-0 w-36">Instagram</Label>
                  <Input
                    value={diffusion.instagram.url}
                    onChange={e => updateDiffusion('instagram', { ...diffusion.instagram, url: e.target.value })}
                    placeholder="URL (opcional)"
                    className="text-xs h-8"
                    disabled={!diffusion.instagram.active}
                  />
                </div>

                {/* WhatsApp */}
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={diffusion.whatsapp}
                    onCheckedChange={v => updateDiffusion('whatsapp', !!v)}
                  />
                  <Label className="text-xs">Difusión por WhatsApp</Label>
                </div>

                {/* Cartelería */}
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={diffusion.carteleria.active}
                      onCheckedChange={v => updateDiffusion('carteleria', { ...diffusion.carteleria, active: !!v })}
                    />
                    <Label className="text-xs">Cartelería física</Label>
                  </div>
                  {diffusion.carteleria.active && (
                    <Input
                      value={diffusion.carteleria.observacion}
                      onChange={e => updateDiffusion('carteleria', { ...diffusion.carteleria, observacion: e.target.value })}
                      placeholder="Observación sobre cartelería..."
                      className="text-xs h-8 ml-7"
                    />
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Section 3: Management Tracking */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Wrench className="h-4 w-4" />
                  Seguimiento de Gestión
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Label className="text-xs text-muted-foreground">Ajustes realizados:</Label>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={adjustments.precio}
                      onCheckedChange={v => setAdjustments(p => ({ ...p, precio: !!v }))}
                    />
                    <Label className="text-xs">Precio</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={adjustments.condiciones}
                      onCheckedChange={v => setAdjustments(p => ({ ...p, condiciones: !!v }))}
                    />
                    <Label className="text-xs">Condiciones</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={adjustments.presentacion}
                      onCheckedChange={v => setAdjustments(p => ({ ...p, presentacion: !!v }))}
                    />
                    <Label className="text-xs">Presentación</Label>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Recomendación del agente para el próximo período</Label>
                  <Textarea
                    value={agentRecommendation}
                    onChange={e => setAgentRecommendation(e.target.value)}
                    rows={2}
                    placeholder="Ej: Se recomienda ajustar el precio un 5% para mayor competitividad..."
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Comentario final de la inmobiliaria al propietario</Label>
                  <Textarea
                    value={finalComment}
                    onChange={e => setFinalComment(e.target.value)}
                    rows={3}
                    placeholder="Resumen de la gestión realizada y próximos pasos..."
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>

        <DialogFooter className="p-6 pt-3 border-t">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button size="sm" disabled={!propertyId || !period || isPending} onClick={handleSubmit}>
            {isPending ? 'Guardando...' : isEdit ? 'Guardar' : 'Crear Reporte'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
