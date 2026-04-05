# Plusterra — Contexto del Sistema

> Sistema de gestión inmobiliaria para **Plusterra Real Estate** (Paraguay).  
> Operado por Fernando Espínola. Datos reales de producción.  
> Última actualización de este archivo: 2026-04-05

---

## Stack técnico

| Capa | Tecnología |
|------|-----------|
| Framework | React 18 + TypeScript 5 |
| Bundler | Vite 5 |
| Estilos | Tailwind CSS v3 + shadcn/ui (Radix primitives) |
| Routing | React Router DOM v6 |
| State / Data | TanStack React Query v5 |
| Animaciones | Framer Motion |
| Backend / DB | Supabase (Lovable Cloud) — PostgreSQL con RLS |
| Auth | Supabase Auth (email/password, sin registro público, MFA opcional) |
| Storage | Supabase Storage (buckets: `property-photos`, `propietario-documentos`, `portal-assets`, `showroom-gallery`, `blog-images`, `avatars`) |
| Edge Functions | Deno (Supabase Edge Functions) — deploy automático |
| Push | OneSignal (web push notifications) |
| PDF | jsPDF |
| Excel | SheetJS (xlsx) |
| Mapas | Leaflet |
| QR | html5-qrcode + qrcode.react |
| Voice | ElevenLabs React SDK |
| Charts | Recharts |
| PWA | vite-plugin-pwa |
| Temas | next-themes (light/dark) |

### Dominios

| Dominio | Función |
|---------|---------|
| `pluspy.app` | Panel administrativo (admin domain) |
| `plusterra.com.py` | Portal público inmobiliario |
| `*.lovable.app` | Preview / desarrollo |

La lógica de dominio está en `src/lib/portalDomain.ts`. En portal domain se bloquean rutas admin; en admin domain se redirige `/portal/*` al dominio externo.

---

## Roles de usuario

Definidos en enum `app_role`: `superadmin`, `admin`, `agent`, `accounting`, `secretaria`, `auditor_externo`.

> **Nota interna**: `accounting` = Gerente en la UI.

| Rol | Descripción | Acceso principal |
|-----|-------------|-----------------|
| **SuperAdmin** | Control total del sistema | Todo + KPI Ejecutivo, Insight, Centro de Control, QA, Roles y Permisos, Cartera Privada, Reporte Actividad, Historial Cambios |
| **Admin** | Administrador general | Todo excepto módulos SuperAdmin-only |
| **Accounting (Gerente)** | Gerencia financiera y operativa | Mismo acceso que Admin (usa `is_admin_like()`) |
| **Secretaria** | Soporte administrativo completo | Mismo acceso que Gerente — lectura/escritura en finanzas, clientes, contratos, edificios, reservas, llaves |
| **Agent** | Agente inmobiliario | Solo sus propias propiedades, clientes, pipeline, comisiones, favoritos, metas, retiro de llaves, perfil portal |
| **Auditor Externo** | Auditor de edificios asignados | Solo lectura de edificios/pagos/mantenimiento de edificios asignados vía `building_auditors` |

### Funciones SQL de verificación de rol

- `is_admin_or_superadmin()` — SuperAdmin o Admin
- `is_admin_like()` — SuperAdmin, Admin, Accounting o Secretaria
- `is_accounting()` — Gerente
- `is_secretaria()` — Secretaría
- `is_agent()` — Agente
- `has_role(_user_id, _role)` — SECURITY DEFINER, evita recursión RLS
- `is_auditor_for_building(_building_id)` — Auditor vinculado

### Matriz de Permisos Frontend

Tabla `role_permissions` con control granular (can_view, can_create, can_edit, can_delete) por módulo y rol. Solo SuperAdmin puede modificarla. Es un control de **interfaz** (no reemplaza RLS).

---

## Módulos del sistema

### Panel Administrativo (pluspy.app)

