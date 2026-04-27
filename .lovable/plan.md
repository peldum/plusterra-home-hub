# Por qué pluspy se ve "loopeando" al refrescar

Después de revisar el código (no es un loop infinito real, el `QueryLoopGuard` no se dispara — verifiqué los logs de consola), lo que ven los usuarios al recargar es una **cascada de 4-5 estados visuales encadenados** en menos de 3 segundos. Eso da sensación de inestabilidad y no profesionalismo. Los focos concretos que detecté:

## Causas reales

1. **Cascada de spinners en cadena** (el más visible)
   - `ProtectedRoute` muestra spinner "Cargando…" mientras espera auth + `portal_settings`.
   - Después se monta `AppShell` que muestra `SplashScreen` (en PWA) + fade-in.
   - Después se monta la página (ej: `AvailableProperties`) con su propio loader.
   - Cada uno con un estilo distinto → parece que la app se "reinicia" 3 veces.

2. **Polling automático cada 30-60 segundos** (genera tráfico continuo)
   - `useNotifications` (×2 queries) cada 60s
   - `useCommunications` cada 30s
   - `ActiveReservationsPanel` cada 60s
   - Cada poll dispara badges, contadores y a veces invalidaciones en cadena → parpadeos.

3. **Service Worker chequea updates cada 60s** (`src/main.tsx`)
   - Hace que el banner "Actualización disponible" aparezca segundos después del refresh.

4. **Múltiples `useQuery` paralelos al cargar páginas pesadas**
   - `AvailableProperties` dispara propiedades + favoritos + photos por cada propiedad → ráfaga de 20-40 requests al refresh, lo que el usuario ve como "está cargando, cargando, cargando…".

5. **Warning de React en `FlyerGeneratorDialog`** (`Function components cannot be given refs`)
   - No causa loop pero sí re-renders extra del Dialog.

6. **`AuthProvider` ya está bien blindado** contra TOKEN_REFRESHED loops (lo verifiqué). Esa parte no es el problema.

## Plan de cambios

### 1. Unificar estado inicial de carga (lo que más se nota)
- **`AppShell`**: eliminar el `animate-fade-in` redundante y el `SplashScreen` solo se muestra si **realmente** es la primera vez en la sesión. Para refresh normal en navegador (no PWA standalone) el splash ya está desactivado, pero el fade-in encadenado con el de `PortalLayout` y el del root (`main.tsx` setea `opacity:1` en RAF) crea triple fade.
- **`ProtectedRoute`**: combinar el loader de auth y de `portal_settings` en uno solo, con el mismo estilo neutro (fondo `#202124` o background) que use la página, para que no se vea cambio visual entre "cargando auth" → "cargando página".
- **Páginas (`AvailableProperties`, `Properties`, etc.)**: usar `placeholderData: keepPreviousData` para que al volver a una página ya visitada NO muestre spinner — la data cacheada se renderiza al instante mientras refresca en background.

### 2. Reducir polling agresivo
- Subir el `refetchInterval` de:
  - `useNotifications`: 60s → **180s** (3 min)
  - `useCommunications`: 30s → **120s** (2 min)
  - `ActiveReservationsPanel`: 60s → **180s**
- Mantener el realtime de Supabase para cosas críticas (ya está implementado en llaves) en lugar de polling.

### 3. Service Worker update check menos agresivo
- Cambiar el `setInterval(60_000)` en `src/main.tsx` a **300_000 (5 min)**. El chequeo cada minuto satura y muestra el banner al poco de refrescar, dando sensación de inestabilidad.

### 4. Arreglar el warning de `FlyerGeneratorDialog`
- Envolver el componente que recibe el ref con `React.forwardRef` o sacar el ref del header del Dialog.
- Esto evita re-renders y también limpia la consola para que en producción no se vean errores rojos.

### 5. Evitar ráfaga de N+1 en `AvailableProperties`
- El componente actualmente hace 1 query por propiedad para fotos. Cambiar a una sola query con `in()` agrupada por `property_id`, o usar `select` con join `property_photos(*)`. Esto reduce de ~30 requests a 1 sola por refresh.

### 6. Suavizar la transición visual
- El root en `main.tsx` aplica `opacity:1` en `requestAnimationFrame`. Sumarle `transition: opacity 200ms` para que no haya "salto" instantáneo.

## Resultado esperado

- Al refrescar: 1 solo loader breve (≤500ms si la cache está caliente, ≤1.5s en frío), sin parpadeos posteriores.
- Sin requests "fantasma" cada 30-60 segundos visibles en la UI.
- Sin banner de update apareciendo poco después del refresh.
- Sin warnings de React en consola.

## Archivos a tocar

- `src/main.tsx` (intervalo SW + fade)
- `src/components/ProtectedRoute.tsx` (loader unificado)
- `src/components/layout/AppShell.tsx` (quitar fade redundante)
- `src/hooks/useNotifications.ts`, `src/hooks/useCommunications.ts`, `src/components/dashboard/ActiveReservationsPanel.tsx` (subir intervalos)
- `src/pages/AvailableProperties.tsx` + `src/hooks/usePropertyPhotos.ts` (batch de fotos)
- `src/components/properties/FlyerGeneratorDialog.tsx` (forwardRef)

## Lo que NO voy a tocar

- `AuthContext`: ya está correctamente blindado contra loops de TOKEN_REFRESHED.
- `QueryLoopGuard`: funciona bien, no se está disparando, no hay loop real.
- Lógica de negocio / RLS / auth: el problema es 100% de UX percibida.

¿Aprobás que aplique estos 6 ajustes? Una vez aprobado, lo hago de una vez en una sola tanda.
