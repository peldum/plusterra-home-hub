## Lo que vas a tener

En la pantalla **Administración → Edificios** (donde marcaste con rojo al lado de "Resumen Gerencial") aparece una **nueva pestaña: "Ganancia Plusterra"**.

Esta pestaña es un **consolidado mensual SOLO de lo que ganó Plusterra**, mostrado **propiedad por propiedad** (no por edificio como el Resumen Gerencial actual). Pensado para uso interno, para saber con claridad cuánto ganó la inmobiliaria en administración cada mes.

### Qué muestra la pantalla

Navegador de mes (← Marzo / Abril / Mayo →) y arriba 3 tarjetas resumen:
- **Total ganancia Plusterra** del mes (suma de todas las propiedades)
- **Total gastos imputados** (egresos caja Admin del mes)
- **Resultado neto** = Ganancia − Gastos

Abajo una **tabla con una fila por propiedad/unidad cobrada**:

| Edificio | Unidad | Código | % | Cobrado | Ganancia Plusterra | Gastos | Observación |
|---|---|---|---|---|---|---|---|
| Salto Grande IV | 4B | PLT-2026-0068 | 5% | ₲ 2.200.000 | ₲ 110.000 | ₲ 0 | _editable_ |
| ... | | | | | | | |
| **TOTAL** | | | | | **₲ X** | **₲ Y** | |

- El **% y Ganancia Plusterra** salen de la configuración de cada edificio (campo `admin_fee_internal_pct`, ya existe).
- La columna **Gastos** muestra cualquier egreso de **Caja Admin** del mes asociado a esa propiedad (campo `property_id` en `admin_cash_movements`, ya existe). Si querés imputar un Uber/taxi a una propiedad puntual, lo registrás desde "+ Movimiento (Caja Admin)" eligiendo la propiedad.
- La columna **Observación** es un input editable que se guarda automáticamente al salir del campo (debounce). Persiste por propiedad+mes.

### Botón "Exportar reporte PDF"

Genera un PDF interno tipo:

```text
PLUSTERRA — Ganancia Administración
Reporte mensual · Abril 2026

Edificio        Unidad   Código          %    Cobrado      Ganancia    Gastos    Observación
Salto Grande IV  4B      PLT-2026-0068   5%   2.200.000    110.000     0         Cliente abonó al día
...
TOTAL                                          X            Y           Z

Resumen del mes
  Total ganancia Plusterra:   ₲ Y
  − Gastos del mes:           ₲ Z
  RESULTADO NETO:             ₲ Y-Z

Observaciones generales: ...
```

### Cambios técnicos

1. **Migración DB** — nueva tabla `admin_property_observations`:
   - `property_id` (uuid, FK), `period` (text 'YYYY-MM'), `observation` (text), `created_by`, timestamps
   - Unique `(property_id, period)` para upsert
   - RLS: lectura/escritura para admin/superadmin/accounting/secretaria

2. **Nuevo hook** `src/hooks/useAdminPlusterraGains.ts`:
   - Query que junta `receivables` pagados del mes (concept = alquiler) + `properties` + `units` + `buildings` + `admin_cash_movements` agrupados por `property_id`.
   - Calcula `ganancia = collected * admin_fee_internal_pct / 100` por fila.

3. **Nuevo componente** `src/components/buildings/PlusterraGainsTab.tsx`:
   - Navegador de mes, 3 KPIs, tabla con observación inline editable (auto-save al blur).

4. **Nuevo PDF** `src/lib/plusterraGainsReportPDF.ts`:
   - Mismo motor (jsPDF + autoTable + Roboto base64) que el reporte mensual existente.

5. **Editar** `src/pages/BuildingDetailPage.tsx` (la pantalla "Propiedades en Administración"):
   - Agregar la 3ra pestaña `"Ganancia Plusterra"` al lado de "Resumen Gerencial".

6. **Editar** `src/components/buildings/AdminCashMovementDialog.tsx`:
   - Si hoy no tiene selector de propiedad, agregarlo (opcional) para poder imputar el gasto a una propiedad concreta.

### Lo que NO toco

- El Resumen Gerencial actual queda igual.
- Finanzas no se mezcla con esta caja (sigue todo separado, como acordamos).
- No cambia la lógica de comisiones/cobros existente.

---

¿Lo apruebo y lo implemento todo de una sola tanda?