| Módulo | Ruta | Descripción |
|--------|------|-------------|
| Dashboard | `/` | Resumen general con widgets de ocupación, transacciones, reservas, cumpleaños, versículo diario |
| Propiedades | `/propiedades` | CRUD de propiedades con código PLT-YYYY-NNNN, fotos, estados, publicación portal |
| Catálogo | `/disponibles` | Vista pública interna de propiedades disponibles |
| Gestión Comercial (Pipeline) | `/pipeline` | Kanban de oportunidades: nuevo lead → visita → negociación → reserva → cierre |
| Contratos | `/contratos` | Registro rápido y wizard completo, estados automáticos, renovación, exportación PDF |
| Pedidos Clientes | `/pedidos-clientes` | Solicitudes de clientes asignadas a agentes |
| Clientes | `/clientes` | Gestión de inquilinos, compradores, propietarios con estado financiero |
| Propietarios | `/propietarios` | Ficha de propietarios con documentos, estado de cuenta, propiedades vinculadas |
| Administración (Edificios) | `/edificios` | Edificios, unidades, control de cobros, liquidaciones, expensas |
| Inventario | `/inventario` | Items de inventario por propiedad/contrato |
| Agentes | `/agentes` | Gestión de agentes, plan, canon, estado |
| Proveedores | `/proveedores` | Directorio de proveedores de servicios |
| Mantenimiento | `/mantenimiento` | Tickets de mantenimiento por propiedad |
| Finanzas | `/finanzas` | Módulo financiero completo: Alquileres, Comisiones, Egresos, Canon Agentes, Consolidado Comercial, Control de Cobros, Comisiones Admin |
| Mis Finanzas | `/mis-finanzas` | Vista financiera para agentes (solo sus datos) |
| Mis Metas | `/mis-metas` | Objetivos mensuales del agente |
| Mis Herramientas | `/mi-plan` | Plan y herramientas del agente |
| Control de Llaves | `/control-llaves` | Registro de retiro/devolución de llaves con QR |
| Retiro de Llaves | `/retiro-llaves` | Scanner QR para agentes |
| Auditoría Financiera | `/auditoria-financiera` | Log inmutable de cambios financieros |
| Comunicaciones | `/comunicaciones` | Avisos internos, eventos, notificaciones |
| Mi Perfil Portal | `/mi-perfil-portal` | Perfil público del agente en el portal |
| Portal Web | `/portal-admin` | Configuración del portal público |
| Blog & Proyectos | `/portal-admin/blog` | CMS de blog y proyectos showroom |
| Leads Portal | `/portal-admin/leads` | Leads capturados desde el portal |
| KPI Ejecutivo | `/kpi-ejecutivo` | Métricas ejecutivas (SuperAdmin only) |
| Insight | `/insight` | Anomalías y análisis inteligente (SuperAdmin only) |
| Cartera Privada | `/cartera-privada` | Propiedades privadas no publicadas (SuperAdmin only) |
| Centro de Control | `/centro-control` | Panel de control del sistema, sugerencias, reportes (SuperAdmin only) |
| QA Validación | `/qa` | Checklist de calidad del sistema (SuperAdmin only) |
| Roles y Permisos | `/roles-permisos` | Matriz de permisos por rol (SuperAdmin only) |
| Reporte Actividad | `/reporte-actividad` | Log de actividad del sistema (SuperAdmin only) |
| Historial Cambios | `/historial-actualizaciones` | Changelog del sistema (SuperAdmin only) |
| Configuración | `/configuracion` | Branding, dominio portal, canon, push, 2FA, watermark, WhatsApp templates, voice widget, DB monitor |
| Centro de Ayuda | `/ayuda` | Artículos de ayuda, reportes de bugs, sugerencias |
| Notificaciones | `/notificaciones` | Historial de notificaciones internas |
| Mis Favoritos | `/mis-favoritos` | Propiedades favoritas del agente |

### Portal Público (plusterra.com.py)

