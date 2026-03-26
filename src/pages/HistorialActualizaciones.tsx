import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSystemUpdates, useCreateSystemUpdate, useDeleteSystemUpdate, type SystemUpdate } from '@/hooks/useSystemUpdates';
import { useAuth } from '@/contexts/AuthContext';
import { format, startOfWeek, parseISO, isAfter, isBefore, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { FileDown, Plus, Trash2, Sparkles, Wrench, Zap, Settings, ClipboardList, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import jsPDF from 'jspdf';
import { Navigate } from 'react-router-dom';

const typeConfig: Record<string, { label: string; icon: React.ElementType; color: string; emoji: string }> = {
  mejora: { label: 'Mejora', icon: Sparkles, color: 'bg-blue-500/10 text-blue-600 border-blue-500/20', emoji: '✨' },
  correccion: { label: 'Corrección', icon: Wrench, color: 'bg-amber-500/10 text-amber-600 border-amber-500/20', emoji: '🔧' },
  nueva_funcion: { label: 'Nueva función', icon: Zap, color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', emoji: '🚀' },
  mantenimiento: { label: 'Mantenimiento', icon: Settings, color: 'bg-gray-500/10 text-gray-600 border-gray-500/20', emoji: '⚙️' },
};

/* ── Group updates by week then by day ── */
interface DayGroup {
  date: string;
  dayLabel: string;
  updates: SystemUpdate[];
}
interface WeekGroup {
  weekStart: string;
  weekLabel: string;
  days: DayGroup[];
}

const groupByWeekAndDay = (updates: SystemUpdate[]): WeekGroup[] => {
  const weeks = new Map<string, Map<string, SystemUpdate[]>>();

  for (const u of updates) {
    const d = parseISO(u.created_at);
    const ws = startOfWeek(d, { weekStartsOn: 1 });
    const weekKey = format(ws, 'yyyy-MM-dd');
    const dayKey = format(d, 'yyyy-MM-dd');

    if (!weeks.has(weekKey)) weeks.set(weekKey, new Map());
    const dayMap = weeks.get(weekKey)!;
    if (!dayMap.has(dayKey)) dayMap.set(dayKey, []);
    dayMap.get(dayKey)!.push(u);
  }

  const result: WeekGroup[] = [];
  const sortedWeeks = [...weeks.entries()].sort((a, b) => b[0].localeCompare(a[0]));

  for (const [weekKey, dayMap] of sortedWeeks) {
    const ws = parseISO(weekKey);
    const we = addDays(ws, 6);
    const weekLabel = `Semana del ${format(ws, "d 'de' MMMM yyyy", { locale: es })}`;

    const days: DayGroup[] = [];
    const sortedDays = [...dayMap.entries()].sort((a, b) => b[0].localeCompare(a[0]));

    for (const [dayKey, dayUpdates] of sortedDays) {
      const dd = parseISO(dayKey);
      days.push({
        date: dayKey,
        dayLabel: format(dd, "EEEE d 'de' MMMM", { locale: es }),
        updates: dayUpdates.sort((a, b) => b.created_at.localeCompare(a.created_at)),
      });
    }

    result.push({ weekStart: weekKey, weekLabel, days });
  }

  return result;
};

/* ── PDF Export ── */
const BRAND_BLUE: [number, number, number] = [0, 68, 124];

const exportPDF = (weeks: WeekGroup[]) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pw = doc.internal.pageSize.getWidth();
  const margin = 15;
  const maxW = pw - margin * 2;
  let y = 15;

  const checkPage = (need: number) => {
    if (y + need > doc.internal.pageSize.getHeight() - 15) {
      doc.addPage();
      y = 15;
    }
  };

  // Header
  doc.setFillColor(...BRAND_BLUE);
  doc.rect(0, 0, pw, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('HISTORIAL DE ACTUALIZACIONES DEL SISTEMA', pw / 2, 12, { align: 'center' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`PLUSTERRA — Generado el ${format(new Date(), "d 'de' MMMM yyyy, HH:mm", { locale: es })}`, pw / 2, 20, { align: 'center' });
  y = 35;

  // Stats
  const totalUpdates = weeks.reduce((s, w) => s + w.days.reduce((s2, d) => s2 + d.updates.length, 0), 0);
  doc.setTextColor(80, 80, 80);
  doc.setFontSize(10);
  doc.text(`Total de actualizaciones: ${totalUpdates}`, margin, y);
  y += 8;

  for (const week of weeks) {
    checkPage(14);
    // Week header
    doc.setFillColor(230, 240, 250);
    doc.rect(margin, y - 4, maxW, 8, 'F');
    doc.setTextColor(...BRAND_BLUE);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`📅 ${week.weekLabel.toUpperCase()}`, margin + 2, y + 1);
    y += 10;

    for (const day of week.days) {
      checkPage(10);
      doc.setTextColor(60, 60, 60);
      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'bold');
      const capitalDay = day.dayLabel.charAt(0).toUpperCase() + day.dayLabel.slice(1);
      doc.text(`▸ ${capitalDay}`, margin + 2, y);
      y += 6;

      for (const u of day.updates) {
        const cfg = typeConfig[u.update_type] || typeConfig.mejora;
        checkPage(12);

        // Type badge
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...BRAND_BLUE);
        doc.text(`${cfg.emoji} [${cfg.label.toUpperCase()}]`, margin + 4, y);

        // Title
        doc.setFontSize(9);
        doc.setTextColor(30, 30, 30);
        const titleX = margin + 4 + doc.getTextWidth(`${cfg.emoji} [${cfg.label.toUpperCase()}] `);
        doc.text(u.title, titleX, y);
        if (u.version) {
          doc.setFontSize(7);
          doc.setTextColor(120, 120, 120);
          doc.text(`v${u.version}`, titleX + doc.getTextWidth(u.title + ' '), y);
        }
        y += 5;

        // Description lines
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(80, 80, 80);
        const descLines = doc.splitTextToSize(u.description, maxW - 10);
        for (const line of descLines) {
          checkPage(5);
          doc.text(`  ${line}`, margin + 6, y);
          y += 4;
        }
        y += 3;
      }
      y += 2;
    }
    y += 4;
  }

  // Footer
  const ph = doc.internal.pageSize.getHeight();
  doc.setFontSize(7);
  doc.setTextColor(160, 160, 160);
  doc.text('Plusterra © — Documento confidencial', pw / 2, ph - 6, { align: 'center' });

  doc.save(`Historial_Actualizaciones_Plusterra_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
};

/* ── Page ── */
const HistorialActualizaciones = () => {
  const { role } = useAuth();
  const { data: updates = [], isLoading } = useSystemUpdates();
  const deleteUpdate = useDeleteSystemUpdate();
  const [showForm, setShowForm] = useState(false);
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set());

  const weeks = useMemo(() => groupByWeekAndDay(updates), [updates]);

  const effectiveExpanded = useMemo(() => {
    if (expandedWeeks.size > 0) return expandedWeeks;
    const auto = new Set<string>();
    weeks.slice(0, 2).forEach(w => auto.add(w.weekStart));
    return auto;
  }, [weeks, expandedWeeks]);

  // Only superadmin
  if (role && role !== 'superadmin') {
    return <Navigate to="/acceso-denegado" replace />;
  }


  const toggleWeek = (key: string) => {
    setExpandedWeeks(prev => {
      const next = new Set(effectiveExpanded);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const totalCount = updates.length;

  return (
    <MainLayout title="Historial de Actualizaciones">
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <ClipboardList className="w-6 h-6 text-primary" />
              Historial de Actualizaciones
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Registro completo de cambios del sistema — Solo SuperAdmin
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => exportPDF(weeks)} disabled={updates.length === 0}>
              <FileDown className="w-4 h-4 mr-2" />
              Exportar PDF
            </Button>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Agregar Cambio
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-primary">{totalCount}</p>
              <p className="text-xs text-muted-foreground">Total cambios</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-emerald-600">{updates.filter(u => u.update_type === 'nueva_funcion').length}</p>
              <p className="text-xs text-muted-foreground">Nuevas funciones</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{updates.filter(u => u.update_type === 'mejora').length}</p>
              <p className="text-xs text-muted-foreground">Mejoras</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-amber-600">{updates.filter(u => u.update_type === 'correccion').length}</p>
              <p className="text-xs text-muted-foreground">Correcciones</p>
            </CardContent>
          </Card>
        </div>

        {/* Timeline */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : weeks.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <ClipboardList className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No hay actualizaciones registradas</p>
              <Button className="mt-4" onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4 mr-2" /> Agregar primer cambio
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {weeks.map(week => {
              const isOpen = effectiveExpanded.has(week.weekStart);
              const weekTotal = week.days.reduce((s, d) => s + d.updates.length, 0);

              return (
                <Card key={week.weekStart} className="overflow-hidden">
                  <button
                    onClick={() => toggleWeek(week.weekStart)}
                    className="w-full flex items-center justify-between p-4 hover:bg-accent/50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      {isOpen ? <ChevronDown className="w-5 h-5 text-primary" /> : <ChevronRight className="w-5 h-5 text-muted-foreground" />}
                      <span className="font-semibold text-foreground">📅 {week.weekLabel}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">{weekTotal} cambio{weekTotal !== 1 ? 's' : ''}</Badge>
                  </button>

                  {isOpen && (
                    <CardContent className="pt-0 pb-4 px-4 space-y-4">
                      {week.days.map(day => (
                        <div key={day.date}>
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-2 h-2 rounded-full bg-primary" />
                            <span className="text-sm font-semibold text-foreground capitalize">{day.dayLabel}</span>
                            <Badge variant="outline" className="text-[10px]">{day.updates.length}</Badge>
                          </div>

                          <div className="ml-4 border-l-2 border-primary/20 pl-4 space-y-3">
                            {day.updates.map(u => {
                              const cfg = typeConfig[u.update_type] || typeConfig.mejora;
                              const Icon = cfg.icon;

                              return (
                                <div key={u.id} className="group relative bg-card border border-border rounded-lg p-3 hover:shadow-sm transition-shadow">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <Badge variant="outline" className={`text-[10px] gap-1 ${cfg.color}`}>
                                        <Icon className="w-3 h-3" />
                                        {cfg.label}
                                      </Badge>
                                      {u.version && (
                                        <Badge variant="outline" className="text-[10px] text-muted-foreground">v{u.version}</Badge>
                                      )}
                                      <span className="text-[10px] text-muted-foreground">
                                        {format(parseISO(u.created_at), 'HH:mm')}
                                      </span>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                      onClick={() => deleteUpdate.mutate(u.id)}
                                    >
                                      <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                                    </Button>
                                  </div>
                                  <h4 className="text-sm font-semibold text-foreground mt-1.5">✅ {u.title}</h4>
                                  <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap leading-relaxed">{u.description}</p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <AddChangeDialog open={showForm} onClose={() => setShowForm(false)} />
    </MainLayout>
  );
};

/* ── Add Change Dialog ── */
const AddChangeDialog = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const createUpdate = useCreateSystemUpdate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [updateType, setUpdateType] = useState('mejora');
  const [version, setVersion] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) return;
    setSaving(true);
    await createUpdate.mutateAsync({ title, description, update_type: updateType, version: version || undefined });
    setSaving(false);
    setTitle(''); setDescription(''); setUpdateType('mejora'); setVersion('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" />
            Agregar Cambio al Historial
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Título del cambio *</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ej: Consolidado Mensual — nuevas columnas" />
          </div>
          <div>
            <Label>Descripción detallada *</Label>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={6}
              placeholder={`Ej:\n- Columna IVA 5% (manual con check + monto)\n- Columna "Destino Expensas"\n- Círculos de checklist más pequeños`}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Tipo</Label>
              <Select value={updateType} onValueChange={setUpdateType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mejora">✨ Mejora</SelectItem>
                  <SelectItem value="correccion">🔧 Corrección</SelectItem>
                  <SelectItem value="nueva_funcion">🚀 Nueva función</SelectItem>
                  <SelectItem value="mantenimiento">⚙️ Mantenimiento</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Versión (opcional)</Label>
              <Input value={version} onChange={e => setVersion(e.target.value)} placeholder="ej. 2.5.0" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving || !title.trim() || !description.trim()}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
            Agregar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default HistorialActualizaciones;
