
Objetivo: separar Finanzas en dos unidades reales e independientes:

```text
Finanzas de Secretaría
= Canon agentes + 15% comisiones comerciales + recuperos/ingresos propios de secretaría - egresos de secretaría

Finanzas de Administración
= Comisión administración + IVA recuperado - egresos de administración

Importante:
Alquiler cobrado a inquilinos NO es ingreso de Plusterra.
Es dinero de terceros que pasa por la administración y luego se liquida al propietario.
```

## 1. Reestructurar el módulo Finanzas actual como “Finanzas de Secretaría”

Voy a ajustar `/finanzas` para que deje de mezclar Administración.

Quedaría así:

- Título: `Finanzas de Secretaría`
- Subtítulo: actividad comercial, agentes, cánones y egresos operativos de Secretaría.
- Mantener:
  - `Resumen Secretaría`
  - `Canon Agentes`
  - `Comisiones Alquileres y Ventas`
  - `Consolidado Comercial`
  - `Egresos Secretaría`
  - `Cierre Mensual` si aplica por rol
- Sacar de este módulo:
  - `Com. Administración`
  - cualquier suma de comisión de edificios
  - cualquier IVA o ingreso de administración

Resultado: cuando los jefes miren el consolidado comercial, no van a ver Administración mezclada.

## 2. Cambiar la fórmula del resumen financiero de Secretaría

Hoy el resumen general todavía suma ingresos de administración dentro de “caja real”.

Lo voy a cambiar a:

```text
Ingresos Secretaría =
  15% Plusterra sobre comisiones de alquileres/ventas
+ canon mensual de agentes
+ otros ingresos manuales clasificados como Secretaría

Egresos Secretaría =
  solo pagos/egresos clasificados como Secretaría

Resultado Secretaría =
  Ingresos Secretaría - Egresos Secretaría
```

También ajustaré textos para que no diga “Ingresos por administración” dentro de Finanzas de Secretaría.

## 3. Clasificar egresos por unidad de negocio

Para poder separar bien los gastos, hace falta que cada egreso diga a qué unidad pertenece:

- Secretaría
- Administración

Haré una migración agregando a `payments` un campo tipo:

```text
business_unit: secretaria | administracion
```

Regla inicial para no romper datos existentes:

- Egresos ya existentes: quedarán como `secretaria` por defecto, salvo los que claramente sean mantenimiento ligado a propiedad/edificio, que se podrán mostrar como Administración si tienen `property_id`.
- Nuevos egresos: el usuario deberá indicar si son de Secretaría o Administración.
- Ingresos comerciales/canon: Secretaría.
- Egresos de mantenimiento generados desde tickets: Administración si están ligados a una propiedad administrada.

No voy a borrar datos históricos. Solo se van a clasificar para que los reportes no se mezclen.

## 4. Actualizar el formulario de egresos

En `Registrar Egreso` agregaré un selector claro:

```text
Unidad de negocio:
[ Secretaría ] [ Administración ]
```

Si el egreso se carga desde Finanzas de Secretaría, vendrá preseleccionado `Secretaría`.

Si el egreso se carga desde Administración/Edificios, vendrá preseleccionado `Administración`.

Esto evita que alguien cargue, por ejemplo, un gasto de edificio dentro del resultado comercial.

## 5. Mover la lógica financiera de Administración al módulo Edificios

La parte de `Comisiones Administración` saldrá de `/finanzas`.

La voy a integrar dentro del módulo `Edificios / Administración`, usando el dashboard que ya existe ahí.

Nuevo bloque dentro de Administración:

```text
Resultado de Administración
```

Con tarjetas como:

- Alquiler cobrado / gestionado
  - Etiqueta: `Fondos de terceros, no ingreso de Plusterra`
- Comisión Administración Plusterra
  - usando el porcentaje real configurado por edificio
- IVA recuperado
- Egresos Administración
- Resultado Administración

Fórmula:

```text
Resultado Administración =
  Comisión Plusterra de administración
+ IVA recuperado
- Egresos de administración
```

## 6. Eliminar etiquetas fijas tipo 5% / 8% cuando no correspondan

