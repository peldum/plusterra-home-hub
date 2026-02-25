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
    roles: ['admin', 'secretaria'],
    steps: [
      'Ir a "Contratos" → botón "Nuevo contrato".',
      'Seleccionar la propiedad y el cliente.',
      'Completar datos del contrato (monto, fechas, periodicidad).',
      'Revisar los datos en el resumen.',
      'Guardar el contrato.',
      'Opcionalmente, generar el PDF del contrato.',
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
