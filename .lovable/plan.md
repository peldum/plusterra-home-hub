## Resumen

Tres mejoras al módulo de **Administración de edificios**, sin tocar Finanzas (que sigue siendo otra caja totalmente aparte):

1. **Limpiar la columna "Unidad"** en Control de Cobros (los códigos PLT-2026-XXXX se ven mal apilados verticalmente).
2. **Caja de Administración independiente**: nueva tabla `admin_cash_movements` para registrar **ingresos y egresos propios** de la operación de Administración (uber, taxis, viáticos, ingresos varios). No tocan Finanzas.
3. **Reporte general mensual exportable** desde Resumen Gerencial: tabla con todos los edificios + ganancia por edificio + observación editable por edificio + totales del mes (ingresos − egresos de la caja Admin) + exportación a PDF.

---

## 1. UX de la columna "Unidad" en Control de Cobros

**Problema:** hoy se ve apilado en 3 líneas (`PLT-2026-0068` arriba, `1B` al medio, `5-15` abajo) → poco profesional.

**Solución:**
- Una sola línea principal: el código de unidad grande (`1B`, `2C`, `3A`…) en bold + el badge `PLT-2026-0068` chiquito al lado, en gris claro.
- El rango de días de pago (5-15) y `PREPAGO` se quedan abajo como badges secundarios.
- Resultado visual:
  ```text
  1B  [PLT-2026-0068]
  [5-15]
  ```
  Compacto, prolijo, alineado horizontalmente.

**Archivo:** `src/components/buildings/CollectionControlTab.tsx` (celda Unidad, líneas ~486-524).

---

## 2. Caja de Administración independiente

### Concepto
La caja de Administración registra movimientos **operativos propios** del área (gastos de movilidad, materiales, ingresos eventuales, etc.). **No se mezcla con Finanzas** ni con `payments`. Es una contabilidad paralela exclusiva del módulo Administración.

### Cambios de base de datos
Nueva tabla `admin_cash_movements`:

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid | PK |
| `movement_type` | text | `'ingreso'` \| `'egreso'` |
| `amount` | numeric | Monto en Gs. |
| `description` | text | Concepto (ej: "Uber a edificio Salto Grande") |
| `category` | text | `'movilidad'`, `'materiales'`, `'viaticos'`, `'ingreso_vario'`, `'otro'` |
| `building_id` | uuid (nullable) | Edificio asociado opcional |
| `movement_date` | date | Fecha contable |
| `period` | text | `'YYYY-MM'` (auto desde fecha) |
| `notes` | text | Observación adicional |
| `created_by` | uuid | |
| `created_at` / `updated_at` | timestamp | |

**RLS:** mismo patrón que `building_expenses` → SuperAdmin/Admin/Gerente(accounting)/Secretaría tienen acceso completo. Agentes y auditores no ven nada.

### Cambios en UI
En la pestaña **Resumen Gerencial** (componente `AdminSummaryDashboard.tsx`):

- **Reemplazar** la tarjeta actual "Egresos Admin" (que hoy lee de `payments`) por **dos tarjetas nuevas** alimentadas de `admin_cash_movements`:
  - 🟢 **Ingresos Admin** del mes
  - 🔴 **Egresos Admin** del mes
- **Recalcular "Resultado Admin"**: `Comisión + IVA + Ingresos caja Admin − Egresos caja Admin`.
- Botón **"+ Movimiento"** al lado del navegador de mes que abre un diálogo con: tipo (ingreso/egreso), monto, categoría, fecha, edificio (opcional), descripción, notas.
- Tabla pequeña abajo "Movimientos del mes" con lista, edición y borrado (solo SuperAdmin/Admin).

### Hook nuevo
`src/hooks/useAdminCashMovements.ts` con `useQuery` por período + mutaciones create/update/delete.

---

## 3. Reporte general mensual con observaciones (exportable PDF)

### En Resumen Gerencial
Botón **"📄 Exportar reporte mensual"** arriba a la derecha (junto al navegador de mes).

