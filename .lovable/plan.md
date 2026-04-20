

## Diagnóstico

Confirmé que **el loop infinito SÍ comenzó con la integración de ORBIA** (Valentina/ElevenLabs). Ya hubo 3 intentos previos de arreglarlo en commits `d29dd88`, `741e42b`, `da1c4f7` ("Fix infinite reload loop", "Fix portal loop and harden init"), pero el problema persiste. Encontré las causas reales todavía presentes en `src/components/portal/ContactWidget.tsx`:

### Causas detectadas

**1. `OrbiaWidget` se remonta en cada cambio de ruta del portal**
- `ContactWidget` está dentro de `PortalLayout` (que envuelve TODAS las rutas del portal con `<Outlet/>`).
- La query `widget-tipo` arranca con `undefined` → renderiza `<WhatsAppWidget>` → cuando llega `"orbia"` desmonta WhatsApp y monta `<OrbiaWidget>`. Cada vez que un usuario navega, este flicker `undefined → "orbia"` puede repetirse si la cache de TanStack se invalida.

**2. `useConversation` de ElevenLabs es inestable**
- Cada render del padre que cambia *cualquier* propiedad expuesta (`status`, `isSpeaking`) causa re-render → el `useEffect` de volumen (`[volume, isConnected]`) se dispara → llama `conversationRef.current.setVolume(...)` → esto puede causar que el SDK emita un nuevo estado → nuevo render → loop.

**3. El `<style>` defensivo se inyecta en `<head>` en cada mount**
- Aunque hay `useRef` para evitar duplicados, si el componente se remonta el `useRef` es nuevo → otro `<style>` tag → el cleanup intenta removerlo pero pueden quedar zombis.

**4. `OrbiaWidget` carga el SDK ElevenLabs en el bundle principal**
- `import { useConversation } from '@elevenlabs/react'` está en el top-level → se carga aunque el usuario use WhatsApp. Cualquier excepción inicializando el SDK puede explotar antes de la condicional.

**5. La query `widget-tipo` no tiene `placeholderData`**
- Hace que el widget arranque siempre como WhatsApp y luego cambie. Si el usuario tiene Orbia activado, se ve un flicker WhatsApp→Orbia en cada nueva ruta hasta que la cache hidrate.

### Por qué afecta al sistema admin
En `pluspy.app` el `ContactWidget` NO se renderiza directamente, **pero** el bundle principal SÍ importa `@elevenlabs/react` (via `App.tsx → portalChildren → PortalLayout → ContactWidget`). Como esos imports son estáticos (no lazy) en `ContactWidget.tsx`, el código de ElevenLabs SE EJECUTA en la app admin también. Si el SDK tiene side-effects en el módulo (suele instalar listeners globales, polyfills, etc.), puede romper el sistema entero.

## Solución (4 pasos)

### 1. Lazy-load completo del `OrbiaWidget`
Separar `OrbiaWidget` a su propio archivo `src/components/portal/OrbiaWidget.tsx` y cargarlo con `React.lazy()` SOLO cuando `widgetTipo === 'orbia'`. Así:
- El bundle del sistema admin no contiene ElevenLabs.
- El bundle del portal con WhatsApp tampoco lo contiene.
- Solo se descarga si la organización efectivamente usa Orbia.

### 2. Estabilizar el `widget-tipo` con `placeholderData`
Agregar `placeholderData: 'whatsapp'` y subir `staleTime` a 5 minutos para que no haya flicker entre renders/navegaciones.

### 3. Eliminar el `useEffect` de volumen reactivo
Reemplazar el efecto `useEffect([volume, isConnected])` por una llamada directa en el `onChange` del slider. Así sólo se llama `setVolume` cuando el usuario mueve el slider, no en cada re-render del SDK.

### 4. Mover el `<style>` defensivo a `index.html`
Inyectarlo una vez en `<head>` directo en `index.html` para que NO sea responsabilidad de React montarlo/desmontarlo. Elimina toda la lógica de `useEffect + styleTagRef`.

### 5. Bonus: cargar solo en dominio portal
Asegurar que `ContactWidget` solo se renderiza dentro de `PortalLayout` (ya lo está) y verificar que no haya imports cruzados. Confirmado.

## Archivos

- **Nuevo**: `src/components/portal/OrbiaWidget.tsx` — extraer toda la lógica de Valentina/ElevenLabs aquí.
- **Modificado**: `src/components/portal/ContactWidget.tsx` — quedará minimalista: lee `widget-tipo`, si es `'orbia'` carga `<Suspense><LazyOrbiaWidget/></Suspense>`, sino `<WhatsAppWidget/>`. Sin imports de ElevenLabs.
- **Modificado**: `index.html` — agregar el `<style>` defensivo de ElevenLabs directo en `<head>`.

## Resultado esperado

- **Sistema admin (`pluspy.app`)**: ya NO carga el SDK ElevenLabs en el bundle. Bundle más liviano y SIN posibilidad de loop por ese vector.
- **Portal con WhatsApp activo**: tampoco carga ElevenLabs.
- **Portal con Orbia activo**: carga el SDK on-demand, sin flicker entre WhatsApp→Orbia, sin loop por re-renders de volumen, sin style tags duplicados en `<head>`.
- Los usuarios pueden volver a trabajar sin recargas infinitas.

