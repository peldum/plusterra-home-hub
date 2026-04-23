
Sí, tiene sentido. Para limpiar el dashboard y evitar confusión, la mejor lógica sería:

## Objetivo

Dejar el dashboard solo con información que requiere acción o seguimiento inmediato.

Las reservas/operaciones que ya terminaron, como propiedades ya marcadas como **Alquilada** o **Vendida**, no deberían ocupar espacio en el dashboard principal. Deben quedar únicamente en el **Historial de Reservas**.

## Cambio propuesto

### 1. Dashboard principal

En el panel de **Reservas Activas**, mostrar solamente:

- Solicitudes de reserva pendientes.
- Reservas confirmadas que todavía no fueron cerradas.
- Reservas próximas a vencer.
- Reservas que requieren aprobar, rechazar, cancelar o confirmar.

No mostrar como “activas” las operaciones que ya terminaron.

### 2. Operaciones finalizadas

Cuando una reserva se confirma como:

- **Alquilada**
- **Vendida**
- **Cancelada**
- **Rechazada**
- **Vencida**

debe desaparecer del dashboard principal y quedar registrada en:

```text
Dashboard
  → Reservas Activas
    → Historial
```

Ahí se podrá consultar después con fecha, propiedad, agente y estado.

### 3. Ajuste visual para reducir confusión

Mantener el dashboard más limpio con estas secciones:

```text
Reservas Activas
  - Solicitudes pendientes
  - Reservas confirmadas en curso

Historial
  - Alquiladas
  - Vendidas
  - Canceladas
  - Rechazadas
  - Vencidas
```

### 4. Texto más claro

Ajustar los textos para que no parezca que una propiedad ya alquilada sigue pendiente.

Por ejemplo:

- “Reservas Activas” = solo lo que requiere acción.
- “Historial” = operaciones ya cerradas.
- El botón “Alquilado” quedaría como acción de cierre, no como estado visible permanente en el dashboard.

### 5. Mantener trazabilidad

No se eliminará información.

Todo cierre seguirá quedando registrado en el historial/auditoría para poder revisar:

- Qué propiedad fue.
- Quién la cerró.
- Qué agente participó.
- Cuándo se cerró.
- Si fue alquilada, vendida, cancelada o rechazada.

## Resultado esperado

Después del ajuste:

- El dashboard queda más limpio.
- Las propiedades ya alquiladas no confunden como si siguieran activas.
- El equipo ve primero lo urgente o pendiente.
- Las operaciones cerradas siguen disponibles en historial.
- No se pierden registros ni trazabilidad.