### Flujo del diálogo
Al hacer clic abre un diálogo con:

1. Tabla pre-llenada: una fila por edificio con columnas
   `Edificio | Cobrado | Comisión | Ganancia Plusterra | Pagados/Total`
2. Junto a cada fila, un campo de texto **"Observación del edificio"** (ej: "Cliente del 4B abonó con atraso", "Reparación en escalera del 2do piso").
3. Resumen al pie:
   - Total Ingresos del mes (cobranzas + ingresos caja Admin)
   - Total Egresos del mes (caja Admin)
   - **Resultado neto del mes**
4. Campo "Observaciones generales del mes" (texto libre).
5. Botón **"Generar PDF"**.

### PDF generado
Documento corporativo Plusterra (Roboto, branding consistente):
- Encabezado con logo + período (ej: "Reporte de Administración — Abril 2026")
- Tabla de edificios con observaciones inline
- Sección "Movimientos de Caja Administración" con detalle de ingresos/egresos
- Cuadro final de totales (Ingresos / Egresos / Resultado)
- Observaciones generales abajo
- Pie con firma "Generado el [fecha] por [usuario]"

### Persistencia de observaciones
Las observaciones por edificio se guardan en una tabla nueva `admin_monthly_observations`:

| Campo | Tipo |
|---|---|
| `id` | uuid |
| `building_id` | uuid |
| `period` | text (`YYYY-MM`) |
| `observation` | text |
| `general_note` | text (solo en filas con `building_id = null` para nota general del mes) |
| `created_by` / `updated_at` | |

UNIQUE(`building_id`, `period`) para upsert. Así al volver a abrir el diálogo de exportación el mes siguiente, las observaciones quedan guardadas.

### Archivos
- `src/components/buildings/AdminMonthlyReportDialog.tsx` — diálogo nuevo
- `src/lib/adminMonthlyReportPDF.ts` — generador PDF (sigue patrón Roboto base64)
- `src/hooks/useAdminMonthlyObservations.ts` — hook de persistencia
- Modificación menor en `AdminSummaryDashboard.tsx` para integrar el botón

---

## Detalles técnicos

**Migraciones SQL:**
```sql
-- Caja Administración
CREATE TABLE public.admin_cash_movements (
  id uuid PK DEFAULT gen_random_uuid(),
  movement_type text NOT NULL CHECK (movement_type IN ('ingreso','egreso')),
  amount numeric NOT NULL CHECK (amount > 0),
  description text NOT NULL,
  category text NOT NULL DEFAULT 'otro',
  building_id uuid REFERENCES buildings(id) ON DELETE SET NULL,
  movement_date date NOT NULL DEFAULT CURRENT_DATE,
  period text GENERATED ALWAYS AS (to_char(movement_date,'YYYY-MM')) STORED,
  notes text,
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE admin_cash_movements ENABLE RLS;
-- Policies: admin/superadmin/accounting/secretaria full access

-- Observaciones mensuales por edificio
CREATE TABLE public.admin_monthly_observations (
  id uuid PK DEFAULT gen_random_uuid(),
  building_id uuid REFERENCES buildings(id) ON DELETE CASCADE,
  period text NOT NULL,
  observation text,
  general_note text,
  created_by uuid NOT NULL,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(building_id, period)
);
ALTER TABLE admin_monthly_observations ENABLE RLS;
-- Mismas policies admin-like
```

**Patrones a respetar (memoria del proyecto):**
- `MoneyInput` en todos los montos (formato dot-thousands).
- Toast Sonner top-center 2.5s.
- PDF con Roboto base64 desde `src/lib/pdfFonts.ts`.
- `modal={false}` en Selects dentro de Dialogs.

---

## Lo que NO se toca
- Finanzas, `payments`, `audit_financiero`, comisiones de agentes, canon, receivables.
- La caja de Administración es 100% independiente y no se mezcla con la contabilidad general de Plusterra.

---

## ¿Aprobás este plan?
Una vez aprobado, ejecuto las migraciones y creo todos los componentes en una sola tanda.