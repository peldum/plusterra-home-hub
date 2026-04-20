

## Plan: Dashboard refleja solo ingresos reales de Plusterra

### Cambios

**1. `src/components/dashboard/RentCollectionWidget.tsx` — reescribir**

- Renombrar título de "🏢 Cobros del mes" → "💰 Ingresos del mes (Plusterra)".
- Reemplazar query de `receivables` por dos queries en paralelo:
  - **Cánones cobrados del mes:** `canon_payments` filtrando por `period = YYYY-MM` actual → suma `total_amount`.
  - **Comisiones cobradas del mes:** `commissions` con `status = 'paid'` y `paid_date` dentro del mes → suma `net_amount`.
  - **Pendiente de cánones:** consultar `agents` activos y restar los que ya pagaron este mes (los que NO aparecen en `canon_payments` para el período) × `canon_base_amount` de `canon_settings`.
  - **Pendiente de comisiones:** `commissions` con `status = 'pending'` (sin filtro de fecha, todas las pendientes activas).
- **Total esperado del mes** = cobrado + pendiente. **% cobrado** = cobrado / total.
- Lista "Más urgentes": top 5 de cánones de agentes vencidos (agentes activos que no pagaron y `due_day` ya pasó) + comisiones pendientes más antiguas. Mostrar nombre + días de atraso.
- Botón "Ver Finanzas" → navega a `/finances` (en vez de `/buildings`).
- Query keys nuevos: `['plusterra-income-widget', period]` para no chocar con cache anterior.

**2. `src/hooks/useDashboardStats.ts` — filtrar `overdueRent`**

- El query `overdueRent` actualmente lista contratos de inquilinos vencidos (esto es plata de propietarios, no de Plusterra).
- **Reemplazar** por: agentes con canon vencido del mes en curso (consultar `agents` activos, cruzar con `canon_payments` del período actual; los que falten y ya pasaron del `due_day` van a la lista) + comisiones pendientes con `created_at` mayor a 30 días.
- Mantener la misma estructura de retorno (`alerts.overdueRent`) para no romper consumidores.

**3. `src/components/dashboard/DashboardWidgets.tsx` — ajustar labels**

- Cambiar texto "Alquileres vencidos" / "cobros vencidos pendientes" → "Cánones/Comisiones vencidas".
- Si hay un botón que apunte a `/buildings` desde esa alerta, redirigir a `/finances`.

### Garantías

- **Cero cambios en BD.** Solo lecturas con filtros distintos.
- **Cero impacto en Edificios, Liquidaciones, Control de Cobros, Finanzas.** Esos módulos siguen viendo TODO igual.
- Coherente con `mem://finanzas/alcance-y-dashboard-consolidado` y `mem://business/finanzas-politica-cierre-mensual`.
- Reversible.

### Memoria a actualizar

Anexar a `mem://finanzas/alcance-y-dashboard-consolidado`: *"El widget Dashboard 'Ingresos del Mes (Plusterra)' suma exclusivamente cánones de agentes cobrados (`canon_payments`) + comisiones cobradas (`commissions.status='paid'`) del período en curso. Los cobros gestionados a terceros (alquileres) NO aparecen en el Dashboard; viven solo en Edificios → Control de Cobros."*

### Resultado esperado

Dashboard mostrará el monto real que ingresa a Plusterra (cánones + comisiones), no los 179M que mezclaban dinero de propietarios. El contador de vencidos también solo cuenta lo de Plusterra. Cero confusión.