| Página | Ruta portal | Descripción |
|--------|-------------|-------------|
| Home | `/` | Hero con banners, propiedades destacadas, agentes, quiz |
| Propiedades | `/propiedades` | Listado con filtros avanzados |
| Detalle | `/propiedades/:id` | Ficha completa con galería, mapa, reserva |
| Mapa | `/mapa` | Mapa interactivo Leaflet |
| Agentes | `/agentes` | Directorio de agentes |
| Perfil Agente | `/agentes/:id` | Perfil público con listings |
| Nosotros | `/nosotros` | Página "Sobre la empresa" |
| Contacto | `/contacto` | Formulario de contacto |
| Proyectos | `/proyectos` | Showroom de proyectos inmobiliarios |
| Blog | `/blog` | Artículos y contenido |
| Quiz | `/quiz` | Quiz interactivo para encontrar propiedad ideal |
| Comparar | `/comparar` | Comparador de propiedades |

---

## Tablas de Supabase

### Tablas principales y columnas clave

| Tabla | Columnas principales | Relaciones clave |
|-------|---------------------|-----------------|
| `profiles` | id, full_name, email, phone, avatar_url, status, plan_agente, canon_estado, canon_total_adeudado, canon_dias_atraso | id = auth.users.id |
| `user_roles` | user_id, role (app_role enum) | user_id → auth.users |
| `properties` | id, title, property_code, status, captor_agent_id, owner_id, unit_id, rental_price, sale_price, currency, city, is_published, visible_en_portal | owner_id → owners, unit_id → units |
| `property_photos` | id, property_id, photo_url, storage_path, uploaded_by, order_index | property_id → properties |
| `property_favorites` | id, agent_id, property_id | — |
| `property_reports` | id, property_id, agent_id, period, adjustments, diffusion | property_id → properties |
| `property_report_comments` | id, report_id, agent_id, comment_text | report_id → property_reports |
| `contracts` | id, contract_type, status, client_id, property_id, deal_id, start_date, end_date, monthly_rent, currency, tenant_name, landlord_name, responsible_agent_id, previous_contract_id | client_id → clients, property_id → properties, deal_id → deals |
| `clients` | id, full_name, email, phone, client_type, document_number, created_by | — |
| `owners` | id, full_name, email, phone, document_number, agente_id, created_by | — |
| `buildings` | id, name, address, city, building_type, admin_model, admin_fee_total_pct, is_showroom, showroom_enabled | — |
| `units` | id, building_id, unit_code, floor, area_m2, bedrooms, bathrooms | building_id → buildings |
| `unit_owners` | id, unit_id, owner_id, ownership_percentage | unit_id → units, owner_id → owners |
| `unit_collection_records` | id, unit_id, building_id, period, payment_status, alquiler_amount/check, expensas_amount/check, energia_amount/check, iva_amount/check, mora_amount/days | unit_id → units, building_id → buildings |
| `deals` | id, deal_type, property_id, client_id, captor_agent_id, closer_agent_id, amount, currency, status | property_id → properties, client_id → clients |
| `commissions` | id, deal_id, agent_id, gross_amount, net_amount, company_amount, company_pct, currency, status | deal_id → deals |
| `quick_commissions` | id, agent_id, co_agent_id, property_id, gross_amount, net_amount, company_amount, operation_type, status, is_co_agent, is_cobroker, deleted_at | property_id → properties |
| `payments` | id, payment_type (income/expense), category, amount, currency, payment_date, property_id, client_id, owner_id, status | property_id → properties, client_id → clients, owner_id → owners |
| `receivables` | id, concept, amount, currency, due_date, status, debtor_name, debtor_role, building_id, unit_code, contract_id, property_id, mora_automatica, mora_negociada, descuento, paid_amount, paid_date | building_id → buildings, contract_id → contracts, property_id → properties |
| `canon_payments` | id, agent_id, period, base_amount, interest_amount, total_amount, payment_date | — |
| `canon_settings` | id, canon_base_amount, daily_interest_amount, due_day, grace_period_days | — (singleton) |
| `canon_state_history` | id, agent_id, previous_state, new_state, action, changed_by | — |
| `pipeline_deals` | id, pipeline_type, stage, agent_id, client_id, property_id, client_name, estimated_commission | client_id → clients, property_id → properties |
| `maintenance_tickets` | id, property_id, provider_id, description, status, priority, estimated_cost, actual_cost | property_id → properties, provider_id → providers |
| `inventory_items` | id, property_id, contract_id, item_name, category, condition_delivery, condition_return | property_id → properties, contract_id → contracts |
| `key_movements` | id, property_id, direction (RETIRO/DEVOLUCION), movement_type, agent_id, external_name, created_by | property_id → properties, agent_id → profiles |
| `portal_settings` | id (singleton), site_title, primary_color, secondary_color, maintenance_mode, system_suspended, blog_enabled, showroom_enabled, watermark_*, hero_title_font, blocks_config | — |
| `portal_banners` | id, title, subtitle, image_url_webp, link_url, is_active, order_index | — |
| `portal_agent_profiles` | id, agent_id, public_name, bio, show_in_portal, is_featured | — |
| `portal_leads` | id, visitor_name, visitor_phone, property_id, captor_agent_id, channel, status | property_id → properties |
| `portal_visits` | id, page_path, visited_at, device_type, referrer, ip_hash, session_id | — |
| `blog_posts` | id, title, slug, content, content_blocks, is_published, cover_image_url, brochure_url, seo_title, seo_description | — |
| `brochure_downloads` | id, blog_post_id, visitor_name, visitor_phone | blog_post_id → blog_posts |
| `showroom_gallery` | id, building_id, image_url, image_type, order_index | building_id → buildings |
| `showroom_leads` | id, building_id, visitor_name, visitor_phone | building_id → buildings |
| `alerts` | id, user_id, alert_type, title, message, is_read, due_date | — |
| `notificaciones_internas` | id, user_id, tipo, titulo, mensaje, leida, push_enviado, notification_category | — |
| `avisos` | id, titulo, contenido, autor_id, prioridad, fijado, expires_at | — |
| `aviso_lecturas` | id, aviso_id, user_id, visto_at | aviso_id → avisos |
| `eventos_internos` | id, titulo, fecha_inicio, fecha_fin, autor_id, destinatarios, aviso_id | aviso_id → avisos |
| `audit_financiero` | id, tipo_accion, entidad_tipo, entidad_id, descripcion, valor_anterior, valor_nuevo, usuario_id, usuario_nombre, usuario_rol, ip_address | **Inmutable**: UPDATE/DELETE bloqueados |
| `audit_logs` | id, action, target_table, target_id, user_id, old_data, new_data, ip_address | **Inmutable**: UPDATE/DELETE bloqueados |
| `providers` | id, name, category, phone, email, rating | — |
| `client_requests` | id, agent_id, description, request_type, urgency, status | — |
| `agent_goals` | id, agent_id, month, rental_goal, sales_goal, commission_goal | — |
| `agent_fee_payments` | id, agent_id, paid_month, amount, marked_by | — |
| `private_properties` | id, title, property_type, city, sale_price, rental_price, status | — |
| `propietario_documentos` | id, propietario_id, tipo_documento, archivo_url, storage_path | propietario_id → owners |
| `building_auditors` | id, building_id, user_id, company_name | building_id → buildings |
| `role_permissions` | id, role, module, module_label, can_view, can_create, can_edit, can_delete | — |
| `reservation_history` | id, property_id, event_type, executed_by, snapshot_before, snapshot_after | property_id → properties |
| `company_settings` | id, setting_key, setting_value | — (config singleton key-value) |
| `user_push_tokens` | id, user_id, onesignal_player_id | — |
| `system_announcements` | id, title, message, announcement_type, created_by | — |
| `system_announcement_reads` | id, user_id, last_read_at | — |
| `system_updates` | id, title, description, update_type, version | — |
| `system_update_reads` | id, user_id, last_read_at | — |
| `sugerencias` | id, autor_id, categoria, descripcion, estado, prioridad, respuesta_admin | — |
| `reportes_soporte` | id, autor_id, seccion, descripcion, estado, urgencia, respuesta_admin | — |

