

## Plan: Permitir liquidación de meses adelantados en Edificios

### Problema

En **Control de Cobros** se pueden registrar pagos adelantados (ej: alquiler de mayo cobrado hoy en abril) y eso genera correctamente:
- `receivables` con `status='paid'`
- `unit_collection_records` con `payment_status='paid'` y `alquiler_check=true`

Pero en la pestaña **Liquidación Mensual** del mismo edificio, los botones de navegación de mes no dejan avanzar más allá del mes actual. Por eso no se puede generar el reporte del propietario de mayo aunque el cobro ya esté hecho (caso real: Salto Grande 4).

### Causa raíz

`src/pages/BuildingDetailPage.tsx`, línea 372-377:

```ts
const nextMonth = () => {
  setMonthDate(prev => {
    const next = new Date(prev);
    next.setMonth(next.getMonth() + 1);
    return next > new Date() ? prev : next; // ← TOPE EN HOY
  });
};
```

Mientras tanto, Control de Cobros (`CollectionControlTab.tsx`) ya permite navegar hasta **+6 meses a futuro**. Asimetría que rompe el flujo.

### Cambio

Alinear el navegador de la pestaña Liquidación Mensual con el mismo límite de Control de Cobros: permitir avanzar hasta **+6 meses** desde hoy. Esto cubre prepagos típicos sin abrir la puerta a meses arbitrariamente lejanos.

**Archivo único a editar:** `src/pages/BuildingDetailPage.tsx`

**Cambio:**
```ts
const nextMonth = () => {
  setMonthDate(prev => {
    const next = addMonths(prev, 1);
    const maxDate = addMonths(new Date(), 6);
    return next > maxDate ? prev : next;
  });
};
```

(usar `addMonths` de `date-fns`, ya importado en el archivo)

### Comportamiento esperado tras el cambio

1. En Salto Grande 4, ir a la pestaña **Liquidación Mensual** y navegar con la flecha derecha hasta **mayo 2026**.
2. Las unidades con prepago registrado aparecen con estado **Pagado** (verde), suman alquiler y comisión, y entran en el neto al propietario.
3. Las unidades sin cobro de mayo aparecen con monto esperado en gris y al pie del PDF en "Unidades pendientes" (lógica ya existente, sin cambios).
4. Los botones de exportación (PDF Consolidado, Reporte por Propietario, Excel) funcionan normalmente para mayo.
5. La flecha derecha se desactiva al llegar a 6 meses por delante del mes actual (octubre 2026 si hoy es abril 2026).

### Verificación

- Hoy (abril 2026): poder navegar a may/jun/jul/ago/sep/oct 2026, no a noviembre 2026.
- En un edificio con prepagos: ver el reporte con totales correctos para el mes adelantado.
- En meses sin actividad: muestra el mensaje vacío estándar ("Sin datos de liquidación para este período").

### Notas técnicas

- Sin cambios en hooks, queries, RLS ni schema. La query `useBuildingLiquidation` ya respeta `payment_status='paid'` (memoria `liquidacion-respeta-cobranza`), así que con solo destrabar la navegación todo el flujo posterior funciona.
- Sin cambios en PDFs ni Excel: ya consumen `LiquidationLine` que ya está correcta.

