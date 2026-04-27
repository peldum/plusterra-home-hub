## Diagnóstico del problema

Tenés toda la razón, y ya identifiqué exactamente qué está mal. Comparé los dos PDFs:

**Consolidado Mensual de SALTO GRANDE VI (Abril 2026)** — muestra **20 unidades cobradas** con datos completos:
- Total Alquiler facturado: **Gs. 38.430.000**
- Total Cobrado neto (sub total): **Gs. 33.590.000**
- Plusterra 5%: **Gs. 1.679.500** ← esta es la ganancia real
- Gastos de mantenimiento: **Gs. 695.220**

**Reporte Ganancia Plusterra (Abril 2026)** — muestra **SALTO GRANDE VI con Gs. 0** en todo. ❌

### Por qué pasa esto

Los dos reportes leen de **fuentes de datos distintas**:

| Reporte | Fuente | Qué cuenta |
|---|---|---|
| Consolidado Mensual | `collection_records` + datos del edificio (Tab "Control de Cobros") | Todos los pagos registrados manualmente unidad por unidad en la pestaña de cobros del edificio |
| Ganancia Plusterra | `receivables` con `status='paid'` | Solo cuotas que pasaron por el flujo de "Cobros Pendientes" en Finanzas y fueron confirmadas |

El equipo cargó los cobros de Salto Grande VI directamente en la pestaña **"Control de Cobros" del edificio** (que es lo natural para un edificio en administración), pero esos pagos **no se reflejan como `receivables.status='paid'`** porque se registraron por otro camino. Por eso el Consolidado los ve perfecto y el reporte de Ganancia los ignora.

## Solución propuesta

Cambiar el hook `useAdminPlusterraGains.ts` para que **lea de la misma fuente que el Consolidado Mensual** (la tabla `collection_records` o equivalente que usa `BuildingCollectionsTab` / `useBuildingReceivables`), así ambos reportes muestran lo mismo.

### Pasos técnicos

1. **Inspeccionar** `src/components/buildings/BuildingCollectionsTab.tsx` y `src/hooks/useBuildingReceivables.ts` para identificar exactamente qué tabla/consulta usa el Consolidado Mensual para sumar lo cobrado del mes.

2. **Reescribir** `src/hooks/useAdminPlusterraGains.ts` para que:
   - Itere sobre **todos los edificios en administración**.
   - Para cada edificio, consulte la **misma fuente** que el Consolidado Mensual (los pagos del período registrados en la pestaña Control de Cobros).
   - Calcule por unidad: monto cobrado (sub total = alquiler − expensas) y ganancia Plusterra (cobrado × `admin_fee_internal_pct`).
   - Sume los gastos de mantenimiento del mes (que ya aparecen en el Consolidado como columna "GASTOS MANT.").

3. **Resultado esperado** en el reporte de Ganancia para Abril 2026:
   - SALTO GRANDE VI (6): 20 unidades, Cobrado **Gs. 33.590.000**, Gastos **Gs. 695.220**, Ganancia **Gs. 1.679.500** ← coincide con el Consolidado.
   - Resto de edificios con sus números reales en lugar de Gs. 0.

4. **Verificación**: el total que muestre el Reporte de Ganancia para Salto Grande VI debe ser idéntico a la fila TOTALES del Consolidado Mensual del mismo edificio/período.

## Archivos a modificar

- `src/hooks/useAdminPlusterraGains.ts` (cambio de fuente de datos)

Posibles archivos de solo lectura para confirmar la fuente correcta:
- `src/components/buildings/BuildingCollectionsTab.tsx`
- `src/hooks/useBuildingReceivables.ts`
- `src/lib/adminMonthlyReportPDF.ts` (cómo el Consolidado arma los totales)

¿Aprobás que avance con esta corrección?