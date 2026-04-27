## Cambios al reporte "Ganancia Plusterra"

Se reescribe la lógica del reporte para que sea **un consolidado por EDIFICIO** (no por departamento), con observación a nivel edificio y firmado con el nombre real + rol del usuario que lo genera.

---

### 1. Identidad del usuario en el PDF (seguridad)

**Reemplazar el email por nombre + rol** en la franja "Generado por...":

- En `src/components/buildings/PlusterraGainsTab.tsx`, antes de generar el PDF se obtiene del perfil:
  - `full_name` desde `profiles`
  - `role` desde `user_roles` y se mapea a etiqueta:
    - `superadmin` → "SuperAdmin"
    - `admin` → "Admin"
    - `accounting` → "Gerente"
    - `secretaria` → "Secretaría"
    - `agent` → "Agente"
- Se pasa al PDF como `generatedBy: "Juan Pérez (Gerente)"` en vez del email.
- Si por algún motivo no se obtiene el nombre, se cae a `"Usuario interno"` — **nunca al email**.

---

### 2. Reporte agrupado por EDIFICIO (no por unidad)

El usuario quiere ver una sola línea por edificio con el **total ganado en ese edificio**, no fila por fila de cada unidad.

**Cambios en `src/hooks/useAdminPlusterraGains.ts`**:
- Se agrega una segunda agregación `buildingsRows`:
  - Una fila por `building_id` (o "Sin edificio" para sueltas).
  - Campos: `building_name`, `units_count` (cuántas unidades cobradas), `internal_pct` (el del edificio), `collected` (suma), `gain` (suma), `expenses` (suma de egresos imputados a propiedades de ese edificio + egresos imputados directo al edificio sin propiedad), `observation` (de la nueva tabla por edificio).
- Se mantiene el detalle por propiedad internamente (sigue sirviendo para la pantalla web), pero el PDF y los totales del reporte usan `buildingsRows`.

**Observación por edificio**:
- Crear nueva tabla `admin_building_observations` (mismo esquema que `admin_property_observations` pero con `building_id`):
  - `id`, `building_id` (uuid, nullable para "Sin edificio" → usar key especial), `period`, `observation`, `created_by`, timestamps.
  - Constraint unique `(building_id, period)`.
  - RLS: `is_admin_like()` full access.
- Se carga al hook como `obsByBuildingMap`.

---

### 3. UI: nueva pestaña en formato consolidado

En `src/components/buildings/PlusterraGainsTab.tsx`:

- La tabla pasa a tener columnas:
  - **Edificio** | **Unidades cobradas** | **%** | **Cobrado** | **Ganancia Plusterra** | **Gastos** | **Observación interna**
- Una sola fila por edificio. Se elimina la sub-jerarquía por unidad/código.
- La celda de observación edita en `admin_building_observations` (no en propiedades).
- Los KPIs superiores (Total ganancia / Gastos / Resultado neto) se mantienen pero suman desde `buildingsRows`.
- Footer del total: igual.

> El detalle por unidad se quita del PDF y de la vista. La trazabilidad por unidad ya existe en otros reportes del edificio.

---

### 4. PDF rediseñado (`src/lib/plusterraGainsReportPDF.ts`)

- **Cabecera**: igual (banner azul + logo blanco), pero `Por: ` ahora muestra `Juan Pérez (Gerente)`.
- **Tabla principal** (landscape):
  - Columnas: `Edificio` | `Unid. cobradas` | `%` | `Cobrado` | `Ganancia Plusterra` | `Gastos` | `Observación`
  - Fila por edificio. Estilos y resaltes igual (verde para Ganancia, rojo para Gastos).
  - Footer con TOTAL del mes.
- **Resumen del mes**: igual (verde sobre celeste si positivo, rojo si negativo).
- **Observaciones generales del mes**: se mantiene igual al final.

---

### 5. Migración de base de datos

Crear tabla `admin_building_observations` con su política RLS y trigger de `updated_at`. La tabla `admin_property_observations` se conserva intacta (no se borra) por compatibilidad histórica, simplemente deja de usarse en este reporte.

---

### Detalles técnicos

- Los gastos por edificio se calculan así:
  1. Agrupar `admin_cash_movements` con `period`, `movement_type='egreso'` por:
     - `building_id` directo (egreso imputado al edificio, sin propiedad).
     - + suma de egresos imputados a `property_id` perteneciente a ese edificio (resolviendo via `properties → unit → building_id`).
- Se mantiene `security_invoker` y políticas estándar `is_admin_like()` para la nueva tabla.
- No se elimina ningún archivo. Cambios solo en: `useAdminPlusterraGains.ts`, `PlusterraGainsTab.tsx`, `plusterraGainsReportPDF.ts` y una nueva migración SQL.
