import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import {
  HelpCircle,
  BookOpen,
  Users,
  Building2,
  FileText,
  Wallet,
  Key,
  Kanban,
  ClipboardList,
  Shield,
  Search,
  Crown,
  Globe,
  Star,
  BadgeCheck,
  CalendarClock,
  AlertTriangle,
  DollarSign,
} from 'lucide-react';
import { Input } from '@/components/ui/input';

/* ──────────── types ──────────── */
type RoleFilter = 'all' | 'agent' | 'secretaria' | 'admin';

interface GuideItem {
  title: string;
  icon: React.ElementType;
  roles: RoleFilter[];
  steps: string[];
}

interface FaqItem {
  q: string;
  a: string;
  roles: RoleFilter[];
}

/* ──────────── data ──────────── */
const guides: GuideItem[] = [
  {
    title: 'Registrar una visita a propiedad',
    icon: Building2,
    roles: ['agent', 'admin'],
    steps: [
      'Ir a "Disponibles" y seleccionar la propiedad.',
      'Verificar el semáforo de estado de llave.',
      'Si la llave está en oficina, usar el botón "Retirar llave".',
      'Si la llave está con propietario/captador, contactar al captador vía WhatsApp.',
      'Realizar la visita con el cliente.',
      'Devolver la llave y registrar la devolución.',
    ],
  },
  {
    title: 'Crear un contrato de alquiler',
    icon: FileText,
    roles: ['admin', 'secretaria', 'agent'],
    steps: [
      'Ir a "Contratos" → botón "Nuevo contrato".',
      'Seleccionar tipo, propiedad y cliente.',
      'Si la propiedad NO está en el sistema (captación externa), activar "Propiedad externa" y completar la dirección manualmente.',
      'Si hay un captador externo, registrar su nombre, inmobiliaria y teléfono.',
      'Completar datos del contrato (monto, fechas, garantía).',
      'Revisar los datos en el resumen y guardar.',
      'Al guardar un alquiler, aparece el modal de "Registrar Comisión".',
      'Seleccionar si alquilaste solo, con un co-broker interno o externo.',
      'Activar/desactivar el bonus de garantía según lo acordado con el propietario.',
      'Confirmar — la comisión queda registrada con el 15% pendiente para la empresa.',
    ],
  },
  {
    title: 'Registrar comisión de operación externa',
    icon: DollarSign,
    roles: ['admin', 'secretaria'],
    steps: [
      'Ir a "Finanzas" o "Dashboard" → botón "Registrar Ingreso".',
      'En "Categoría", seleccionar "Comisión externa".',
      'Seleccionar el agente interno que participó en la operación.',
      'Completar la dirección de la propiedad externa.',
      'Registrar el nombre del captador externo y su inmobiliaria.',
      'Ingresar el monto neto que corresponde.',
      'Guardar — queda registrado como ingreso con toda la trazabilidad.',
    ],
  },
  {
    title: 'Gestionar pipeline de ventas',
    icon: Kanban,
    roles: ['agent', 'admin'],
    steps: [
      'Ir a "Pipeline" para ver el tablero Kanban.',
      'Crear una nueva oportunidad con el botón "+".',
      'Arrastrar las tarjetas entre etapas según avance.',
      'Registrar seguimientos y notas en cada deal.',
      'Al cerrar, el sistema genera la comisión automáticamente.',
    ],
  },
  {
    title: 'Control de llaves',
    icon: Key,
    roles: ['admin', 'secretaria'],
    steps: [
      'Ir a "Control de Llaves" para ver las llaves en movimiento.',
      'Verificar qué agentes tienen llaves retiradas.',
      'Registrar devoluciones cuando un agente entregue una llave.',
      'El badge rojo en el sidebar indica llaves fuera de oficina.',
    ],
  },
  {
    title: 'Retiro de llaves (agente)',
    icon: Key,
    roles: ['agent'],
    steps: [
      'Ir a "Retiro de Llaves" desde el menú.',
      'Escanear el código QR de la propiedad o buscarla manualmente.',
      'Confirmar el retiro — queda registrado automáticamente.',
      'Al finalizar la visita, devolver la llave en oficina.',
    ],
  },
  {
    title: 'Registrar cobros y pagos',
    icon: Wallet,
    roles: ['admin'],
    steps: [
      'Ir a "Finanzas" → pestaña "Cuentas por cobrar".',
      'Localizar la cuenta pendiente.',
      'Registrar el pago con monto, método y fecha.',
      'El sistema actualiza el estado automáticamente.',
    ],
  },
  {
    title: 'Gestionar propietarios y edificios',
    icon: Users,
    roles: ['admin', 'secretaria'],
    steps: [
      'Ir a "Propietarios" para crear o editar un propietario.',
      'Asociar propiedades al propietario desde su ficha.',
      'Ir a "Edificios" para agrupar unidades por edificio.',
      'Generar liquidaciones mensuales desde el detalle del edificio.',
    ],
  },
  {
    title: 'Mis Metas y comisiones',
    icon: ClipboardList,
    roles: ['agent'],
    steps: [
      'Ir a "Mis Metas" para configurar tus objetivos mensuales.',
      'Establecer meta de alquileres, ventas y comisiones.',
      'El sistema calcula tu progreso automáticamente.',
      'Consultar "Mis Finanzas" para ver comisiones acumuladas.',
    ],
  },
  {
    title: 'Mi Plan (Básico / Premium)',
    icon: Crown,
    roles: ['agent'],
    steps: [
      'Ir a "Mi Plan" desde el menú lateral.',
      'Ver los beneficios incluidos en tu plan actual.',
      'Plan Básico: publicaciones ilimitadas, WhatsApp, mapa y PDF.',
      'Plan Premium: propiedades destacadas, video, tour 360°, badge Verificado y leads.',
      'Para activar Premium, contactá a tu administrador.',
    ],
  },
  {
    title: 'Mi Perfil del Portal Público',
    icon: Globe,
    roles: ['agent'],
    steps: [
      'Ir a "Mi Perfil Portal" desde el menú.',
      'Subir tu foto profesional (se muestra en el portal público).',
      'Completar tu biografía, áreas de especialidad y WhatsApp.',
      'Tu perfil se actualiza automáticamente en el portal público.',
    ],
  },
  {
    title: 'Propiedades destacadas (Premium)',
    icon: Star,
    roles: ['agent'],
    steps: [
      'Requiere Plan Premium activo.',
      'Al crear o editar una propiedad, activar "Propiedad destacada".',
      'Las propiedades destacadas aparecen primero en el portal.',
      'También podés agregar video (YouTube/Vimeo) y tour 360°.',
      'Si no sos Premium, el sistema te mostrará un mensaje informativo.',
    ],
  },
  {
    title: 'Gestión de planes de agente',
    icon: Crown,
    roles: ['admin'],
    steps: [
      'Ir a "Agentes" y seleccionar un agente.',
      'En la ficha del agente, cambiar el plan entre Básico y Premium.',
      'El cambio es inmediato y habilita/deshabilita funciones Premium.',
      'Los agentes Premium muestran un badge de estrella en la lista.',
    ],
  },
  {
    title: 'Portal Web y Blog',
    icon: Globe,
    roles: ['admin'],
    steps: [
      'Ir a "Portal Web" para configurar el portal público.',
      'Ajustar banners, colores, bloques visibles y datos de contacto.',
      'Ir a "Blog & Proyectos" para publicar artículos y proyectos.',
      'Los leads del portal se gestionan desde "Leads Portal".',
    ],
  },
  {
    title: 'Configuración del sistema',
    icon: Shield,
    roles: ['admin'],
    steps: [
      'Ir a "Configuración" desde el menú lateral.',
      'Ajustar branding (logo, nombre de empresa).',
      'Configurar plantillas de WhatsApp.',
      'Gestionar parámetros de canon de agentes.',
      'Revisar el monitor de base de datos.',
    ],
  },
];

