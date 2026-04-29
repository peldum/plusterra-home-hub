## Problema

El buscador del diálogo "Generar garantía manual" devuelve "No se encontraron unidades de edificios" porque está consultando una columna que **no existe**.

Hice la query asumiendo que `units.property_id` apuntaba a la propiedad. La realidad del esquema es la inversa:

- `units` tiene: `id`, `building_id`, `unit_code` (NO tiene `property_id`)
- `properties` tiene: `unit_id` (apunta a `units.id`)

Verifiqué que **PLT-2026-0172** ("Salón con vivienda zona centro", inquilina Verónica Batista, status `rented`) está correctamente vinculado al edificio **GREGORIO LUZKO - PROPIEDADES** vía `properties.unit_id`. Solo faltaba que el código lo busque bien.

## Cambios

### 1. `src/components/buildings/ManualGuaranteeCreateDialog.tsx`

Reescribir la query de `managed-units-for-guarantee`:

- Empezar desde `properties` filtrando `unit_id IS NOT NULL` (esas son las propiedades de edificio).
- Cargar las `units` por `properties.unit_id` y los `buildings` por `units.building_id`.
- Mapear cada opción con: `property_id`, `unit_id` (= `properties.unit_id`), `building_id` (= `units.building_id`), `unit_code`, `building_name`, owner, status.
- Mantener filtro de búsqueda por edificio / unit_code / título / código de propiedad / propietario.
- Mostrar todas las propiedades de edificios (no solo "rented") para cubrir casos de renovaciones/registros tardíos; el estado se muestra como info en cada fila.

### 2. Verificar trigger automático y migración

Revisar `supabase/migrations/20260429190622_*.sql` (trigger `trg_auto_create_owner_guarantee`). Si también usa `units.property_id`, hay que arreglarlo con una **nueva migración** que reemplace la función para leer `NEW.unit_id` directamente desde `properties` (la fila que cambia de status). Si ya está bien (usa `NEW.unit_id` y `NEW.building_id` desde `properties`), no se toca.

### 3. Probar Verónica Batista

Tras el fix, abrir Edificios → Gregorio Luzko → Garantías → "+ Generar garantía manual" → buscar "PLT-2026-0172" o "Verónica" → aparece la opción → Crear → Registrar con monto y % correspondiente.

## Detalles técnicos

Esquema confirmado vía DB:

```text
properties (id, property_code, status, owner_id, unit_id) ──┐
                                                            │ unit_id
                                                            ▼
                                          units (id, building_id, unit_code)
                                                            │ building_id
                                                            ▼
                                                  buildings (id, name)
```

Nueva query (resumen):

```ts
const { data: props } = await supabase
  .from('properties')
  .select('id, title, property_code, owner_id, status, unit_id')
  .not('unit_id', 'is', null);

const unitIds = props.map(p => p.unit_id);
const { data: units } = await supabase
  .from('units').select('id, unit_code, building_id').in('id', unitIds);

const buildingIds = [...new Set(units.map(u => u.building_id))];
const { data: buildings } = await supabase
  .from('buildings').select('id, name').in('id', buildingIds);
// + owners por owner_ids → arma ManagedUnitOption[]
```

No se cambia el resto del flujo (insert en `owner_guarantee_records` sigue igual, ya guarda `property_id`, `unit_id`, `building_id`, `owner_id`).