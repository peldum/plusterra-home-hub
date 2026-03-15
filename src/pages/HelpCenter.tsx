import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { SugerenciaDialog } from '@/components/help/SugerenciaDialog';
import { ReporteDialog } from '@/components/help/ReporteDialog';
import { Lightbulb, Wrench as WrenchIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  CalendarClock,
  AlertTriangle,
  DollarSign,
  CheckCircle2,
  Lock,
  Megaphone,
  Smartphone,
  Inbox,
  Mic,
  ShieldCheck,
  Camera,
  Bell,
  Wifi,
  WifiOff,
  Download,
  FileDown,
  Trash2,
  BarChart3,
  Settings,
  Eye,
  UserCheck,
} from 'lucide-react';
import { Input } from '@/components/ui/input';

/* ──────────── types ──────────── */
interface Article {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  /** Which roles can see this article */
  visibleTo: ('superadmin' | 'admin' | 'accounting' | 'secretaria' | 'agent')[];
  steps: string[];
}

interface Section {
  id: string;
  title: string;
  visibleTo: ('superadmin' | 'admin' | 'accounting' | 'secretaria' | 'agent')[];
  articles: Article[];
}

/* ──────────── data ──────────── */
const ADMIN_ROLES: Section['visibleTo'] = ['superadmin', 'admin', 'accounting'];
const ADMIN_PLUS_SECRETARIA: Section['visibleTo'] = ['superadmin', 'admin', 'accounting', 'secretaria'];
const AGENT_ONLY: Section['visibleTo'] = ['agent'];

