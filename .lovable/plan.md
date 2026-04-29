# Garantías de Propietario — Módulo en Administración

## Objetivo
Cuando se alquila una unidad **administrada** (en edificio o propiedad individual en administración), registrar la **parte de la garantía que corresponde al propietario** para que aparezca en su Informe Mensual. Totalmente independiente de Finanzas/Comisiones (eso lo gestiona el agente como hoy).

## Flujo definido

1. **Agente alquila** una propiedad y registra su comisión bruta (flujo actual, sin cambios).
2. Si la propiedad es administrada (`building_id` no nulo o `administration_type` activo), el sistema **crea automáticamente una tarea** "Garantía pendiente de registrar" visible solo para Admin/Gerente/Secretaría.
3. **Admin abre la tarea** → mini-formulario:
   - **Monto total de garantía cobrada al inquilino** (default = monto de alquiler del contrato, editable con `<MoneyInput>`)
   - **% para propietario** (campo numérico, default 50, editable: 50, 65, 70, etc.)
   - **Vista en vivo a la derecha**: "Garantía propietario: Gs. 1.000.000" (calcula `monto × % / 100`)
   - **Fecha de cobro** (default hoy)
   - **Observación opcional**
   - Botón **Confirmar** o **Marcar sin garantía** (con motivo: renovación, exoneración, etc.)
4. **Al confirmar**: se guarda en una nueva tabla y ese monto del propietario se suma al **Informe del Propietario** del mes correspondiente.
5. **Plusterra no gana nada sobre la garantía.** No toca Finanzas, no toca Reporte de Ganancia Plusterra.

## Cambios técnicos

### 1. Nueva tabla `owner_guarantee_records`
```text
- id (uuid, pk)
- property_id (uuid) — propiedad alquilada
- unit_id (uuid, nullable) — si pertenece a edificio
- building_id (uuid, nullable)
- contract_id (uuid, nullable) — referencia al contrato si existe
- period (text, YYYY-MM) — mes en que se cobró
- monto_garantia_total (numeric) — monto cobrado al inquilino
- porcentaje_propietario (numeric, default 50) — 50, 65, 70...
- monto_propietario (numeric, generated) — monto_garantia_total × porcentaje_propietario / 100
- currency (text, default 'PYG')
- fecha_cobro (date)
- status (text: 'pending' | 'registered' | 'no_aplica')
- motivo_no_aplica (text, nullable)
- observacion (text, nullable)
- registered_by (uuid)
- created_at / updated_at
```
RLS: solo Admin/Gerente/Secretaría/SuperAdmin pueden leer/escribir.

### 2. Trigger automático de creación de tarea pendiente
Al cambiar `properties.status` a `rented`, si la propiedad es administrada (tiene `building_id` o `administration_type IS NOT NULL`), insertar una fila `pending` en `owner_guarantee_records` (si no existe ya una para esa propiedad+período).

### 3. UI nueva: panel "Garantías de Propietario"
Ubicación: **Administración → nueva pestaña "Garantías"** (o dentro del menú Administración).
- Tabla con columnas: Edificio | Unidad | Propietario | Fecha alquiler | Estado | Acciones
- Filtro por estado (Pendientes / Registradas / Sin aplicar) y por mes
- Badge en sidebar con conteo de pendientes para Admin/Gerente
- Botón "Registrar garantía" → abre el dialog con el mini-formulario descrito arriba

### 4. Integración al Informe del Propietario
En el componente que arma el informe mensual (`hub-propietario` y reportes comerciales del propietario), agregar línea:
- "Garantía recibida (mes X)" → monto del propietario
Solo aparece el mes en que se registró. No toca el cálculo de Plusterra.

### 5. Memoria del proyecto
Crear `mem://features/garantia-propietario` documentando:
- Garantía solo se registra para propiedades administradas
- Porcentaje configurable por operación (default 50%, puede ser 65%, 70%, etc.)
- Solo afecta Informe del Propietario, NO Finanzas ni Reporte Plusterra
- Agente nunca ve este módulo

## Lo que NO se toca
- Flujo del agente (registro de comisión bruta queda igual).
- Finanzas, Comisiones, split 85/15.
- Reporte de Ganancia Plusterra (`useAdminPlusterraGains`).
- Liquidación de edificios.
- Tabla `receivables` ni `payments`.

## Pregunta única antes de implementar
¿La pestaña "Garantías" la querés dentro de **Administración → Edificios** (junto a Cobros, Liquidaciones) o como **sección global de Administración** (lista todas las garantías de todas las propiedades administradas, sean de edificio o individuales)?

Mi recomendación: **sección global** porque también incluye casas/deptos individuales en administración, no solo edificios.