### Vista

| Vista | Descripción |
|-------|-------------|
| `profiles_public` | Vista pública de profiles (id, full_name, avatar_url, status, plan_agente). Usa `security_invoker = true` |

### Funciones SQL

| Función | Descripción |
|---------|-------------|
| `generate_property_code()` | Genera código PLT-YYYY-NNNN secuencial |
| `generate_contract_alerts()` | Alertas de vencimiento a 30/15/7 días |
| `generate_monthly_receivables(target_period)` | Genera cuentas por cobrar mensuales |
| `update_contract_statuses()` | Actualiza estados de contratos automáticamente |
| `recalculate_canon_states()` | Recalcula estado de canon de agentes |
| `get_profiles_public_by_ids(_ids)` | Batch lookup de nombres |
| `rls_policy_gaps()` | Auditoría de brechas en RLS |

### Triggers importantes

| Trigger | Función |
|---------|---------|
| `trg_canon_payment_mirror` | Al pagar canon → crea ingreso espejo en `payments` |
| `trg_receivable_paid_mirror` | Al marcar receivable como pagado → crea ingreso espejo en `payments` |

### Enums

| Enum | Valores |
|------|---------|
| `app_role` | superadmin, admin, agent, accounting, secretaria, auditor_externo |
| `property_status` | draft, available, reservation_request, reserved, rented, sold, archived |
| `contract_status` | draft, active, expired, cancelled, renewed, near_expiration, terminated |
| `deal_type` | rental, temporary_rental, sale, property_management, exclusivity |
| `payment_status` | pending, paid, overdue, cancelled |
| `payment_type` | income, expense |
| `currency_type` | PYG, USD |
| `property_type` | apartment, house, land, office, commercial, other |
| `rental_period` | daily, weekly, monthly |
| `maintenance_status` | open, in_progress, completed, cancelled |
| `user_status` | active, suspended, blocked |

