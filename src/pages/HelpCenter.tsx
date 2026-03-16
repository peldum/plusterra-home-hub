import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { SugerenciaDialog } from '@/components/help/SugerenciaDialog';
import { ReporteDialog } from '@/components/help/ReporteDialog';
import { useSystemUpdates, type SystemUpdate } from '@/hooks/useSystemUpdates';
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
  Globe,
  Star,
  CalendarClock,
  AlertTriangle,
  DollarSign,
  CheckCircle2,
  Megaphone,
  Smartphone,
  Inbox,
  Mic,
  ShieldCheck,
  Bell,
  FileDown,
  BarChart3,
  Settings,
  Eye,
  UserCheck,
  Rocket,
  Sparkles,
  Zap,
  Send,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

/* ──────────── types ──────────── */
interface Article {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  visibleTo: ('superadmin' | 'admin' | 'accounting' | 'secretaria' | 'agent')[];
  steps: string[];
  esNuevo?: boolean;
  fecha?: string; // ISO date
}

interface Section {
  id: string;
  title: string;
  visibleTo: ('superadmin' | 'admin' | 'accounting' | 'secretaria' | 'agent')[];
  articles: Article[];
}

/* ──────────── role helpers ──────────── */
const ALL_ROLES: Section['visibleTo'] = ['superadmin', 'admin', 'accounting', 'secretaria', 'agent'];
const ADMIN_ROLES: Section['visibleTo'] = ['superadmin', 'admin', 'accounting'];
const ADMIN_PLUS_SECRETARIA: Section['visibleTo'] = ['superadmin', 'admin', 'accounting', 'secretaria'];
const AGENT_ONLY: Section['visibleTo'] = ['agent'];