const sections: Section[] = [
  /* ━━━ SECCIÓN ADMIN / SUPERADMIN / GERENTE ━━━ */
  {
    id: 'admin',
    title: 'Administración y Gestión',
    visibleTo: ADMIN_ROLES,
    articles: [
      {
        id: 'admin-propiedades',
        title: 'Gestión de propiedades',
        description: 'Cómo cargar, editar y gestionar propiedades en el sistema.',
        icon: Building2,
        visibleTo: ADMIN_ROLES,
        steps: [
          'Ir a "Propiedades" → botón "Nueva propiedad".',
          'Completar los datos básicos: título, dirección, tipo, precio, moneda.',
          'Las fotos se pueden subir ilimitadas — el sistema las comprime automáticamente a formato WebP para optimizar la carga.',
          'Usar los toggles rápidos para marcar: sala/cocina integrada, acepta mascotas, cochera, y otros atributos.',
          'Para cambiar a estado "Alquilada": editar la propiedad → Estado → "Alquilada". Aparece la opción de poner fecha de disponibilidad futura.',
          'Si marcás "Disponible desde [fecha]", en el portal público aparece un badge naranja con la fecha y un botón "Reservar" para que los visitantes soliciten la propiedad.',
          'Toggle "Mostrar en portal público": controla si la propiedad es visible en el portal. Funciona para cualquier estado (disponible, alquilada, vendida).',
          'En la lista de propiedades del admin, la columna "Portal" muestra el estado de visibilidad con un ícono de ojo/ojo tachado.',
        ],
      },
      {
        id: 'admin-catalogo-export',
        title: 'Exportar PDF desde Catálogo Interno',
        description: 'Seleccionar propiedades y generar folletos PDF comparativos.',
        icon: FileDown,
        visibleTo: ADMIN_ROLES,
        steps: [
          'Ir a "Catálogo Interno" (Disponibles) desde el sidebar.',
          'Cada tarjeta de propiedad tiene un checkbox en la esquina superior izquierda.',
          'Seleccionar hasta 10 propiedades marcando sus checkboxes.',
          'Al seleccionar al menos una, aparece el botón "Exportar" con un contador de selección.',
          'Hacer clic en "Exportar" → se abre el diálogo de generación de PDF.',
          'Opcionalmente escribir un título personalizado (ej: "Terrenos en Cambyretá").',
          'Si seleccionaste más de una propiedad, podés activar "Incluir tabla comparativa" para un cuadro resumen.',
          'Hacer clic en "Generar PDF" → se descarga automáticamente.',
          'El PDF incluye: portada con branding Plusterra, foto principal, título, código, ubicación, precios, especificaciones y descripción de cada propiedad.',
        ],
      },
      {
        id: 'admin-propietarios',
        title: 'Gestión de propietarios',
        description: 'Administración de propietarios, documentos y asignación a agentes.',
        icon: UserCheck,
        visibleTo: ADMIN_ROLES,
        steps: [
          'Ir a "Propietarios" → botón "Nuevo propietario".',
          'Completar nombre, documento, teléfono, email y dirección.',
          'Como Admin/Gerente, aparece el selector "Asignar a agente" para vincular el propietario a un agente específico.',
          'Si no seleccionás agente, el propietario queda asignado a tu usuario por defecto.',
          'Los agentes solo ven sus propios propietarios (campo agente_id). Admin y Gerente ven todos.',
          'En el listado global, Admin y Gerente ven un badge identificando al agente responsable de cada propietario.',
          'Para reasignar un propietario a otro agente: editar el propietario → cambiar el selector de agente.',
          'Para subir documentos privados: abrir detalle del propietario → pestaña "Documentos" → botón "Subir documento".',
          'Tipos de documento soportados: Cédula, Contrato, Escritura, Poder, Otros.',
          'Los documentos son privados por agente — cada agente solo accede a los documentos de sus propietarios.',
          'Admin, Gerente y SuperAdmin tienen acceso a todos los documentos.',
        ],
      },
      {
        id: 'admin-edificios',
        title: 'Gestión de edificios',
        description: 'Crear, editar, eliminar edificios y gestionar unidades.',
        icon: Building2,
        visibleTo: ADMIN_ROLES,
        steps: [
          'Ir a "Edificios" → botón "Nuevo Edificio" (solo Admin y SuperAdmin).',
          'Completar nombre, dirección, pisos, total de unidades y modelo de administración.',
          'Modelos de administración: Tercerizado/Glosker, Directo, Propietario directo.',
          'Para editar el nombre de un edificio existente: abrir el detalle → hacer clic en el nombre para editarlo.',
          'Para eliminar un edificio: botón eliminar → confirmación con advertencia de propiedades vinculadas.',
          'La eliminación segura desvincula propiedades (unit_id = null) y elimina unidades y propietarios de unidad automáticamente.',
          'Dentro del edificio: pestaña "Unidades" para agregar y gestionar unidades individuales.',
          'Pestaña "Liquidación Mensual" para ver ingresos y egresos por unidad con trazabilidad inquilino-propietario.',
          'Botones de exportación contextual: Verde (Propietarios), Azul (Interno/Plusterra), Naranja (Externo/Glosker).',
        ],
      },
      {
        id: 'admin-leads',
        title: 'Portal de Leads',
        description: 'Gestión de leads del portal web, brochures y Orbia.',
        icon: Inbox,
        visibleTo: ADMIN_ROLES,
        steps: [
          'Ir a "Leads Portal" desde el sidebar.',
          'Pestaña "Contactos": muestra los leads generados desde el formulario de contacto del portal web.',
          'Pestaña "Descargas Brochure": registra las descargas de fichas PDF de blog/proyectos (nombre + teléfono).',
          'Pestaña "Orbia (IA)": leads capturados automáticamente por el agente de voz Valentina.',
          'Para cambiar el estado de un lead: hacer clic en el botón de estado (Nuevo → Contactado → Cerrado).',
          'Para asignar un lead a un agente: usar el selector de agente en la tarjeta del lead.',
          'Los leads generan automáticamente una oportunidad en el Pipeline del agente asignado.',
          'Las solicitudes de reserva del portal (propiedades con fecha futura) también llegan como leads con fuente "reserva-portal".',
        ],
      },
      {
        id: 'admin-orbia',
        title: 'Asistente de voz Orbia (Valentina)',
        description: 'Configuración y uso del widget de voz IA integrado.',
        icon: Mic,
        visibleTo: ADMIN_ROLES,
        steps: [
          'Valentina es un asistente de voz con IA que responde consultas de visitantes del portal en tiempo real.',
          'Funciona como un widget flotante en el portal público — los visitantes pueden hablar o escribir.',
          'Para cambiar entre widget Orbia y WhatsApp: ir a "Configuración" → sección "Widget del Portal".',
          'Personalización: podés cambiar la foto, nombre visible y colores del widget desde la misma sección.',
          'Los leads capturados por voz llegan automáticamente a "Leads Portal" → pestaña "Orbia (IA)".',
          'Para probar que el webhook funciona: ir a "Configuración" → "Avanzado" → botón "Probar webhook".',
          'Si el webhook falla, verificar que la URL del endpoint esté correctamente configurada.',
        ],
      },
      {
        id: 'admin-comunicaciones',
        title: 'Comunicaciones internas',
        description: 'Avisos, eventos y notificaciones al equipo.',
        icon: Megaphone,
        visibleTo: ADMIN_ROLES,
        steps: [
          'Ir a "Comunicaciones" desde el sidebar.',
          'Para publicar un aviso: botón "Nuevo aviso" en el Pizarrón.',
          'Tipos de aviso: Normal (fondo azul) y Urgente (fondo rojo con alerta).',
          'Los avisos pueden fijarse al pizarrón (ícono de pin) y tener fecha de expiración automática.',
          'Para crear un evento: botón "Nuevo" en la sección "Próximos eventos".',
          'Los eventos pueden tener recordatorios automáticos a 24 horas y 1 hora antes.',
          'Los recordatorios llegan como notificación interna (campanita) y push a todos los destinatarios.',
          'Nuevos avisos y eventos aparecen en tiempo real sin recargar la página.',
          'Solo Admin, Gerente y SuperAdmin pueden crear avisos y eventos. Los agentes solo leen.',
        ],
      },
      {
        id: 'admin-pipeline-global',
        title: 'Pipeline global y eliminación de deals',
        description: 'Vista global del pipeline con filtros y gestión de deals.',
        icon: Kanban,
        visibleTo: ADMIN_ROLES,
        steps: [
          'Ir a "Pipeline" para ver el tablero Kanban global con todos los deals de la oficina.',
          'Usar el filtro por agente responsable para ver solo los deals de un agente específico.',
          'Filtros por tipo: Alquiler, Venta o Todos.',
          'Cada tarjeta muestra: cliente, propiedad, etapa y agente responsable.',
          'Para eliminar un deal: hacer clic en el ícono de papelera (🗑) en la tarjeta.',
          'Aparece un diálogo de confirmación → confirmar para eliminar definitivamente.',
          'Admin, SuperAdmin y Gerente pueden eliminar cualquier deal del pipeline.',
          'La vista se actualiza automáticamente sin recargar la página.',
        ],
      },
      {
        id: 'admin-roles',
        title: 'Roles y permisos',
        description: 'Estructura completa de roles, acceso y seguridad del sistema.',
        icon: ShieldCheck,
        visibleTo: ADMIN_ROLES,
        steps: [
          'El sistema tiene 5 roles: SuperAdmin, Admin, Gerente, Secretaría y Agente.',
          'SuperAdmin: acceso total al sistema incluyendo KPI Ejecutivo, Insight, QA y Roles.',
          'Admin: gestión operativa completa — propiedades, contratos, finanzas, configuración, portal web.',
          'Gerente: mismo acceso que Admin — visibilidad total operativa y financiera.',
          'Secretaría: panel operativo — contratos, propiedades (lectura), agentes (lectura), caja operativa. Sin finanzas globales.',
          'Agente: panel personal — sus propiedades, propietarios, favoritos, pipeline, finanzas personales.',
          'Datos privados por agente: propietarios, documentos, favoritos, metas personales.',
          'Para crear un usuario nuevo: el SuperAdmin debe usar la gestión de usuarios desde "Configuración".',
          'Ir a "Roles y Permisos" (solo SuperAdmin) para la matriz completa de visibilidad por módulo.',
        ],
      },
      {
        id: 'admin-configuracion',
        title: 'Configuración del sistema',
        description: 'Portal web, branding, marcas de agua y ajustes generales.',
        icon: Settings,
        visibleTo: ADMIN_ROLES,
        steps: [
          'Ir a "Configuración" desde el sidebar.',
          'Sección "Branding": cambiar logo, colores primarios y secundarios del portal.',
          'Sección "Marca de agua": activar/desactivar marca de agua en fotos del portal, configurar posición y opacidad.',
          'Sección "Portal web": habilitar/deshabilitar modo mantenimiento, blog, showroom.',
          'Sección "Widget del Portal": elegir entre widget de voz Orbia o WhatsApp flotante.',
          'Sección "Plantilla WhatsApp": personalizar el mensaje que se envía al contactar por WhatsApp desde el catálogo interno.',
          'Sección "Notificaciones push": probar el envío de push a todos los usuarios.',
          'Sección "Canon": configurar monto base, interés diario, día de vencimiento y período de gracia.',
        ],
      },
    ],
  },

  /* ━━━ SECCIÓN SECRETARIA ━━━ */
  {
    id: 'secretaria',
    title: 'Operaciones y Secretaría',
    visibleTo: ADMIN_PLUS_SECRETARIA,
    articles: [
      {
        id: 'sec-clientes',
        title: 'Gestión de clientes y contactos',
        description: 'Registro y seguimiento de clientes del sistema.',
        icon: Users,
        visibleTo: ADMIN_PLUS_SECRETARIA,
        steps: [
          'Ir a "Clientes" → botón "Nuevo cliente".',
          'Completar nombre completo, tipo de documento, número, teléfono, email.',
          'Seleccionar tipo de cliente: Inquilino, Comprador, Inversor, Otro.',
          'Para registrar una consulta recibida: usar el Pipeline → "Nueva oportunidad" con los datos del contacto.',
          'Para hacer seguimiento de leads: ir a "Leads Portal" y actualizar el estado de cada lead.',
          'Agendar una visita: desde el Pipeline, registrar la próxima acción con fecha.',
        ],
      },
      {
        id: 'sec-contratos',
        title: 'Contratos y finanzas',
        description: 'Carga de contratos, pagos y alertas financieras.',
        icon: FileText,
        visibleTo: ADMIN_PLUS_SECRETARIA,
        steps: [
          'Ir a "Contratos" → botón "Nuevo contrato".',
          'Completar el wizard: tipo (alquiler/venta), propiedad, cliente, fechas, montos.',
          'Si la propiedad no está en el sistema: activar "Propiedad externa" para ingresar la dirección manualmente.',
          'Para registrar un ingreso o egreso: ir a "Finanzas" → botón correspondiente.',
          'Las alertas de pagos próximos a vencer aparecen automáticamente en las notificaciones (campanita).',
          'El sistema envía alertas a 30, 15 y 7 días del vencimiento de un contrato.',
          'Para usar el inventario: ir a "Inventario" → registrar los ítems de cada propiedad con su condición.',
          'Al finalizar un contrato, comparar condición de entrega vs condición de devolución.',
        ],
      },
    ],
  },

  /* ━━━ SECCIÓN AGENTES ━━━ */
  {
    id: 'agentes',
    title: 'Guías para Agentes',
    visibleTo: AGENT_ONLY,
    articles: [
      {
        id: 'ag-propiedades',
        title: 'Mis propiedades',
        description: 'Cómo cargar, editar y gestionar tus propiedades.',
        icon: Building2,
        visibleTo: AGENT_ONLY,
        steps: [
          'Ir a "Propiedades" → botón "Nueva propiedad".',
          'Completar los datos: título, dirección, tipo, precio, metros cuadrados, habitaciones, baños.',
          'Subir fotos ilimitadas — se comprimen automáticamente a WebP (no hay límite de cantidad).',
          'Usar los toggles rápidos al cargar: sala integrada, cocina integrada, acepta mascotas, cochera incluida.',
          'Para cambiar el estado de una propiedad: editarla → campo "Estado" → elegir el nuevo estado.',
          'Si tu propiedad está alquilada pero estará disponible pronto: activar "Disponible desde" con la fecha futura. Esto habilita el botón "Reservar" en el portal.',
          'Toggle "Mostrar en portal público": controla si la propiedad es visible para los visitantes del portal. Podés ocultar una propiedad sin cambiar su estado.',
          'Solo podés editar o eliminar tus propias propiedades. Las de otros agentes se ven en el catálogo pero no se pueden modificar.',
        ],
      },
      {
        id: 'ag-catalogo-export',
        title: 'Exportar PDF desde Catálogo Interno',
        description: 'Generar folletos PDF con propiedades seleccionadas.',
        icon: FileDown,
        visibleTo: AGENT_ONLY,
        steps: [
          'Ir a "Disponibles" (Catálogo Interno) desde el sidebar.',
          'Cada tarjeta tiene un checkbox en la esquina superior izquierda — seleccionar las propiedades que querés exportar.',
          'Podés seleccionar hasta 10 propiedades.',
          'Al seleccionar al menos una, aparece el botón "Exportar" en la barra superior.',
          'Hacer clic en "Exportar" → escribir un título personalizado (opcional).',
          'Si seleccionaste más de una, podés activar "Incluir tabla comparativa".',
          'Hacer clic en "Generar PDF" → se descarga el folleto con branding Plusterra.',
          'Ideal para enviar a clientes por WhatsApp o email con varias opciones comparadas.',
        ],
      },
      {
        id: 'ag-propietarios',
        title: 'Mis propietarios',
        description: 'Tu cartera de propietarios es privada y segura.',
        icon: UserCheck,
        visibleTo: AGENT_ONLY,
        steps: [
          'Ir a "Propietarios" → botón "Nuevo propietario".',
          'Completar nombre, documento, teléfono, email.',
          'Tus propietarios son privados — otros agentes NO los ven. Solo vos y los administradores.',
          'Para subir documentos del propietario: abrir su detalle → "Documentos" → "Subir documento".',
          'Los documentos están protegidos — solo vos y los admins pueden accederlos.',
          'Al cargar una propiedad, el selector de propietario solo muestra TUS propietarios.',
          'También podés crear un propietario nuevo directamente desde el formulario de propiedad (botón "+").',
        ],
      },
      {
        id: 'ag-favoritos',
        title: 'Mis favoritos',
        description: 'Marcar propiedades como favoritas para acceso rápido.',
        icon: Star,
        visibleTo: AGENT_ONLY,
        steps: [
          'En el Catálogo Interno, cada tarjeta de propiedad tiene un ícono de estrella.',
          'Hacer clic en la estrella para marcar/desmarcar como favorita.',
          'Usar el botón "Favoritos" en la barra de filtros para ver solo las propiedades marcadas.',
          'Ir a "Mis Favoritos" desde el sidebar para ver tu lista completa.',
          'Los favoritos son privados — solo vos los ves.',
          'Útil para tener a mano las propiedades que más mostrás o que son prioritarias.',
        ],
      },
      {
        id: 'ag-pipeline',
        title: 'Pipeline personal',
        description: 'Tu tablero Kanban de oportunidades con eliminación de deals.',
        icon: Kanban,
        visibleTo: AGENT_ONLY,
        steps: [
          'Ir a "Pipeline" desde el sidebar para ver tu tablero Kanban personal.',
          'Solo ves TUS deals — los de otros agentes no aparecen.',
          'Crear un nuevo deal: botón "+" → completar cliente, propiedad y tipo (Alquiler/Venta).',
          'Mover deals entre etapas arrastrando las tarjetas o con el botón de cambio de etapa.',
          'Cada tarjeta tiene botones: chat (WhatsApp), editar (lápiz), transferir (flechas).',
          'Para ELIMINAR un deal propio: hacer clic en el ícono de papelera (🗑) en la tarjeta.',
          'Aparece un diálogo: "¿Estás seguro que querés eliminar este lead?" → confirmar para borrar.',
          'La eliminación es definitiva — el deal se borra de la base de datos.',
          'La vista se actualiza automáticamente sin recargar la página.',
        ],
      },
      {
        id: 'ag-edificios',
        title: 'Mis edificios',
        description: 'Gestionar unidades y cobranzas de tus edificios.',
        icon: Building2,
        visibleTo: AGENT_ONLY,
        steps: [
          'Ir a "Edificios" desde el sidebar para ver los edificios donde tenés unidades.',
          'Hacer clic en un edificio para ver su detalle: unidades, inquilinos y estados.',
          'Badges de estado por unidad: Alquilado (verde), Disponible (azul), Reservado (amarillo).',
          'Pestaña "Control de Cobranza": registrar el estado de pago mensual por unidad.',
          'Los agentes no pueden crear nuevos edificios — eso lo hace la administración.',
        ],
      },
      {
        id: 'ag-leads',
        title: 'Leads y consultas',
        description: 'Dónde ver y gestionar tus leads asignados.',
        icon: Inbox,
        visibleTo: AGENT_ONLY,
        steps: [
          'Tus leads asignados aparecen en "Leads Portal" y en tu Pipeline.',
          'Estados de lead: Nuevo (recién llegó), Contactado (ya hablaste), Cerrado (operación terminada).',
          'Los leads del asistente de voz Orbia (Valentina) llegan automáticamente a tu bandeja.',
          'Las solicitudes de reserva del portal (propiedades con fecha futura) también llegan como leads.',
          'Cada lead genera automáticamente una oportunidad en tu Pipeline para darle seguimiento.',
          'Revisá tus leads regularmente para no perder oportunidades.',
        ],
      },
      {
        id: 'ag-comunicaciones',
        title: 'Comunicaciones y avisos',
        description: 'Avisos del equipo, eventos y recordatorios.',
        icon: Megaphone,
        visibleTo: AGENT_ONLY,
        steps: [
          'Ir a "Comunicaciones" desde el sidebar para ver los avisos del equipo.',
          'Los avisos urgentes aparecen con fondo rojo y se muestran primero.',
          'Los avisos fijados tienen un ícono de pin y permanecen arriba del pizarrón.',
          'En la columna derecha podés ver el calendario con los próximos eventos y reuniones.',
          'Los recordatorios de eventos llegan automáticamente a tu campanita: 24 horas y 1 hora antes.',
          'El badge rojo en "Comunicaciones" del sidebar indica cuántas notificaciones sin leer tenés.',
          'Para activar notificaciones push: tu navegador te pedirá permiso la primera vez que entres.',
        ],
      },
      {
        id: 'ag-metas',
        title: 'Mis metas mensuales',
        description: 'Configurar y seguir tus metas de ventas y alquileres.',
        icon: BarChart3,
        visibleTo: AGENT_ONLY,
        steps: [
          'Ir a "Mis Metas" desde el sidebar.',
          'Configurar metas mensuales: cantidad de alquileres, ventas y monto de comisiones.',
          'El sistema muestra tu progreso actual vs tu meta con barras de avance.',
          'Podés agregar una nota personal motivacional para el mes.',
          'Las metas se reinician mes a mes — configurá cada mes tu objetivo.',
        ],
      },
      {
        id: 'ag-celular',
        title: 'Usar Plusterra desde el celular',
        description: 'Instalación, actualizaciones y modo offline.',
        icon: Smartphone,
        visibleTo: AGENT_ONLY,
        steps: [
          'iOS: abrí Safari → visitá la dirección de Plusterra → tocá el ícono de compartir → "Agregar a pantalla de inicio".',
          'Android: abrí Chrome → visitá la dirección de Plusterra → tocá el menú (⋮) → "Instalar app" o "Agregar a pantalla de inicio".',
          'Una vez instalada, la app se abre a pantalla completa con el splash screen animado de Plusterra.',
          'Cuando aparezca el banner azul "Nueva versión disponible": tocá "Actualizar ahora" para obtener la última versión.',
          'Si quedás sin internet: aparece una pantalla de "Sin conexión". Los datos se cargan automáticamente cuando vuelva la conexión.',
          'La app funciona como una app nativa — podés recibir notificaciones push aunque no tengas la app abierta.',
        ],
      },
    ],
  },
];

