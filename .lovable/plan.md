

## Plan: Agilizar carga de gastos en Mantenimiento + trazabilidad clara

Resuelve los 2 puntos del reporte de Lidiane.

### Problema 1: Flujo lento para registrar el gasto al completar

Hoy: marcar "Completado" → abrir "Editar" → cargar Costo Real → guardar. **3 pasos.**

**Solución:** cuando se hace clic en "Marcar Completado", abrir un mini-diálogo (`CompleteTicketDialog`) con:
- Costo real (MoneyInput, obligatorio si quiere registrar gasto, opcional si no hubo costo)
- Fecha de realización (default hoy, editable)
- Proveedor (si no estaba asignado, opcional)
- Checkbox: **"Registrar este monto como egreso en Finanzas"** (default: marcado)
- Notas opcionales

Al confirmar:
1. Update del ticket: `status='completed'`, `actual_cost`, `completed_date`, `provider_id`, `notes`.
2. Si el checkbox está marcado y hay monto > 0 → INSERT en `payments` con `payment_type='expense'`, `category='mantenimiento'`, `description='Mantenimiento: <descripción ticket> (<propiedad>)'`, `amount=<costo real>`, `payment_date=<completed_date>`, `notes=<link al ticket>`.
3. Invalidar queries: `maintenance_tickets`, `payments`, `admin-payments`, `dashboard-stats`.

**1 solo paso. Y queda registrado en Finanzas automáticamente.**

### Problema 2: "¿Dónde verifico el monto cargado?"

**Causa raíz:** el costo de mantenimiento vive solo en `maintenance_tickets`. No aparece en Finanzas → Egresos. Si Lidiane mira el reporte mensual de Finanzas, no lo ve.

**Solución (parte ya cubierta arriba):** al completar un ticket con monto, queda automáticamente como egreso en `payments` (módulo Finanzas → Egresos), categoría "Mantenimiento". Ahí lo va a ver.

**Refuerzo visual en la lista de Mantenimiento:**
- Si el ticket tiene `actual_cost > 0` y está completado → mostrar un mini-badge "💰 Registrado en Finanzas" debajo del monto, con tooltip "Ver en Egresos" y link a `/finances?tab=egresos`.
- En la columna Monto, si el valor es **estimado** (sin actual_cost), mantener el "(est.)" en gris claro como hoy.
- Agregar tooltip al header "Monto" explicando: *"Muestra el costo real si está cargado; si no, el estimado."*

### Cambios técnicos

1. **Nuevo componente** `src/components/maintenance/CompleteTicketDialog.tsx`
   - Form con MoneyInput, date, provider dropdown, checkbox "Registrar como egreso", notas.
   - Mutación que hace los 2 INSERTS/UPDATE (ticket + payment opcional).
   - Toast: "Ticket completado · Egreso de Gs. X registrado en Finanzas".

2. **`src/pages/Maintenance.tsx`**
   - Reemplazar línea 603 (`<DropdownMenuItem onClick={() => updateStatus.mutate({...status:'completed'})}>`) por: `<DropdownMenuItem onClick={() => setCompletingTicket(ticket)}>Marcar Completado</DropdownMenuItem>`.
   - Renderizar `<CompleteTicketDialog>` al final del componente.
   - Agregar badge "💰 En Finanzas" en columna monto cuando aplica.
   - Agregar tooltip al header "Monto".

3. **Cero cambios en BD.** La tabla `payments` ya tiene `category` libre y `payment_type='expense'`. Los ya cargados quedan como están.

### Garantías

- **Reversible:** si se quita el checkbox de "Registrar como egreso", funciona como hoy (solo actualiza ticket).
- **NO duplica datos:** el ticket sigue siendo la fuente operativa; el `payment` es el reflejo contable. Un campo `notes` en el payment guarda referencia al ticket.
- **Coherente con `mem://finanzas/alcance-y-dashboard-consolidado`**: los gastos de mantenimiento son egresos reales de Plusterra (cuando los paga la inmobiliaria) o trasladables al propietario (en cuyo caso Lidiane puede dejar el checkbox sin marcar y solo dejarlo en el ticket).
- **NO toca otros módulos.** Edificios, Liquidaciones, Dashboard quedan igual.

### Resultado esperado para Lidiane

1. Clic en "Marcar Completado" → 1 diálogo → carga monto + fecha → listo.
2. El monto aparece automáticamente en **Finanzas → Egresos** (categoría Mantenimiento).
3. En la lista de Mantenimiento, ve un badge "💰 En Finanzas" que confirma dónde quedó registrado.
4. Si el reporte que mira es el de Mantenimiento (PDF/Excel), ya muestra el monto real correctamente. Si mira Finanzas/Egresos, también lo ve. Cero confusión.

### Memoria a actualizar

Crear `mem://features/mantenimiento-flujo-egresos`: *"Al marcar un ticket de mantenimiento como Completado, se abre un diálogo que captura costo real + fecha + proveedor en un paso. Si el checkbox 'Registrar como egreso' está marcado (default), se inserta automáticamente un movimiento en `payments` con `payment_type='expense'` y `category='mantenimiento'`, visible en Finanzas → Egresos. El ticket queda con badge '💰 En Finanzas' como confirmación visual."*

### Archivos modificados

- `src/components/maintenance/CompleteTicketDialog.tsx` (NUEVO)
- `src/pages/Maintenance.tsx` (cambio en dropdown + badge en columna)

