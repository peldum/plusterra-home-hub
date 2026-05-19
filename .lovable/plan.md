# Telemetría de Query Loops — origen puntual

## Objetivo
Hoy el `queryLoopGuard` detecta loops a nivel **fetch** (URL Supabase) y dispara el evento `query-loop-detected`, pero no dice **qué `queryKey` de React Query** ni **qué hook/componente** lo originó. Vamos a cerrar ese hueco para poder erradicar cada loop en su raíz.

## Qué se construye

### 1. Registro de queryKey → URL activa
Nuevo archivo `src/lib/queryTelemetry.ts`:
- Mantiene un `Map<requestKey, { queryKey, queryHash, observersCount, firstSeen, componentStack? }>`.
- Se suscribe al `QueryCache` de React Query (`queryClient.getQueryCache().subscribe`) y registra cada vez que una query pasa a estado `fetching`, guardando su `queryKey` serializado.
- Cuando el `queryLoopGuard` detecta un loop, consulta este registro para resolver el `queryKey` que estaba activo sobre esa URL/RPC en los últimos N ms.

### 2. Contador agregado por queryKey
- Cuenta refetches por `queryKey` en ventana móvil (4s).
- Umbral configurable (default 30 refetches/4s) — más bajo que el del guard para detectar el loop **antes** de que el guard tenga que degradar a respuesta vacía.
- Cuando se supera el umbral, emite evento `query-key-loop` con: `queryKey`, `hits`, `windowMs`, `lastUrl`, `observersCount`.

### 3. Logging estructurado
En consola (solo cuando se detecta):
```
[QueryLoop] key=["comisiones-rapidas",2026,5] hits=47/4s observers=3 url=/rest/v1/comisiones?... 
   → posible origen: useComisionesRapidas (hook)
```
- Sin ruido durante operación normal.
- Stack trace opcional capturado del primer `fetching` para apuntar al hook caller.

### 4. Panel de diagnóstico SuperAdmin
Nuevo botón en el Sidebar (solo `superadmin`) → **"Diagnóstico de loops"** abre un Dialog que muestra:
- Top 10 queryKeys con más refetches en la última hora.
- Última detección (key, hits, hora, componente sospechoso si está disponible).
- Botón "Copiar reporte" para pegarlo en el chat.
- Botón "Limpiar historial".

El panel persiste el historial en `sessionStorage` (no en DB) para no contaminar nada.

### 5. Integración con el guard existente
- `queryLoopGuard.ts`: cuando dispara `query-loop-detected`, enriquece el `detail` con `queryKey` resolviendo desde `queryTelemetry`.
- El `QueryLoopBoundary` ya existente sigue intacto.

## Lo que NO se toca
- No se cambian umbrales del guard ni la lógica de degradación.
- No se modifica ningún hook ni queryKey existente.
- No hay cambios en DB, RLS, ni edge functions.
- No se envía telemetría a backend (todo client-side).

## Archivos

**Nuevos**
- `src/lib/queryTelemetry.ts` — registro + contadores + suscripción a QueryCache.
- `src/components/diagnostics/QueryLoopDiagnosticsDialog.tsx` — panel SuperAdmin.

**Editados**
- `src/App.tsx` — inicializar `queryTelemetry` con la instancia de `queryClient` justo después de crearla.
- `src/lib/queryLoopGuard.ts` — al emitir `query-loop-detected`, incluir `queryKey` resuelto.
- `src/components/layout/Sidebar.tsx` — agregar entrada "Diagnóstico de loops" (solo SuperAdmin), debajo del botón "Limpiar caché".

## Cómo lo vas a usar
1. Cuando notes lentitud o veas el toast de loop, abrís **Sidebar → Diagnóstico de loops**.
2. Ves el `queryKey` exacto y cuántas veces se disparó.
3. Copiás el reporte y me lo pegás → identifico el hook responsable y lo arreglo en su origen (típicamente una dependencia inestable en `useQuery({ queryKey: [...], ... })` o un `invalidateQueries` mal puesto).

## Riesgo
Bajo. Solo observabilidad pasiva sobre el `QueryCache`. Overhead despreciable (un Map + un subscribe). No afecta UX si todo está sano.
