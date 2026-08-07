
UPDATE public.ai_chat_settings SET model = 'google/gemini-3.6-flash' WHERE id = 1;

INSERT INTO public.ai_manual_sections (title, category, content, display_order, is_active) VALUES
('Cómo usar la lista de Morosos (todos los edificios)', 'morosos',
'La sección **Morosos** muestra, en una sola lista, todas las unidades administradas que no están al día en el mes elegido — sin entrar edificio por edificio.

1. En el menú lateral, sección **ADMINISTRACIÓN**, entrá a **Morosos** (ícono de triángulo de alerta).
2. Arriba elegís el **mes/período** que querés revisar. Los meses futuros no muestran mora (todavía no vencieron).
3. Las tarjetas de resumen muestran: **Vencidos**, **Pendientes** (aún en fecha) y **monto vencido estimado**.
4. La fila en **rojo** con el badge de días es deuda vencida; el badge **ámbar "Pendiente"** es una cuota que todavía no venció.
5. Usá el **buscador** para filtrar por edificio, unidad, inquilino o propietario.

Importante: solo se listan unidades cuyo contrato estaba **vigente en ese mes**. La columna **Cobranza** aclara si el período ya estaba "Cargado" en el Control de Cobranza (deuda real) o si figura "Sin registro" (ese mes nunca se cargó).', 1, true),

('Cómo marcar un cobro desde Morosos (alquiler, expensas, energía, IVA)', 'morosos',
'1. En **Morosos**, ubicá la fila de la unidad y tocá el botón **Cobrado**.
2. Se abre la confirmación con los conceptos pendientes y su monto: **Alquiler**, **Expensas**, **Energía** e **IVA**. Tildá solo los que realmente cobraste.
3. Si querés, escribí una **Observación** (queda guardada en el Control de Cobranza y se ve en la columna Observación de la lista).
4. Tocá **Confirmar cobro**.

Qué pasa después:
- Si tildaste **todos** los conceptos → la unidad queda **Pagada** y sale de la lista de Morosos.
- Si tildaste **solo parte** → queda en estado **Parcial** (badge azul) y sigue en la lista hasta completar el resto.
- Se guarda en el **mismo registro** del Control de Cobranza del edificio (fechas de pago y mora en 0 al cobrar el alquiler), así que la liquidación, Finanzas, el cierre mensual y el dashboard quedan sincronizados sin duplicar nada.

Si falta algún concepto y querés cargarlo con más detalle, entrá a **Edificios → [edificio] → Control de Cobranza**.', 2, true),

('Cómo usar el Control de Cobranza de un edificio', 'cobranzas',
'1. Entrá a **Edificios** y abrí el edificio.
2. Andá a la pestaña **Control de Cobranza**.
3. Elegí el **mes** que querés controlar.
4. Por cada unidad tildás los conceptos cobrados (alquiler, expensas, energía, IVA), cargás la fecha de pago y la observación.
5. Las cuotas con vencimiento pasado y sin cobrar aparecen marcadas como **Vencido** con los días de mora.

Este es el registro base: lo que tildás acá alimenta la **liquidación del mes**, **Finanzas**, el **cierre mensual** y la lista global de **Morosos**.', 3, true),

('Dónde cargar los gastos generales de un edificio (limpieza, ANDE, ESSAP, WiFi)', 'gastos',
'1. Entrá a **Edificios** y abrí el edificio.
2. Andá a la pestaña **Liquidación** y elegí el mes.
3. Bajá hasta el bloque **Gastos generales del edificio**.
4. Tocá **Registrar gasto** y completá: fecha, concepto (descripción), **categoría** (limpieza, ANDE, ESSAP, WiFi o gastos varios) y monto.
5. Guardá. El gasto queda listado con Fecha / Concepto / Categoría / Monto y se suma a la tarjeta **Gastos + Mant.**, descontándose del **Neto Propietarios** del mes.

Para corregirlo o borrarlo, usá los botones de acción en la misma fila del gasto.

Ojo: los gastos operativos de la inmobiliaria (no de un edificio) van en **Finanzas → Egresos Secretaría**.', 4, true),

('Cómo controlar el canon de los agentes', 'canon',
'1. Entrá a **Finanzas**.
2. Abrí la pestaña **Canon Agentes**.
3. Elegí el mes: vas a ver por agente lo **cobrado** y lo que **falta**.
4. Los agentes en deuda aparecen en **rojo**.
5. Para registrar el cobro del canon, usá la acción sobre la fila del agente y confirmá el monto y la fecha.

El agente ve su propio detalle en **Mis Finanzas** y en **Mi Plan**.', 5, true),

('Cómo usar el Catálogo Interno de propiedades disponibles', 'catalogo',
'1. En el menú entrá a **Disponibles** (Catálogo Interno).
2. Filtrá y buscá por zona, tipo, operación o precio.
3. Desde cada ficha podés ver fotos, datos y compartir la propiedad por WhatsApp con el código PLT.
4. Si la propiedad está publicada en el portal, el enlace lleva a la ficha pública de plusterra.com.py.

Si la pantalla queda cargando y aparece "No se pudo cargar el catálogo", tocá **Reintentar**; si sigue, recargá con Ctrl+F5.', 6, true),

('Cómo exportar la ficha de una propiedad en PDF', 'reportes',
'1. Entrá a **Disponibles** (Catálogo Interno) o a **Propiedades**.
2. Seleccioná la propiedad (o varias) y abrí la opción de **Exportar PDF**.
3. Elegí las opciones del diálogo y confirmá la descarga.

Qué incluye el PDF:
- Encabezado de PLUSTERRA y la ficha con datos y foto (la foto mantiene su proporción, no se estira).
- Si la propiedad está **publicada en el portal**, incluye el enlace **"Ver más detalles y fotos en la web"** para que el cliente entre directo a la ficha pública.
- Al exportar una sola propiedad no se genera portada vacía: arranca directo con la ficha.', 7, true),

('Cómo asignar el agente captador de una propiedad', 'propiedades',
'1. Entrá a **Propiedades** y tocá **Nueva propiedad** (o abrí una existente y tocá **Editar**).
2. Buscá el bloque **Agente Captador** dentro del formulario.
3. Elegí el agente en el selector y guardá.

Lo pueden hacer SuperAdmin, Admin, Gerente y **Secretaría**. Es lo que define quién figura como captador para las comisiones y los reportes, así que conviene cargarlo al momento de crear la propiedad.', 8, true),

('Qué hago si el escáner de llaves no abre la cámara', 'llaves',
'Abrí **Retiro de Llaves** y, si no funciona, seguí el panel **"¿No funciona el escáner?"** que está arriba del visor:

1. **Cerrá y reabrí la app** (o reinstalala desde pluspy.app → "Agregar a pantalla de inicio").
2. Revisá el **permiso de cámara**: en el navegador, Configuración del sitio → Cámara → Permitir.
3. **Cerrá otras apps** que estén usando la cámara (videollamadas, cámara nativa).
4. Si nada de eso funciona, usá el **ingreso manual del código PLT** en el mismo lugar del escáner.

Si el error persiste, mandale al SuperAdmin la **captura del mensaje de error exacto** que muestra la pantalla.', 9, true),

('Cómo volver atrás sin salir de todo (navegación)', 'general',
'En las pantallas de detalle (por ejemplo **Edificios → [edificio]** o **Propietarios → [propietario]**) hay un botón **← Volver** arriba a la izquierda, al lado del título. Te devuelve a la lista de donde venías sin cerrar el módulo.

En las tablas anchas hay barra de **scroll horizontal arriba y abajo**: podés desplazarte al costado sin bajar hasta el final de la lista, y la primera columna queda fija para no perder de vista la unidad o el edificio.

En el menú lateral, el botón de **colapsar/expandir** está arriba, al lado del logo.', 10, true),

('Cómo generar el reporte mensual de administración', 'reportes',
'1. Entrá a **Edificios** y abrí el edificio.
2. Andá a la pestaña **Liquidación** y elegí el mes.
3. Usá el panel de exportación para generar el **reporte mensual** o la **liquidación en PDF** (hay distintos modelos según lo que necesite el propietario).

Recordá: la liquidación toma solo lo efectivamente **cobrado** en el Control de Cobranza. Las unidades sin cobrar no se suman a los totales, así que cargá primero los cobros del mes y después generá el reporte.', 11, true),

('Cómo ver notificaciones, avisos y el historial', 'general',
'- La **campanita** arriba a la derecha muestra las notificaciones pendientes; al tocar una te lleva directo al registro relacionado.
- En **Notificaciones** (menú) tenés el **historial completo** con lo leído y lo resuelto.
- En **Comunicaciones** publicás mensajes internos y avisos en el **Pizarrón** para todo el equipo.', 12, true),

('Qué hago si el asistente responde "no está en el manual"', 'soporte',
'El asistente solo responde procedimientos que estén cargados en el manual del sistema.

1. Si te dice que algo no está documentado, avisale al **SuperAdmin**.
2. El SuperAdmin lo agrega en **Configuración → Asistente IA Interno → Manual** (título, categoría y pasos).
3. Desde ese momento el asistente ya lo responde a todos, sin necesidad de actualizar la app.

Si el asistente devuelve un error de servicio o de créditos, también avisale al SuperAdmin: es un tema de configuración, no de tu usuario.', 13, true);