---

## Reglas críticas — NUNCA romper

### 1. RLS (Row-Level Security)

- **Todas las tablas** tienen RLS habilitado. Sin política = acceso denegado.
- Patrón estándar: `is_admin_or_superadmin()` → ALL, `is_accounting()` → ALL, `is_secretaria()` → ALL, `is_agent()` → solo sus registros.
- Las políticas son **PERMISSIVE** (OR logic) para permitir roles superpuestos.
- **NUNCA** crear políticas con `USING (true)` en tablas sensibles.
- Funciones de rol son `SECURITY DEFINER` para evitar recursión RLS.
- `audit_financiero` y `audit_logs`: UPDATE y DELETE **bloqueados** para todos.

### 2. Códigos de propiedad PLT

- Formato: `PLT-YYYY-NNNN` (ej: PLT-2026-0121)
- Generados por `generate_property_code()` — secuencial, no editable.
- Visibles en admin y portal público.

### 3. Lógica de estados de pago (Receivables / Cobros)

- Estados: `pendiente`, `pagado`, `vencido`, `adelantado`, `parcial`
- Mora automática calculada por días de atraso.
- Mora negociada: ajuste manual por admin.
- Descuento: reducción aplicada al cobro.
- `total_cobrado` = paid_amount - descuento + mora.

### 4. Canon de agentes

- Canon mensual obligatorio para agentes (configurable en `canon_settings`).
- Estados en `profiles`: `al_dia`, `por_vencer`, `vencido`, `en_mora`, `suspendido`.
- Interés diario acumulativo después del período de gracia.
- `recalculate_canon_states()` actualiza estados automáticamente.
- Pagos de canon generan espejo en `payments` via trigger.

### 5. Sistema suspendido (`system_suspended`)

- Flag en `portal_settings.system_suspended`.
- Si es `true`: portal público muestra página de mantenimiento, panel admin muestra pantalla de error tipo Chrome (ERR_CONNECTION_TIMED_OUT simulado).
- Solo SuperAdmin puede activar/desactivar desde Centro de Control.

### 6. Modo mantenimiento (`maintenance_mode`)

- Flag separado de `system_suspended`.
- Solo afecta al portal público — muestra página de mantenimiento con WhatsApp de contacto.
- Panel admin sigue funcionando normalmente.

### 7. Soft-lock de agentes

- Agentes con canon vencido o en mora pueden tener acceso restringido.
- Banner visible advirtiendo del estado.
- Lógica en `useAgentSoftLock.ts`.

### 8. Comisiones — Retención Plusterra

