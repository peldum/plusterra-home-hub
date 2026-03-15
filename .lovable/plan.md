

## Diagnóstico

1. **Logo faltante en el footer del portal**: La imagen del ícono en el CTA del footer (`plusterra-icon.png`) se importa como asset estático. Si el archivo existe pero no se muestra, puede haber un problema de ruta o el `cta_icon_url` de la BD devuelve una URL vacía/rota. Revisando el código, el fallback es correcto (`settings?.cta_icon_url || plusterraIcon`), así que el problema es que `cta_icon_url` en la BD tiene un valor que apunta a una imagen inexistente. Hay que asegurar que si el valor es una cadena vacía, se use el fallback.

2. **Acceso a landing para agentes no-premium**: Actualmente `PortalAgentProfile` renderiza la vista premium (hero cinematográfico, stats animadas, carrusel) para TODOS los agentes sin distinción. Los agentes básicos no deberían tener acceso a su propia landing page premium.

## Plan de cambios

### 1. Corregir logo en footer CTA
**Archivo**: `src/components/portal/PortalFooter.tsx`
- Cambiar la condición del `src` del ícono CTA para que también cubra strings vacíos: `settings?.cta_icon_url?.trim() || plusterraIcon`

### 2. Restringir landing a agentes premium
**Archivo**: `src/pages/portal/PortalAgentProfile.tsx`
- Después de obtener `portalAgent`, verificar si `plan_agente === 'premium'` o `'elite'`
- Si NO es premium: mostrar una vista simplificada (nombre, foto, listado de propiedades) sin el hero cinematográfico, stats animadas ni carrusel de destacados
- Alternativa: redirigir a la lista de agentes con un mensaje

### 3. Ocultar enlace "Ver propiedades" para básicos
**Archivo**: `src/pages/portal/PortalAgentsList.tsx`
- El enlace a `/portal/agentes/:id` solo debe aparecer para agentes premium
- Los agentes básicos solo muestran el botón de WhatsApp

Estos 3 cambios resuelven ambos problemas sin romper nada existente.

