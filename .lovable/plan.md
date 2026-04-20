

## Plan: Sincronización inmediata en Control de Cobros (Nivel 1)

### Qué se va a cambiar

Un solo archivo: `src/hooks/useCollectionRecords.ts`. Cuando se guarda un cambio de estado de pago (Pagado/Pendiente), avisar al instante a TODOS los módulos relacionados para que refresquen sus datos.

### Módulos que se van a actualizar al instante

Después del cambio, al marcar "Pagado" en Control de Cobros vas a ver reflejado el cambio inmediatamente en:

- **Resumen del edificio** (la pestaña de al lado)
- **Cobros generales** (módulo Finanzas → Alquileres)
- **Liquidación del edificio** (montos a transferir al propietario)
- **Widget de cobros** del Dashboard
- **Cierre Mensual** (totales del mes)
- **Contadores** de cobros vencidos / por vencer

### Cambio técnico exacto

En el `onSuccess` del `upsert` del hook `useCollectionRecords`, además de invalidar `['collection-records']` (lo único que hace hoy), agregar:

```ts
queryClient.invalidateQueries({ queryKey: ['building-receivables'] });
queryClient.invalidateQueries({ queryKey: ['receivables'] });
queryClient.invalidateQueries({ queryKey: ['receivable-counters'] });
queryClient.invalidateQueries({ queryKey: ['building-liquidation'] });
queryClient.invalidateQueries({ queryKey: ['rent-collection-widget'] });
queryClient.invalidateQueries({ queryKey: ['cierre-mensual'] });
queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
```

### Garantías

- **NO toca la base de datos** — los pagos se siguen guardando igual.
- **NO modifica RLS, triggers ni funciones SQL** — toda la lógica financiera queda intacta.
- **NO afecta otros módulos** — solo agrega avisos de actualización; si una query no existe, simplemente no pasa nada.
- **NO introduce loops** — `invalidateQueries` es la API estándar de TanStack Query, ya usada en decenas de hooks del sistema.
- **Reversible en 30 segundos** si algo no gusta: borrar las 7 líneas y vuelve a comportarse como hoy.

### Archivo modificado

- `src/hooks/useCollectionRecords.ts` — agregar 7 invalidaciones en el `onSuccess` del mutation.

### Resultado esperado

Lidiane (y cualquier usuaria) marca "Pagado" en Control de Cobros → entra al Resumen → ve "Pagado" al instante, sin recargar, sin esperar.

### Si después querés ir más lejos (opcional, NO incluido en este plan)

**Nivel 2 — Realtime entre usuarios:** que si Lidiane marca "Pagado" en su computadora, María en otra computadora lo vea aparecer sin recargar. Eso requiere activar Supabase Realtime en 2 tablas (`unit_collection_records` y `receivables`) y suscribirse desde el frontend. Es un poco más de trabajo pero también seguro. Lo dejamos para después si te interesa.