- Retención estándar: **15%** para Plusterra.
- Split agente: **85%** (42.5% cada uno si es compartida entre 2 agentes).
- Comisiones retroactivas (propiedades ya alquiladas/vendidas): solo Admin, SuperAdmin, Gerente o Secretaría.
- Soft-delete via `deleted_at` en `quick_commissions`.
- Revertir/Eliminar registrado en `audit_logs`.

### 9. Estructura de datos normalizada

- **Edificios** → **Unidades** → **Propiedades** (via `unit_id`).
- **Unidades** → **Propietarios** (via `unit_owners`, N:N con porcentaje).
- **NO** agregar `edificio_id` o `dueño_id` directo en `properties`.
- Las relaciones se resuelven via joins existentes.

### 10. Archivos que NUNCA editar

- `src/integrations/supabase/client.ts` — auto-generado
- `src/integrations/supabase/types.ts` — auto-generado
- `.env` — auto-generado
- `supabase/migrations/` — inmutables

### 11. Rate-limiting público

- Visitas del portal y leads tienen rate-limiting por IP/visitor ID.
- Validación estricta de campos en formularios públicos.
- Registro público deshabilitado.

### 12. Eliminación de propiedades

- Propiedades con contratos, deals, comisiones, cobros, pipeline, fotos, inventario o movimientos de llaves vinculados **NO pueden eliminarse** directamente (FK constraints).
- El sistema desvincula dependencias huérfanas antes de eliminar (nullifica FK references seguras).

---

## Lo que NO tocar sin confirmar primero

> ⚠️ Este sistema tiene **datos reales de producción** del negocio de Fernando Espínola.

- **Tablas `payments`, `receivables`, `commissions`, `quick_commissions`**: Datos financieros reales. No modificar estructura sin backup.
- **Tablas `contracts`, `deals`**: Contratos legales activos.
- **Tabla `profiles`**: Usuarios reales (agentes, admin). No borrar registros.
- **Tabla `properties`**: Propiedades con códigos PLT activos vinculados a contratos.
- **Tabla `owners`**: Propietarios reales con documentación.
- **Tabla `buildings`, `units`, `unit_collection_records`**: Edificios administrados con cobros reales.
- **Tabla `canon_payments`, `canon_settings`**: Cobros de canon activos.
- **Triggers de mirror** (`trg_canon_payment_mirror`, `trg_receivable_paid_mirror`): Romperlos descuadra la contabilidad.
- **Funciones RLS** (`is_admin_or_superadmin`, `is_admin_like`, `has_role`, etc.): Cambiarlas afecta todo el sistema de permisos.
- **Portal público** (`plusterra.com.py`): Sitio activo visible por clientes.

---

## Integraciones externas

| Servicio | Uso | Configuración |
|----------|-----|---------------|
| **OneSignal** | Push notifications web/mobile | App ID en `OneSignalProvider.tsx`, worker en `public/OneSignalSDKWorker.js`, tokens en `user_push_tokens` |
| **Supabase (Lovable Cloud)** | Backend completo: DB, Auth, Storage, Edge Functions | Auto-configurado. Ref: `ccxjxpgeppxfcwlzmvbd` |
| **Cloudflare** | DNS y proxy para `plusterra.com.py` | Configurado externamente |
| **Zoho Mail** | Email corporativo (no integrado en código) | Configurado externamente |
| **Leaflet / OpenStreetMap** | Mapas en portal y admin | Tiles gratuitos, sin API key |
| **ElevenLabs** | Widget de voz configurable | SDK React, config en `useVoiceWidgetConfig` |

### Edge Functions desplegadas

| Función | Descripción |
|---------|-------------|
| `bootstrap-admin` | Inicialización de admin |
| `contract-automation` | Automatización de estados de contratos |
| `create-user` | Creación de usuarios (admin only) |
| `db-monitor` | Monitor de base de datos |
| `event-reminders` | Recordatorios de eventos 1h/24h |
| `expire-reservations` | Expiración automática de reservas |
| `manage-user` | Gestión de usuarios (suspend/activate) |
| `orbia-webhook` | Webhook externo Orbia |
| `recalculate-canon` | Recálculo de estados de canon |
| `reset-password` | Reset de contraseña |
| `send-push-notification` | Envío de push via OneSignal |
| `track-visit` | Tracking de visitas del portal |

