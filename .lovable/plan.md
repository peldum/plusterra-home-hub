
Sí, se entiende: quieren que en **Administración → Liquidación Mensual** también se vea claramente qué unidades están en mora, igual que en **Control de Cobros**, para poder cotejar la liquidación sin tener que cambiar de pestaña.

## Objetivo

Agregar visibilidad de **mora por unidad** dentro de la pestaña **Liquidación Mensual**, tomando como referencia los mismos datos que ya se cargan en **Control de Cobros**:

- Estado de pago.
- Días de mora.
- Monto de mora.
- Si está pendiente, vencido, parcial o pagado.
- Si la mora está exonerada.

## Cambio principal en Liquidación Mensual

Hoy la liquidación muestra la columna **Mora** principalmente cuando hay un monto cargado.

Voy a ajustarlo para que también se refleje cuando una unidad está en mora por días o estado, aunque el monto de mora todavía no se haya cargado.

Ejemplo esperado:

```text
Unidad: 3B
Estado: En mora · 15d
Alquiler: (₲ 3.500.000)
Mora: ₲ 150.000
```

Y si tiene días de mora pero todavía no tiene monto:

```text
Unidad: 3B
Estado: En mora · 15d
Mora: 15 días · sin monto
```

## Cómo se verá en la tabla

En **Liquidación Mensual** voy a reforzar dos lugares:

### 1. Columna Estado

Actualmente muestra algo como:

```text
Pendiente
Pagado
Parcial
```

Se va a mejorar para que cuando corresponda se vea:

```text
En mora · 10d
```

con una etiqueta roja o resaltada, similar a Control de Cobros.

### 2. Columna Mora

La columna **Mora** se mostrará si existe cualquiera de estas condiciones:

- `mora_amount > 0`
- `mora_days > 0`
- estado del cobro = `overdue`

Así no se oculta la mora cuando todavía no se cargó un monto manual.

## Resumen superior

En las tarjetas/resumen de Liquidación Mensual agregaré o ajustaré un indicador claro:

```text
Unidades en mora: 10
Total mora: ₲ xxx.xxx
```

Esto servirá para comparar rápidamente con Control de Cobros.

## Vista agrupada por propietario

Cuando se active **Agrupar por propietario**, también se reflejará la mora:

```text
Propietario: Gregorio Luzco
Unidades: 3
En mora: 2
Total mora: ₲ 300.000
```

Y al desplegar el propietario, cada unidad mostrará su estado de mora individual.

## Reportes PDF / Excel

Voy a revisar los reportes generados desde Liquidación Mensual para que también puedan reflejar la mora de forma consistente.

Especialmente:

- Consolidado mensual.
- Reporte propietario.
- Reporte Plusterra.
- Excel/CSV si corresponde.

La idea es que el informe permita cotejar:

```text
Unidad
Propietario
Estado de cobro
Días de mora
Monto mora
```

sin depender únicamente de la pantalla Control de Cobros.

## Importante

No se va a cambiar la lógica financiera de la liquidación.

Es decir:

- No se va a cobrar ni descontar nada nuevo automáticamente.
- No se va a modificar la fórmula de pago al propietario.
- No se va a cambiar cómo funciona Control de Cobros.
- Solo se va a hacer visible la información de mora dentro de Liquidación Mensual.

## Archivos a revisar/modificar

- `src/hooks/useBuildingLiquidation.ts`
- `src/pages/BuildingDetailPage.tsx`
- `src/components/buildings/LiquidationExportPanel.tsx`
- `src/lib/buildingLiquidationPDF.ts`
- `src/lib/buildingLiquidationPDFModels.ts`
- Posiblemente `src/lib/buildingExport.ts` para Excel/CSV

## Resultado esperado

Después del cambio:

- En **Control de Cobros** seguirá viéndose la mora como ahora.
- En **Liquidación Mensual** también se verá qué unidades están en mora.
- Si hay días de mora pero no monto, igual se mostrará la advertencia.
- Será más fácil cotejar datos entre ambas pestañas.
- Los reportes quedarán más claros y profesionales.
- No se alteran cálculos existentes de alquiler, expensas, ANDE, comisión ni pago final.
