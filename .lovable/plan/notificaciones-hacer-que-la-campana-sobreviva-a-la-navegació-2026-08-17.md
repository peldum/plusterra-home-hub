# Notificaciones: hacer que la campana sobreviva a la navegación

## Diagnóstico

- `AppShell` es el único layout persistente: monta `Sidebar`, `SplashScreen`, `PWA*`, `InternalAIChat` y el `<Outlet>`. No se desmonta al navegar.
- `MainLayout` no está en `AppShell`: cada página lo renderiza por su cuenta (55 usos en 45 archivos). Contiene el header completo: título, subtítulo, botón "Volver", buscador, Novedades, tema, `NotificationBell` y el botón de acción.
- Consecuencia: al cambiar de ruta se desmonta el header entero, y con él la campana. El canal realtime se recrea con nombre aleatorio (`notif-bell-realtime-<user>-<random>` en `useNotifications.ts`) y se disparan refetches del contador y de la lista.
- Efecto secundario: `useKeyMovementsRealtime` y `useUnreadAnnouncements` viven también en `MainLayout`, así que sufren el mismo remontaje.
- Riesgo real de duplicación: si la campana se agrega a `AppShell` sin quitarla de `MainLayout`, quedan dos campanas visibles y dos canales por usuario.

## Arquitectura recomendada (mínimo riesgo, sin rediseño)

Opción elegida: **A — separar la suscripción de la UI**.

- La campana visual se queda exactamente donde está, dentro del header de `MainLayout`, con el mismo diseño, orden y comportamiento responsive. No se toca ninguna página.
- Lo que se mueve a `AppShell` es solo la **suscripción realtime** y el estado compartido: un componente invisible montado una vez (por ejemplo `NotificationsRealtimeMount`) que abre el canal y solo invalida las query keys existentes.
- `NotificationBell` deja de abrir su propio canal y pasa a ser un consumidor puro de React Query (que ya cachea entre montajes). Al remontarse solo lee caché; no reabre canales.
- El nombre del canal deja de ser aleatorio y pasa a ser determinista por usuario (`notif-realtime-<user.id>`), de modo que un doble montaje accidental no crea dos suscripciones distintas.

Se descarta por ahora mover el header a `AppShell`: obligaría a migrar títulos, subtítulos, `action`/`actionNode`, `showBack`/`backTo` y guardas de permisos de 45 archivos a un contexto nuevo, con alto riesgo en móvil/tablet. Tampoco se crea un `RealtimeProvider` global.

## Archivos que probablemente cambiarían

- `src/hooks/useNotifications.ts` — extraer la suscripción a un hook único con nombre de canal determinista y guard de instancia; los hooks de datos quedan sin canal.
- `src/components/notifications/NotificationsRealtimeMount.tsx` — nuevo, sin UI.
- `src/components/layout/AppShell.tsx` — montar ese componente una sola vez.
- `src/components/notifications/NotificationBell.tsx` — quitar la lógica de canal; conserva UI y filtros actuales.
- Opcional (segunda etapa, aparte): mover `useKeyMovementsRealtime` y `useUnreadAnnouncements` al mismo punto persistente.

## Pasos de implementación

1. Aislar la suscripción actual en un hook propio dentro de `useNotifications.ts`, con canal determinista por usuario e idempotente.
2. Crear el componente invisible que solo llama a ese hook.
3. Montarlo en `AppShell`, después de la comprobación de sesión, para que no se abra sin usuario.
4. Quitar la suscripción de `NotificationBell` en el mismo cambio (evita la ventana de campana/canal duplicado).
5. Verificar que las query keys invalidadas son idénticas a las de hoy, para que contador y lista sigan actualizándose igual.

## Validaciones y pruebas

- Navegar entre 5 pantallas y confirmar en consola/red que no se abren canales nuevos ni se repiten HEAD/GET del contador.
- Confirmar exactamente un canal por usuario tras varias navegaciones (inspección de canales activos del cliente).
- Insertar una notificación de prueba y comprobar que el badge y el panel se actualizan en tiempo real, y que "Marcar todas leídas" sigue funcionando.
- Logout/login: el canal se cierra al salir y se abre uno solo al entrar; cambio de rol sin canales huérfanos.
- Responsive: header idéntico en móvil, tablet y desktop; botón Volver, acciones y menú hamburguesa sin cambios.
- Typecheck y lint limpios.

## Rollback

Cambio acotado a 4 archivos, sin base de datos, RLS, migraciones, autenticación, finanzas ni branding. Si algo falla: revertir desde el historial de Lovable, o quitar el componente de `AppShell` y devolver la suscripción a `NotificationBell`.
