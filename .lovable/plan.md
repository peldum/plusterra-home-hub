## Contexto

Ayer tocamos 3 piezas relacionadas al flujo 85/15:
- `src/components/finances/PendingCommissionsDialog.tsx` (popup "Comisiones pendientes")
- `src/components/buildings/QuickTenantDialog.tsx` (auto-popup post-alquiler)
- `src/components/commissions/QuickCommissionDialog.tsx` (defaults pre-cargados)

La gerente reportó cartel de "Loop de consultas detectado" mientras trabajábamos. Hoy ya no lo ve, pero quiere un repaso para asegurar que no vuelva a aparecer **sin romper la funcionalidad nueva** (popup automático, comisiones pendientes, defaults).

## Diagnóstico

Revisé el código actual y encontré 3 patrones que **pueden** disparar el guard bajo ciertas condiciones (no hay un loop crítico evidente, pero hay riesgo):

1. **`PendingCommissionsDialog`** lanza 4 `useQuery` en paralelo al abrir (`pending-comm-properties`, `…-existing-quick`, `…-existing-deal`, `…-agents`). Si una de las consultas (ej. `commissions` con join `deal:deal_id(property_id)`) refetchea por focus repetido, el guard puede contarlo como loop.

2. **`QuickTenantDialog`** tiene un `useEffect` que depende de `existingTenantName` y `existingTenantPhone` (strings que el padre puede recrear en cada render). Si el padre no memoiza, se reejecuta el efecto, dispara una consulta a `contracts`, y puede repetirse.

3. **`QuickCommissionDialog`** tiene `enabled: open && (form.property_source === 'internal' || !!defaultPropertyId)` — al cambiar `form.property_source` en el mismo efecto que setea `defaultPropertyId`, puede generar oscilación enabled→disabled→enabled.

## Cambios propuestos (todos defensivos, sin cambiar UX)

### 1) PendingCommissionsDialog
- Agregar `staleTime: 30_000` y `refetchOnWindowFocus: false` a las 4 queries para que no refetcheen al volver al tab.
- Mantener toda la lógica actual (RLS fallback, filtros, pendientes).

### 2) QuickTenantDialog
- En el `useEffect` que carga el contrato existente, **quitar** `existingTenantName` y `existingTenantPhone` del array de deps (ya solo se usan como fallback dentro de `resetCreateForm`, que corre con valores actuales por closure). Dejar solo `[open, existingContractId, isReplacing]`.
- Agregar guard: si `!open` retornar temprano sin hacer nada (ya está, pero confirmar).

### 3) QuickCommissionDialog
- Cambiar `enabled` de la query de propiedades a solo `open` (la query es liviana, ya tiene su propia `queryKey` estable y evita la oscilación). 
- Agregar `staleTime: 60_000` y `refetchOnWindowFocus: false` a `quick-comm-properties-all` y `quick-comm-agents`.

### 4) Reseteo del guard al cambiar de ruta
- En `App.tsx` (o donde esté el `installSupabaseQueryLoopGuard`), llamar a `resetQueryLoopGuard()` en cada cambio de ruta. Esto asegura que un loop bloqueado en una página no quede arrastrado a otra.

## Qué NO se toca

- Lógica de comisiones, splits 85/15, autocompletado.
- Auto-popup post-alquiler en QuickTenantDialog (el flujo Origen → 85/15 sigue igual).
- Fallback RLS para Secretaria/Agente en PendingCommissionsDialog.
- RLS, edge functions, base de datos.

## Verificación

- Abrir Comisiones pendientes como Gerente y como Secretaria → no debe aparecer loop.
- Cargar inquilino en una unidad → debe abrir Origen → 85/15 sin loop.
- Cambiar de Finanzas a otra pestaña y volver → no debe refetchear todo.

## Detalles técnicos

```text
Archivos a modificar:
  src/components/finances/PendingCommissionsDialog.tsx   (+ staleTime/refetchOnWindowFocus en 4 queries)
  src/components/buildings/QuickTenantDialog.tsx         (deps del useEffect)
  src/components/commissions/QuickCommissionDialog.tsx   (enabled simplificado + staleTime)
  src/App.tsx                                            (resetQueryLoopGuard al cambiar route)
```