/* ──────────── Universal sections (shown to everyone) ──────────── */
const universalGuides: Article[] = [
  {
    id: 'uni-contratos',
    title: 'Crear un contrato de alquiler',
    description: 'Flujo completo de creación de contrato.',
    icon: FileText,
    visibleTo: ['superadmin', 'admin', 'accounting', 'secretaria', 'agent'],
    steps: [
      'Ir a "Contratos" → botón "Nuevo contrato".',
      'Seleccionar tipo, propiedad y cliente.',
      'Si la propiedad NO está en el sistema (captación externa), activar "Propiedad externa" y completar la dirección manualmente.',
      'Si hay un captador externo, registrar su nombre, inmobiliaria y teléfono.',
      'Completar datos del contrato (monto, fechas, garantía).',
      'Revisar los datos en el resumen y guardar.',
      'Al guardar un alquiler, aparece el modal de "Registrar Comisión".',
      'Seleccionar si alquilaste solo, con un co-broker interno o externo.',
      'Confirmar — la comisión queda registrada con el 15% pendiente para la empresa.',
    ],
  },
  {
    id: 'uni-pipeline',
    title: 'Gestionar pipeline de ventas',
    description: 'Tablero Kanban para seguimiento de oportunidades y eliminación de deals.',
    icon: Kanban,
    visibleTo: ['superadmin', 'admin', 'accounting', 'secretaria', 'agent'],
    steps: [
      'Ir a "Pipeline" para ver el tablero Kanban.',
      'Crear una nueva oportunidad con el botón "+".',
      'Arrastrar las tarjetas entre etapas según avance.',
      'Registrar seguimientos y notas en cada deal.',
      'Cada tarjeta tiene botones de acción: WhatsApp, editar, transferir y eliminar (papelera).',
      'Para eliminar un deal: clic en el ícono de papelera → confirmar en el diálogo → se elimina definitivamente.',
      'Los agentes solo pueden eliminar sus propios deals. Admin/Gerente pueden eliminar cualquiera.',
      'Al cerrar una operación, el sistema genera la comisión automáticamente.',
    ],
  },
  {
    id: 'uni-llaves',
    title: 'Control y retiro de llaves',
    description: 'Gestión de llaves de propiedades.',
    icon: Key,
    visibleTo: ['superadmin', 'admin', 'accounting', 'secretaria', 'agent'],
    steps: [
      'Admin/Secretaría: ir a "Control de Llaves" para ver llaves en movimiento y registrar devoluciones.',
      'Agentes: ir a "Retiro de Llaves" → escanear QR de la propiedad o buscarla manualmente → confirmar retiro.',
      'El badge rojo en el sidebar indica cuántas llaves están fuera de oficina.',
      'Al finalizar la visita, devolver la llave en oficina para que quede registrado.',
    ],
  },
];

