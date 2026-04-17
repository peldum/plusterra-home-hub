

## Análisis

Hoy en Mantenimiento:
- **Faltan campos de fecha visibles**: la tabla ya tiene `scheduled_date`, `completed_date` y `actual_cost`, pero el formulario nunca los pide ni los muestra. Sólo se setea `completed_date` automáticamente al marcar Completado.
- **El filtro de fecha es por "Mes" único** (un dropdown). No hay rango "desde / hasta".
- **No hay exportación** (ni PDF ni Excel/CSV).
- **No hay historial por ticket**: no se ve cuándo se creó, cuándo se programó, cuándo se completó, ni quién lo modificó.

## Propuesta — 3 mejoras

### 1. Campos de fecha visibles + costo real
Agrego al formulario (alta y edición):
- **Fecha programada** (`scheduled_date`) — opcional.
- **Fecha de realización** (`completed_date`) — editable manualmente (no sólo automática).
- **Costo real** (`actual_cost`) con `MoneyInput` — el monto efectivamente gastado, separado del estimado.

En la tabla de listado agrego columna **"Realizado"** (fecha) entre Estado y Monto, para que se vea cuándo se hizo cada mantenimiento.

### 2. Filtro por rango de fechas
Reemplazo el filtro "Mes" único por dos campos:
- **Desde** (`<input type="date">`)
- **Hasta** (`<input type="date">`)

Atajos rápidos arriba: "Este mes", "Mes pasado", "Últimos 90 días", "Este año", "Limpiar". Aplica sobre `completed_date` (si existe) o `created_at`.

### 3. Exportación PDF — Reporte por propietario
Nuevo botón **"Exportar PDF"** al lado de Filtros. Usa la lista ya filtrada y genera un PDF con el estándar visual del sistema (Roboto + landscape, igual que `buildingLiquidationPDF.ts`).

**Estructura del reporte:**
- Encabezado con logo Plusterra + título "Reporte de Mantenimientos" + período (rango de fechas del filtro) + propietario filtrado.
- Si hay un **propietario filtrado**: agrupa por propiedad, lista sus tickets con fecha, descripción, proveedor, estado, costo. Total final.
- Si **no hay propietario filtrado**: agrupa automáticamente por propietario → cada bloque con sus tickets y subtotal. Al final total general.
- Cada fila: **Fecha realizada · Propiedad · Descripción · Proveedor · Estado · Costo** (real si existe, si no estimado marcado con "(est.)").
- Pie con total general, total de tickets, fecha de generación.

Bonus: botón **"Exportar Excel/CSV"** al lado, para que la jefa pueda manipular números fácil. Mismo dataset filtrado.

## Archivos

- `src/pages/Maintenance.tsx` — agregar campos, filtros de rango, atajos, botones de export, columna "Realizado".
- `src/lib/maintenanceReportPDF.ts` *(nuevo)* — generador del PDF agrupado por propietario, basado en `pdfFontHelper.ts` + `jspdf` (mismo patrón que `propertyReportPDF.ts`).
- `src/lib/maintenanceReportExport.ts` *(nuevo)* — export CSV simple.

## Resultado esperado

En el módulo Mantenimiento vas a poder:
1. **Cargar fechas** programada y de realización en cada ticket, además del costo real.
2. **Filtrar por rango "del 1 de marzo al 30 de abril"** con atajos.
3. **Exportar un PDF profesional por propietario** que se le puede mandar por WhatsApp/email mostrando todos los mantenimientos hechos en sus propiedades, con costos y totales — listo para rendir cuentas.

