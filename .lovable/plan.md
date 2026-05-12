## Problema

En el diálogo "Registrar Comisión Rápida" (que abre la secretaría al marcar "Cobrado"/confirmar reserva, o desde "Pendientes de registrar"), antes se veía la información de la propiedad seleccionada — el **monto del alquiler** y la **seña/reserva** — para poder calcular cuánto le queda a cada parte. Hoy ese bloque no aparece y la secretaría tiene que ir a la ficha de la propiedad a buscarlo.

## Solución

Cuando la propiedad seleccionada sea **interna** (la del catálogo), mostrar un panel informativo arriba del campo "Monto bruto" con los datos clave de esa propiedad, y un botón rápido para auto-completar el monto bruto.

### Datos a mostrar en el panel

Tomados de `properties` (ya se consultan):
- **Monto de alquiler mensual** (`rental_price`) — si la operación es Alquiler.
- **Precio de venta** (`sale_price`) — si la operación es Venta.
- **Seña / monto de reserva**: `reservation_amount` (si está reservada) o `reservation_request_amount` (si fue solicitud). Si no hay, se omite.
- **Código PLT y estado** (Alquilada / Vendida / Reservada) — ya se ve en el selector, pero se repite en el panel para confirmar.

### Comportamiento

- Panel solo visible cuando `property_source === 'internal'` y hay propiedad seleccionada.
- Botón **"Usar como monto bruto"** que copia el `rental_price` (o `sale_price`) al campo `gross_amount`. No se auto-rellena solo, para no pisar correcciones manuales.
- Debajo del monto sugerido, una nota chiquita: "Reparto: 85% agente / 15% inmobiliaria — se calcula automáticamente abajo."
- Si no hay precio cargado en la propiedad, mostrar mensaje suave "Esta propiedad no tiene precio cargado".

### Cambio técnico

Único archivo a tocar: `src/components/commissions/QuickCommissionDialog.tsx`.

1. Ampliar el `select` de `quick-comm-properties-all` para traer también `rental_price`, `sale_price`, `reservation_amount`, `reservation_request_amount`, `currency`.
2. Insertar un nuevo bloque JSX entre el selector de propiedad y el campo "Monto bruto" que renderice los valores formateados con `formatAmount()`.
3. Agregar un `<Button variant="ghost" size="sm">` con la acción de copiar el precio al `gross_amount` (y, si la moneda de la propiedad es distinta, también ajustar `currency`).

No se modifica lógica de negocio, comisiones, ni base de datos — es solo UI para que la secretaría tenga el dato a mano al registrar.
