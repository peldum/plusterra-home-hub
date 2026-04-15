import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSugerencias, useUpdateSugerencia } from '@/hooks/useSugerencias';
import { useReportesSoporte, useUpdateReporte } from '@/hooks/useReportesSoporte';
import { ActividadTab } from '@/components/centro-control/ActividadTab';
import { ReportesMensualesTab } from '@/components/centro-control/ReportesMensualesTab';
import { Lightbulb, Wrench, Activity, FileText, MessageSquare, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const estadoBadge = (estado: string) => {
  const map: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string; className?: string }> = {
    pendiente: { variant: 'default', label: 'Pendiente' },
    en_revision: { variant: 'secondary', label: 'En revisión' },
    implementada: { variant: 'outline', label: '✓ Implementada', className: 'border-green-500 bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400' },
    descartada: { variant: 'destructive', label: 'Descartada' },
    abierto: { variant: 'destructive', label: 'Abierto' },
    en_proceso: { variant: 'secondary', label: 'En proceso' },
    resuelto: { variant: 'outline', label: '✓ Resuelto', className: 'border-green-500 bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400' },
  };
  const m = map[estado] || { variant: 'default' as const, label: estado };
  return <Badge variant={m.variant} className={m.className}>{m.label}</Badge>;
};

const prioridadBadge = (p: string) => {
  if (p === 'alta') return <Badge variant="destructive" className="text-[10px]">Alta</Badge>;
  if (p === 'media') return <Badge variant="secondary" className="text-[10px]">Media</Badge>;
  return <Badge variant="outline" className="text-[10px]">Baja</Badge>;
};

