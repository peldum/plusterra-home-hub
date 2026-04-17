

## Análisis

La jefa pide dos cosas sobre los círculos de estado (verde = cobrado, rojo = pendiente) que aparecen en las columnas **ALQ.**, **EXP.** y **ENE.** de los reportes PDF de administración:

1. **Estado intermedio "Pendiente" en amarillo**: hoy solo hay 2 estados (verde si está marcado el check, rojo si no). Quiere un **3er estado: amarillo cuando aún no se decidió** (no se hizo clic ni para confirmar ni para descartar el cobro). Hoy no existe esa diferencia: si nunca se tocó, sale rojo igual que si está pendiente real.

2. **Renombrar "ENE." → "ANDE"**: el label actual confunde (parece "enero"). En Paraguay el servicio eléctrico es ANDE, mucho más claro.

## Diseño

**Nuevo estado "no definido" → amarillo**

Para distinguir "no se tocó nunca" vs "se marcó como no cobrado", agrego un check explícito de **"no aplica/no cobrado deliberadamente"**. La lógica más simple y sin migrar la BD:

- Si **no existe registro** en `unit_collection_records` para esa unidad/período → **amarillo (Pendiente)**
- Si existe el registro pero el check está `false` → **rojo (No cobrado)**
- Si el check está `true` → **verde (Cobrado)**

Esto refleja exactamente la realidad: no se entró a procesar la cobranza de esa unidad todavía.

**Cambios concretos:**

### 1. PDFs — `src/lib/buildingLiquidationPDFModels.ts` y `src/lib/buildingLiquidationPDF.ts`
- Cambiar la firma del check de `boolean` a `'paid' | 'unpaid' | 'pending'`.
- Colores: verde `(22,128,57)` / rojo `(180,40,40)` / **amarillo nuevo `(217,167,32)`**.
- En las celdas de tabla (Modelo 2 y 3), si la unidad no tiene registro en `checkMap`, dibujar círculo amarillo.
- En el bloque "VERIFICACIÓN DE COBROS" del reporte individual, mostrar texto `— Sin procesar` en amarillo cuando aplique.
- Renombrar las 3 ocurrencias de `'ENE.'` → `'ANDE'` (mismo width 9mm, cabe perfecto).

### 2. UI Web — `src/components/buildings/CollectionControlTab.tsx`
- Cambiar el texto del tooltip y la línea de resumen `⚡ Energía:` → `⚡ ANDE:` para mantener coherencia con el PDF.
- (Los checks de la web siguen siendo booleanos verdes; el amarillo solo aparece cuando aún no se guardó ningún registro para esa unidad ese mes — lo cual ya se refleja porque el check sale "vacío"/destildado, no necesita cambios visuales fuertes acá).

### Archivos a modificar
- `src/lib/buildingLiquidationPDFModels.ts` (Modelo 2 y 3, tablas + reporte individual M2)
- `src/lib/buildingLiquidationPDF.ts` (Modelo 1 - reporte individual completo)
- `src/components/buildings/CollectionControlTab.tsx` (label "Energía" → "ANDE" en tooltip y resumen)

### Resultado esperado
En el PDF de Consolidado Mensual Modelo 2 (la captura que mostró):
- Columna pasa a llamarse **ANDE** en vez de ENE.
- Aparecen 3 colores: 🟢 cobrado, 🔴 marcado como no cobrado, 🟡 sin procesar todavía.

