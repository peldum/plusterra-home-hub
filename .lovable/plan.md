## Rediseño del reporte "Ganancia Plusterra" con branding corporativo

### 1. PDF — `src/lib/plusterraGainsReportPDF.ts`

**Header con branding Plusterra (reemplaza el actual rojo plano):**
- Cargar el logo `/logo-plusterra-liquidacion.png` (mismo logo que ya usan los otros reportes oficiales) en la esquina superior izquierda usando el patrón `loadLogo` ya existente en `buildingLiquidationPDFModels.ts`.
- Banda superior con el **azul corporativo Plusterra `#003F7A`** (RGB `[0, 63, 122]`) detrás del título.
- Título en blanco sobre la banda azul: "PLUSTERRA — Ganancia Administración".
- Subtítulo: "Reporte interno · {mes}" + meta (generado por / fecha) en gris.
- Línea divisoria en color primario en lugar de gris plano.

**Tabla principal:**
- `headStyles.fillColor` cambia de rojo `[220,38,38]` → **azul Plusterra `[0,63,122]`** (consistente con el resto de reportes corporativos).
- Filas alternadas con `alternateRowStyles.fillColor: [240, 247, 255]` (celeste muy suave) para reforzar branding.
- Footer de la tabla en `[219, 234, 254]` (celeste claro) con texto azul oscuro.

**Resumen del mes (cambio clave solicitado):**
- Renombrar la fila final de "RESULTADO NETO" para que sea visualmente protagonista.
- **Si `totalGain - totalExpenses >= 0` (positivo):**
  - `fillColor: [219, 234, 254]` (celeste claro / sky-100)
  - `textColor: [21, 128, 61]` (verde 700)
  - texto: "RESULTADO NETO POSITIVO"
- **Si negativo:** mantener rojo actual con texto "RESULTADO NETO NEGATIVO".
- Aumentar tamaño de fuente de esa fila (12pt) para destacar.

**Footer del PDF:**
- Cambiar gris plano por azul Plusterra suave + ícono textual "Plusterra ®".

### 2. UI — `src/components/buildings/PlusterraGainsTab.tsx`

**Reemplazar el ícono `Sparkles` por un símbolo de dinero/ganancia:**
- Cambiar `Sparkles` por **`Coins`** de lucide-react (moneditas apiladas — representa ganancia y dinero, encaja con el branding del módulo).
- Mantener el color `text-primary` (azul Plusterra).
- Aplicar el mismo cambio en el badge/etiqueta de la pestaña dentro de `src/pages/Buildings.tsx` para que el tab "Ganancia Plusterra" también muestre `Coins` en lugar de `Sparkles` (consistencia visual).

**Card "Resultado neto del mes" (refuerzo visual cuando es positivo):**
- Cuando `data.netResult >= 0`: cambiar el fondo a **`bg-sky-100`** (celeste claro) con borde `border-sky-300`, y el monto en **verde `text-emerald-700`** + ícono `TrendingUp` verde — para que coincida con la lógica del PDF (positivo = verde sobre celeste).
- Cuando es negativo: se mantiene el rojo actual.

**Footer de la tabla — fila TOTAL:**
- Si neto positivo: aplicar `bg-sky-100` con texto neto en verde `text-emerald-700 font-bold`, para reflejar el mismo tratamiento del PDF en la app.

### Detalle técnico (sin tocar el resto)

- El logo se carga de forma asíncrona; convertir `generatePlusterraGainsReportPDF` en `async` (ya está siendo usado con `await` desde `handleExport`, así que no hay cambios en el llamador).
- Reusar la función `loadLogo` copiándola localmente (no se exporta desde el archivo de liquidación) — pequeño helper privado en este mismo archivo.
- No se modifica la estructura de datos, RLS, ni la migración existente.
- No se rompe nada del flujo actual de exportación: el botón sigue siendo el mismo y la firma pública del PDF no cambia más allá de pasar a `async`.

### Archivos a editar
- `src/lib/plusterraGainsReportPDF.ts` (rediseño completo de estilos + logo)
- `src/components/buildings/PlusterraGainsTab.tsx` (ícono `Coins` + tarjeta neto + total verde sobre celeste cuando positivo)
- `src/pages/Buildings.tsx` (cambiar ícono del tab `Ganancia Plusterra` de `Sparkles` a `Coins`)
