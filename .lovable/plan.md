## Objetivo

Crear un asistente de chat IA interno que enseñe al equipo cómo usar el sistema (paso a paso de procedimientos), con límites diarios por usuario y un panel de control para que SuperAdmin gestione cuotas, vea métricas y blinde el uso.

## Alcance

**Incluye:**
- Chat IA flotante (burbuja) accesible para SuperAdmin / Admin / Gerente / Secretaría.
- Asistente Nivel A: solo responde sobre procedimientos del manual interno. Sin acceso a BD ni datos sensibles.
- Manual interno editable por SuperAdmin (Markdown).
- Límites diarios configurables por usuario + panel de control.
- Auditoría: logs de cada consulta, métricas globales, top preguntas frecuentes.
- Kill-switch global de emergencia.

**No incluye** (queda para después):
- Recordatorio automático de garantías pendientes.
- Acceso del bot a la base de datos (Nivel B/C).
- WhatsApp Business API.

## Backend

### 1. Base de datos (migration)

**Tabla `ai_manual_sections`** — manual interno editable
- `id`, `title`, `category` ('garantias' | 'finanzas' | 'propiedades' | 'general' | ...), `content` (text/markdown), `order`, `is_active`, `updated_by`, `updated_at`.
- RLS: lectura para roles admin/gerente/secretaria/superadmin; escritura solo superadmin.

**Tabla `ai_chat_limits`** — cuota por usuario
- `user_id` (PK, FK profiles), `daily_limit` (int), `is_enabled` (bool), `bonus_today` (int, suma extra puntual), `bonus_date` (date).
- Defaults por rol vía función `get_default_daily_limit(role)`: superadmin=999, admin=25, gerente=25, secretaria=15, agente=0.

**Tabla `ai_chat_logs`** — auditoría
- `id`, `user_id`, `role`, `question`, `answer`, `tokens_in`, `tokens_out`, `cost_usd` (numeric), `created_at`, `error` (nullable).
- RLS: lectura solo SuperAdmin. Insert vía edge function (service role).

**Tabla `ai_chat_settings`** — config global
- Single-row: `kill_switch_enabled` (bool), `model` (text default 'google/gemini-3-flash-preview'), `monthly_budget_usd` (numeric default 5), `system_prompt_extra` (text opcional).

**Función `get_user_chat_quota(uid)`** — devuelve `{ limit, used_today, remaining, is_enabled, kill_switch }`.

### 2. Edge function `ai-internal-chat`

- Verifica JWT, obtiene `user_id` + `role`.
- Chequea kill-switch global → bloqueado.
- Chequea presupuesto mensual → bloqueado.
- Chequea cuota del día via `get_user_chat_quota` → si 0, devuelve mensaje educado.
- Carga manual activo (`ai_manual_sections` where is_active=true, ordenado).
- Arma system prompt blindado:
  - Rol: "Asistente del sistema Plusterra. Solo respondés sobre cómo usar el sistema."
  - Reglas: NO revelar contraseñas, datos de usuarios, código interno, configuraciones técnicas. NO inventar pasos. Si no está en el manual: indicar que consulte al SuperAdmin.
  - Inyecta el manual como contexto.
- Llama Lovable AI Gateway (`google/gemini-3-flash-preview` por default).
- Inserta log en `ai_chat_logs` con tokens y costo estimado.
- Maneja errores 429 (rate limit) y 402 (créditos agotados) con mensajes claros.

## Frontend

### 3. Componente `<InternalAIChat />` (burbuja flotante)

- Ubicación: integrado en `AppShell` o `MainLayout`, visible solo en rutas internas (no portal público) y solo para roles permitidos.
- Botón flotante esquina inferior derecha (icono chat + badge si hay cuota restante baja).
- Click → abre panel lateral/modal con:
  - Lista de mensajes (markdown render con `react-markdown`).
  - Sugerencias rápidas pre-armadas ("¿Cómo registro una garantía?", "¿Cómo cargo un pago?", "¿Dónde veo el reporte mensual?").
  - Input + botón enviar.
  - Indicador "X consultas restantes hoy" en el header.
  - Estado de loading durante respuesta.
- Toast top-center con mensaje claro si se agotó cuota o kill-switch activo.

### 4. Página `Settings → Manual del Sistema` (SuperAdmin only)

- Lista editable de secciones del manual (`ai_manual_sections`).
- CRUD: agregar/editar/eliminar/reordenar/activar-desactivar secciones.
- Editor con preview Markdown.
- Contador de caracteres totales del manual (para vigilar tokens).

### 5. Página `Settings → Control IA` (SuperAdmin only)

Nueva tab dentro de Settings o sección al final del tab General:

**Sección "Estado global":**
- Toggle kill-switch.
- Selector de modelo (3 opciones: rápido/equilibrado/calidad).
- Input presupuesto mensual USD.
- KPIs: gasto del mes, consultas totales del mes, % presupuesto usado (barra).

**Sección "Usuarios":**
- Tabla con todos los usuarios admin/gerente/secretaria:
  - Nombre, rol, límite diario, usadas hoy, total mes, estado (activo/bloqueado).
  - Acciones: editar límite (modal con input), +10 bonus hoy, toggle bloqueo.

**Sección "Métricas":**
- Top 10 preguntas más frecuentes (agrupar `question` similares).
- Top 5 usuarios que más preguntan este mes.
- Gráfico simple de consultas por día (últimos 30 días).
- Exportar logs a CSV.

## Recomendación de cuotas iniciales

| Rol | Límite/día | Costo aprox/mes |
|---|---|---|
| SuperAdmin | 999 | ~$0.50 |
| Admin / Gerente | 25 | ~$1.50 |
| Secretaría | 15 | ~$0.50 |
| Agente | 0 | — |

**Total estimado: ~$2.50/mes** (cubierto por el saldo gratis de $1 USD + saldo mínimo de top-up).

## Seguridad

- Sistema prompt blindado contra extracción de info sensible.
- Manual no contiene datos reales (solo procedimientos genéricos).
- Edge function valida JWT y consulta cuota antes de cada llamada al modelo.
- Logs auditables con `cost_usd` para detectar abusos.
- Kill-switch para corte inmediato.

## Detalles técnicos

- Modelo default: `google/gemini-3-flash-preview` (rápido y barato).
- Markdown render: `react-markdown` (ya disponible o agregar).
- Llamadas al chat usan `supabase.functions.invoke('ai-internal-chat')`.
- Logs se insertan async desde la edge function (service role).
- Reset de `bonus_today` se hace por comparación de fecha en cada lectura (no requiere cron).

## Entregables

1. Migration con 4 tablas + función `get_user_chat_quota` + RLS + seed inicial del manual con la sección "Registrar garantía de propietario".
2. Edge function `ai-internal-chat`.
3. Componente `<InternalAIChat />` flotante.
4. Página de edición del manual.
5. Panel de control en Settings.
6. Memoria actualizada: nueva entrada `mem://features/asistente-ia-interno`.
