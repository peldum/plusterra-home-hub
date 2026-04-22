
## Implementación recomendada: Depósito de garantía como cobro pendiente

Voy a implementar la opción completa y segura: el depósito de garantía dejará de ser un dato “suelto” del contrato y pasará a aparecer como un cobro real pendiente, separado del alquiler.

## Qué va a cambiar

### 1. Al crear o editar un inquilino desde Unidades

Cuando se cargue un contrato con **Depósito de garantía > 0**, el sistema va a crear automáticamente un cobro pendiente en `Control de Cobros`.

Ejemplo:

- Unidad: 7C
- Inquilino: Juan Pérez
- Depósito: Gs. 2.000.000

Se generará una fila nueva:

```text
Concepto: Depósito de garantía
Monto: Gs. 2.000.000
Estado: Pendiente
Vencimiento: fecha de inicio del contrato
Unidad: 7C
```

### 2. No se va a mezclar con el alquiler

El alquiler mensual sigue funcionando igual.

El depósito aparecerá como concepto aparte:

```text
Alquiler
Depósito de garantía
Canon
Expensas
Servicios
```

Esto evita confusión y evita que el depósito “infle” el alquiler del mes.

### 3. Al marcar el depósito como pagado

Cuando se marque como pagado desde Control de Cobros:

- pasa a estado **Pagado**
- genera automáticamente el ingreso financiero correspondiente
- queda visible en Finanzas
- aparece en Liquidación Mensual en la columna **Garantía / Llave Ing.**

Es decir:

```text
Contrato → Cobro pendiente → Pago confirmado → Finanzas / Liquidación
```

### 4. Evitar duplicados

Voy a cuidar que no se duplique el depósito.

La lógica será:

- si el contrato ya tiene un cobro de depósito generado, no crea otro
- si se edita el monto del depósito y todavía no fue pagado, actualiza el cobro pendiente
- si ya fue pagado, no lo pisa automáticamente para no alterar movimientos reales
- si se borra el depósito antes de cobrarlo, se podrá quitar o dejar en cero según el estado del cobro

### 5. Ajustes visuales en Control de Cobros

Voy a actualizar los textos para que se vea claro:

- agregar etiqueta **Depósito de garantía**
- permitir filtrar por ese concepto
- actualizar WhatsApp para que diga “depósito de garantía” y no sólo “alquiler”
- actualizar exportación PDF/CSV de cobros para incluir el concepto correctamente

### 6. Liquidación Mensual

No voy a romper la lógica actual.

La liquidación ya suma ingresos con categoría:

```text
deposito
garantia
llave_ingreso
```

Entonces voy a hacer que el pago generado desde el depósito use una categoría compatible, para que entre automáticamente en:

```text
Garantía / Llave Ing.
```

## Qué no voy a tocar

Para no romper lo que ya funciona:

- No cambio el cálculo del alquiler mensual.
- No cambio la generación mensual de alquileres.
- No cambio mantenimiento.
- No cambio cierre mensual.
- No cambio permisos ni roles salvo que sea estrictamente necesario.
- No mezclo depósito con comisión de administración.
- No hago que el depósito cuente como alquiler cobrado.

## Detalle técnico

### Backend

Voy a ajustar la función que genera o sincroniza cobros desde contratos para que contemple:

```text
contracts.deposit_amount → receivables.concept = 'deposito'
```

Con datos como:

```text
source_type: auto_contract_deposit
concept: deposito
description: Depósito de garantía — Unidad X
due_date: start_date del contrato
amount: deposit_amount
contract_id: contrato
property_id: propiedad
building_id: edificio
unit_code: unidad
```

También voy a ajustar el espejo automático de `receivables` a `payments` para que:

```text
concept = deposito → payments.category = deposito
```

Así Liquidación Mensual lo detecta sin cambios grandes.

### Frontend

Voy a actualizar:

- `QuickTenantDialog`
- `useBuildingReceivables`
- `useReceivables`
- `CollectionControlTab` de Finanzas
- `BuildingCollectionsTab`
- `ReceivableDetailDialog`
- `receivablesExport`

## Mensaje de WhatsApp para enviar al equipo

Podés enviarles este texto:

```text
Hola equipo, se agregó una mejora en el sistema:

Ahora cuando carguen un inquilino desde Unidades y completen el campo “Depósito de garantía”, ese monto ya no queda solo como dato del contrato.

El sistema lo va a mostrar automáticamente en Control de Cobros como un cobro separado del alquiler, con el concepto “Depósito de garantía”.

Cuando lo marquen como pagado, se registra en Finanzas y también aparece en la Liquidación Mensual en la columna “Garantía / Llave Ing.”.

Ruta para usarlo:
Administración / Edificios → entrar al edificio → Unidades → Agregar o editar inquilino → cargar Depósito de garantía.

Luego para cobrarlo:
Finanzas → Control de Cobros → filtrar o buscar la unidad/inquilino → marcar el depósito como pagado.

Importante: el depósito no se mezcla con el alquiler mensual, aparece separado para evitar confusiones.
```

## Pruebas que voy a hacer

1. Crear inquilino con depósito y verificar que aparece en Control de Cobros.
2. Confirmar que el alquiler sigue apareciendo separado.
3. Marcar el depósito como pagado.
4. Confirmar que se crea el ingreso en Finanzas.
5. Confirmar que aparece en Liquidación Mensual como Garantía / Llave Ing.
6. Editar un contrato y verificar que no se duplique el depósito.
7. Confirmar que contratos sin depósito siguen funcionando igual.
