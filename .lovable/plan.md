## Objetivo

Que al cargar un inquilino desde **Edificios → Agregar/Reemplazar Inquilino** (`QuickTenantDialog`), una vez guardado, se abra automáticamente el mismo flujo que ya existe en el formulario de propiedades:

1. `OperationOriginDialog` → preguntar si la operación fue **interna (Plusterra)** o **externa**.
2. Si es interna → abrir `PostRentalCommissionDialog` con la propiedad pre-cargada para registrar la comisión 85/15.
3. Si es externa → cerrar y no pedir comisión.

Hoy ese disparador solo existe en `PropertyFormDialog` cuando el status pasa a `rented`/`sold`. Por eso, cuando Secretaría/Admin carga el inquilino desde el edificio, la propiedad queda Alquilada sin que se pida la comisión, y termina apareciendo en "Comisiones pendientes de registrar".

## Cambios

### `src/components/buildings/QuickTenantDialog.tsx`

1. Importar `OperationOriginDialog` y `PostRentalCommissionDialog`.
2. Agregar estados locales:
   - `savedPropertyForCommission: any | null`
   - `showOriginDialog: boolean`
   - `showCommissionDialog: boolean`
3. En `handleSave`, después de guardar contrato + actualizar la propiedad a `rented` (línea ~239) y antes del `onOpenChange(false)`:
   - Solo cuando **no es edición** (`!isEditing`) — porque editar un inquilino existente no implica una operación nueva.
   - Cargar los datos mínimos necesarios para el diálogo de comisión:
     ```ts
     setSavedPropertyForCommission({
       id: finalPropertyId,
       title: propertyTitle + ' — ' + unitCode,
       property_code: undefined, // QuickTenant no lo tiene a mano; el dialog lo resuelve
       rental_price: parsedMonthlyRent,
       currency,
       captor_agent_id: user!.id,
       reserved_by: user!.id,
     });
     setShowOriginDialog(true);
     ```
   - **No cerrar** el `QuickTenantDialog` con `onOpenChange(false)` todavía: cerrarlo recién cuando el usuario elija "Externa" o termine la carga de comisión, para que el popup no quede huérfano detrás de otro modal. Alternativa más limpia: cerrar `QuickTenantDialog` y montar los nuevos diálogos en un portal a nivel `Buildings` (ver "Alternativa" abajo).
4. Renderizar al final, condicional a `savedPropertyForCommission`, los dos diálogos con la misma estructura que ya está en `PropertyFormDialog` (líneas 811–837).
5. Al cerrar `PostRentalCommissionDialog`, limpiar `savedPropertyForCommission` y recién ahí cerrar el `QuickTenantDialog` original.

### Detalle de `PostRentalCommissionDialog`

Verificar que acepta los campos que se le pasan (`id`, `title`, `rental_price`, `currency`, `captor_agent_id`). Hoy en `PropertyFormDialog` se le pasa exactamente ese shape, así que es directo.

## Alternativa de arquitectura (recomendada si superponer modales causa conflictos de focus)

En vez de montar los diálogos dentro de `QuickTenantDialog`, levantar un evento al componente padre (la grilla de unidades en `Buildings.tsx` o `BuildingDetailPage.tsx`) con la propiedad recién marcada como rented, y que el padre monte `OperationOriginDialog` + `PostRentalCommissionDialog` después de cerrar el `QuickTenantDialog`. Esto evita anidar tres `Dialog` de Radix y respeta la regla de focus de la memoria del proyecto.

```text
QuickTenantDialog ──onSavedRented({propertyId, ...})──▶ Buildings page
                                                          │
                                                          ├─ OperationOriginDialog
                                                          └─ PostRentalCommissionDialog
```

Recomiendo esta variante por estabilidad de UI.

## Casos cubiertos

- Agregar inquilino nuevo a unidad vacía → dispara flujo.
- Reemplazar inquilino (`isReplacing`) → dispara flujo (es una operación comercial nueva).
- **Editar** inquilino existente (`isEditing`) → NO dispara flujo (no hay nueva operación).
- Si el usuario elige "Externa" → no se crea comisión y la propiedad queda fuera de "Pendientes de registrar" igual que hoy en el formulario de propiedades.

## Fuera de alcance

- No se toca la lógica de `PendingCommissionsDialog` (sigue siendo la red de seguridad).
- No se modifica `PostRentalCommissionDialog` ni `OperationOriginDialog`.
- No se cambian RLS ni triggers; es solo UI.

¿Avanzo con la **alternativa recomendada** (evento al padre) o preferís la versión simple (diálogos anidados dentro de `QuickTenantDialog`)?
