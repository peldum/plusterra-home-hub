
Voy a agregar el **código de la propiedad** en Control de Cobros para que cuando un propietario tenga inmuebles dispersos o nombres parecidos, se puedan diferenciar claramente sin depender solo del nombre.

## Cambio propuesto

En la tabla de **Administración → Control de Cobros**, donde hoy se ve algo como:

```text
Monoambiente
Edificio Wiessen
```

pasará a verse con una identificación adicional:

```text
Monoambiente
Edificio Wiessen
Cód. PROP-000123
```

o en formato compacto:

```text
Monoambiente Edificio Wiessen
PROP-000123
```

El código se mostrará como una etiqueta chica, prolija y legible debajo del nombre/unidad.

## Por qué esto resuelve el problema

Cuando un propietario como **LUZKO** tiene propiedades dispersas o varias propiedades con nombres similares, el usuario podrá distinguirlas por el código único de propiedad.

Ejemplo:

```text
Monoambiente Edificio Wiessen
Cód. PROP-0012

Monoambiente Edificio Wiessen
Cód. PROP-0048
```

Así no se confunden aunque el nombre sea casi igual.

## Dónde lo voy a aplicar

### 1. Control de Cobros

En la columna donde aparece la unidad/nombre, agregaré el código de propiedad debajo.

También mantendré visible el rango de pago, prepago y demás indicadores actuales, sin romper la tabla.

### 2. Datos que ya existen

No hace falta crear campos nuevos en la base de datos porque el sistema ya tiene `property_code`.

Solo hay que pasar ese dato correctamente al componente de Control de Cobros.

### 3. Reportes / liquidación

Voy a revisar que los reportes que usan esas mismas líneas puedan mostrar también el código cuando sea útil, especialmente donde hoy aparece solo la unidad. La idea es que el informe también sea claro si hay nombres similares.

Ejemplo en reporte:

```text
Unidad: Monoambiente Edificio Wiessen
Código propiedad: PROP-0012
```

## Cuidado con el diseño

No voy a agrandar innecesariamente la tabla ni romper la vista en PC.

El código se verá como una etiqueta secundaria, por ejemplo:

```text
PROP-0012
```

con estilo discreto, tipo `badge`, debajo del nombre.

## Archivos a tocar

- `src/hooks/useBuildingDetail.ts`
- `src/components/buildings/CollectionControlTab.tsx`
- Posiblemente `src/components/buildings/LiquidationExportPanel.tsx`
- Posiblemente `src/pages/BuildingDetailPage.tsx`
- Posiblemente los generadores PDF si corresponde mostrar el código en reportes

## Resultado esperado

Después del cambio:

- En Control de Cobros se podrá diferenciar cada propiedad aunque tenga nombre parecido.
- Propietarios con varias propiedades dispersas serán más fáciles de administrar.
- No se altera la lógica de cobros, pagos, mora, ANDE, expensas ni liquidaciones.
- El sistema seguirá ordenando las unidades como ya se ajustó antes.