/* ──────────── FAQ universal ──────────── */
const faqs = [
  { q: '¿Cómo se calcula la comisión en alquileres?', a: 'La comisión base es el 50% del primer alquiler mensual. Si el propietario otorga la mitad de la garantía como bonus, se suma al bruto total. Cada agente deja el 15% de su ganancia bruta para la empresa. Ejemplo: alquiler de 2.500.000 Gs → comisión 1.250.000 + bonus garantía 1.250.000 = 2.500.000 bruto. 15% empresa = 375.000. Neto agente = 2.125.000.' },
  { q: '¿Qué pasa si alquilo con otro agente (co-broker)?', a: 'La ganancia bruta se divide 50/50 entre captador y cerrador. Cada uno deja su 15% a la empresa. Funciona igual para co-broker interno o externo.' },
  { q: '¿Qué significa cada estado de propiedad?', a: 'Disponible = se puede mostrar. Reservada = un agente la reservó temporalmente. Alquilada = operación cerrada (puede tener fecha de disponibilidad futura). Vendida = operación de venta cerrada. Mantenimiento = no disponible para visitas.' },
  { q: '¿Cómo funciona el pipeline?', a: 'Es un tablero Kanban donde cada tarjeta representa una oportunidad. Movelas entre etapas según el avance de la negociación.' },
  { q: '¿Puedo exportar datos?', a: 'Sí. Las secciones de contratos, finanzas y edificios tienen botones de exportación a Excel y PDF.' },
  { q: '¿El bonus de garantía es siempre?', a: 'No. Depende del acuerdo con el propietario. Al registrar la comisión, podés activar o desactivar el toggle "Bonus de garantía".' },
  { q: '¿Cómo registro un alquiler de una propiedad externa?', a: 'Al crear el contrato, activá "Propiedad externa". Esto permite ingresar la dirección manualmente y registrar el captador externo.' },
];

