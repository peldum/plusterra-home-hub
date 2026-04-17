
El usuario reporta loop infinito al entrar al sistema. Veo en los logs:

**Diagnóstico:**
- Network requests muestran **JWT expired** (status 401, código `PGRST303`) en TODAS las queries.
- El token expiró: `exp: 1776372472` vs `iat: 1776368872` (1h después).
- React Query reintenta automáticamente queries fallidas → como el 401 nunca se "soluciona" (el token sigue expirado), las queries entran en loop.
- El `queryLoopGuard` detecta esto pero solo bloquea Y muestra error; no fuerza refresh del token.
- El `AuthContext` tiene `autoRefreshToken: true` pero parece que no se dispara antes de que React Query reintente.
- Falta interceptar respuestas 401 para forzar `supabase.auth.refreshSession()` o sign out.

**Causa raíz:** Cuando un usuario abre la app después de mucho tiempo (sesión vieja en localStorage), Supabase intenta usar el token expirado antes de que `autoRefreshToken` lo renueve. Las queries fallan con 401, React Query reintenta → loop visible.

## Plan

**1. Interceptar 401 en `queryLoopGuard.ts`**
Cuando una respuesta sea 401 con `JWT expired` o `PGRST303`:
- Llamar `supabase.auth.refreshSession()` una sola vez.
- Si el refresh falla → `signOut()` y redirigir a `/login`.
- Si el refresh tiene éxito → permitir el retry natural de React Query.

**2. Configurar React Query (en `App.tsx`)**
- Añadir `retry: (failureCount, error) => false` cuando el error sea 401, para evitar reintentos en errores de auth.
- Mantener retries normales para otros errores de red.

**3. Mejorar `AuthContext`**
- En `initializeAuth`, si `getSession()` devuelve sesión pero el token está expirado o por expirar (<60s), llamar `refreshSession()` ANTES de marcar `loading=false`.
- Escuchar evento `TOKEN_REFRESHED` y `SIGNED_OUT` para limpiar el cache de React Query (`queryClient.clear()`).

**4. Limpiar el guard cuando el usuario hace logout**
Resetear el mapa `entries` del guard al hacer signOut para no arrastrar bloqueos viejos.

### Archivos a modificar
- `src/lib/queryLoopGuard.ts` — interceptar 401, intentar refresh
- `src/contexts/AuthContext.tsx` — refresh proactivo al iniciar, limpiar cache en SIGNED_OUT
- `src/App.tsx` (donde se crea el QueryClient) — `retry` que ignore 401

### Resultado esperado
Al entrar con sesión vieja: el sistema renueva el token automáticamente (1 sola vez), las queries proceden normalmente, sin loop. Si el refresh falla, va a `/login` limpio.

¿Avanzo con la implementación?
