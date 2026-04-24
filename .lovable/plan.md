# Fix: pantalla en blanco en Propiedades / Disponibles

## Diagnóstico confirmado

En `src/components/properties/PropertyDetailDialog.tsx`, el componente accede a `property.status` en la línea 276 **antes** del guard `if (!property) return null;` que está en la línea 282.

```tsx
// Línea 270-282 (estado actual con bug)
export const PropertyDetailDialog = ({ open, onOpenChange, property }) => {
  const { data: whatsappTemplate } = useWhatsAppTemplate();
  const { user, role, isAdmin } = useAuth();
  const isSecretaria = role === "secretaria";
  const isGerente = role === "accounting";
  const canManageReservations = isAdmin || isSecretaria || isGerente;
  const isReserved = property.status === "reserved";  // ❌ crash si property = null
  const isMobile = useIsMobile();
  const [reservationMode, setReservationMode] = useState<...>(null);

  if (!property) return null;  // llega tarde
```

El diálogo se monta con `property={null}` por defecto en `Properties.tsx`, `AvailableProperties.tsx`, `MyFavorites.tsx` y otros. En cuanto entra un agente, se lanza `TypeError: Cannot read properties of null (reading 'status')` y se rompe toda la página → pantalla en blanco.

## Cambio

**1 archivo, 1 cambio mínimo:**

`src/components/properties/PropertyDetailDialog.tsx` — mover el `if (!property) return null;` justo después de los hooks (`useState`) y **antes** de cualquier lectura de `property.*`. Se elimina la línea suelta de `isReserved` (no se usa en el resto del archivo) o se mueve después del guard.

```tsx
export const PropertyDetailDialog = ({ open, onOpenChange, property }) => {
  const { data: whatsappTemplate } = useWhatsAppTemplate();
  const { user, role, isAdmin } = useAuth();
  const isMobile = useIsMobile();
  const [reservationMode, setReservationMode] = useState<...>(null);

  // ✅ Guard antes de acceder a property.*
  if (!property) return null;

  const isSecretaria = role === "secretaria";
  const isGerente = role === "accounting";
  const canManageReservations = isAdmin || isSecretaria || isGerente;
  const isReserved = property.status === "reserved";
  // ... resto igual
};
```

## Por qué funciona

- El orden de hooks se mantiene (todos los `useX` quedan antes del `return null`).
- Cuando el diálogo está cerrado y `property === null`, el componente devuelve `null` sin tocar propiedades inexistentes.
- Cuando el usuario abre una propiedad, `property` ya tiene valor y todo el render normal procede.

## Alcance

- Sin cambios en otras páginas, hooks o RLS.
- Sin migración de base de datos.
- Riesgo mínimo: es un reordenamiento defensivo dentro del mismo componente.