/* ──────────── component ──────────── */
const HelpCenter = () => {
  const { role } = useAuth();
  const [search, setSearch] = useState('');
  const [sugerenciaOpen, setSugerenciaOpen] = useState(false);
  const [reporteOpen, setReporteOpen] = useState(false);

  const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const searchNorm = normalize(search);

  const userRole = (role || 'agent') as 'superadmin' | 'admin' | 'accounting' | 'secretaria' | 'agent';

  const matchesSearch = (article: Article) => {
    if (!searchNorm) return true;
    return (
      normalize(article.title).includes(searchNorm) ||
      normalize(article.description).includes(searchNorm) ||
      article.steps.some(s => normalize(s).includes(searchNorm))
    );
  };

  const visibleSections = sections
    .filter(s => s.visibleTo.includes(userRole))
    .map(s => ({
      ...s,
      articles: s.articles.filter(a => a.visibleTo.includes(userRole) && matchesSearch(a)),
    }))
    .filter(s => s.articles.length > 0);

  const visibleUniversal = universalGuides.filter(a => a.visibleTo.includes(userRole) && matchesSearch(a));

  const filteredFaqs = faqs.filter(f => !searchNorm || normalize(f.q).includes(searchNorm) || normalize(f.a).includes(searchNorm));

  return (
    <MainLayout
      title="Centro de Ayuda"
      subtitle="Documentación completa del sistema según tu rol."
      actionNode={
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar en la ayuda..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      }
    >
      <div className="space-y-8">

        {/* ── Commission info (everyone) ── */}
        <section>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
            <DollarSign className="w-5 h-5 text-emerald-500" />
            Comisiones por alquiler
          </h2>
          <Card className="border-emerald-500/20 bg-emerald-500/5">
            <CardContent className="pt-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10 shrink-0">
                  <DollarSign className="w-5 h-5 text-emerald-500" />
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
                    Cada uno deja su 15% a la empresa.
                  </p>
                </div>
              </div>
              <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-1.5">
                <p className="font-semibold text-foreground text-sm mb-2">📊 Ejemplo con alquiler de 2.500.000 Gs:</p>
                <p><strong>Solo (con bonus):</strong> Bruto 2.500.000 → 15% empresa = 375.000 → <span className="text-emerald-600 font-semibold">Neto agente: 2.125.000</span></p>
                <p><strong>Co-broker (con bonus):</strong> Bruto ÷ 2 = 1.250.000 c/u → 15% = 187.500 c/u → <span className="text-emerald-600 font-semibold">Neto c/agente: 1.062.500</span></p>
                <p><strong>Solo (sin bonus):</strong> Bruto 1.250.000 → 15% empresa = 187.500 → <span className="text-emerald-600 font-semibold">Neto agente: 1.062.500</span></p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* ── Payment & Canon info (agents) ── */}
        {(userRole === 'agent') && (
          <section>
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
              <CalendarClock className="w-5 h-5 text-primary" />
              Pagos y canon mensual
            </h2>
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="pt-5 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 shrink-0"><Wallet className="w-5 h-5 text-primary" /></div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">¿Cuándo debo pagar?</h3>
                    <p className="text-sm text-muted-foreground">
                      Los días de pago del canon mensual son <strong className="text-foreground">del 1 al 5 de cada mes</strong>.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/10 shrink-0"><AlertTriangle className="w-5 h-5 text-amber-500" /></div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">¿Qué pasa si no pago a tiempo?</h3>
                    <p className="text-sm text-muted-foreground">
                      Estado <span className="text-amber-500 font-semibold">VENCIDO</span> → interés diario acumulándose.
                      Estado <span className="text-destructive font-semibold">MOROSO</span> → se restringen funciones operativas.
                    </p>
                  </div>
                </div>
                <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
                  <p>🟢 <strong className="text-emerald-600">AL DÍA</strong> — Pagaste este mes. Todo funcionando.</p>
                  <p>🟡 <strong className="text-amber-500">VENCIDO</strong> — Pasó el plazo. Interés acumulándose.</p>
                  <p>🔴 <strong className="text-destructive">MOROSO</strong> — Acceso operativo limitado.</p>
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {/* ── Plan comparison (agents + admin) ── */}
        {(userRole === 'agent' || ADMIN_ROLES.includes(userRole)) && (
          <section>
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
              <Crown className="w-5 h-5 text-amber-500" />
              Comparativa: Plan Básico vs Premium
            </h2>
            <Card>
              <CardContent className="pt-5 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-3 text-muted-foreground font-medium">Funcionalidad</th>
                      <th className="text-center py-2 px-3 text-muted-foreground font-medium w-28">Básico</th>
                      <th className="text-center py-2 px-3 font-medium w-28"><span className="text-amber-600 dark:text-amber-400">Premium</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {[
                      { feature: 'Publicaciones ilimitadas', basic: true, premium: true },
                      { feature: 'WhatsApp directo', basic: true, premium: true },
                      { feature: 'Presencia en el portal', basic: true, premium: true },
                      { feature: 'Ubicación en mapa', basic: true, premium: true },
                      { feature: 'PDF de propiedad', basic: true, premium: true },
                      { feature: 'Propiedades destacadas', basic: false, premium: true },
                      { feature: 'Video embebido (YouTube/Vimeo)', basic: false, premium: true },
                      { feature: 'Tour virtual 360°', basic: false, premium: true },
                      { feature: 'Badge Agente Verificado', basic: false, premium: true },
                      { feature: 'Landing page exclusiva', basic: false, premium: true },
                      { feature: 'Código QR personalizado', basic: false, premium: true },
                      { feature: 'Estadísticas de leads', basic: false, premium: true },
                      { feature: 'Mayor visibilidad en listados', basic: false, premium: true },
                    ].map(({ feature, basic, premium }) => (
                      <tr key={feature}>
                        <td className="py-2.5 px-3 text-foreground">{feature}</td>
                        <td className="text-center py-2.5 px-3">
                          {basic ? <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" /> : <Lock className="w-4 h-4 text-muted-foreground/40 mx-auto" />}
                        </td>
                        <td className="text-center py-2.5 px-3">
                          {premium ? <CheckCircle2 className="w-4 h-4 text-amber-500 mx-auto" /> : <Lock className="w-4 h-4 text-muted-foreground/40 mx-auto" />}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="text-xs text-muted-foreground mt-4">
                  Para activar el Plan Premium, contactá a tu administrador.
                </p>
              </CardContent>
            </Card>
          </section>
        )}

        {/* ── Role-specific article sections ── */}
        {visibleSections.map(section => (
          <section key={section.id}>
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
              <BookOpen className="w-5 h-5 text-primary" />
              {section.title}
            </h2>
            <Accordion type="multiple" className="space-y-3">
              {section.articles.map(article => (
                <AccordionItem key={article.id} value={article.id} className="border rounded-lg px-4">
                  <AccordionTrigger className="text-sm text-left hover:no-underline py-4">
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 rounded-md bg-primary/10 shrink-0">
                        <article.icon className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{article.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{article.description}</p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4">
                    <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground ml-1">
                      {article.steps.map((step, i) => (
                        <li key={i} className="leading-relaxed">{step}</li>
                      ))}
                    </ol>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>
        ))}

        {/* ── Universal guides ── */}
        {visibleUniversal.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
              <BookOpen className="w-5 h-5 text-secondary" />
              Guías generales
            </h2>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {visibleUniversal.map(guide => (
                <Card key={guide.id} className="flex flex-col">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <guide.icon className="w-4 h-4 text-primary shrink-0" />
                      {guide.title}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">{guide.description}</p>
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
        )}

        {/* ── FAQ ── */}
        {filteredFaqs.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
              <HelpCircle className="w-5 h-5 text-primary" />
              Preguntas frecuentes
            </h2>
            <Accordion type="multiple" className="max-w-3xl">
              {filteredFaqs.map((faq, i) => (
                <AccordionItem key={i} value={`faq-${i}`}>
                  <AccordionTrigger className="text-sm text-left">{faq.q}</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground">{faq.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>
        )}

        {/* Empty search */}
        {visibleSections.length === 0 && visibleUniversal.length === 0 && filteredFaqs.length === 0 && search && (
          <div className="text-center py-12 text-muted-foreground">
            <Search className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No se encontraron resultados para "{search}"</p>
          </div>
        )}

        {/* ── Action buttons ── */}
        <div className="flex flex-wrap gap-3 pt-4 border-t border-border">
          <Button onClick={() => setSugerenciaOpen(true)} variant="outline" className="gap-2">
            <Lightbulb className="w-4 h-4 text-secondary" />
            💡 Sugerir mejora
          </Button>
          <Button onClick={() => setReporteOpen(true)} variant="outline" className="gap-2">
            <WrenchIcon className="w-4 h-4 text-destructive" />
            🔧 Reportar problema
          </Button>
        </div>

        <SugerenciaDialog open={sugerenciaOpen} onOpenChange={setSugerenciaOpen} />
        <ReporteDialog open={reporteOpen} onOpenChange={setReporteOpen} />
      </div>
    </MainLayout>
  );
};

export default HelpCenter;
