# Plan: Detector Universal de Bucles

## Objetivo
Detectar y **cortar automáticamente** cualquier tipo de bucle infinito en el sistema, sin importar su origen (render de React, queries de Supabase, navegación de rutas, llamadas de red, setState, efectos). Hoy `queryLoopGuard` solo mira queryKeys, por eso el panel sale vacío aunque haya loop.

## Qué se va a construir

### 1. `LoopSentinel` — núcleo unificado (`src/lib/loopSentinel.ts`)
Un detector central con 4 sensores independientes que reportan al mismo bus:

- **Render Sensor**: hook `useRenderTracker(componentName)` que cuenta renders por componente en ventana de 2s. Si supera umbral (ej. 50 renders/2s) → marca loop de render.
- **Query Sensor**: integra el `queryTelemetry` existente; cuenta ejecuciones de la misma queryKey en ventana corta.
- **Network Sensor**: intercepta `window.fetch` (wrapper liviano). Cuenta requests idénticos (método+URL+body hash) por ventana de 5s. Umbral: 15 requests iguales.
- **Navigation Sensor**: escucha `popstate` + `history.pushState`/`replaceState` (monkey-patch). Detecta >10 navegaciones en 3s o ping-pong entre 2 rutas.

Cada sensor empuja eventos a un `LoopEventBus` con: tipo, identidad, timestamp, stack trace corto.

### 2. Auto-corte (circuit breaker)
Cuando un sensor dispara:
- **Query/Network**: bloquea nuevas ejecuciones de ese key/URL por 30s y devuelve último valor cacheado o `null`.
- **Render**: fuerza `console.error` con stack + marca el componente en el panel (no se puede "matar" un render desde fuera sin romper React, pero sí dejarlo evidente y notificar).
- **Navigation**: cancela la próxima navegación al mismo path por 10s.

### 3. Panel de diagnóstico mejorado (`QueryLoopDiagnosticsDialog`)
Renombrar a `LoopDiagnosticsDialog`. Mostrar 4 tabs:
- Renders (componente, count, último stack)
- Queries (queryKey, count)
- Red (URL+método, count, payload size)
- Navegación (path, count, patrón ping-pong detectado)

Botón "Exportar JSON" para pegarlo en chat. Badge rojo persistente en sidebar cuando hay eventos.

### 4. Instrumentación automática
- **fetch wrapper**: instalado una sola vez en `src/main.tsx` antes de que React monte.
- **history wrapper**: instalado en `main.tsx`.
- **render tracker**: agregar `useRenderTracker("NombrePantalla")` solo en las 8-10 pantallas más pesadas (Dashboard, Finanzas, Propiedades, CRM, Tablero, Sidebar, Layout, App). No instrumentar todo — eso sí causaría overhead.

### 5. Notificación visible al usuario
Cuando el sentinel detecta un loop:
- Toast rojo persistente: "Bucle detectado en [tipo]: [identidad]. Sistema protegido."
- Badge numérico en el botón del panel de diagnóstico.
- Log en `console.error` con tag `[LoopSentinel]` para que aparezca en logs del navegador.

### 6. Persistencia para post-mortem
Guardar últimos 50 eventos en `sessionStorage` (`__loop_sentinel_events`). Así, si el loop tira la pestaña, al recargar el panel sigue mostrando qué pasó.

## Lo que esto resuelve vs. hoy
| Hoy | Con este plan |
|---|---|
| Solo detecta queryKeys repetidas | Detecta render, red, navegación y queries |
| Panel vacío si el loop no es de queries | Panel siempre muestra el origen real |
| No corta nada, solo loguea | Auto-corte de queries/red/navegación |
| Se pierde al recargar | Persistencia en sessionStorage |

## Archivos a crear/editar
- **Crear**: `src/lib/loopSentinel.ts` (núcleo + bus + circuit breaker)
- **Crear**: `src/lib/sensors/renderSensor.ts` (+ hook `useRenderTracker`)
- **Crear**: `src/lib/sensors/networkSensor.ts` (fetch wrapper)
- **Crear**: `src/lib/sensors/navigationSensor.ts` (history wrapper)
- **Editar**: `src/lib/queryTelemetry.ts` → empuja al bus unificado
- **Editar/renombrar**: `src/components/diagnostics/QueryLoopDiagnosticsDialog.tsx` → `LoopDiagnosticsDialog.tsx` con 4 tabs
- **Editar**: `src/main.tsx` → instalar wrappers antes del render
- **Editar**: 8-10 pantallas pesadas → agregar `useRenderTracker("Nombre")` (1 línea cada una)
- **Editar**: `src/components/layout/Sidebar.tsx` → badge en botón diagnóstico

## Lo que NO se toca
- No se modifica ninguna lógica de negocio (finanzas, comisiones, propiedades, contratos).
- No se cambian queries existentes — solo se observan.
- No se cambia ningún componente visual del usuario final.

## Resultado esperado
La próxima vez que haya un bucle, el panel mostrará exactamente **qué** está en loop (componente X re-renderizando 200 veces, o fetch a Y repitiéndose, o navegación A↔B), el sistema lo corta automáticamente, y vos podés mandarme el JSON exportado para corregir la causa raíz en una sola iteración en vez de cinco.