/* ──────────── data ──────────── */
const sections: Section[] = [
  /* ━━━ ADMIN / SUPERADMIN / GERENTE ━━━ */
  {
    id: 'admin',
    title: 'Administración y Gestión',
    visibleTo: ADMIN_ROLES,
    articles: [
      {
        id: 'admin-propiedades',
        title: 'Gestión de propiedades',
        description: 'Cómo cargar, editar y administrar propiedades paso a paso.',
        icon: Building2,
        visibleTo: ADMIN_ROLES,
        steps: [
          'Andá a "Propiedades" y tocá el botón "Nueva propiedad".',
          'Completá los datos principales: título, dirección, tipo (casa, depto, terreno), precio y moneda.',
          'Subí todas las fotos que quieras — no hay límite. El sistema las comprime solo para que carguen rápido.',
          'Usá los toggles para marcar detalles: sala/cocina integrada, acepta mascotas, cochera, etc.',
          'Para marcar una propiedad como alquilada: editala → cambiá el estado a "Alquilada".',
          'Si la propiedad va a estar disponible en una fecha futura, activá "Disponible desde" y poné la fecha. En el portal aparece un badge naranja con esa fecha y un botón "Reservar".',
          'El toggle "Mostrar en portal público" controla si los visitantes del sitio web la ven. Podés ocultarla sin cambiar su estado.',
          'En la lista de propiedades, la columna "Portal" muestra un ícono de ojo para ver rápido cuáles están visibles.',
        ],
      },
      {
        id: 'admin-catalogo-export',
        title: 'Exportar PDF desde el catálogo',
        description: 'Seleccioná propiedades y generá un folleto PDF para compartir.',
        icon: FileDown,
        visibleTo: ADMIN_ROLES,
        steps: [
          'Andá a "Disponibles" (Catálogo Interno) en el menú lateral.',
          'Cada tarjeta tiene un checkbox arriba a la izquierda — marcá las que querés incluir.',
          'Podés seleccionar hasta 10 propiedades.',
          'Cuando marqués al menos una, aparece el botón "Exportar" arriba.',
          'Hacé clic en "Exportar", escribí un título si querés (ej: "Terrenos en Cambyretá").',
          'Si elegiste más de una, podés activar "Incluir tabla comparativa" para un cuadro resumen.',
          'Tocá "Generar PDF" y se descarga automáticamente con el branding de Plusterra.',
        ],
      },
      {
        id: 'admin-propietarios',
        title: 'Gestión de propietarios',
        description: 'Cómo cargar propietarios, asignarlos a agentes y subir documentos.',
        icon: UserCheck,
        visibleTo: ADMIN_ROLES,
        steps: [
          'Andá a "Propietarios" → botón "Nuevo propietario".',
          'Completá nombre, documento, teléfono, email y dirección.',
          'Como Admin o Gerente, podés asignar el propietario a un agente específico usando el selector "Asignar a agente".',
          'Si no elegís agente, queda asignado a tu usuario.',
          'Los agentes solo ven sus propios propietarios. Admin y Gerente ven todos.',
          'Para subir documentos privados: abrí el detalle del propietario → pestaña "Documentos" → "Subir documento".',
          'Tipos de documento: Cédula, Contrato, Escritura, Poder, Otros.',
          'Los documentos son privados por agente. Admin, Gerente y SuperAdmin ven todos.',
        ],
      },
      {
        id: 'admin-edificios',
        title: 'Gestión de edificios',
        description: 'Crear edificios, gestionar unidades y ver liquidaciones.',
        icon: Building2,
        visibleTo: ADMIN_ROLES,
        steps: [
          'Andá a "Edificios" → botón "Nuevo Edificio" (solo Admin y SuperAdmin).',
          'Completá nombre, dirección, pisos, total de unidades y modelo de administración.',
          'Modelos disponibles: Tercerizado/Glosker, Directo, Propietario directo.',
          'Para cambiar el nombre de un edificio: abrí su detalle y hacé clic en el nombre.',
          'Para eliminar un edificio: botón eliminar → confirmación. Las propiedades vinculadas se desvinculan automáticamente.',
          'Dentro del edificio: pestaña "Unidades" para agregar y gestionar cada unidad.',
          'Pestaña "Liquidación Mensual" para ver ingresos y egresos por unidad.',
          'Botones de exportación: Verde (Propietarios), Azul (Interno), Naranja (Externo).',
        ],
      },
      {
        id: 'admin-leads',
        title: 'Portal de Leads',
        description: 'Acá llegan las consultas del portal web, brochures y del asistente de voz.',
        icon: Inbox,
        visibleTo: ADMIN_ROLES,
        steps: [
          'Andá a "Leads Portal" en el menú lateral.',
          'Pestaña "Contactos": consultas que llegan del formulario de contacto del portal.',
          'Pestaña "Descargas Brochure": personas que descargaron fichas PDF del blog (dejan nombre y teléfono).',
          'Pestaña "Orbia (IA)": consultas capturadas por el asistente de voz Valentina.',
          'Para cambiar el estado de un lead: hacé clic en el botón de estado (Nuevo → Contactado → Cerrado).',
          'Para asignarlo a un agente: usá el selector de agente en la tarjeta.',
          'Los leads generan automáticamente una oportunidad en el Pipeline del agente.',
        ],
      },
      {
        id: 'admin-orbia',
        title: 'Asistente de voz Valentina (Orbia)',
        description: 'El widget de voz con inteligencia artificial que responde a los visitantes del portal.',
        icon: Mic,
        visibleTo: ADMIN_ROLES,
        steps: [
          'Valentina es un asistente de voz con IA que responde consultas en tiempo real desde el portal.',
          'Aparece como un widget flotante — los visitantes pueden hablar o escribir.',
          'Para elegir entre Orbia y WhatsApp: andá a "Configuración" → sección "Widget del Portal".',
          'Podés personalizar la foto, nombre y colores del widget desde esa misma sección.',
          'Los leads de voz llegan automáticamente a "Leads Portal" → pestaña "Orbia (IA)".',
          'Para probar el webhook: andá a "Configuración" → "Avanzado" → botón "Probar webhook".',
        ],
      },
      {
        id: 'admin-comunicaciones',
        title: 'Comunicaciones internas',
        description: 'Publicar avisos, crear eventos y enviar notificaciones al equipo.',
        icon: Megaphone,
        visibleTo: ADMIN_ROLES,
        esNuevo: true,
        fecha: '2026-03-16',
        steps: [
          'Andá a "Comunicaciones" en el menú lateral.',
          'Para publicar un aviso: botón "Nuevo aviso" en el Pizarrón.',
          'Ahora todos los roles pueden publicar avisos (antes era solo admin). Cada aviso muestra quién lo publicó y su rol.',
          'Tipos de aviso: Normal (fondo azul) y Urgente (fondo rojo con alerta).',
          'Los avisos se pueden fijar al pizarrón (ícono de pin) y tener fecha de expiración.',
          'Para crear un evento: botón "Nuevo" en "Próximos eventos".',
          'Los eventos tienen recordatorios automáticos a 24 horas y 1 hora antes.',
          'Todo aparece en tiempo real sin recargar la página.',
        ],
      },
      {
        id: 'admin-pipeline-global',
        title: 'Pipeline global',
        description: 'El tablero Kanban donde ves todas las oportunidades de la oficina y sus avances.',
        icon: Kanban,
        visibleTo: ADMIN_ROLES,
        steps: [
          'Andá a "Pipeline" para ver el tablero con todos los deals de la oficina.',
          'Usá el filtro por agente para ver solo los deals de un agente específico.',
          'Filtrá por tipo: Alquiler, Venta o Todos.',
          'Cada tarjeta muestra: cliente, propiedad, etapa y agente responsable.',
          'Para eliminar un deal: hacé clic en el ícono de papelera (🗑) → confirmar.',
          'Admin, SuperAdmin y Gerente pueden eliminar cualquier deal.',
        ],
      },
      {
        id: 'admin-roles',
        title: 'Roles y permisos',
        description: 'Quién puede ver y hacer qué cosa en el sistema.',
        icon: ShieldCheck,
        visibleTo: ADMIN_ROLES,
        steps: [
          'El sistema tiene 5 roles: SuperAdmin, Admin, Gerente, Secretaría y Agente.',
          'SuperAdmin: acceso total. Incluye KPI Ejecutivo, Insight, QA y gestión de Roles.',
          'Admin: gestión operativa completa — propiedades, contratos, finanzas, configuración, portal.',
          'Gerente: mismo acceso que Admin — visibilidad total operativa y financiera.',
          'Secretaría: panel operativo — contratos, propiedades (lectura), agentes (lectura), caja operativa. Sin finanzas globales.',
          'Agente: panel personal — sus propiedades, propietarios, favoritos, pipeline, finanzas personales.',
          'Para crear un usuario nuevo: el SuperAdmin lo hace desde "Configuración".',
          'Andá a "Roles y Permisos" (solo SuperAdmin) para ver la matriz completa.',
        ],
      },
      {
        id: 'admin-configuracion',
        title: 'Configuración del sistema',
        description: 'Branding, marca de agua, portal web y ajustes generales.',
        icon: Settings,
        visibleTo: ADMIN_ROLES,
        steps: [
          'Andá a "Configuración" en el menú lateral.',
          'Sección "Branding": cambiar logo, colores primarios y secundarios.',
          'Sección "Marca de agua": activar/desactivar marca de agua en fotos del portal, configurar posición y opacidad.',
          'Sección "Portal web": habilitar/deshabilitar modo mantenimiento, blog, showroom.',
          'Sección "Widget del Portal": elegir entre Orbia o WhatsApp flotante.',
          'Sección "Plantilla WhatsApp": personalizar el mensaje del botón de contacto del catálogo.',
          'Sección "Notificaciones push": probar envío de notificaciones.',
          'Sección "Canon": configurar monto base, interés diario, día de vencimiento y período de gracia.',
        ],
      },
      {
        id: 'admin-dashboard-v2',
        title: 'Dashboard rediseñado',
        description: 'El panel principal ahora tiene tarjetas modernizadas y alertas con acciones directas.',
        icon: BarChart3,
        visibleTo: ADMIN_ROLES,
        esNuevo: true,
        fecha: '2026-03-15',
        steps: [
          'Al entrar, ves un saludo personalizado: "Hola, [tu nombre]. Tenés N cobros vencidos hoy."',
          'Las tarjetas principales tienen diseño limpio con sombras suaves.',
          'Las tarjetas de alerta ahora incluyen un botón "Ver detalle →" que te lleva directo a Finanzas o Contratos.',
          'La "Reflexión del día" está al final del dashboard — hacé clic para expandirla o cerrarla.',
          'Las Acciones Rápidas (Ingreso, Egreso, Comisión, etc.) siguen iguales con iconos actualizados.',
          'El diseño es responsive: 1 columna en celular, 2 en tablet, 4 en computadora.',
        ],
      },
      {
        id: 'admin-finanzas-tabs',
        title: 'Finanzas: pestañas por concepto',
        description: 'Ahora Finanzas está organizado en 6 pestañas para encontrar todo más fácil.',
        icon: Wallet,
        visibleTo: ADMIN_ROLES,
        esNuevo: true,
        fecha: '2026-03-16',
        steps: [
          'Andá a Finanzas — ahora tiene 6 pestañas arriba para separar la información.',
          'Pestaña "Resumen General": todos los movimientos recientes con filtros.',
          'Pestaña "Control de Cobros": seguimiento de deudas y cobros pendientes.',
          'Pestaña "Cánones Agentes": lo que pagan los agentes a Plusterra, por agente y mes.',
          'Pestaña "Comisiones": comisiones por operaciones con split 85% agente / 15% empresa.',
          'Pestaña "Alquileres": lo que pagan los inquilinos mensualmente.',
          'Pestaña "Egresos": gastos operativos (Internet, salarios, impuestos, etc.).',
          'Las métricas del header (Ingresos, Egresos, Balance, Cánones) se ven siempre, sin importar la pestaña.',
          'En celular, las pestañas se desplazan horizontalmente.',
        ],
      },
      {
        id: 'admin-sidebar-v2',
        title: 'Barra lateral rediseñada',
        description: 'El menú lateral ahora está organizado por secciones para encontrar todo más rápido.',
        icon: Eye,
        visibleTo: ADMIN_ROLES,
        esNuevo: true,
        fecha: '2026-03-15',
        steps: [
          'El sidebar agrupa las opciones en: OPERACIONES, ADMINISTRACIÓN, FINANZAS, COMUNICACIÓN, PORTAL PÚBLICO y SISTEMA.',
          'Cada sección tiene una etiqueta para que sepas dónde está cada cosa.',
          'En computadora: sidebar completo con iconos y texto. Podés colapsarlo con la flechita.',
          'En tablet: sidebar con solo iconos. Mantené el mouse encima para ver el nombre.',
          'En celular: sidebar oculto, se abre con el ícono de menú hamburguesa (☰).',
          'El modo oscuro ahora se cambia con el ícono de sol/luna arriba a la derecha.',
        ],
      },
      {
        id: 'admin-portal-web',
        title: 'Portal Web: acceso y configuración',
        description: 'Las pestañas del portal web ahora son más fáciles de usar en celular.',
        icon: Globe,
        visibleTo: ADMIN_ROLES,
        steps: [
          'Las pestañas de configuración del Portal Web se desplazan horizontalmente en celular y tablet.',
          'En computadora se muestran todas en fila como antes.',
          'La pestaña "Avanzado" (Widget de Contacto, Webhook Orbia, Modo Mantenimiento) solo la ve el SuperAdmin.',
        ],
      },
      {
        id: 'admin-novedades',
        title: 'Novedades del Sistema',
        description: 'Panel de actualizaciones del sistema con notificaciones automáticas.',
        icon: Rocket,
        visibleTo: ADMIN_ROLES,
        esNuevo: true,
        fecha: '2026-03-16',
        steps: [
          'En el header (arriba a la derecha) hay un ícono de cohete 🚀 con un puntito rojo cuando hay novedades sin leer.',
          'Hacé clic en el cohete para abrir el panel lateral con el historial de novedades.',
          'Cuando abrís el panel, el puntito desaparece — el sistema registra que ya las leíste.',
          'Solo el SuperAdmin puede publicar novedades. Los demás roles solo leen.',
          'Cada novedad tiene: tipo (Mejora, Corrección, Nueva función, Mantenimiento), título, descripción y versión opcional.',
          'Al publicar una novedad se envía notificación push a todos los usuarios.',
          'Las novedades también aparecen automáticamente en esta página del Centro de Ayuda.',
        ],
      },
    ],
  },

  /* ━━━ SECRETARÍA ━━━ */
  {
    id: 'secretaria',
    title: 'Operaciones y Secretaría',
    visibleTo: ADMIN_PLUS_SECRETARIA,
    articles: [
      {
        id: 'sec-clientes',
        title: 'Gestión de clientes y contactos',
        description: 'Cómo registrar clientes y hacer seguimiento de sus consultas.',
        icon: Users,
        visibleTo: ADMIN_PLUS_SECRETARIA,
        steps: [
          'Andá a "Clientes" → botón "Nuevo cliente".',
          'Completá: nombre completo, tipo de documento, número, teléfono, email.',
          'Elegí el tipo de cliente: Inquilino, Comprador, Inversor u Otro.',
          'Para registrar una consulta: usá el Pipeline → "Nueva oportunidad" con los datos del contacto.',
          'Para hacer seguimiento de leads: andá a "Leads Portal" y actualizá el estado de cada uno.',
          'Para agendar una visita: desde el Pipeline, registrá la próxima acción con fecha.',
        ],
      },
      {
        id: 'sec-contratos',
        title: 'Contratos y finanzas',
        description: 'Cómo cargar contratos, registrar pagos y ver alertas financieras.',
        icon: FileText,
        visibleTo: ADMIN_PLUS_SECRETARIA,
        steps: [
          'Andá a "Contratos" → botón "Nuevo contrato".',
          'Completá el wizard paso a paso: tipo (alquiler/venta), propiedad, cliente, fechas, montos.',
          'Si la propiedad no está en el sistema: activá "Propiedad externa" para ingresar la dirección a mano.',
          'Para registrar un ingreso o egreso: andá a "Finanzas" → botón correspondiente.',
          'Las alertas de pagos próximos a vencer aparecen automáticamente en las notificaciones (campanita).',
          'El sistema avisa a 30, 15 y 7 días del vencimiento de un contrato.',
          'Para usar el inventario: andá a "Inventario" → registrá los ítems de cada propiedad con su condición.',
          'Al finalizar un contrato, podés comparar cómo se entregó vs cómo se devolvió.',
        ],
      },
    ],
  },

  /* ━━━ AGENTES ━━━ */
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
          'Andá a "Propiedades" → botón "Nueva propiedad".',
          'Completá los datos: título, dirección, tipo, precio, metros cuadrados, habitaciones, baños.',
          'Subí todas las fotos que quieras — se comprimen automáticamente (no hay límite).',
          'Usá los toggles rápidos: sala integrada, cocina integrada, acepta mascotas, cochera.',
          'Para cambiar el estado: editá la propiedad → campo "Estado" → elegí el nuevo.',
          'Si tu propiedad está alquilada pero va a estar disponible pronto: activá "Disponible desde" con la fecha. Esto habilita el botón "Reservar" en el portal.',
          'El toggle "Mostrar en portal público" controla si la ven los visitantes. Podés ocultarla sin cambiar su estado.',
          'Solo podés editar o eliminar tus propias propiedades.',
        ],
      },
      {
        id: 'ag-catalogo-export',
        title: 'Exportar PDF desde el catálogo',
        description: 'Generá folletos PDF con las propiedades que elijas para compartir con clientes.',
        icon: FileDown,
        visibleTo: AGENT_ONLY,
        steps: [
          'Andá a "Disponibles" (Catálogo Interno) en el menú lateral.',
          'Cada tarjeta tiene un checkbox arriba a la izquierda — marcá las que querés.',
          'Podés seleccionar hasta 10 propiedades.',
          'Cuando marqués al menos una, aparece el botón "Exportar" arriba.',
          'Hacé clic en "Exportar" → escribí un título si querés.',
          'Si elegiste más de una, podés activar "Incluir tabla comparativa".',
          'Tocá "Generar PDF" → se descarga con branding Plusterra.',
          'Ideal para enviar a clientes por WhatsApp o email.',
        ],
      },
      {
        id: 'ag-propietarios',
        title: 'Mis propietarios',
        description: 'Tu cartera de propietarios es privada — solo vos y los admins la ven.',
        icon: UserCheck,
        visibleTo: AGENT_ONLY,
        steps: [
          'Andá a "Propietarios" → botón "Nuevo propietario".',
          'Completá nombre, documento, teléfono, email.',
          'Tus propietarios son privados — otros agentes NO los ven.',
          'Para subir documentos: abrí el detalle → "Documentos" → "Subir documento".',
          'Los documentos también son privados — solo vos y los admins pueden verlos.',
          'Al cargar una propiedad, el selector de propietario solo muestra TUS propietarios.',
          'También podés crear un propietario nuevo directo desde el formulario de propiedad (botón "+").',
        ],
      },
      {
        id: 'ag-favoritos',
        title: 'Mis favoritos',
        description: 'Marcá propiedades como favoritas para tenerlas siempre a mano.',
        icon: Star,
        visibleTo: AGENT_ONLY,
        steps: [
          'En el Catálogo Interno, cada tarjeta tiene un ícono de estrella.',
          'Hacé clic para marcar/desmarcar como favorita.',
          'Usá el botón "Favoritos" en la barra de filtros para ver solo las marcadas.',
          'Andá a "Mis Favoritos" en el menú lateral para ver tu lista completa.',
          'Los favoritos son privados — solo vos los ves.',
          'Útil para tener a mano las propiedades que más mostrás.',
        ],
      },
      {
        id: 'ag-pipeline',
        title: 'Mi Pipeline',
        description: 'Tu tablero donde ves y movés a tus clientes según en qué etapa de la operación están.',
        icon: Kanban,
        visibleTo: AGENT_ONLY,
        steps: [
          'Andá a "Pipeline" para ver tu tablero Kanban personal.',
          'Solo ves TUS deals — los de otros agentes no aparecen.',
          'Para crear un nuevo deal: botón "+" → completá cliente, propiedad y tipo.',
          'Mové los deals entre etapas arrastrando las tarjetas o con el botón de cambio.',
          'Cada tarjeta tiene botones: WhatsApp, editar, transferir y eliminar (papelera).',
          'Para eliminar un deal: hacé clic en la papelera 🗑 → confirmá.',
          'La eliminación es definitiva.',
        ],
      },
      {
        id: 'ag-edificios',
        title: 'Mis edificios',
        description: 'Cómo ver tus edificios, unidades y registrar cobranzas.',
        icon: Building2,
        visibleTo: AGENT_ONLY,
        steps: [
          'Andá a "Edificios" para ver los edificios donde tenés unidades.',
          'Hacé clic en un edificio para ver su detalle: unidades, inquilinos y estados.',
          'Badges de estado: Alquilado (verde), Disponible (azul), Reservado (amarillo).',
          'Pestaña "Control de Cobranza": registrá el estado de pago mensual por unidad.',
          'Los agentes no pueden crear edificios nuevos — eso lo hace la administración.',
        ],
      },
      {
        id: 'ag-leads',
        title: 'Mis leads y consultas',
        description: 'Dónde ver las consultas que te asignaron y darles seguimiento.',
        icon: Inbox,
        visibleTo: AGENT_ONLY,
        steps: [
          'Tus leads asignados aparecen en "Leads Portal" y en tu Pipeline.',
          'Estados: Nuevo (recién llegó), Contactado (ya hablaste), Cerrado (operación terminada).',
          'Los leads del asistente Valentina llegan automáticamente.',
          'Las solicitudes de reserva del portal también llegan como leads.',
          'Cada lead genera una oportunidad en tu Pipeline para darle seguimiento.',
          'Revisá tus leads regularmente para no perder oportunidades.',
        ],
      },
      {
        id: 'ag-comunicaciones',
        title: 'Comunicaciones y avisos',
        description: 'Avisos del equipo, eventos y recordatorios que te llegan automáticamente.',
        icon: Megaphone,
        visibleTo: AGENT_ONLY,
        esNuevo: true,
        fecha: '2026-03-16',
        steps: [
          'Andá a "Comunicaciones" para ver los avisos del equipo.',
          'Ahora vos también podés publicar avisos — antes era solo para admin.',
          'Los avisos urgentes aparecen con fondo rojo y se muestran primero.',
          'Los avisos fijados tienen un pin y se quedan arriba del pizarrón.',
          'En la columna derecha ves los próximos eventos y reuniones.',
          'Los recordatorios llegan automáticamente a tu campanita: 24 horas y 1 hora antes.',
          'El badge rojo en "Comunicaciones" del menú indica cuántas notificaciones sin leer tenés.',
        ],
      },
      {
        id: 'ag-metas',
        title: 'Mis metas mensuales',
        description: 'Ponete objetivos de ventas y alquileres y seguí tu progreso.',
        icon: BarChart3,
        visibleTo: AGENT_ONLY,
        steps: [
          'Andá a "Mis Metas" en el menú lateral.',
          'Configurá tus metas del mes: cantidad de alquileres, ventas y monto de comisiones.',
          'El sistema te muestra tu progreso actual vs tu meta con barras de avance.',
          'Podés agregar una nota personal motivacional para el mes.',
          'Las metas se reinician mes a mes — configurá cada mes tu objetivo.',
        ],
      },
      {
        id: 'ag-celular',
        title: 'Usar Plusterra desde el celular',
        description: 'Cómo instalar la app, recibir notificaciones y usarla sin internet.',
        icon: Smartphone,
        visibleTo: AGENT_ONLY,
        steps: [
          'iPhone: abrí Safari → visitá la dirección de Plusterra → tocá el ícono de compartir → "Agregar a pantalla de inicio".',
          'Android: abrí Chrome → visitá la dirección → tocá el menú (⋮) → "Instalar app".',
          'Una vez instalada, la app se abre a pantalla completa como una app nativa.',
          'Cuando aparezca el banner azul "Nueva versión disponible": tocá "Actualizar ahora".',
          'Si te quedás sin internet: aparece una pantalla de "Sin conexión". Los datos cargan solos cuando vuelva.',
          'Podés recibir notificaciones push aunque no tengas la app abierta.',
        ],
      },
      {
        id: 'ag-sidebar-v2',
        title: 'Navegación rediseñada',
        description: 'El menú lateral ahora está organizado por secciones para que encuentres todo más rápido.',
        icon: Eye,
        visibleTo: AGENT_ONLY,
        esNuevo: true,
        fecha: '2026-03-15',
        steps: [
          'El menú lateral agrupa las opciones: OPERACIONES, ADMINISTRACIÓN, COMUNICACIÓN, etc.',
          'En celular: tocá el ícono de menú hamburguesa (☰) para abrirlo.',
          'En tablet: se muestran solo iconos — mantené el dedo encima para ver el nombre.',
          'En computadora: menú completo. Podés colapsarlo con la flechita.',
          'El modo oscuro se cambió al ícono de sol/luna arriba a la derecha.',
          'Los botones "Sugerir" y "Reportar" están acá, al final de esta página.',
        ],
      },
      {
        id: 'ag-novedades',
        title: 'Novedades del Sistema',
        description: 'Mirá qué cambios y mejoras se hicieron en el sistema.',
        icon: Rocket,
        visibleTo: AGENT_ONLY,
        esNuevo: true,
        fecha: '2026-03-16',
        steps: [
          'Arriba a la derecha hay un ícono de cohete 🚀. Si tiene un puntito rojo, hay novedades sin leer.',
          'Hacé clic para abrir el panel con todas las novedades.',
          'Cuando lo abrís, el puntito desaparece — el sistema sabe que ya las viste.',
          'Las novedades las publica el SuperAdmin. Vos solo las leés.',
          'Cada novedad tiene tipo (Mejora, Corrección, etc.), título y descripción.',
        ],
      },
    ],
  },
];

