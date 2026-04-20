

## Plan: Mostrar hora del registro en Movimientos Propios

### Dónde

**Finanzas → Resumen General → Movimientos Propios** (la lista que aparece en tu screenshot).

### Cambio

En cada fila, debajo de la descripción, donde hoy dice solo `2026-04-20`, mostrar:

**`2026-04-20 · 14:54 hs`**

- **Fecha contable** (`payment_date`) primero — es la fecha del movimiento real (ej: cuándo se pagó el Bolt).
- **Hora de registro** (`created_at` formateado a `HH:mm`) después — es cuándo lo cargaron en el sistema.
- Separador `·` entre ambos para diferenciar visualmente.
- Sufijo `hs` para que quede claro que es hora.

### Por qué `created_at` y no `payment_date`

`payment_date` es solo fecha (sin hora). `created_at` es timestamp completo con hora exacta de cuándo se registró. Esto te permite ver "Fátima cargó esto a las 14:54" → trazabilidad real para casos como el de Marco.

### Cambios técnicos

**Archivo único**: `src/pages/Finances.tsx`

Línea 449, reemplazar:
```tsx
<p className="text-xs text-muted-foreground">{p.payment_date}</p>
```

Por:
```tsx
<p className="text-xs text-muted-foreground">
  {p.payment_date}
  {p.created_at && (
    <span className="ml-1.5 opacity-75">
      · {new Date(p.created_at).toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit', hour12: false })} hs
    </span>
  )}
</p>
```

`created_at` ya viene en la query actual (es columna estándar de `payments`), no hay que tocar la consulta a la BD.

### Garantías

- **Cero cambios en BD ni queries.**
- **Cero impacto en otros tabs** (Egresos, Comisiones, etc.) — solo Resumen General.
- **Cero impacto en exportaciones** PDF/CSV.
- **Responsivo**: la hora va inline al lado de la fecha, sin romper el layout móvil.

### Resultado esperado

Antes:
```
Bolt para muestra de oficina sobre Independencia  [Alquiler oficina]
2026-04-20
```

Después:
```
Bolt para muestra de oficina sobre Independencia  [Alquiler oficina]
2026-04-20 · 14:54 hs
```

Cuando Marco cargue el ingreso de Tamoñaro, vas a ver al instante la hora exacta y podrás confirmarle "se registró a las XX:XX hs".

### Archivos modificados

- `src/pages/Finances.tsx` (1 línea)

