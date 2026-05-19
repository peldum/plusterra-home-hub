## Flujo "Dar de baja agente + Transferir cartera"

### Quién puede ejecutarlo
SuperAdmin, Admin, Gerente y Secretaría (los 4 roles admin-like). Agentes nunca.

### UI — Pestaña Agentes
Reemplazar el botón "Eliminar" por dos acciones separadas en cada tarjeta de agente:

1. **Transferir cartera** (siempre disponible) — abre diálogo con:
   - Resumen: # propiedades activas (draft / available / reserved / reservation_request), # alquiladas/vendidas, # contratos activos, # leads abiertos.
   - Selector de **agente receptor** (lista de agentes activos, excluye al saliente).
   - Checkboxes opcionales:
     - [x] Propiedades en captación (default ON: draft, available, reserved, reservation_request)
     - [ ] Propiedades alquiladas/vendidas (default OFF — quedan con histórico original)
     - [x] Leads y deals del pipeline en estado abierto
   - Campo "Motivo" obligatorio (texto libre, queda en auditoría).
   - Botón "Confirmar transferencia".

2. **Dar de baja** (solo si el agente sigue activo) — abre diálogo con:
   - Mismo resumen + selector de receptor (obligatorio si tiene propiedades activas).
   - Mismo motivo.
   - Confirmación doble: "Esto bloqueará el acceso de [Nombre] al sistema y transferirá su cartera activa a [Receptor]".
   - Ejecuta: transferencia + bloqueo de auth + `profiles.status = 'blocked'`.

Etiqueta de estado en la tarjeta: **Activo / Bloqueado**. Agentes bloqueados aparecen al final de la lista con badge gris.

### Backend — RPC `admin_offboard_agent`
Función `SECURITY DEFINER` que valida:
- `is_admin_or_superadmin()` OR rol `gerente` OR `secretaria` (los 4 admin-like).
- Agente saliente y receptor existen y son distintos.
- Receptor está activo.

Acciones (en transacción):
1. UPDATE `properties` SET `captor_agent_id = receptor` WHERE `captor_agent_id = saliente` AND `status IN ('draft','available','reserved','reservation_request')` (según checkboxes).
2. UPDATE `pipeline_deals` SET `agent_id = receptor` WHERE `agent_id = saliente` AND `stage NOT IN ('cerrado_ganado','cerrado_perdido')` (si checkbox ON).
3. UPDATE `profiles` SET `status = 'blocked'` (solo si "Dar de baja").
4. Bloquear auth via Edge Function `manage-user` (ban_duration permanente).
5. INSERT en `audit_logs` con:
   - `action = 'agent_offboard'` o `'agent_portfolio_transfer'`
   - `user_id` = quien ejecuta
   - `old_data` = { agente_saliente, total_propiedades, ids_transferidos }
   - `new_data` = { agente_receptor, motivo, fecha }

### Reglas de transferencia (defaults)
| Estado propiedad | Transfiere por default |
|---|---|
| draft | Sí |
| available | Sí |
| reserved / reservation_request | Sí |
| rented | No (queda con histórico — comisión ya cobrada) |
| sold | No (queda con histórico) |
| archived | No |

SuperAdmin puede forzar transferencia de las históricas activando el checkbox extra.

### Auditoría (registro de TODOS los cambios)
Ya existe `audit_logs` (trigger `log_audit` en varias tablas) y `audit_financiero` (financiero inmutable). Para este flujo:
- Cada propiedad reasignada genera entrada vía trigger existente en `properties`.
- Adicionalmente, el RPC inserta UNA entrada resumen en `audit_logs` con `action = 'agent_offboard'` para verla como un evento único en el centro de auditoría.
- Visible en **Centro de Control Ejecutivo / Auditoría** (SuperAdmin) y exportable a PDF/CSV.

### Caso Joel Lippman (ya bloqueado)
Después de implementar, abrir "Transferir cartera" sobre Joel → elegir receptor (ej. Sandra) → checkbox solo "captación" activo → transfiere las 5 disponibles. La PLT-2026-0062 (alquilada) queda con Joel como histórico.

### Archivos a crear/editar (técnico)
- `supabase/migrations/<timestamp>_admin_offboard_agent.sql` — RPC + permisos.
- `src/components/agents/TransferPortfolioDialog.tsx` (nuevo).
- `src/components/agents/OffboardAgentDialog.tsx` (nuevo).
- `src/pages/Agents.tsx` — reemplazar botón "Eliminar", agregar las 2 nuevas acciones según rol.
- `src/hooks/useAgents.ts` — agregar `offboardAgent()` y `transferPortfolio()`.
- Reutilizar Edge Function `manage-user` existente para el bloqueo de auth.
