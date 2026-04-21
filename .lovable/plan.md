
## Plan: cortar el bucle infinito que reaparece en /propiedades

### Problema real

El bucle no parece venir del listado de propiedades en sí, sino de la combinación de consultas globales que se montan junto con la página:

- autenticación (`role` / `profile`)
- layout compartido (`NotificationBell`, `Novedades`, sidebar)
- contadores y queries auxiliares (`agents`, notificaciones, branding, etc.)

En la evidencia revisada:
- `/propiedades` hace su `GET /properties` normalmente
- pero también se disparan varias consultas compartidas al mismo tiempo
- además reaparecen requests de `user_roles` y `profiles` del usuario autenticado, señal de churn en la capa de auth/layout

Do I know what the issue is? Sí: el loop más probable está en la capa compartida de auth/layout y no en el render visual de la tabla de propiedades.

### Qué voy a corregir

#### 1) Blindar `AuthContext` para que no recargue perfil/rol repetidamente
Archivo principal:
- `src/contexts/AuthContext.tsx`

Cambios:
- evitar refetch de `fetchUserData` si el `user.id` no cambió realmente
- ignorar eventos duplicados de auth que no cambien sesión efectiva
- guardar una “firma” de sesión/auth event para no volver a pedir `user_roles` + `profiles` innecesariamente
- mantener `resetQueryLoopGuard()` solo cuando corresponda, sin reactivar cascadas

Objetivo:
- que `user_roles` y `profiles` no se vuelvan a pedir en bucle al permanecer en la misma sesión

#### 2) Reducir consultas globales montadas en cada pantalla
Archivos:
- `src/components/ProtectedRoute.tsx`
- `src/components/layout/MainLayout.tsx`
- `src/components/layout/Sidebar.tsx`

Cambios:
- endurecer `enabled`, `staleTime`, `refetchOnMount` y/o `refetchInterval` donde hoy no hacen falta
- no montar consultas secundarias hasta que auth esté realmente estable
- evitar que el layout dispare polling o contadores de forma agresiva al entrar a `/propiedades`

Objetivo:
- bajar el “ruido” de requests paralelos que puede gatillar el guard

#### 3) Estabilizar los hooks usados por Propiedades
Archivos:
- `src/hooks/useProperties.ts`
- `src/hooks/useAgents.ts`
- potencialmente `src/pages/Properties.tsx`

Cambios:
- agregar configuración conservadora de React Query en lecturas pesadas:
  - `staleTime`
  - `refetchOnMount: false` cuando aplique
  - `refetchOnWindowFocus: false` explícito
- asegurar que no haya recreación innecesaria de queries auxiliares al abrir/cerrar diálogos

Objetivo:
- que Propiedades cargue una vez y quede estable, sin reconsultas en cascada

#### 4) Separar el warning de Radix/refs del problema del loop
Archivos:
- `src/pages/Properties.tsx`
- si hace falta, componentes UI relacionados

Detecté además el warning:
- “Function components cannot be given refs” en el menú desplegable

Eso no es necesariamente la causa del loop, pero lo voy a limpiar en esta pasada porque:
- ensucia el render
- puede complicar el diagnóstico
- deja la ruta más estable

Objetivo:
- eliminar warnings de `DropdownMenu`/trigger si algún child no está resolviendo ref correctamente

#### 5) Mejorar el diagnóstico si el loop vuelve a aparecer
Archivo:
- `src/lib/queryLoopGuard.ts`

Cambios:
- dejar trazabilidad más clara del request exacto que detonó el guard
- exponer mejor la key del fetch para aislar el culpable si otro módulo vuelve a romper

Objetivo:
- evitar futuras correcciones “a ciegas”

### Archivos a tocar

- `src/contexts/AuthContext.tsx`
- `src/components/ProtectedRoute.tsx`
- `src/components/layout/MainLayout.tsx`
- `src/components/layout/Sidebar.tsx`
- `src/hooks/useProperties.ts`
- `src/hooks/useAgents.ts`
- `src/pages/Properties.tsx`
- `src/lib/queryLoopGuard.ts`

### Qué no voy a tocar

- sin cambios de base de datos
- sin cambios de RLS
- sin cambios funcionales en liquidaciones/reportes
- sin backend nuevo

### Verificación después del arreglo

1. Entrar a `/propiedades` y confirmar que no aparece la pantalla de loop bloqueado.
2. Verificar que la tabla/grid carga una sola vez y queda estable.
3. Confirmar en consola que desaparece o al menos se reduce el warning del dropdown.
4. Confirmar que abrir/cerrar:
   - detalle de propiedad
   - edición
   - filtros
   no reenciende una cascada de requests.
5. Confirmar que navegación a otras rutas con el mismo layout sigue funcionando normal.

### Resultado esperado

La ruta `/propiedades` vuelve a abrir normal, sin bucle infinito, sin pantalla en blanco y con consultas estabilizadas desde la capa compartida para que el problema no reaparezca al navegar.
