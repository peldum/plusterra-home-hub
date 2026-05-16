## Objetivo

Erradicar de raíz los "loops infinitos" — tanto los reales (consultas que se disparan en cadena) como los **falsos positivos** del `QueryLoopGuard` que muestran la pantalla roja de "Loop detectado" cuando en realidad el dashboard simplemente carga muchas consultas en paralelo (lo que se ve en tu video: el contenido aparece y luego se "vacía").

## Diagnóstico

Hoy hay **dos cosas distintas** mezcladas bajo el nombre "loop infinito":

1. **Falsos positivos del guard.** `src/lib/queryLoopGuard.ts` corta cualquier query que se ejecute más de `25 veces en 2.5s`. El dashboard del SuperAdmin dispara ~10 `useQuery` simultáneos (`useDashboardStats`, `ActiveReservationsPanel`, `RentCollectionWidget`, `BirthdayWidget`, `FinancialRiskPanel`, `RecentTransactions`, `useContractForecast`, etc.) más recargas por foco/montaje. Cuando se combinan navegación rápida + StrictMode + refetch on focus, una sola query puede pasar el umbral sin estar en loop real.
2. **Loops reales** por dependencias inestables (objetos/arrays nuevos en cada render dentro de `queryKey`, `useEffect` con deps que cambian de referencia, `refetchInterval` muy agresivo, suscripciones realtime duplicadas).

Hoy el guard **además bloquea toda la app** mostrando la pantalla roja (`QueryLoopBoundary`), aunque la causa sea solo carga concurrente.

## Cambios propuestos

### 1. Endurecer y "silenciar" el guard para falsos positivos
Archivo: `src/lib/queryLoopGuard.ts`
- Subir `maxHits` de 25 → **60** y `windowMs` de 2500 → **4000ms** (más tolerante a dashboards pesados).
- Extender `COLD_START_GRACE_MS` de 15s → **25s** solo en la primera carga después de login.
- Cuando se detecte un loop:
  - **No lanzar `QueryLoopDetectedError`** que rompe la UI. En su lugar devolver `lastResponse` cacheado si existe, y si no, devolver un `Response` 200 con `[]` (array vacío) + un `console.warn` detallado.
  - Seguir disparando el `CustomEvent('query-loop-detected')` pero solo para telemetría.

### 2. Quitar la pantalla roja bloqueante
Archivo: `src/components/errors/QueryLoopBoundary.tsx`
- Reemplazar el render de pantalla completa por un **toast discreto** (sonner) tipo "Demasiadas consultas a `X`, se pausó temporalmente". La app sigue funcionando.
- Mantener el componente como wrapper transparente.

### 3. Estabilizar `queryKey` dependientes de fecha
Archivo: `src/hooks/useDashboardStats.ts`
- `todayStr`, `monthStart`, `monthEnd` se recalculan en cada render. Envolverlos en `useMemo(() => …, [])` para que el `queryKey` no cambie entre renders del mismo día.
- Mismo patrón en cualquier hook detectado con `new Date()` directo en `queryKey` (revisar `useCanonAgent`, `useContractForecast`, `useNotifications`).

### 4. Consolidar refetch agresivos
- `ActiveReservationsPanel`: `refetchInterval: 180_000` está OK, pero agregar `refetchOnWindowFocus: false` y `staleTime: 60_000`.
- Establecer defaults globales en el `QueryClient` (probablemente `src/App.tsx`):
  ```ts
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: (count, err) => !(err instanceof QueryLoopDetectedError) && count < 1,
    }
  }
  ```

### 5. Auditoría puntual de hooks sospechosos
Revisar y corregir si hace falta (no tocar lógica, solo deps/keys):
- `src/hooks/useNotifications.ts` (3 useEffect)
- `src/hooks/useContractHistory.ts`
- `src/contexts/AuthContext.tsx` (resets del guard)
- `src/components/portal/ContactWidget.tsx`
- `src/components/portal/agent/AgentHeroSection.tsx`

En cada uno: garantizar que arrays/objetos pasados como deps estén memorizados, y que canales realtime se desuscriban en cleanup.

### 6. Telemetría mínima
- En `queryLoopGuard.ts`, cuando se exceda el umbral, `console.warn` con: queryKey, hits, ventana, y `new Error().stack` recortado. Así si vuelve a aparecer un loop **real** podemos identificarlo en consola sin romper la UI.

## Resultado esperado

- Desaparece la pantalla roja de "Loop detectado".
- El dashboard del SuperAdmin carga sin parpadeos / sin vaciarse (como en el video).
- Si en el futuro hay un loop real, queda registrado como `console.warn` con el queryKey culpable, sin tumbar la app.

## Detalles técnicos (para implementación)

- Tocar solo: `queryLoopGuard.ts`, `QueryLoopBoundary.tsx`, `useDashboardStats.ts`, `App.tsx` (defaults del QueryClient), y los hooks listados en §5 si hay deps inestables comprobadas al leerlos.
- No tocar lógica de negocio, RLS, ni edge functions.
- Mantener `AuthExpiredError` y el flujo de refresh 401 intactos.