/* ──────────── Universal guides ──────────── */
const universalGuides: Article[] = [
  {
    id: 'uni-contratos',
    title: 'Crear un contrato de alquiler',
    description: 'El paso a paso completo para cargar un contrato nuevo.',
    icon: FileText,
    visibleTo: ALL_ROLES,
    steps: [
      'Andá a "Contratos" → botón "Nuevo contrato".',
      'Elegí el tipo, la propiedad y el cliente.',
      'Si la propiedad NO está en el sistema (captación externa), activá "Propiedad externa" y completá la dirección a mano.',
      'Si hay un captador externo, registrá su nombre, inmobiliaria y teléfono.',
      'Completá datos del contrato: monto, fechas, garantía.',
      'Revisá el resumen y guardá.',
      'Al guardar un alquiler, aparece el modal de "Registrar Comisión".',
      'Elegí si alquilaste solo, con co-broker interno o externo.',
      'Confirmá — la comisión queda registrada con el 15% pendiente para la empresa.',
    ],
  },
  {
    id: 'uni-pipeline',
    title: 'Gestionar el pipeline',
    description: 'Acá ves y movés tus clientes según en qué etapa de la venta o alquiler están.',
    icon: Kanban,
    visibleTo: ALL_ROLES,
    steps: [
      'Andá a "Pipeline" para ver el tablero Kanban.',
      'Creá una nueva oportunidad con el botón "+".',
      'Arrastrá las tarjetas entre etapas según cómo avanza la operación.',
      'Registrá seguimientos y notas en cada deal.',
      'Para eliminar un deal: clic en la papelera 🗑 → confirmá.',
      'Los agentes solo pueden eliminar sus propios deals. Admin y Gerente pueden eliminar cualquiera.',
      'Al cerrar una operación, el sistema genera la comisión automáticamente.',
    ],
  },
  {
    id: 'uni-llaves',
    title: 'Control y retiro de llaves',
    description: 'Cómo funciona el sistema de llaves para mostrar propiedades.',
    icon: Key,
    visibleTo: ALL_ROLES,
    steps: [
      'Admin/Secretaría: andá a "Control de Llaves" para ver llaves en movimiento y registrar devoluciones.',
      'Agentes: andá a "Retiro de Llaves" → escaneá el QR de la propiedad o buscala manualmente → confirmá el retiro.',
      'El badge rojo en el menú indica cuántas llaves están fuera de oficina.',
      'Al terminar la visita, devolvé la llave en oficina para que quede registrado.',
    ],
  },
  {
    id: 'uni-compartir-propiedad',
    title: 'Compartir propiedad por WhatsApp o copiar mensaje',
    description: 'Cómo enviar una ficha de propiedad a un cliente con o sin link del portal.',
    icon: Send,
    visibleTo: ALL_ROLES,
    esNuevo: true,
    fecha: '2026-03-16',
    steps: [
      'Abrí el detalle de cualquier propiedad desde el Catálogo Interno.',
      'Abajo vas a ver dos botones: "Enviar por WhatsApp" (verde) y "Copiar mensaje" (gris).',
      'Si la propiedad ESTÁ publicada en el portal: el mensaje incluye automáticamente el link directo para que el cliente la vea online.',
      'Si la propiedad NO está publicada: aparece un aviso amarillo con dos opciones:',
      '→ "Publicar ahora y enviar": publica la propiedad en el portal y envía el mensaje CON link.',
      '→ "Enviar sin link": envía solo la ficha técnica (título, precio, características) SIN link.',
      'El mensaje incluye: título, precio con moneda, dormitorios, baños, metros cuadrados y dirección.',
      '"Copiar mensaje" copia exactamente el mismo texto al portapapeles para pegarlo en Telegram, email o cualquier otra app.',
      'IMPORTANTE: "Publicar en portal" y "Mostrar en portal público" son lo mismo — si está activado, la propiedad aparece en el sitio web público y el link funciona.',
    ],
  },
];

