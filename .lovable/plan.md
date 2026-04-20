

## Plan: Respetar el "no pagado" en el Resumen Consolidado de Liquidación

### El problema (confirmado con datos reales)

Caso **Salto Grande IV — Abril 2026, unidad 4B (Álvaro Antúnez)**:
- En Control de Cobros está marcada como **"Pendiente"** + **"Alquiler ✗ no cobrado"** + **10 días de mora**.
- En el **Resumen Consolidado** (y en el PDF) igual aparece sumando: Gs. 2.000.000 alquiler, Gs. 160.000 admin 8%, Gs. 100.000 Plusterra 5%, Gs. 60.000 Glosker 3%.

**Causa técnica:** `useBuildingLiquidation.ts` toma `prop.rental_price` directamente sin mirar si la unidad cobró o no. Lo mismo en los PDFs Modelo 2 y Modelo 3.

### Solución

Que la liquidación use el **estado real de cobro** del módulo "Control de Cobros":

1. **Si `alquiler_check = true` (cobrado)** → suma alquiler completo y calcula comisiones normalmente.
2. **Si `alquiler_check = false` o `payment_status` ∈ ('pending', 'overdue')** → se muestra la fila pero con:
   - Alquiler "esperado" en gris claro (informativo)
   - Comisiones Plusterra/Glosker/Admin = **0** (no se generaron porque no hubo cobro)
   - Pago final propietario = 0
   - Badge claro "PENDIENTE" / "NO COBRADO"
3. Los **totales del consolidado** suman únicamente lo cobrado.

### Cambios

**1. `src/hooks/useBuildingLiquidation.ts` (núcleo del bug)**

Agregar estos campos al `LiquidationLine`:
- `is_collected: boolean` (true si `alquiler_check`)
- `rental_price_expected: number` (el original)
- `rental_price_collected: number` (0 si no cobrado)

Cambiar el cálculo:
```ts
const isCollected = !!collectionRec?.alquiler_check;
const rentalPrice = isCollected ? (prop.rental_price || 0) : 0;
const rentalExpected = prop.rental_price || 0;
// subtotal, admin_fee_amount, etc. usan rentalPrice (=0 si no cobrado)
```

**2. `src/pages/BuildingDetailPage.tsx` — tabla del Consolidado**

- Agregar columna "Estado cobro" con badge: 🟢 Cobrado / 🔴 No cobrado / 🟡 Sin procesar
- Las filas no cobradas se muestran en gris/atenuado con monto esperado entre paréntesis pero columna comisión = "—"
- Totales al pie: "Total cobrado: X · Total esperado: Y · Pendiente: Y-X"

**3. `src/lib/buildingLiquidationPDFModels.ts` (PDFs Modelo 2 y 3)**

Mismo criterio: si `!is_collected` → comisiones y pago final = 0, fila atenuada (texto gris), columna "Estado" muestra "PENDIENTE". Totales solo suman lo cobrado.

**4. `src/components/buildings/AdminSummaryDashboard.tsx` (KPIs Plusterra del mes)**

Ya filtra correctamente por `r.status === 'paid'` en `receivables` — pero agregar también el cruce con `unit_collection_records.alquiler_check` para casos donde el receivable existe pero el control manual dice "no cobrado". Validar que coincidan.

### Garantías

- **Cero cambios en BD.** Solo lógica de cálculo en frontend y exportadores PDF.
- **Reversible.** Si Lidiane prefiere ver el "esperado" como hoy, agregamos toggle "Ver lo esperado / Ver solo cobrado" (default: solo cobrado).
- **El módulo Control de Cobros sigue siendo la única fuente de verdad** sobre qué se cobró y qué no — perfecto, así trabaja Lidiane hoy.
- **Coherente con `mem://finanzas/alcance-y-dashboard-consolidado`**: la comisión Plusterra solo se contabiliza cuando el dinero efectivamente entra.

### Resultado esperado para Lidiane

Caso 4B Salto IV abril 2026:
- Antes: aparece sumando Gs. 100.000 a Plusterra aunque no cobró nada.
- Después: aparece como "PENDIENTE" en gris, alquiler esperado Gs. 2.000.000 (informativo), comisiones = 0, pago final propietario = 0. **Los totales del consolidado bajan en consecuencia y reflejan la realidad.**

### Memoria a guardar

`mem://features/liquidacion-respeta-cobranza`: *"El Resumen Consolidado de Liquidación de Edificios (tabla en BuildingDetailPage + PDFs Modelo 2/3) calcula alquiler, comisiones Admin/Plusterra/Glosker y pago al propietario SOLO cuando `unit_collection_records.alquiler_check = true` para esa unidad+período. Las unidades no cobradas se muestran con badge 'PENDIENTE', monto esperado en gris, y comisiones = 0. Los totales suman únicamente lo efectivamente cobrado."*

### Archivos modificados

- `src/hooks/useBuildingLiquidation.ts` (lógica principal)
- `src/pages/BuildingDetailPage.tsx` (tabla con estado y atenuado)
- `src/lib/buildingLiquidationPDFModels.ts` (PDFs Modelo 2 y 3)
- `src/lib/buildingLiquidationPDF.ts` (PDF clásico — ajuste menor)
- `src/components/buildings/AdminSummaryDashboard.tsx` (validación cruzada)