const SugerenciasTab = () => {
  const { data: sugerencias = [] } = useSugerencias();
  const update = useUpdateSugerencia();
  const [responding, setResponding] = useState<string | null>(null);
  const [respuesta, setRespuesta] = useState('');
  const [filterEstado, setFilterEstado] = useState('all');
  const [filterCat, setFilterCat] = useState('all');

  // Separate active vs resolved, newest first
  const activeSugerencias = sugerencias
    .filter(s => {
      if (filterEstado !== 'all' && s.estado !== filterEstado) return false;
      if (filterCat !== 'all' && s.categoria !== filterCat) return false;
      return s.estado === 'pendiente' || s.estado === 'en_revision';
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const resolvedSugerencias = sugerencias
    .filter(s => {
      if (filterEstado !== 'all' && s.estado !== filterEstado) return false;
      if (filterCat !== 'all' && s.categoria !== filterCat) return false;
      return s.estado === 'implementada' || s.estado === 'descartada';
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const filtered = [...activeSugerencias, ...resolvedSugerencias];

  const implementadas = sugerencias.filter(s => {
    const d = new Date(s.created_at);
    const now = new Date();
    return s.estado === 'implementada' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const handleRespond = (id: string, estado: string) => {
    update.mutate({ id, estado, respuesta_admin: respuesta }, {
      onSuccess: () => { setResponding(null); setRespuesta(''); },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 bg-secondary/10 rounded-lg px-3 py-1.5">
          <CheckCircle2 className="w-4 h-4 text-secondary" />
          <span className="text-sm font-medium">{implementadas} implementadas este mes</span>
        </div>
        <Select value={filterEstado} onValueChange={setFilterEstado}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pendiente">Pendiente</SelectItem>
            <SelectItem value="en_revision">En revisión</SelectItem>
            <SelectItem value="implementada">Implementada</SelectItem>
            <SelectItem value="descartada">Descartada</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterCat} onValueChange={setFilterCat}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Categoría" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {['Propiedades', 'Clientes / Leads', 'Portal público', 'App mobile', 'Comunicaciones', 'Otro'].map(c =>
              <SelectItem key={c} value={c}>{c}</SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>

      {filtered.map(s => (
        <Card key={s.id}>
          <CardContent className="pt-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{s.descripcion}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {s.autor_nombre} · {s.categoria} · {formatDistanceToNow(new Date(s.created_at), { addSuffix: true, locale: es })}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {prioridadBadge(s.prioridad)}
                {estadoBadge(s.estado)}
              </div>
            </div>
            {s.respuesta_admin && (
              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                <p className="text-xs font-medium text-muted-foreground mb-1">Respuesta:</p>
                {s.respuesta_admin}
              </div>
            )}
            {responding === s.id ? (
              <div className="space-y-2">
                <Textarea value={respuesta} onChange={e => setRespuesta(e.target.value)} placeholder="Escribí tu respuesta..." rows={2} />
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleRespond(s.id, 'en_revision')}>En revisión</Button>
                  <Button size="sm" className="bg-secondary hover:bg-secondary/90 text-secondary-foreground" onClick={() => handleRespond(s.id, 'implementada')}>Implementada</Button>
                  <Button size="sm" variant="destructive" onClick={() => handleRespond(s.id, 'descartada')}>Descartar</Button>
                  <Button size="sm" variant="ghost" onClick={() => setResponding(null)}>Cancelar</Button>
                </div>
              </div>
            ) : (
              <Button size="sm" variant="outline" onClick={() => { setResponding(s.id); setRespuesta(s.respuesta_admin || ''); }}>
                <MessageSquare className="w-3.5 h-3.5 mr-1" /> Responder
              </Button>
            )}
          </CardContent>
        </Card>
      ))}
      {filtered.length === 0 && <p className="text-center text-muted-foreground py-8 text-sm">No hay sugerencias</p>}
    </div>
  );
};

const SoporteTab = () => {
  const { data: reportes = [] } = useReportesSoporte();
  const update = useUpdateReporte();
  const [responding, setResponding] = useState<string | null>(null);
  const [respuesta, setRespuesta] = useState('');

  const sorted = useMemo(() => {
    const active = reportes.filter(r => r.estado !== 'resuelto')
      .sort((a, b) => {
        if (a.urgencia === 'urgente' && b.urgencia !== 'urgente') return -1;
        if (a.urgencia !== 'urgente' && b.urgencia === 'urgente') return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    const resolved = reportes.filter(r => r.estado === 'resuelto')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return [...active, ...resolved];
  }, [reportes]);

  const handleResolve = (id: string) => {
    update.mutate({ id, estado: 'resuelto', respuesta_admin: respuesta }, {
      onSuccess: () => { setResponding(null); setRespuesta(''); },
    });
  };

  return (
    <div className="space-y-4">
      {sorted.map(r => (
        <Card key={r.id} className={r.urgencia === 'urgente' && r.estado === 'abierto' ? 'border-destructive/50 bg-destructive/5' : ''}>
          <CardContent className="pt-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {r.urgencia === 'urgente' && r.estado === 'abierto' && (
                    <AlertTriangle className="w-4 h-4 text-destructive animate-pulse flex-shrink-0" />
                  )}
                  <p className="text-sm font-medium">{r.descripcion}</p>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {r.autor_nombre} · {r.seccion} · Reportado {formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale: es })}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {r.urgencia === 'urgente' && <Badge variant="destructive" className="text-[10px]">Urgente</Badge>}
                {estadoBadge(r.estado)}
              </div>
            </div>
            {r.respuesta_admin && (
              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                <p className="text-xs font-medium text-muted-foreground mb-1">Respuesta:</p>
                {r.respuesta_admin}
              </div>
            )}
            {r.estado !== 'resuelto' && (
              responding === r.id ? (
                <div className="space-y-2">
                  <Textarea value={respuesta} onChange={e => setRespuesta(e.target.value)} placeholder="Respuesta o solución..." rows={2} />
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => update.mutate({ id: r.id, estado: 'en_proceso', respuesta_admin: respuesta }, { onSuccess: () => { setResponding(null); setRespuesta(''); } })}>En proceso</Button>
                    <Button size="sm" className="bg-secondary hover:bg-secondary/90 text-secondary-foreground" onClick={() => handleResolve(r.id)}>
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Marcar resuelto
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setResponding(null)}>Cancelar</Button>
                  </div>
                </div>
              ) : (
                <Button size="sm" variant="outline" onClick={() => { setResponding(r.id); setRespuesta(r.respuesta_admin || ''); }}>
                  <MessageSquare className="w-3.5 h-3.5 mr-1" /> Responder
                </Button>
              )
            )}
          </CardContent>
        </Card>
      ))}
      {sorted.length === 0 && <p className="text-center text-muted-foreground py-8 text-sm">No hay reportes</p>}
    </div>
  );
};


const CentroControl = () => {
  const { data: sugerencias = [] } = useSugerencias();
  const { data: reportes = [] } = useReportesSoporte();
  const pendingSug = sugerencias.filter(s => s.estado === 'pendiente').length;
  const openRep = reportes.filter(r => r.estado === 'abierto').length;

  return (
    <MainLayout title="Centro de Control">
      <Tabs defaultValue="sugerencias" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sugerencias" className="gap-1.5">
            <Lightbulb className="w-4 h-4" />
            Sugerencias
            {pendingSug > 0 && <Badge variant="secondary" className="ml-1 text-[10px] h-5 px-1.5">{pendingSug}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="soporte" className="gap-1.5">
            <Wrench className="w-4 h-4" />
            Soporte
            {openRep > 0 && <Badge variant="destructive" className="ml-1 text-[10px] h-5 px-1.5">{openRep}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="actividad" className="gap-1.5">
            <Activity className="w-4 h-4" />
            Actividad
          </TabsTrigger>
          <TabsTrigger value="reportes" className="gap-1.5">
            <FileText className="w-4 h-4" />
            Reportes Mensuales
          </TabsTrigger>
        </TabsList>
        <TabsContent value="sugerencias"><SugerenciasTab /></TabsContent>
        <TabsContent value="soporte"><SoporteTab /></TabsContent>
        <TabsContent value="actividad"><ActividadTab /></TabsContent>
        <TabsContent value="reportes"><ReportesMensualesTab /></TabsContent>
      </Tabs>
    </MainLayout>
  );
};

export default CentroControl;
