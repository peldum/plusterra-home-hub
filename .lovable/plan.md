## Objetivo

Cuando un alquiler/venta se registra con un **co-broker externo** (ej. Sandra + Joel Sly), la fila de Comisiones hoy solo muestra "Ret. Sandra Benítez: Gs. 195.000" y no explica de dónde sale ese número. Queremos que aparezca el mismo nivel de detalle que cuando es co-agente interno (caso de Sandra + Elias Imas en la captura), y que el reporte PDF también lo refleje.

## Cambios

### 1. Lista de Comisiones (`src/components/finances/ComisionesTab.tsx`)

Agregar un bloque dedicado para `q.is_cobroker === true` (hoy cae en el `!q.is_co_agent` y solo muestra una línea). Mostrar:

- **Línea de neto por agente** (similar al co-agente interno):
  - `Sandra Benitez: Gs. 1.105.000` (su mitad menos 15%)
  - `Joel Sly (externo): Gs. 1.300.000` (mitad bruta, sin retención Plusterra)
- **Línea de retención**:
  - `Ret. Sandra Benitez: Gs. 195.000`
  - `Ret. externo: Gs. 0 — Plusterra no retiene sobre la mitad del agente externo`
- Mantener el badge "Co-broker externo" y el subtítulo `Sandra Benitez · Externo: Joel Sly`.

Los valores salen de los campos ya recalculados: `gross_amount` (bruto total), `agent_retention`/`company_amount` (195.000), `net_amount` (1.105.000). La mitad del externo = `gross_amount/2`.

Pequeña nota tooltip/leyenda al lado de la retención: "15% solo sobre la mitad de Plusterra" para que quede claro por qué es menos que en operaciones solo.

### 2. Reporte PDF de Comisiones (`src/lib/commissionReportExport.ts` + el armado de filas en `ComisionesTab.tsx` líneas ~491-506)

- En la columna **Cerrador**: cuando es co-broker externo, mostrar `<nombre externo> (externo)` en vez de "—".
- En **Gan. Cerrador**: mostrar la mitad bruta del externo (`gross/2`), aclarando con un sufijo/columna que no genera retención Plusterra.
- En **Observaciones**: incluir frase fija "Co-broker externo: split 50/50. Retención 15% solo sobre mitad de Plusterra." para que el PDF sea autoexplicativo.
- **85% Agentes** y **Ret. Plusterra**: ya están correctos tras el recálculo; verificar que `pct50` para externos use `gross/2 + net_amount` (mitad externo + neto Sandra) o documentar la fórmula en el encabezado.

### 3. AgentFinances (panel del agente)

Revisar `src/pages/AgentFinances.tsx` (líneas 255-355): cuando la operación es `is_cobroker`, agregar la misma mini-leyenda "Mitad externo (sin retención Plusterra): Gs. X" para que el agente vea el cuadro completo y entienda por qué su retención es menor.

### Detalles técnicos

- No cambia el modelo de datos ni los cálculos backend (ya están bien tras la migración previa).
- Solo presentación: nuevo bloque condicional `q.is_cobroker && !q.is_co_agent` en la lista, ajuste de `getRowValues` y `buildCommissionReportPDF` para el PDF.
- Mantener formato de Guaraníes con puntos (`fmtCur`).

## Fuera de alcance

- No tocar lógica de `computeCommissionSplit`.
- No modificar la migración ni los registros históricos (ya recalculados).
