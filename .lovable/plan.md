
## Plan: blindar el arranque para que no vuelva el loop infinito tras publicar + Ctrl+F5

### Qué está pasando

El problema no parece ser “solo Finanzas”, sino una ráfaga de consultas al arrancar en frío:

- `ProtectedRoute` consulta `portal_settings` en cada pantalla protegida.
- `MainLayout` monta consultas globales siempre (`NotificationBell`, `useUnreadAnnouncements`, realtime de llaves).
- `Finances` ejecuta `usePlusterraIncome()` dos veces al mismo tiempo:
  - una para el header global
  - otra dentro de `ResumenGeneralTab`
- en hard refresh (`Ctrl+F5`) todo entra sin caché, así que varias queries iguales o muy cercanas se disparan juntas y el `queryLoopGuard` las interpreta como loop.

### Objetivo

Mantener la protección anti-loop, pero evitar que el arranque de la app genere ráfagas falsas después de publicar o recargar fuerte.

### Cambios a implementar

#### 1) Ejecutar `usePlusterraIncome` una sola vez en Finanzas
Archivo:
- `src/pages/Finances.tsx`

Cambio:
- mover `usePlusterraIncome()` al nivel de `AdminFinanceView`
- pasar sus resultados a:
  - `FinanceStatsHeader`
  - `ResumenGeneralTab`

Resultado:
- se elimina la duplicación de 5 queries de ingresos/egresos al entrar a `/finanzas`

#### 2) No montar hooks globales hasta que auth/rol estén realmente listos
Archivo:
- `src/components/layout/MainLayout.tsx`

Cambio:
- gatear estas piezas globales con `useAuth()`:
  - `useUnreadAnnouncements()`
  - `useKeyMovementsRealtime()`
  - `NotificationBell`
- no dispararlas mientras `loading === true`
- notificaciones y realtime solo cuando haya `user`
- realtime de llaves solo para roles permitidos y ya resueltos

Resultado:
- el layout deja de hacer queries “ansiosas” durante el arranque

#### 3) Evitar consulta repetida de `portal_settings` por cada ProtectedRoute
Archivo:
- `src/components/ProtectedRoute.tsx`

Cambio:
- convertir la query `["system-suspended"]` en una consulta realmente estable:
  - `staleTime` largo
  - `gcTime` largo
  - `refetchOnMount: false`
  - `refetchOnWindowFocus: false`
  - `refetchOnReconnect: false`
- opcionalmente extraerla a un hook compartido tipo `useSystemSuspended()` para que todas las rutas reutilicen la misma suscripción/cache

Resultado:
- una sola lectura estable de suspensión del sistema, en vez de revalidaciones innecesarias al montar rutas

#### 4) Endurecer el guard para no castigar el “cold start”
Archivo:
- `src/lib/queryLoopGuard.ts`

Cambio:
- mantener el guard, pero hacerlo menos agresivo en el primer arranque:
  - ignorar duplicados simultáneos del mismo request mientras haya `inFlight`
  - no contar como “hits de loop” requests idénticos servidos por deduplicación
  - resetear timestamps viejos con más margen en navegación inicial
- si hace falta, subir ligeramente el umbral solo para GET/RPC de arranque sin tocar la protección para loops reales

Resultado:
- el guard sigue bloqueando loops reales, pero deja pasar la carga normal tras Ctrl+F5

#### 5) Revisar invalidaciones amplias en Finanzas
Archivo:
- `src/pages/Finances.tsx`

Cambio:
- al editar/eliminar movimiento, invalidar solo keys necesarias
- evitar invalidaciones genéricas redundantes como `['payments']` si no están siendo usadas en esa vista
- mantener solo:
  - `['admin-payments-movements']`
  - totales financieros específicos que realmente cambian

Resultado:
- menos cascadas de refetch después de acciones manuales

### Archivos a tocar

- `src/pages/Finances.tsx`
- `src/components/layout/MainLayout.tsx`
- `src/components/ProtectedRoute.tsx`
- `src/lib/queryLoopGuard.ts`

### Resultado esperado

Después de publicar y hacer `Ctrl+F5`:

- la app entra normal
- `/finanzas` no dispara doble carga de ingresos/egresos
- el guard no muestra la pantalla de loop por consultas legítimas de arranque
- las protecciones contra loops reales siguen activas

### Validación

Probar específicamente estos casos:

1. publicar cambios
2. abrir `/finanzas`
3. hacer `Ctrl+F5`
4. confirmar que no aparece “Loop de consultas detectado y bloqueado”
5. navegar entre Dashboard ↔ Finanzas ↔ Notificaciones
6. editar o eliminar un movimiento y verificar que solo refresca lo necesario
