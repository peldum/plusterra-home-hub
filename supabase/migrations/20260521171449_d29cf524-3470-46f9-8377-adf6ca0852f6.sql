INSERT INTO public.ai_manual_sections (title, category, content, display_order, is_active) VALUES
('Flujo oficial: Reservar (Agente) → Comisión Rápida (Secretaría)', 'Flujos',
$$## Flujo oficial para registrar una operación cerrada

Este es el flujo correcto y obligatorio cuando un agente cierra un alquiler o venta. Está pensado para que **no haya errores de comisión** y que la información financiera entre **únicamente por Secretaría / Administración**.

### 1. Agente: usar "Reservar" cuando el cliente se compromete

Cuándo:
- El cliente firmó una reserva o pagó una seña.
- Todavía NO hay contrato firmado ni llaves entregadas.

Qué hace "Reservar":
- Bloquea la propiedad para que ningún otro agente la toque.
- Deja registrado quién es el agente responsable y el cliente.
- **NO carga monto de comisión todavía** (eso lo hace Secretaría al cierre).

Cómo hacerlo: ir a la propiedad → botón **"Reservar"** → completar cliente, fecha estimada y observaciones.

### 2. Cierre: contrato firmado + llaves entregadas

Cuando la operación realmente se cierra (firma de contrato de alquiler o boleto de venta), el agente avisa a Secretaría.

### 3. Secretaría / Admin: cargar la comisión real con "Comisión Rápida"

Quién: **Secretaría, Admin, Gerente o SuperAdmin** (los agentes ya NO tienen este botón).

Dónde: **Finanzas → Comisiones → "Registrar Comisión Rápida"**.

Qué cargar:
- Propiedad y agente responsable.
- Monto real de la comisión (lo que figura en el contrato firmado).
- Si hay co-broker:
  - **Co-broker interno** (otro agente Plusterra): elegir el agente y el % de cada uno. El 15% de Plusterra se aplica sobre el total.
  - **Co-broker externo** (inmobiliaria de afuera): se reparte **50/50 fijo**. El **15% de Plusterra se descuenta solo sobre la mitad que le toca a Plusterra**, no sobre la mitad del externo.
- Motivo / observación (obligatorio, queda en auditoría).

### 4. Resultado automático

- Se crea el registro de comisión visible para el agente en **Mis Finanzas**.
- Se descuenta el 15% de Plusterra automáticamente.
- Queda asentado en **Auditoría Financiera** (inmutable).
- Si la propiedad estaba en "Reservada", pasa a "Alquilada" o "Vendida".

### Por qué este flujo

- El agente nunca toca montos → cero errores de carga.
- Secretaría tiene el contrato firmado a la vista → carga el monto exacto.
- Todo queda auditado con motivo.
- Si hay un error, **Secretaría puede eliminar y volver a cargar** (la auditoría lo registra).

### Errores comunes

- ❌ Cargar la comisión **antes** de tener contrato firmado.
- ❌ Cambiar la propiedad a "Alquilada" sin avisar a Secretaría.
- ❌ Cargar co-broker externo como si fuera interno (los porcentajes son distintos).
- ✅ Siempre: Reserva → Contrato firmado → Secretaría carga Comisión Rápida.$$,
55, true);