Hay lugares donde hoy se muestran textos como:

```text
Comisión Admin (8%)
Plusterra 5%
Glosker 3%
```

Eso puede estar mal si cada edificio tiene otra configuración.

Voy a reemplazarlo por etiquetas dinámicas:

```text
Comisión Admin configurada
Parte Plusterra configurada
Parte empresa externa configurada
```

Y cuando se muestre el porcentaje, tomará el valor real del edificio:

```text
Comisión Admin 7%
Plusterra 5%
Empresa externa 2%
```

Si no hay empresa externa, no se mostrará Glosker/tercero.

## 7. Reforzar visualmente que el alquiler cobrado no es ingreso

En Administración, el alquiler cobrado aparecerá como volumen administrado o fondos gestionados, no como ganancia.

Ejemplo visual:

```text
Alquiler cobrado: ₲ 30.000.000
Fondos de terceros. No suma como ingreso de Plusterra.

Ingreso real Plusterra:
Comisión administración: ₲ 1.500.000
IVA recuperado: ₲ 75.000
```

Esto ayuda a explicar a los jefes que hay diferencia entre flujo de dinero y rentabilidad real.

## 8. IVA recuperado

Actualmente hay base parcial para IVA en control de cobros (`iva_check`, `iva_amount`).

Voy a ordenar el cálculo así:

- Si una unidad tiene IVA marcado en el control de cobros, se usa ese `iva_amount`.
- Si no tiene IVA marcado, no se suma IVA recuperado.
- En el resumen de Administración se mostrará separado:
  - Comisión administración
  - IVA recuperado
  - Total ingreso administración

Esto evita asumir automáticamente IVA para todos los edificios/unidades si no corresponde.

## 9. Ajustar reportes y exportaciones

Voy a revisar los reportes afectados para que respeten la separación:

- Consolidado Comercial:
  - solo operaciones comerciales de agentes
  - 15% Plusterra
  - canon si corresponde en resumen/cierre
  - sin administración de edificios

- Cierre Mensual de Finanzas:
  - debe quedar orientado a Secretaría/comercial
  - no mezclar comisiones de administración

- Dashboard Administración:
  - debe mostrar su propio resultado financiero
  - no alimentar el consolidado comercial

## 10. Archivos principales a tocar

- `src/pages/Finances.tsx`
  - convertirlo funcionalmente en Finanzas de Secretaría
  - remover administración del cálculo general
  - sacar pestaña de Comisiones Administración

- `src/components/finances/EgresosTab.tsx`
  - filtrar egresos por unidad de negocio
  - mostrar solo Secretaría dentro de Finanzas

- `src/components/finances/ExpenseFormDialog.tsx`
  - agregar selector de unidad de negocio
  - permitir preselección según módulo

- `src/components/finances/AdminCommissionsTab.tsx`
  - dejar de usarlo dentro de Finanzas
  - reutilizar o migrar lógica hacia Administración

- `src/components/buildings/AdminSummaryDashboard.tsx`
  - crear el bloque Resultado Administración
  - sumar comisión + IVA recuperado - egresos administración
  - reemplazar porcentajes fijos por porcentajes reales

- `src/components/buildings/BuildingAdminConfig.tsx`
  - reforzar configuración de comisión por edificio
  - aclarar parte Plusterra / tercero / total

- `src/components/maintenance/CompleteTicketDialog.tsx`
  - cuando genera egreso desde mantenimiento, clasificarlo como Administración

- Migración de base de datos:
  - agregar `business_unit` en `payments`
  - default seguro para registros existentes
  - mantener RLS actual

## Resultado final esperado

Después del cambio, la explicación para tus jefes queda simple:

```text
El consolidado comercial de Finanzas ya no incluye Administración.

Finanzas de Secretaría mide la rentabilidad de la operación comercial:
canon de agentes + 15% de comisiones + recuperos propios - egresos de Secretaría.

Administración de Edificios tiene su propio resultado financiero dentro del módulo Edificios:
comisión de administración + IVA recuperado - egresos de administración.

Los alquileres cobrados se muestran como fondos administrados de terceros,
pero no se cuentan como ingreso de Plusterra.
```
