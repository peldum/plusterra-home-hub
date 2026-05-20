## 1. Por qué "desapareció" la burbuja

La burbuja se monta en `AppShell` (línea 87) y se muestra siempre que se cumplan estas dos condiciones:
- Hay un `user` autenticado
- El `role` está cargado y es uno de: `superadmin | admin | accounting | secretaria`

Tu rol es `superadmin`, así que el problema **no es de permisos**. Las causas más probables (ordenadas por probabilidad):

1. **Caché del Service Worker / PWA.** El sistema tiene PWA activa (`PWAUpdateBanner`, `OneSignalSDKWorker.js`). La primera vez que abriste el sistema cargaste la versión vieja sin el componente. Un `Ctrl+F5` (o "Limpiar caché" desde el sidebar) debería traerla.
2. **Error silencioso en el RPC `get_user_chat_quota`.** Si el RPC tira error, la burbuja igual se muestra (porque solo depende de `allowed`), pero si hubo un crash de render por tipo inesperado se podría haber desmontado. Hoy el código tolera el error pero no loguea — voy a agregar un `console.error` para que la próxima vez quede rastro.
3. **`z-index: 40` tapado por algo.** En ciertas vistas con drawers/modales abiertos podría quedar debajo. Lo subo a `z-50` (sin chocar con el panel abierto que ya es `z-50`).

**Acciones de fix defensivo (no funcionales, solo robustez):**
- Subir `z-index` del botón flotante a `z-50` y el panel abierto a `z-[60]`.
- Agregar `console.error` cuando el RPC falla, para diagnóstico futuro.
- Forzar un re-chequeo del `role` con dependencia `[user?.id, role]` (hoy solo depende de `user`), por si el rol llega más tarde que el user.

## 2. Revisión de loops infinitos

Revisé `InternalAIChat.tsx`:
- `useEffect([open, user])` → solo dispara al abrir el panel. **OK.**
- `useEffect([messages, sending])` → solo hace `scrollTo`. No setea estado. **OK.**
- `send()` no se llama dentro de ningún efecto. **OK.**
- El RPC `get_user_chat_quota` se llama una sola vez por apertura. **OK.**
- La Edge Function inserta logs async sin retry loops. **OK.**

**Veredicto: no hay riesgo de loop.** Igual, como protección extra, voy a envolver la llamada al RPC con el `queryLoopGuard` existente (clave `ai-chat-quota:<uid>`) para que si alguna vez algo dispara muchas lecturas seguidas, el sistema lo corte solo (como en el resto del proyecto).

## 3. Desactivar el asistente desde el Panel de Control

El kill-switch **ya existe** en `Settings → Asistente IA Interno → Estado global → "Kill-switch (apagar para todos)"`. Hoy hace esto:
- Bloquea las consultas en el backend (devuelve mensaje de "desactivado").
- Pero **la burbuja sigue visible**, solo que al consultar tira el aviso.

**Mejora propuesta:** cuando el kill-switch esté ON, la **burbuja desaparece del todo** para todos los usuarios (no solo bloquea, oculta). Adicionalmente:
- Renombrar el toggle a algo más claro: **"Asistente IA activo / desactivado"** en lugar de "Kill-switch".
- Agregar un segundo toggle individual: **"Ocultar burbuja para mí"** (preferencia personal en `localStorage`), por si vos como SuperAdmin querés trabajar sin distracción pero dejarlo activo para el resto.

Cómo se implementa:
- El componente `InternalAIChat` lee `ai_chat_settings.kill_switch_enabled` al montarse (vía un canal liviano cacheado 60s). Si está ON → `return null`.
- Suscripción Realtime opcional al cambio para que el apagado sea instantáneo en todas las sesiones abiertas (sin necesidad de refresh).

## 4. Mejoras recomendadas (solo te las cuento, no hago nada)

Basado en cómo funcionan asistentes IA internos en otros sistemas (Intercom Fin, Notion AI, ClickUp Brain, Linear Asks):

**A. Calidad de respuestas**
1. **Búsqueda semántica del manual** (RAG con `pgvector`) en vez de inyectar todo el manual en cada prompt. Hoy si el manual crece a 50+ procedimientos, gastás tokens enviando todo. Con embeddings solo se envían los 3-5 más relevantes → más barato y más preciso.
2. **Citar la sección del manual** en cada respuesta (ej: *"Según 'Registrar garantía' →..."*). Genera confianza y permite verificar.
3. **Botón "👍 / 👎"** en cada respuesta. Las marcadas con 👎 quedan en una cola para que SuperAdmin mejore el manual.

**B. UX**
4. **Captura de pantalla automática** al preguntar ("preguntar sobre esta pantalla"). El bot sabe en qué ruta estás y puede dar respuesta contextual sin que el usuario describa dónde está.
5. **Sugerencias dinámicas según la ruta**: en `/finanzas` sugerir "¿Cómo registro un egreso?", en `/propiedades` "¿Cómo cargo fotos?", etc.
6. **Comando rápido `/`** dentro del chat: `/garantia`, `/canon`, `/contrato` salta directo al procedimiento.
7. **Conversaciones persistentes** (hoy se borran al cerrar). Guardar últimas 5 conversaciones por usuario para retomar.

**C. Onboarding / aprendizaje**
8. **Modo "Tour guiado"**: el bot detecta primera vez del usuario en un módulo y ofrece tour de 30s.
9. **"Aprendí algo nuevo"**: cuando un usuario pregunta algo que NO está en el manual, queda registrado y el SuperAdmin recibe notificación para agregarlo (auto-crecimiento del manual).

**D. Seguridad / control**
10. **Filtro de PII**: scan automático de la pregunta para detectar si el usuario está pegando datos sensibles (CI, teléfono, contraseña) y advertirle antes de enviarlo a la IA.
11. **Alerta de gasto**: notificación al SuperAdmin si el gasto del mes pasa el 80% del presupuesto.
12. **Auditoría visible para el usuario**: que cada usuario vea sus propias preguntas del día (transparencia → menos abuso).

**E. Costos**
13. **Cache de respuestas frecuentes**: si 5 usuarios preguntan "¿cómo registro una garantía?" en una semana, la respuesta se cachea 24h y no se vuelve a llamar a la IA → ahorro 60-70%.
14. **Modelo escalonado**: usar `gemini-3.1-flash-lite-preview` (más barato) para preguntas cortas y solo subir a `gemini-3-flash-preview` si la pregunta es compleja (>200 caracteres o con código).

---

## Resumen de qué haría ahora (si aprobás)

| Cambio | Impacto |
|---|---|
| z-index +1 y `console.error` en RPC | Robustez, sin cambio visible |
| Re-check de `role` con dep correcta | Burbuja aparece apenas se carga rol |
| `queryLoopGuard` en RPC de cuota | Defensa anti-loop |
| Kill-switch oculta la burbuja completa | UX más clara |
| Toggle "Ocultar para mí" (localStorage) | Preferencia personal |
| Renombrar "Kill-switch" → "Asistente activo/desactivado" | Más entendible |
| Realtime opcional al cambio de kill-switch | Apagado instantáneo |

Las mejoras de la sección 4 (RAG, citas, captura de pantalla, cache, etc.) **NO las incluyo en este plan** — me dijiste solo avisarte. Si más adelante querés, hacemos una segunda tanda priorizada.
