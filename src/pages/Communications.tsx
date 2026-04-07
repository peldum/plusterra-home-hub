import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  useAvisos,
  useCreateAviso,
  useDeleteAviso,
  useEventos,
  useCreateEvento,
  type Aviso,
  type EventoInterno,
} from '@/hooks/useCommunications';
import { useAgents } from '@/hooks/useAgents';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Megaphone, Pin, Plus, Calendar, Clock, Trash2, AlertTriangle, ChevronLeft, ChevronRight, BarChart3, CheckCheck, ArrowLeft, MapPin, ChevronDown, ChevronUp } from 'lucide-react';
import { useMarkAllNotificationsRead as useMarkAllRead } from '@/hooks/useNotifications';
import { useMarkAvisoRead, useAvisoLecturas } from '@/hooks/useNotifications';
import { AvisoDeliveryReport } from '@/components/notifications/AvisoDeliveryReport';
import { formatDistanceToNow, format, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isToday, differenceInHours, differenceInDays, isPast } from 'date-fns';
import { es } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

const Communications = () => {
  const { user, role, isAdmin } = useAuth();
  const navigate = useNavigate();
  const canManage = true; // All roles can now create avisos
  const canDelete = role === 'superadmin' || role === 'admin' || role === 'accounting' || role === 'secretaria';
  const canManageEvents = role === 'superadmin' || role === 'admin' || role === 'accounting' || role === 'secretaria';
  const { data: avisos = [], isLoading: loadingAvisos } = useAvisos();
  const { data: eventos = [], isLoading: loadingEventos } = useEventos();
  const createAviso = useCreateAviso();
  const deleteAviso = useDeleteAviso();
  const createEvento = useCreateEvento();
  const markAllRead = useMarkAllRead();
  const markAvisoRead = useMarkAvisoRead();
  const { data: agentsData } = useAgents();
  const agents = agentsData || [];

  const [showAvisoDialog, setShowAvisoDialog] = useState(false);
  const [showEventoDialog, setShowEventoDialog] = useState(false);
  const [calMonth, setCalMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [reportAviso, setReportAviso] = useState<Aviso | null>(null);

  // Mark notifications as read on mount
  useEffect(() => { markAllRead.mutate(); }, []);

  // Auto-mark all visible avisos as read when page loads
  useEffect(() => {
    if (!user || avisos.length === 0) return;
    avisos.forEach(a => {
      markAvisoRead.mutate(a.id);
    });
  }, [user, avisos.length]);

  // Filter non-expired avisos
  const activeAvisos = useMemo(() =>
    avisos.filter(a => !a.expires_at || new Date(a.expires_at) > new Date()),
    [avisos]
  );
  const pinnedAvisos = activeAvisos.filter(a => a.fijado);
  const regularAvisos = activeAvisos.filter(a => !a.fijado);

  // Upcoming events
  const upcomingEvents = useMemo(() =>
    eventos.filter(e => new Date(e.fecha_inicio) >= new Date(new Date().setHours(0, 0, 0, 0)))
      .sort((a, b) => new Date(a.fecha_inicio).getTime() - new Date(b.fecha_inicio).getTime())
      .slice(0, 10),
    [eventos]
  );

  // Calendar helpers
  const monthStart = startOfMonth(calMonth);
  const monthEnd = endOfMonth(calMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDow = getDay(monthStart); // 0=Sun

  const eventDates = useMemo(() => {
    const set = new Set<string>();
    eventos.forEach(e => set.add(format(new Date(e.fecha_inicio), 'yyyy-MM-dd')));
    return set;
  }, [eventos]);

  const dayEvents = useMemo(() => {
    if (!selectedDay) return [];
    return eventos.filter(e => isSameDay(new Date(e.fecha_inicio), selectedDay));
  }, [selectedDay, eventos]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8 lg:hidden" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Megaphone className="w-7 h-7 text-secondary" /> Comunicaciones
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Avisos, eventos y comunicaciones del equipo</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN — 2/3 */}
        <div className="lg:col-span-2 space-y-6">
          {/* Pizarrón */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Pin className="w-5 h-5 text-secondary" /> Pizarrón
              </CardTitle>
              <Button size="sm" onClick={() => setShowAvisoDialog(true)} className="bg-secondary hover:bg-secondary/90">
                <Plus className="w-4 h-4 mr-1" /> Nuevo aviso
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {loadingAvisos ? (
                <p className="text-sm text-muted-foreground">Cargando...</p>
              ) : activeAvisos.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No hay avisos publicados</p>
              ) : (
                <>
                  {pinnedAvisos.map(a => <AvisoCard key={a.id} aviso={a} canDelete={canDelete} canManage={canManage} onDelete={() => deleteAviso.mutate(a.id)} onReport={canDelete ? () => setReportAviso(a) : undefined} />)}
                  {regularAvisos.map(a => <AvisoCard key={a.id} aviso={a} canDelete={canDelete} canManage={canManage} onDelete={() => deleteAviso.mutate(a.id)} onReport={canDelete ? () => setReportAviso(a) : undefined} />)}
                </>
              )}
            </CardContent>
          </Card>

          {/* Feed */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Feed del equipo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 max-h-[500px] overflow-y-auto">
              {[...activeAvisos, ...eventos]
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .map(item => {
                  const isAviso = 'contenido' in item;
                  return (
                    <div key={item.id} className="flex gap-3 py-3 border-b border-border last:border-0">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-sm font-bold text-primary">
                        {(item as any).autor_nombre?.[0] || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">{(item as any).autor_nombre}</span>
                          <Badge variant="outline" className="text-[10px]">{isAviso ? 'Aviso' : 'Evento'}</Badge>
                        </div>
                        <p className="text-sm text-foreground font-medium mt-0.5">{item.titulo}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {isAviso ? (item as Aviso).contenido : (item as EventoInterno).descripcion}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: es })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              {activeAvisos.length === 0 && eventos.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">Sin actividad reciente</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN — 1/3 */}
        <div className="space-y-6">
          {/* Mini calendar */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-secondary" /> Calendario
                </CardTitle>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCalMonth(m => subMonths(m, 1))}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCalMonth(m => addMonths(m, 1))}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground capitalize">{format(calMonth, 'MMMM yyyy', { locale: es })}</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-muted-foreground mb-1">
                {['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'].map(d => <span key={d}>{d}</span>)}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: startDow }).map((_, i) => <div key={`e-${i}`} />)}
                {daysInMonth.map(day => {
                  const key = format(day, 'yyyy-MM-dd');
                  const hasEvent = eventDates.has(key);
                  const selected = selectedDay && isSameDay(day, selectedDay);
                  const today = isToday(day);
                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedDay(day)}
                      className={`relative h-8 w-full rounded text-xs transition-colors
                        ${selected ? 'bg-secondary text-white font-bold' : hasEvent ? 'bg-secondary/10 font-medium' : today ? 'bg-primary/10 font-bold' : 'hover:bg-muted'}
                      `}
                    >
                      {day.getDate()}
                      {hasEvent && !selected && (
                        <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-secondary" />
                      )}
                    </button>
                  );
                })}
              </div>
              {selectedDay && dayEvents.length > 0 && (
                <div className="mt-3 space-y-2 border-t border-secondary/20 pt-3">
                  <p className="text-xs font-semibold text-foreground capitalize">{format(selectedDay, 'EEEE d MMM', { locale: es })}</p>
                  {dayEvents.map(ev => (
                    <div key={ev.id} className="text-xs p-2.5 rounded-lg bg-secondary/10 border border-secondary/20 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground">{ev.titulo}</span>
                        <span className="text-secondary font-medium">{format(new Date(ev.fecha_inicio), 'HH:mm')}{ev.fecha_fin ? ` – ${format(new Date(ev.fecha_fin), 'HH:mm')}` : ''}</span>
                      </div>
                      {ev.descripcion && <p className="text-muted-foreground whitespace-pre-wrap line-clamp-3">{ev.descripcion}</p>}
                      {(ev as any).lugar && <p className="text-muted-foreground">📍 {(ev as any).lugar}</p>}
                    </div>
                  ))}
                </div>
              )}
              {selectedDay && dayEvents.length === 0 && (
                <p className="text-xs text-muted-foreground text-center mt-3">Sin eventos este día</p>
              )}
            </CardContent>
          </Card>

          {/* Upcoming events */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-lg">Próximos eventos</CardTitle>
              {canManageEvents && (
                <Button size="sm" variant="outline" onClick={() => setShowEventoDialog(true)}>
                  <Plus className="w-4 h-4 mr-1" /> Nuevo
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              {loadingEventos ? (
                <p className="text-sm text-muted-foreground">Cargando...</p>
              ) : upcomingEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No hay eventos próximos</p>
              ) : (
                upcomingEvents.map(ev => <EventCard key={ev.id} evento={ev} />)
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialog: Nuevo Aviso */}
      <AvisoFormDialog open={showAvisoDialog} onClose={() => setShowAvisoDialog(false)} onCreate={createAviso.mutateAsync} onCreateEvento={createEvento.mutateAsync} />

      {/* Dialog: Nuevo Evento */}
      <EventoFormDialog open={showEventoDialog} onClose={() => setShowEventoDialog(false)} onCreate={createEvento.mutateAsync} agents={agents} />

      {/* Delivery report dialog */}
      <AvisoDeliveryReport open={!!reportAviso} onClose={() => setReportAviso(null)} aviso={reportAviso} />
    </div>
  );
};

/* ── Aviso Card ── */
const AvisoCard = ({ aviso, canManage, canDelete, onDelete, onReport }: { aviso: Aviso; canManage: boolean; canDelete?: boolean; onDelete: () => void; onReport?: () => void }) => {
  const isUrgent = aviso.prioridad === 'urgente';
  const showDeleteAndReport = canDelete ?? canManage;
  const { data: lecturas = [] } = useAvisoLecturas(showDeleteAndReport ? aviso.id : null);
  const { data: agentsData } = useAgents();
  const totalTeam = agentsData?.length || 0;
  const totalVisto = lecturas.length;

  // Role label for author
  const roleLabels: Record<string, string> = {
    superadmin: 'SuperAdmin',
    admin: 'Admin',
    accounting: 'Gerente',
    secretaria: 'Secretaría',
    agent: 'Agente',
  };

  return (
    <div className={`p-4 rounded-lg border-l-4 ${
      isUrgent
        ? 'bg-destructive/5 border-destructive'
        : 'bg-primary/5 border-primary'
    }`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {aviso.fijado && <Pin className="w-4 h-4 text-secondary flex-shrink-0" />}
          {isUrgent && <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />}
          <h4 className="text-sm font-semibold text-foreground">{aviso.titulo}</h4>
        </div>
        <div className="flex items-center gap-1">
          {onReport && showDeleteAndReport && (
            <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={onReport} title="Ver entregas">
              <BarChart3 className="w-3.5 h-3.5 text-muted-foreground" />
            </Button>
          )}
          {showDeleteAndReport && (
            <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={onDelete}>
              <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
            </Button>
          )}
        </div>
      </div>
      <p className="text-sm text-foreground/80 mt-1 whitespace-pre-wrap">{aviso.contenido}</p>
      <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground flex-wrap">
        <span className="font-medium text-foreground/70">{aviso.autor_nombre}</span>
        {(aviso as any).autor_rol && (
          <Badge variant="outline" className="text-[9px] px-1.5 py-0">
            {roleLabels[(aviso as any).autor_rol] || (aviso as any).autor_rol}
          </Badge>
        )}
        <span>·</span>
        <span>{formatDistanceToNow(new Date(aviso.created_at), { addSuffix: true, locale: es })}</span>
        {aviso.expires_at && (
          <>
            <span>·</span>
            <span>Expira {format(new Date(aviso.expires_at), 'dd/MM/yyyy')}</span>
          </>
        )}
      </div>
      {/* Read tracking - visible only for admins */}
      {showDeleteAndReport && totalTeam > 0 && (
        <button
          onClick={onReport}
          className="flex items-center gap-1.5 mt-2 text-[11px] text-primary hover:underline"
        >
          <CheckCheck className="w-3.5 h-3.5" />
          Visto por {totalVisto} de {totalTeam}
        </button>
      )}
    </div>
  );
};

/* ── Event Card ── */
const EventCard = ({ evento }: { evento: EventoInterno }) => {
  const now = new Date();
  const start = new Date(evento.fecha_inicio);
  const hoursLeft = differenceInHours(start, now);
  const daysLeft = differenceInDays(start, now);
  const isEventToday = isToday(start);

  let countdown = '';
  if (isEventToday || (hoursLeft >= 0 && hoursLeft < 24)) {
    countdown = 'HOY';
  } else if (daysLeft === 1) {
    countdown = 'Mañana';
  } else if (daysLeft > 1) {
    countdown = `En ${daysLeft} días`;
  }

  return (
    <div className="flex items-start gap-3 py-2 border-b border-border last:border-0">
      <div className="w-10 h-10 rounded-lg bg-secondary/10 flex flex-col items-center justify-center flex-shrink-0">
        <span className="text-[10px] font-bold text-secondary uppercase">{format(start, 'MMM', { locale: es })}</span>
        <span className="text-sm font-bold text-foreground leading-none">{format(start, 'd')}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{evento.titulo}</p>
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="w-3 h-3" /> {format(start, 'HH:mm')}
          {evento.fecha_fin && ` – ${format(new Date(evento.fecha_fin), 'HH:mm')}`}
        </p>
        {evento.lugar && (
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <MapPin className="w-3 h-3" /> <span className="truncate">{evento.lugar}</span>
          </p>
        )}
      </div>
      {countdown && (
        <Badge
          className={`flex-shrink-0 text-[10px] ${
            countdown === 'HOY'
              ? 'bg-destructive text-destructive-foreground animate-pulse'
              : 'bg-secondary/15 text-secondary border-0'
          }`}
        >
          {countdown}
        </Badge>
      )}
    </div>
  );
};

/* ── Aviso Form Dialog ── */
const AvisoFormDialog = ({ open, onClose, onCreate, onCreateEvento }: { open: boolean; onClose: () => void; onCreate: (v: any) => Promise<void>; onCreateEvento: (v: any) => Promise<void> }) => {
  const [titulo, setTitulo] = useState('');
  const [contenido, setContenido] = useState('');
  const [prioridad, setPrioridad] = useState('normal');
  const [fijado, setFijado] = useState(false);
  const [expiresAt, setExpiresAt] = useState('');
  const [saving, setSaving] = useState(false);

  // Event fields
  const [isEvent, setIsEvent] = useState(false);
  const [eventDate, setEventDate] = useState('');
  const [eventTimeStart, setEventTimeStart] = useState('09:00');
  const [eventTimeEnd, setEventTimeEnd] = useState('');
  const [eventModalidad, setEventModalidad] = useState<'presencial' | 'virtual' | 'ambos'>('presencial');
  const [eventLugar, setEventLugar] = useState('');

  const resetForm = () => {
    setTitulo(''); setContenido(''); setPrioridad('normal'); setFijado(false); setExpiresAt('');
    setIsEvent(false); setEventDate(''); setEventTimeStart('09:00'); setEventTimeEnd(''); setEventModalidad('presencial'); setEventLugar('');
  };

  const handleSubmit = async () => {
    if (!titulo.trim() || !contenido.trim()) return;
    if (isEvent && !eventDate) return;
    setSaving(true);
    try {
      await onCreate({ titulo, contenido, prioridad, fijado, expires_at: expiresAt || null });

      // If event toggle is on, also create a calendar event
      if (isEvent && eventDate) {
        const fi = `${eventDate}T${eventTimeStart}:00`;
        const ff = eventTimeEnd ? `${eventDate}T${eventTimeEnd}:00` : null;
        const lugarText = eventLugar ? `${eventModalidad === 'virtual' ? '🔗' : eventModalidad === 'ambos' ? '🏢+🔗' : '📍'} ${eventLugar}` : null;
        await onCreateEvento({
          titulo,
          descripcion: `${contenido}${lugarText ? `\n\n${lugarText}` : ''}`,
          fecha_inicio: fi,
          fecha_fin: ff,
          destinatarios: ['todos'],
          recordatorio_24h: true,
          recordatorio_1h: false,
          lugar: eventLugar || null,
        });
      }
      resetForm();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuevo aviso</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Título *</Label>
            <Input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Título del aviso" />
          </div>
          <div>
            <Label>Contenido *</Label>
            <Textarea value={contenido} onChange={e => setContenido(e.target.value)} rows={4} placeholder="Escribe el mensaje..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Prioridad</Label>
              <Select value={prioridad} onValueChange={setPrioridad}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Expira</Label>
              <Input type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={fijado} onCheckedChange={setFijado} />
            <Label>Fijar en pizarrón</Label>
          </div>

          {/* Event toggle */}
          <div className="border-t border-border pt-4">
            <div className="flex items-center gap-2">
              <Switch checked={isEvent} onCheckedChange={setIsEvent} />
              <Label className="font-medium">📅 Es un evento con fecha</Label>
            </div>
          </div>

          {isEvent && (
            <div className="space-y-3 p-3 rounded-lg bg-secondary/5 border border-secondary/20">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Fecha del evento *</Label>
                  <Input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Hora inicio *</Label>
                  <Input type="time" value={eventTimeStart} onChange={e => setEventTimeStart(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Hora fin (opc.)</Label>
                  <Input type="time" value={eventTimeEnd} onChange={e => setEventTimeEnd(e.target.value)} />
                </div>
              </div>
              <div>
                <Label className="text-xs">Modalidad</Label>
                <Select value={eventModalidad} onValueChange={(v: any) => setEventModalidad(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="presencial">📍 Presencial</SelectItem>
                    <SelectItem value="virtual">🔗 Virtual</SelectItem>
                    <SelectItem value="ambos">🏢+🔗 Ambos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">
                  {eventModalidad === 'virtual' ? 'Link de reunión' : eventModalidad === 'ambos' ? 'Dirección / Link' : 'Lugar o dirección'}
                </Label>
                <Input
                  value={eventLugar}
                  onChange={e => setEventLugar(e.target.value)}
                  placeholder={eventModalidad === 'virtual' ? 'https://meet.google.com/...' : 'Ej: Oficina Plusterra, Av. España 1234'}
                />
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving || !titulo.trim() || !contenido.trim() || (isEvent && !eventDate)} className="bg-secondary hover:bg-secondary/90">
            {isEvent ? '📅 Publicar aviso + evento' : 'Publicar aviso'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/* ── Evento Form Dialog ── */
const EventoFormDialog = ({ open, onClose, onCreate, agents }: { open: boolean; onClose: () => void; onCreate: (v: any) => Promise<void>; agents: any[] }) => {
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [horaInicio, setHoraInicio] = useState('09:00');
  const [horaFin, setHoraFin] = useState('10:00');
  const [destinatarios, setDestinatarios] = useState('todos');
  const [rec24, setRec24] = useState(true);
  const [rec1, setRec1] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!titulo.trim() || !fechaInicio) return;
    setSaving(true);
    const fi = `${fechaInicio}T${horaInicio}:00`;
    const ff = `${fechaInicio}T${horaFin}:00`;
    await onCreate({
      titulo,
      descripcion: descripcion || null,
      fecha_inicio: fi,
      fecha_fin: ff,
      destinatarios: destinatarios === 'todos' ? ['todos'] : [destinatarios],
      recordatorio_24h: rec24,
      recordatorio_1h: rec1,
    });
    setSaving(false);
    setTitulo(''); setDescripcion(''); setFechaInicio(''); setHoraInicio('09:00'); setHoraFin('10:00');
    setDestinatarios('todos'); setRec24(true); setRec1(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nuevo evento</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Título *</Label>
            <Input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Nombre del evento" />
          </div>
          <div>
            <Label>Descripción</Label>
            <Textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} rows={3} placeholder="Descripción opcional" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Fecha *</Label>
              <Input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} />
            </div>
            <div>
              <Label>Hora inicio</Label>
              <Input type="time" value={horaInicio} onChange={e => setHoraInicio(e.target.value)} />
            </div>
            <div>
              <Label>Hora fin</Label>
              <Input type="time" value={horaFin} onChange={e => setHoraFin(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Destinatarios</Label>
            <Select value={destinatarios} onValueChange={setDestinatarios}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {agents.map((a: any) => (
                  <SelectItem key={a.id} value={a.id}>{a.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox checked={rec24} onCheckedChange={(v) => setRec24(!!v)} />
              <Label className="text-sm">Recordar 24 horas antes</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={rec1} onCheckedChange={(v) => setRec1(!!v)} />
              <Label className="text-sm">Recordar 1 hora antes</Label>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving || !titulo.trim() || !fechaInicio} className="bg-secondary hover:bg-secondary/90">
            Crear evento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default Communications;
