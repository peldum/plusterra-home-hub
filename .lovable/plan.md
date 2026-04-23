
Sí, se entiende.

## Dónde queda registrado el gasto del edificio

Cuando cargan un gasto desde **Administración → Edificio → Liquidación Mensual → Gastos generales del edificio**, queda guardado en la tabla interna de gastos generales del edificio.

En pantalla se ve dentro de esa misma sección:

```text
Liquidación Mensual
  → Gastos generales del edificio
      Fecha
      Concepto
      Categoría
      Monto
```

Ese gasto después se usa para:

- Mostrarlo en la liquidación mensual.
- Sumarlo dentro de **Gastos + Mant.**
- Restarlo del **Neto Propietarios / Pago final ajustado**.
- Incluirlo en los reportes PDF de liquidación cuando corresponde.

## Situación actual

Actualmente el sistema permite **registrar** el gasto, pero en la tabla de “Gastos generales del edificio” no hay botón visible para eliminarlo si se cargó mal.

## Cambio propuesto

Voy a agregar la posibilidad de **eliminar un gasto general del edificio** desde la misma sección donde se visualiza.

### Cómo quedaría

En la tabla de gastos generales se agregará una columna de acciones:

```text
Fecha       Concepto              Categoría      Monto        Acciones
2026-04-23 Limpieza general       Limpieza       ₲ 450.000    Eliminar
```

Al tocar **Eliminar**, se abrirá una confirmación:

```text
¿Eliminar este gasto del edificio?

Esta acción eliminará el gasto de la liquidación mensual y actualizará los totales.
```

Con botones:

```text
Cancelar | Eliminar gasto
```

## Seguridad

Solo podrán eliminar gastos los mismos roles que ya pueden editar/cargar datos administrativos:

- SuperAdmin
- Admin
- Gerente / Contabilidad
- Secretaría

No se habilitará para usuarios sin permisos administrativos.

## Qué pasa al eliminar

Al eliminar un gasto:

- Desaparece de la lista de **Gastos generales del edificio**.
- Se descuenta del total de gastos del período.
- Se recalcula el **Neto Propietarios / Pago final ajustado**.
- Los reportes PDF posteriores ya no lo incluirán.
- No afecta cobros de inquilinos ni pagos ya registrados en Control de Cobros.

## Implementación técnica

Voy a modificar principalmente:

- `src/pages/BuildingDetailPage.tsx`

Cambios internos:

1. Agregar estado para identificar qué gasto se está eliminando.
2. Crear una función `handleDeleteBuildingExpense`.
3. Ejecutar eliminación sobre el registro correspondiente de `building_expenses`.
4. Invalidar las consultas:
   - `building-expenses`
   - `building-liquidation`
5. Agregar botón con ícono de papelera en cada fila.
6. Agregar diálogo de confirmación antes de borrar.
7. Mostrar mensajes claros:
   - “Gasto eliminado correctamente”
   - “Error al eliminar gasto…”

## Resultado esperado

Después del cambio:

- Van a poder corregir errores de carga eliminando el gasto equivocado.
- La liquidación se actualizará automáticamente.
- El reporte mensual quedará consistente.
- La operación tendrá confirmación para evitar borrados accidentales.
