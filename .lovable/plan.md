

## Plan: Reportes/Liquidación cuentan alquiler solo si Estado = "Pagado"

### Problema

Hoy en Administración, una unidad puede quedar en estado **Pendiente / Vencido / Parcial**, pero el reporte mensual y la liquidación al propietario igual suman el alquiler como cobrado. Esto sucede porque el motor de liquidación (`useBuildingLiquidation`) usa solo el tilde `alquiler_check` como fuente de verdad, ignorando el `payment_status` general de la unidad. Además, en algunos generadores de PDF (Modelo 2/3) se usa `line.rental_price` sin validar si efectivamente está cobrado.

### Regla acordada

- El alquiler solo se considera **cobrado** (y por lo tanto se suma a totales, comisión Plusterra y pago al propietario) cuando `payment_status === 'paid'`.
- Si el estado es **Pendiente, Vencido o Parcial**:
  - Alquiler en el reporte = **0 ₲**
  - Comisión Plusterra para esa unidad = **0 ₲**
  - Pago final al propietario para esa unidad = **0 ₲**
  - La fila aparece igual en el PDF/Excel, pero con 0 y marca visual de pendiente
  - Al pie del reporte se agrega una **nota con las unidades pendientes** y el monto esperado de cada una

### Cambios técnicos

1. **`src/hooks/useBuildingLiquidation.ts`**
   - Cambiar la fuente de verdad: `isCollected = collectionRec?.payment_status === 'paid'` (en lugar de `alquiler_check`).
   - Mantener `rental_price_expected` y `alquiler_check` para uso informativo en UI/PDF.

2. **`src/components/buildings/CollectionControlTab.tsx`**
   - Asegurar que tildar "Alquiler" sin que el estado llegue a `paid` no marque la unidad como cobrada para liquidación. (La lógica ya pone `paid` solo cuando los 3 tildes están marcados; queda igual.)
   - Mostrar un badge/tooltip de aviso: "Tildar el alquiler no cuenta como cobrado hasta que el estado sea Pagado".

3. **Generadores de PDF — forzar 0 cuando `payment_status !== 'paid'`**
   - `src/lib/buildingLiquidationPDFModels.ts` (Modelo 2 y Modelo 3, consolidado e individual): reemplazar `line.rental_price` por `isPaid ? line.rental_price : 0` en los cálculos de totalNeto, comisión y pago final.
   - `src/lib/buildingLiquidationPDF.ts` (Modelo 1): mismo tratamiento — si no está pagado, los conceptos A–H se muestran en 0 (pero la fila se mantiene).
   - Estilo visual: filas no pagadas en gris claro con etiqueta **"PENDIENTE"** o **"VENCIDO"** en la columna de estado.
   - Agregar al final del PDF una sección **"Unidades pendientes en este período"** listando: Unidad, Inquilino, Estado, Monto esperado.

4. **Excel — `src/lib/buildingExport.ts`**
   - Mismo criterio: si `payment_status !== 'paid'`, exportar 0 en alquiler/comisión/neto y agregar una columna "Estado" con el valor real (Pendiente, Vencido, Parcial, Pagado).
   - Hoja/sección adicional con el listado de pendientes.

5. **Tab de visualización en pantalla** (`AdminSummaryDashboard` u otros lugares que muestren totales por edificio)
   - Verificar que los totales en el dashboard de Administración respeten también la nueva regla. Si ya consumen `useBuildingLiquidation`, automáticamente quedará bien.

### Validación

1. Crear/usar una unidad con estado **Pendiente** y `alquiler_amount` cargado → el PDF Consolidado y Reporte Propietario deben mostrar 0 en alquiler/comisión/pago final para esa unidad.
2. La unidad debe aparecer al pie del PDF en la sección "Unidades pendientes" con su monto esperado.
3. Cambiar la unidad a **Pagado** → el PDF debe sumarla normalmente y desaparecer de la sección de pendientes.
4. El Excel debe reflejar la misma lógica con la nueva columna "Estado".
5. Probar Modelo 1, Modelo 2 y Modelo 3.