const faqs: FaqItem[] = [
  { q: '¿Cómo sé si una propiedad está lista para mostrar?', a: 'El semáforo verde en la card de "Disponibles" indica que la llave está en oficina y podés coordinar visita inmediatamente. Amarillo requiere coordinar con el captador.', roles: ['all'] },
  { q: '¿Puedo ver datos del propietario?', a: 'Solo los roles Admin, Gerente, Secretaría y SuperAdmin pueden ver datos del propietario. Los agentes no tienen acceso a esta información por seguridad.', roles: ['all'] },
  { q: '¿Qué pasa si no devuelvo una llave?', a: 'El sistema registra las llaves retiradas. Admin y Secretaría pueden ver qué agentes tienen llaves pendientes de devolución.', roles: ['agent'] },
  { q: '¿Cómo genero un contrato en PDF?', a: 'Dentro del detalle de un contrato, usá el botón "Exportar PDF". El documento se genera con los datos del contrato y la marca de la empresa.', roles: ['admin', 'secretaria'] },
  { q: '¿Cómo funciona el pipeline?', a: 'El pipeline es un tablero Kanban donde cada tarjeta representa una oportunidad. Movelas entre etapas según el avance de la negociación.', roles: ['all'] },
  { q: '¿Qué es el canon de agente?', a: 'Es una cuota mensual que cada agente debe pagar. El sistema calcula intereses automáticamente si hay mora. Admin puede consultar el estado desde la ficha de cada agente.', roles: ['admin', 'agent'] },
  { q: '¿Cómo reservo una propiedad?', a: 'Desde "Disponibles", abrí el detalle de la propiedad y usá el botón "Solicitar reserva". Un administrador debe confirmarla.', roles: ['agent'] },
  { q: '¿Qué significa cada estado de propiedad?', a: 'Disponible = se puede mostrar. Reservada = un agente la reservó temporalmente. Alquilada/Vendida = operación cerrada. Mantenimiento = no disponible para visitas.', roles: ['all'] },
  { q: '¿Cómo contacto al captador de una propiedad?', a: 'En el detalle de la propiedad, usá el botón de WhatsApp del checklist. Siempre se contacta al captador, nunca al propietario directamente.', roles: ['agent'] },
  { q: '¿Puedo exportar datos?', a: 'Sí. Las secciones de contratos, finanzas y edificios tienen botones de exportación a Excel y PDF según el módulo.', roles: ['admin', 'secretaria'] },
  { q: '¿Qué es el Plan Premium de agente?', a: 'Es un nivel de suscripción que habilita funciones exclusivas: propiedades destacadas, video embebido, tour 360°, badge de Agente Verificado y estadísticas de leads. Consultá "Mi Plan" para más detalles.', roles: ['agent'] },
  { q: '¿Cómo me convierto en Agente Verificado?', a: 'El badge de Agente Verificado se activa automáticamente al tener Plan Premium. Se muestra en tu perfil del portal público y en la sección de agentes.', roles: ['agent'] },
  { q: '¿Cómo subo mi foto de perfil para el portal?', a: 'Andá a "Mi Perfil Portal" desde el menú lateral. Ahí podés subir tu foto profesional, que se mostrará en el portal público y en tu perfil del sistema.', roles: ['agent'] },
  { q: '¿Cómo gestiono los planes de los agentes?', a: 'Desde "Agentes", seleccioná un agente y cambiá su plan entre Básico y Premium. El cambio es inmediato y afecta las funciones disponibles para ese agente.', roles: ['admin'] },
  { q: '¿Qué pasa si un agente básico intenta usar funciones Premium?', a: 'El sistema muestra un mensaje informativo invitándolo a contactar al administrador para activar Premium. Las validaciones se aplican tanto en frontend como en backend.', roles: ['admin'] },
  { q: '¿Cómo funciona la comisión en alquileres?', a: 'La comisión inmobiliaria es el 50% del primer alquiler. Si el propietario otorga la mitad de la garantía como bonus, se suma al monto bruto. Cada agente deja el 15% de su ganancia bruta para la empresa. Ejemplo: alquiler de 2.500.000 Gs → comisión 1.250.000 + bonus garantía 1.250.000 = 2.500.000 bruto. 15% empresa = 375.000. Neto agente = 2.125.000.', roles: ['all'] },
  { q: '¿Qué pasa si alquilo con otro agente (co-broker)?', a: 'La ganancia bruta se divide 50/50 entre captador y cerrador. Cada uno deja el 15% de su parte a la empresa. Ejemplo: bruto total 2.500.000 → cada uno recibe 1.250.000 bruto, deja 187.500 (15%) a la empresa, y recibe 1.062.500 neto.', roles: ['all'] },
  { q: '¿Cómo registro un alquiler de una propiedad que no está en el sistema?', a: 'Al crear el contrato, activá el checkbox "Propiedad externa" en el paso de Propiedad. Esto te permite ingresar la dirección manualmente y registrar los datos del captador externo (nombre, inmobiliaria, teléfono). El contrato se crea normalmente sin vincular a una propiedad interna.', roles: ['all'] },
  { q: '¿Cómo registro la comisión de una operación con un colega externo?', a: 'Tenés dos opciones: (1) Crear el contrato con "Propiedad externa" y luego registrar la comisión en el modal post-contrato, o (2) ir a Finanzas → Registrar Ingreso → categoría "Comisión externa", que permite registrar el agente interno, la propiedad y el captador externo directamente.', roles: ['all'] },
  { q: '¿Y si el co-broker es un agente externo?', a: 'Funciona igual en el cálculo (50/50), pero el sistema solo registra la comisión del agente interno. La parte del externo queda documentada en las notas del registro.', roles: ['all'] },
  { q: '¿El bonus de garantía es siempre?', a: 'No. Depende del acuerdo con el propietario. Al registrar la comisión, podés activar o desactivar el toggle "Bonus de garantía" según corresponda.', roles: ['all'] },
  { q: '¿Cómo confirma la secretaría el pago del 15%?', a: 'Las comisiones quedan con estado "Pendiente". La secretaría o admin puede marcarlas como pagadas desde el módulo de Finanzas cuando el agente entrega su 15%.', roles: ['admin', 'secretaria'] },
];

