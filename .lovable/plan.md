

## Análisis

Tu jefa pide que **TODOS los inputs de precios/montos en el sistema** se comporten igual:
1. **Sin "0" por defecto** → mostrar vacío (con `0` solo como placeholder gris).
2. **Formato con puntos automáticos** mientras se escribe (ej: tipear `10000` → ver `10.000`).
3. **Sin flechitas** de spinner del navegador.

Hoy hay **inconsistencia total**: algunos campos usan `MontoInputValidado` (que ya formatea bien con puntos), otros usan `<input type="number">` que muestra `0`, no formatea, y muestra flechitas.

## Solución

Crear **un único componente reutilizable** `MoneyInput` (basado en la lógica ya existente de `MontoInputValidado`) que:
- Es `type="text"` con `inputMode="numeric"` (teclado numérico en mobile, sin spinners).
- Filtra cualquier carácter no numérico al tipear.
- **Formatea con puntos en tiempo real** (`10000` → `10.000`) usando `Intl.NumberFormat('es-PY')`.
- Inicia **vacío**; muestra `0` solo como placeholder gris.
- Compatible con `value={number | string | ''}` y `onChange(value: number | '')`.
- Acepta props opcionales: `currency` (Gs./USD para mostrar prefijo), `min`, `max`, `disabled`, `className`.

## Lugares a reemplazar (10 archivos detectados)

Solo campos **monetarios** (no cantidades como pisos, baños, área, %, orden):

| Archivo | Campos |
|---|---|
| `src/pages/Maintenance.tsx` | Costo Estimado (alta + edición) |
| `src/components/contracts/ContractGeneratorDialog.tsx` | Alquiler, Expensas, Depósito |
| `src/components/contracts/ContractFormWizard.tsx` | Monto Total, Mensual, Depósito |
| `src/components/agents/AgentFormDialog.tsx` | Canon mensual |
| `src/components/secretaria/NuevoMovimientoDialog.tsx` | Monto |
| `src/pages/PrivatePropertiesPage.tsx` | Alquiler, Venta |
| `src/components/properties/PropertyFormDialog.tsx` | Precio Alquiler, Precio Venta, Precio Cochera |
| `src/components/properties/PropertyFilterDrawer.tsx` | Precio mín/máx |
| `src/components/finances/ReceivableDetailDialog.tsx` | Mora manual, Descuento |
| `src/pages/MisMetasPage.tsx` | Meta de comisión, Meta de ingreso |
| `src/pages/portal/PortalListings.tsx` y `PortalHome.tsx` | Filtros precio mín/máx |

**Refactor de `MontoInputValidado`**: lo actualizo para que internamente formatee con puntos también (hoy guarda solo dígitos, pero no muestra los puntos al usuario). Así el componente queda 100% alineado y los formularios que ya lo usan (Comisiones, Canon, Egresos) **automáticamente heredan** el formato con puntos sin tocar más código.

## Detalles técnicos

- **Almacenamiento interno**: el state sigue siendo el número crudo (sin puntos), para no romper inserts/updates a la base de datos.
- **Visualización**: en cada `onChange` se limpia con `replace(/\D/g, '')` y al renderizar se aplica `Number(value).toLocaleString('es-PY')`.
- **Cursor**: mantengo el cursor al final tras formatear (suficiente para el caso típico de tipeo continuo; no hay edición a mitad).
- **CSS**: ya hay clase `[&::-webkit-inner-spin-button]:appearance-none` en algunos lados — la incorporo al `MoneyInput` para que **nunca aparezcan flechitas**.

## Resultado esperado

En **Mantenimiento → Nuevo Ticket → Costo Estimado**:
- Antes: campo con `0` precargado, flechitas, sin formato.
- Después: campo vacío con placeholder gris `0`. Tipeás `1500000` y ves `1.500.000`. Sin flechitas. Mismo comportamiento en TODO el sistema (Contratos, Comisiones, Propiedades, Cánones, Filtros, Metas, etc.).