/* ──────────── FAQ ──────────── */
const faqs = [
  { q: '¿Cómo se calcula la comisión en alquileres?', a: 'La comisión base es el 50% del primer alquiler mensual. Si el propietario da la mitad de la garantía como bonus, se suma al total. Cada agente deja el 15% de su ganancia bruta para la empresa. Ejemplo: alquiler de 2.500.000 Gs → comisión 1.250.000 + bonus 1.250.000 = 2.500.000 bruto. 15% empresa = 375.000. Neto agente = 2.125.000.' },
  { q: '¿Qué pasa si alquilo con otro agente (co-broker)?', a: 'La ganancia bruta se divide 50/50 entre captador y cerrador. Cada uno deja su 15% a la empresa.' },
  { q: '¿Qué significa cada estado de propiedad?', a: 'Disponible = se puede mostrar. Reservada = un agente la reservó temporalmente. Alquilada = operación cerrada (puede tener fecha de disponibilidad futura). Vendida = operación de venta cerrada. Mantenimiento = no disponible.' },
  { q: '¿Cómo funciona el pipeline?', a: 'Es un tablero donde cada tarjeta es una oportunidad. Movelas entre etapas según avance. Los agentes pueden eliminar sus propios deals con el botón de papelera.' },
  { q: '¿Puedo exportar datos?', a: 'Sí. Contratos, finanzas y edificios se pueden exportar a Excel/PDF. Desde el Catálogo Interno podés seleccionar hasta 10 propiedades y generar un folleto PDF con branding Plusterra.' },
  { q: '¿El bonus de garantía es siempre?', a: 'No. Depende del acuerdo con el propietario. Al registrar la comisión, podés activar o desactivar el toggle "Bonus de garantía".' },
  { q: '¿Cómo registro un alquiler de una propiedad externa?', a: 'Al crear el contrato, activá "Propiedad externa". Eso te deja ingresar la dirección a mano y registrar el captador externo.' },
  { q: '¿Cómo elimino un deal del pipeline?', a: 'En la tarjeta del deal, hacé clic en la papelera 🗑, confirmá y listo.' },
  { q: '¿Cómo asigno un propietario a un agente?', a: 'Como Admin o Gerente, al crear o editar un propietario aparece el selector "Asignar a agente".' },
  { q: '¿Puedo cambiar el nombre de un edificio?', a: 'Sí. Entrá al detalle del edificio y hacé clic en el nombre para editarlo.' },
  { q: '¿Dónde están las pestañas de Finanzas?', a: 'El módulo de Finanzas tiene 6 pestañas: Resumen General, Control de Cobros, Cánones Agentes, Comisiones, Alquileres y Egresos. Las métricas globales se ven siempre.' },
  { q: '¿Dónde quedó la Reflexión del día?', a: 'Se movió al final del Dashboard. Hacé clic en "Reflexión del día" para expandirla.' },
  { q: '¿Qué es el ícono del cohete 🚀?', a: 'Es el panel de Novedades del Sistema. Cuando tiene un puntito rojo, hay actualizaciones sin leer. Hacé clic para verlas.' },
  { q: '¿Todos pueden publicar avisos en el Pizarrón?', a: 'Sí. Ahora todos los roles pueden crear avisos. Cada aviso muestra quién lo publicó y su rol.' },
  { q: '¿Qué diferencia hay entre "Publicar en portal" y "Mostrar en portal público"?', a: 'Son lo mismo — ambos controlan si la propiedad aparece en el sitio web público. Si está activado, los visitantes pueden verla y el link de WhatsApp funciona. Si está desactivado, la propiedad existe solo en el sistema interno.' },
  { q: '¿Qué pasa si comparto una propiedad que no está publicada?', a: 'El sistema te avisa con un cartel amarillo. Tenés dos opciones: "Publicar ahora y enviar" (activa la publicación y envía con link) o "Enviar sin link" (manda solo la ficha técnica sin URL).' },
];