/* ──────────── helpers ──────────── */
const roleMatch = (itemRoles: RoleFilter[], userRole: string | null, tab: RoleFilter): boolean => {
  if (tab !== 'all') return itemRoles.includes(tab) || itemRoles.includes('all');
  // When "all" tab, filter by user role
  if (userRole === 'agent') return itemRoles.includes('agent') || itemRoles.includes('all');
  return true; // admin-like sees everything
};

const roleBadgeLabel: Record<string, string> = {
  agent: 'Agente',
  secretaria: 'Secretaría',
  admin: 'Admin',
  all: 'Todos',
};

/* ──────────── component ──────────── */
const HelpCenter = () => {
  const { role } = useAuth();
  const isAgent = role === 'agent';
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<RoleFilter>(isAgent ? 'agent' : 'all');

  const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const searchNorm = normalize(search);

  const filteredGuides = guides.filter(
    (g) =>
      roleMatch(g.roles, role, activeTab) &&
      (searchNorm === '' || normalize(g.title).includes(searchNorm) || g.steps.some((s) => normalize(s).includes(searchNorm)))
  );

  const filteredFaqs = faqs.filter(
    (f) =>
      roleMatch(f.roles, role, activeTab) &&
      (searchNorm === '' || normalize(f.q).includes(searchNorm) || normalize(f.a).includes(searchNorm))
  );

  return (
    <MainLayout
      title="Centro de Ayuda"
      subtitle="Guías, flujos operativos y preguntas frecuentes del sistema."
      actionNode={
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar guía o pregunta..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      }
    >
    <div className="space-y-6">

      {/* Tabs by role */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as RoleFilter)}>
        <TabsList>
          {!isAgent && <TabsTrigger value="all">Todas</TabsTrigger>}
          <TabsTrigger value="agent">Agente</TabsTrigger>
          {!isAgent && <TabsTrigger value="secretaria">Secretaría</TabsTrigger>}
          {!isAgent && <TabsTrigger value="admin">Admin</TabsTrigger>}
        </TabsList>

        {/* Single content area – filtering handles role */}
        <TabsContent value={activeTab} className="mt-4 space-y-8">
          {/* Commission Info */}
          {(activeTab === 'agent' || activeTab === 'admin' || activeTab === 'all') && (
            <section>
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
                <DollarSign className="w-5 h-5 text-success" />
                Comisiones por alquiler
              </h2>
              <Card className="border-success/20 bg-success/5">
                <CardContent className="pt-5 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-success/10 shrink-0">
                      <DollarSign className="w-5 h-5 text-success" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-1">¿Cómo se calcula?</h3>
                      <p className="text-sm text-muted-foreground">
                        La <strong className="text-foreground">comisión base</strong> es el 50% del primer alquiler mensual.
                        Si el propietario otorga la <strong className="text-foreground">mitad de la garantía</strong> como bonus,
                        se suma al bruto total. Cada agente deja el <strong className="text-foreground">15%</strong> de su ganancia bruta para la empresa.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-1">¿Qué pasa si alquilo con otro agente?</h3>
                      <p className="text-sm text-muted-foreground">
                        Se divide la ganancia bruta <strong className="text-foreground">50/50</strong> entre captador y cerrador.
                        Cada uno deja su 15% a la empresa. Funciona igual para co-broker interno o externo.
                      </p>
                    </div>
                  </div>

                  <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-1.5">
                    <p className="font-semibold text-foreground text-sm mb-2">📊 Ejemplo con alquiler de 2.500.000 Gs y garantía de 2.500.000 Gs:</p>
                    <p><strong>Solo (con bonus):</strong> Bruto 2.500.000 → 15% empresa = 375.000 → <span className="text-success font-semibold">Neto agente: 2.125.000</span></p>
                    <p><strong>Co-broker (con bonus):</strong> Bruto 2.500.000 ÷ 2 = 1.250.000 c/u → 15% empresa = 187.500 c/u → <span className="text-success font-semibold">Neto c/agente: 1.062.500</span></p>
                    <p><strong>Solo (sin bonus):</strong> Bruto 1.250.000 → 15% empresa = 187.500 → <span className="text-success font-semibold">Neto agente: 1.062.500</span></p>
                  </div>
                </CardContent>
              </Card>
            </section>
          )}

          {/* Payment Info for agents */}
          {(activeTab === 'agent' || activeTab === 'all') && (
            <section>
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
                <CalendarClock className="w-5 h-5 text-primary" />
                Pagos y canon mensual
              </h2>
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="pt-5 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                      <Wallet className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-1">¿Cuándo debo pagar?</h3>
                      <p className="text-sm text-muted-foreground">
                        Los días de pago del canon mensual son <strong className="text-foreground">del 1 al 5 de cada mes</strong>.
                        Realizá tu pago dentro de ese plazo para mantener tu cuenta al día.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-warning/10 shrink-0">
                      <AlertTriangle className="w-5 h-5 text-warning" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-1">¿Qué pasa si no pago a tiempo?</h3>
                      <p className="text-sm text-muted-foreground">
                        El sistema te avisará con una <strong className="text-foreground">cuenta regresiva</strong> antes del vencimiento.
                        Si no pagás dentro del plazo, tu estado pasará a <span className="text-warning font-semibold">VENCIDO</span> y
                        comenzará a acumularse un interés diario. Si la mora se extiende, el estado cambia a{' '}
                        <span className="text-destructive font-semibold">MOROSO</span> y se restringen ciertas funciones operativas
                        (crear propiedades, retirar llaves, crear contratos).
                      </p>
                    </div>
                  </div>

                  <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
                    <p>🟢 <strong className="text-success">AL DÍA</strong> — Pagaste este mes. Todo funcionando.</p>
                    <p>🟡 <strong className="text-warning">VENCIDO</strong> — Pasó el plazo. Interés acumulándose.</p>
                    <p>🔴 <strong className="text-destructive">MOROSO</strong> — Acceso operativo limitado hasta regularizar.</p>
                  </div>
                </CardContent>
              </Card>
            </section>
          )}

          {/* Guides */}
          <section>
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
              <BookOpen className="w-5 h-5 text-primary" />
              Guías paso a paso
            </h2>

            {filteredGuides.length === 0 && (
              <p className="text-muted-foreground text-sm">No se encontraron guías con ese criterio.</p>
            )}

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredGuides.map((guide) => (
                <Card key={guide.title} className="flex flex-col">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <guide.icon className="w-4 h-4 text-primary shrink-0" />
                        {guide.title}
                      </CardTitle>
                    </div>
                    <div className="flex gap-1 flex-wrap mt-1">
                      {guide.roles.map((r) => (
                        <Badge key={r} variant="secondary" className="text-[10px] px-1.5 py-0">
                          {roleBadgeLabel[r] || r}
                        </Badge>
                      ))}
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <ol className="list-decimal list-inside space-y-1.5 text-sm text-muted-foreground">
                      {guide.steps.map((step, i) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ol>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* FAQ */}
          <section>
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
              <HelpCircle className="w-5 h-5 text-primary" />
              Preguntas frecuentes
            </h2>

            {filteredFaqs.length === 0 && (
              <p className="text-muted-foreground text-sm">No se encontraron preguntas con ese criterio.</p>
            )}

            <Accordion type="multiple" className="max-w-3xl">
              {filteredFaqs.map((faq, i) => (
                <AccordionItem key={i} value={`faq-${i}`}>
                  <AccordionTrigger className="text-sm text-left">{faq.q}</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground">
                    {faq.a}
                    <div className="flex gap-1 mt-2">
                      {faq.roles.map((r) => (
                        <Badge key={r} variant="outline" className="text-[10px] px-1.5 py-0">
                          {roleBadgeLabel[r] || r}
                        </Badge>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>
        </TabsContent>
      </Tabs>
    </div>
    </MainLayout>
  );
};

export default HelpCenter;
