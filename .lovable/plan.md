# Opción B — Resolver caso 6B + arreglar el sistema

## 1. Limpieza puntual del caso (6B SG VI — Dominga Palmerola)

**Datos confirmados en BD:**
- Contrato: `4884386a-54d3-4509-a693-c85f7ca8553d`, deposit_amount = 1.300.000, status=active, start_date=2026-04-22.
- Propiedad: `14740551-...` (6B SG VI), edificio Salto Grande VI.
- Owner unidad: `bdc55d7e-...` (asignado en `unit_owners`).
- `owner_guarantee_records`: **no existe registro** → por eso no aparece en el Informe del Propietario.

**Acciones:**
- Revertir el cobro que cargaron mal como "mora / pro rateo" del 6B en `receivables` (lo identifico por monto + concepto y lo elimino o lo dejo como referencia con nota administrativa, según prefieras).
- Insertar el registro correcto en `owner_guarantee_records` para el contrato del 6B:
  - `monto_garantia_total = 1.300.000`, `porcentaje_propietario = 50` (default, ajustable), `status = 'registered'`, owner heredado de `unit_owners`, period = mes del cobro real.

## 2. Arreglo de fondo (trigger inverso)

Crear trigger `trg_auto_create_owner_guarantee_from_contract` sobre `contracts` (AFTER INSERT/UPDATE):

Condiciones para disparar:
- `deposit_amount > 0`
- `contract_type IN ('rental','temporary_rental')`
- `status IN ('active','near_expiration')`
- La propiedad pertenece a una unidad administrada (`units.building_id IS NOT NULL`)
- No existe ya un `owner_guarantee_records` para ese `contract_id`

Acción: insertar fila `pending` en `owner_guarantee_records` con monto sugerido = `deposit_amount`, `porcentaje_propietario = 50` (editable luego en UI), heredando `owner_id` desde `unit_owners`, para que Administración la confirme desde **Edificios → Garantías**.

Esto cubre el hueco actual: hoy el único trigger (`trg_auto_create_owner_guarantee`) dispara solo al cambiar `properties.status → rented`. Si la propiedad ya estaba alquilada antes de firmar el nuevo contrato (caso 6B), nunca se generaba la tarea pendiente.

## 3. Aviso visible en el formulario de contrato

En `ContractFormDialog`, cuando:
- `deposit_amount > 0` **y**
- la unidad tiene `building_id` (administrada),

mostrar un banner informativo amarillo debajo del campo de depósito:

> "Este contrato genera una garantía del propietario. Recordá registrarla / confirmarla en **Edificios → Garantías** una vez guardado el contrato."

(Nota: con el trigger del punto 2 ya se crea automáticamente la fila `pending`; el banner solo recuerda al usuario que pase a confirmarla.)

## 4. Backfill (opcional pero recomendado)

Correr una vez al aplicar la migración: para cada contrato activo con `deposit_amount > 0` cuya unidad tenga `building_id` y no exista ya un `owner_guarantee_records`, crear la fila `pending` correspondiente. Así también se detectan otros casos viejos como el 6B que pudieron quedar sin registrar.

## Detalles técnicos

- Migración SQL nueva: trigger function `auto_create_owner_guarantee_from_contract()` + trigger en `contracts`.
- Insert tool para: (a) borrar el receivable mal cargado del 6B, (b) insertar el `owner_guarantee_records` correcto para el 6B, (c) backfill de contratos pendientes.
- Frontend: editar `src/components/contracts/ContractFormDialog.tsx` para agregar el banner condicional.
- No se toca el módulo Finanzas ni el cálculo de comisiones/liquidaciones (la garantía sigue siendo solo del Informe del Propietario, según `mem://features/garantia-propietario`).