---

## Formato regional

| Aspecto | Valor |
|---------|-------|
| **País** | Paraguay 🇵🇾 |
| **Moneda principal** | Guaraní (₲ / Gs.) — PYG |
| **Moneda secundaria** | Dólar estadounidense (US$) — USD |
| **Moneda obligatoria en dashboards** | Guaraní (PYG) |
| **Formato numérico** | `es-PY` (puntos como separador de miles) |
| **Formato de fecha** | DD/MM/YYYY |
| **Documento de identidad** | CI (Cédula de Identidad) o RUC |
| **Campo tributario** | NIS ANDE (servicio eléctrico) |
| **Ciudad por defecto** | Encarnación |
| **Idioma UI** | Español (Paraguay) |
| **Teléfono** | Código país +595, formato local 09XX-XXXXXX |
| **Zona horaria** | América/Asunción (implícita, timestamps UTC en DB) |

---

## Estado actual del proyecto

### ✅ Módulos completos y en producción

- Dashboard con widgets
- Propiedades (CRUD completo, fotos, estados, publicación portal, código PLT)
- Contratos (registro rápido + wizard completo, renovación, alertas vencimiento)
- Clientes y Propietarios
- Edificios y Unidades con control de cobros y liquidación
- Finanzas (ingresos, egresos, alquileres, comisiones, consolidado comercial)
- Comisiones rápidas (con split, co-agente, co-broker, retroactivas)
- Canon de agentes (cálculo automático, intereses, estados)
- Pipeline / Gestión Comercial (Kanban)
- Control de Llaves (QR, retiro/devolución)
- Portal público completo (home, listings, detalle, mapa, agentes, blog, showroom, quiz, comparador)
- Sistema de notificaciones (internas + push OneSignal)
- Comunicaciones (avisos, eventos internos)
- Auditoría financiera inmutable
- Roles y permisos (matriz frontend)
- Sistema suspendido / modo mantenimiento
- PWA con instalación y actualización
- Reportes PDF y Excel (contratos, cobros, comisiones, liquidaciones, estado de cuenta propietario)
- MFA opcional (TOTP)
- Inventario por propiedad
- Reservas con historial y timeline

### 🔧 Funcionalidades activas pero en iteración

- Cartera Privada (propiedades no publicadas)
- KPI Ejecutivo e Insight (anomalías)
- Centro de Control (reportes, sugerencias)
- Voice widget (ElevenLabs)
- Reportes de propiedad por agente

### 📋 Pendientes / roadmap conocido

- (Definido por Fernando según necesidades operativas)

---

## Paleta de colores (Design System)

```
Primary (Plusterra Blue):  #00447C → hsl(209, 100%, 24%)
Secondary (Orange):         #FC5100 → hsl(19, 98%, 49%)
Accent (Teal):              hsl(173, 58%, 39%)
Success:                    hsl(142, 71%, 45%)
Warning:                    hsl(38, 92%, 50%)
Info:                       hsl(217, 91%, 60%)
Destructive:                hsl(0, 72%, 51%)
Background:                 hsl(210, 20%, 98%)
Foreground:                 hsl(0, 0%, 29%)
Sidebar:                    hsl(209, 100%, 14%) — azul oscuro
```

---

## Convenciones de código

- Componentes en `src/components/` organizados por dominio (agents/, buildings/, contracts/, etc.)
- Hooks en `src/hooks/` — uno por feature/tabla
- Páginas en `src/pages/` (admin) y `src/pages/portal/` (portal)
- Utilidades en `src/lib/`
- Contextos en `src/contexts/`
- Nunca escribir colores directos — usar tokens semánticos de Tailwind
- Supabase client: siempre importar desde `@/integrations/supabase/client`
- Types de Supabase: nunca editar `types.ts` manualmente
- Edge functions en `supabase/functions/`
- Migraciones SQL via herramienta de migración (nunca editar archivos de migración existentes)