/* ──────────── Novedades type map ──────────── */
const novedadTypeConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  mejora: { label: 'Mejora', icon: Sparkles, color: 'bg-info/10 text-info border-info/20' },
  correccion: { label: 'Corrección', icon: WrenchIcon, color: 'bg-warning/10 text-warning border-warning/20' },
  nueva_funcion: { label: 'Nueva función', icon: Zap, color: 'bg-success/10 text-success border-success/20' },
  mantenimiento: { label: 'Mantenimiento', icon: Settings, color: 'bg-muted text-muted-foreground border-border' },
};

/* ──────────── Utility: count new articles ──────────── */
export const getNewArticleCount = (userRole: string): number => {
  const r = (userRole || 'agent') as 'superadmin' | 'admin' | 'accounting' | 'secretaria' | 'agent';
  let count = 0;
  for (const s of sections) {
    if (!s.visibleTo.includes(r)) continue;
    for (const a of s.articles) {
      if (a.esNuevo && a.visibleTo.includes(r)) count++;
    }
  }
  return count;
};

/* ──────────── component ──────────── */
const HelpCenter = () => {
  const { role } = useAuth();
  const [search, setSearch] = useState('');
  const [sugerenciaOpen, setSugerenciaOpen] = useState(false);
  const [reporteOpen, setReporteOpen] = useState(false);
  const { data: systemUpdates = [] } = useSystemUpdates();

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

  // Collect new articles visible to this user
  const newArticles: Article[] = [];
  for (const s of sections) {
    if (!s.visibleTo.includes(userRole)) continue;
    for (const a of s.articles) {
      if (a.esNuevo && a.visibleTo.includes(userRole)) newArticles.push(a);
    }
  }

  const visibleSections = sections
    .filter(s => s.visibleTo.includes(userRole))
    .map(s => ({
      ...s,
      articles: s.articles.filter(a => a.visibleTo.includes(userRole) && matchesSearch(a)),
    }))
    .filter(s => s.articles.length > 0);

  const visibleUniversal = universalGuides.filter(a => a.visibleTo.includes(userRole) && matchesSearch(a));

  const filteredFaqs = faqs.filter(f => !searchNorm || normalize(f.q).includes(searchNorm) || normalize(f.a).includes(searchNorm));

  // System updates (novedades) for display
  const recentUpdates = systemUpdates.slice(0, 5);

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

        {/* ── ÚLTIMAS ACTUALIZACIONES ── */}
        {!search && (newArticles.length > 0 || recentUpdates.length > 0) && (
          <section>
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
              <Rocket className="w-5 h-5 text-[hsl(var(--warning))]" />
              Últimas actualizaciones
            </h2>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {/* System updates from DB */}
              {recentUpdates.map((update: SystemUpdate) => {
                const cfg = novedadTypeConfig[update.update_type] || novedadTypeConfig.mejora;
                const Icon = cfg.icon;
                return (
                  <Card key={`su-${update.id}`} className="border-[hsl(var(--warning))]/20 bg-[hsl(var(--warning))]/5">
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className="bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground,var(--primary-foreground)))] text-[10px] border-0">
                          Nuevo
                        </Badge>
                        <Badge variant="outline" className={`text-[10px] gap-1 ${cfg.color}`}>
                          <Icon className="w-3 h-3" />
                          {cfg.label}
                        </Badge>
                        {update.version && (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">v{update.version}</Badge>
                        )}
                      </div>
                      <CardTitle className="text-sm mt-1">{update.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-3">{update.description}</p>
                      <p className="text-[10px] text-muted-foreground mt-2">
                        {formatDistanceToNow(new Date(update.created_at), { addSuffix: true, locale: es })}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}

              {/* Static new articles */}
              {newArticles.map(article => (
                <Card key={article.id} className="border-[hsl(var(--warning))]/20 bg-[hsl(var(--warning))]/5">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground,var(--primary-foreground)))] text-[10px] border-0">
                        Nuevo
                      </Badge>
                    </div>
                    <CardTitle className="text-sm flex items-center gap-2 mt-1">
                      <article.icon className="w-4 h-4 text-primary shrink-0" />
                      {article.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-xs text-muted-foreground">{article.description}</p>
                    {article.fecha && (
                      <p className="text-[10px] text-muted-foreground mt-2">
                        {formatDistanceToNow(new Date(article.fecha), { addSuffix: true, locale: es })}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

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
                    Si el propietario da la <strong className="text-foreground">mitad de la garantía</strong> como bonus,
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
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-foreground">{article.title}</p>
                        {article.esNuevo && (
                          <Badge className="bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground,var(--primary-foreground)))] text-[9px] px-1.5 py-0 border-0">
                            Nuevo
                          </Badge>
                        )}
                        <p className="text-xs text-muted-foreground mt-0.5 w-full">{article.description}</p>
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
