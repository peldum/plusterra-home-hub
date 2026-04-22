
## Ajuste: Depósito de garantía en Administración y Consolidado Mensual

Sí: el depósito de garantía debe vivir en **Administración**, no en Finanzas de Secretaría.

La lógica correcta para explicarlo internamente sería:

```text
Depósito de garantía de inquilino
= Fondo administrado por Administración / propietario / contrato
≠ Ingreso comercial de Secretaría
≠ Ganancia propia de Plusterra
```

Pero dentro de **Administración**, sí debe verse y sumar correctamente en los reportes operativos cuando corresponda.

## Qué se va a ajustar

### 1. Control de Cobros: agregar columna de Depósito / Garantía

En:

```text
Edificios → Angra → Control de Cobros
```

voy a agregar una columna visible:

```text
Depósito / Garantía
```

Para cada unidad va a mostrar:

```text
Sin depósito
Depósito pendiente: ₲ xxx
Depósito cobrado: ₲ xxx
```

Y si está pendiente, tendrá acción para registrar el pago desde ahí.

Ejemplo:

```text
Unidad 2C | Alquiler | Expensas | ANDE | Depósito/Garantía ₲ 550.000 pendiente
```

### 2. Usar el cobro ya generado por contrato

No hace falta crear una estructura nueva porque el sistema ya genera el depósito como:

```text
receivables.concept = deposito
source_type = auto_contract_deposit
building_id = edificio
unit_code = unidad
```

El ajuste será de visualización y flujo: hoy existe, pero no está suficientemente visible en el Control de Cobros principal.

### 3. Al registrar el pago del depósito

Cuando se registre el pago desde Control de Cobros:

```text
Depósito pasa a pagado
Se guarda fecha de pago
Se guarda método de pago
Se genera movimiento automático en Administración
```

Categoría:

```text
deposito
```

Unidad de negocio:

```text
administracion
```

### 4. Consolidado Mensual: sumar garantía cuando esté cobrada

En el **Consolidado Mensual** de Administración, el depósito debe reflejarse en la columna existente o ajustada:

```text
Garantía / Llave de ingreso
```

La fórmula del reporte quedará clara:

```text
Alquiler cobrado
+ Mora
- Expensas
- Comisión administración
- Gastos / mantenimiento
+ Depósito de garantía cobrado
= Neto / Total administrado
```

Importante: el depósito debe sumar como **fondo administrado**, no como comisión ni ingreso propio de Plusterra.

### 5. Corregir el cálculo de “Otros Ingresos”

Voy a revisar y ajustar el cálculo para que “Otros Ingresos” no mezcle conceptos incorrectamente.

Debe mostrar únicamente cargos especiales como:

```text
Depósito de garantía
Llave de ingreso
Garantía
Otros cargos administrativos
```

No debe duplicar alquileres si el alquiler ya está mostrado en su propia columna.

### 6. Reportes PDF y Excel

El botón que marcaste:

```text
Consolidado Mensual
```

debe exportar también esa información.

Voy a verificar/ajustar:

```text
PDF Consolidado Mensual
Reporte Propietario
Reporte Plusterra
Excel Resumen General
Excel Por Propietario
```

Para que todos respeten la misma lógica:

```text
Depósito cobrado → aparece y suma
Depósito pendiente → aparece como pendiente o informativo, pero no suma como cobrado
```

### 7. Texto aclaratorio para la gerente

Agregaré una aclaración breve en Administración:

```text
Los depósitos y garantías son fondos administrados del contrato. Se muestran en Control de Cobros y Liquidación Mensual, pero no forman parte del ingreso comercial de Secretaría ni de la comisión de Plusterra.
```

## Resultado esperado

Después del ajuste, para Angra la gerente debería poder ver:

```text
Control de Cobros → Unidad 2C → Depósito de garantía ₲ 550.000
```

Y cuando se marque como cobrado:

```text
Liquidación / Consolidado Mensual → Garantía / Llave ingreso ₲ 550.000
```

Sin que eso aparezca en el Consolidado Comercial de Finanzas de Secretaría.

## Archivos principales a tocar

```text
src/components/buildings/CollectionControlTab.tsx
src/hooks/useBuildingReceivables.ts
src/hooks/useBuildingLiquidation.ts
src/pages/BuildingDetailPage.tsx
src/lib/buildingLiquidationPDF.ts
src/lib/buildingLiquidationPDFModels.ts
src/lib/buildingExport.ts
```

No debería hacer falta una migración nueva de base de datos, porque el depósito ya existe como cobro generado desde contrato.
