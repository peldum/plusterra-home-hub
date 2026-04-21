

## Aclaración + ajustes en Mantenimiento

### Por qué el 7C parece "duplicado" (no lo está)

Revisé la base de datos y **el 7C NO está duplicado**. Existe:

- **1 ticket** en Mantenimiento: 7C Salto VI · Gs. 77.000 · Completado
- **1 egreso** en Finanzas: mismo monto, generado automáticamente al marcar el ticket como completado (con la opción "Registrar como egreso en Finanzas" tildada)

Es **el mismo movimiento mostrado en dos módulos**:
- Mantenimiento lo muestra como "trabajo realizado"
- Finanzas lo muestra como "egreso real de caja"

El badge verde "En Finanzas" justamente indica que ya está reflejado allí. **El total de Mantenimiento (Gs. 837.220) y el total de Egresos de Finanzas son listas independientes — el sistema no los suma entre sí**, así que no hay doble conteo en ningún reporte.

Los otros tickets del listado (3B ANGRA, Emisión Factura 7C IV, ANDE 6C, Descuento luz 1A) tienen monto en gris con "(EST.)" porque están marcados como completados pero **nunca pasaron por el diálogo "Marcar Completado"** que es el que genera el egreso. Quedaron sólo con costo estimado y por eso no figuran en Finanzas.

### Por qué hay "Costo Estimado" Y "Costo Real"

El campo doble viene de un flujo viejo:
- **Costo Estimado**: presupuesto inicial cuando se abre el ticket
- **Costo Real**: lo que efectivamente se pagó al completarlo

Hoy esto ya no aporta valor porque:
- El total del header usa `actual_cost ?? estimated_cost` (cae al estimado si no hay real)
- Genera confusión (la captura del 7C IV lo muestra: estimado 115.000, real 0)
- El nuevo diálogo "Marcar Completado" ya pide directamente el costo real

### Cambios propuestos

**1. Unificar a un único campo "Costo" en el formulario de Editar Ticket**
- Archivo: `src/pages/Maintenance.tsx`
- Quitar el doble campo Estimado/Real del diálogo "Editar Ticket".
- Mostrar un único campo **"Costo"** que escribe en `actual_cost`. Si el ticket viejo sólo tiene `estimated_cost`, se precarga ese valor en el campo único (migración silenciosa al editar).
- Mismo cambio en el diálogo "Nuevo Ticket": un solo campo "Costo estimado / real" opcional.

**2. Mantener `estimated_cost` en BD por compatibilidad**
- No se borra la columna ni los datos históricos.
- La lógica de visualización sigue priorizando `actual_cost`, y si no existe usa `estimated_cost` (los tickets viejos siguen mostrándose bien).
- El badge "(EST.)" se mantiene para que se distingan los tickets viejos que sólo tienen estimado.

**3. Aclarar visualmente la relación con Finanzas**
- En el header de Mantenimiento, junto al total, agregar una nota chica:
  > *"Total operativo. Los tickets con badge 'En Finanzas' ya están reflejados como egresos en el módulo Finanzas — no se suman dos veces."*
- En el tooltip del badge "En Finanzas" reforzar: *"Este monto ya figura en Finanzas → Egresos. No se duplica al sumar reportes."*

**4. Ofrecer acción rápida "Registrar en Finanzas" para tickets completados sin egreso**
- Para tickets como "Emisión Factura 7C IV" (completado, con costo, sin badge En Finanzas), agregar en el menú de acciones (⋮) la opción **"Registrar egreso en Finanzas"** que abre el diálogo CompleteTicketDialog con el costo precargado, para que el usuario pueda generar el egreso retroactivo si quiere.

### Archivos a tocar

- `src/pages/Maintenance.tsx` (formularios Nuevo/Editar + nota header + opción nueva en menú)
- `src/components/maintenance/CompleteTicketDialog.tsx` (soporte para abrirse en modo "registrar egreso de ticket ya completado")

### Lo que NO se toca

- Sin cambios en BD (la columna `estimated_cost` se preserva)
- Sin cambios en el cálculo de Finanzas, Cierre Mensual ni reportes
- Sin cambios en RLS ni permisos

### Resultado esperado

- El usuario ve **un solo campo "Costo"** al editar tickets, sin la dualidad estimado/real que confunde.
- Queda claro en pantalla que Mantenimiento y Finanzas **no se duplican**, son dos vistas del mismo egreso.
- Los tickets viejos sin egreso pueden registrarse en Finanzas con un click desde el menú.

