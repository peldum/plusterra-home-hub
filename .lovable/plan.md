
Voy a ajustar la tarjeta del portal para que las etiquetas superiores se lean bien en Inicio, Alquileres/Ventas y celular, sin romper la vista de PC.

## Problema detectado

En la página **Alquileres / catálogo completo**, las tarjetas tienen más ancho porque usan una grilla de 3 columnas en PC. Por eso la etiqueta:

```text
DISPONIBLE DESDE 1 MAY. 2026
```

se lee bien.

En **Inicio**, la sección de propiedades destacadas usa una grilla de 4 columnas en PC. Eso hace que cada tarjeta sea más angosta y las dos etiquetas superiores compitan por el mismo espacio:

```text
DISPONIBLE DESDE 1 MAY. 2026     DESTACADA
```

Entonces se superponen o se cortan visualmente.

En celular se ve bien porque la tarjeta ocupa casi todo el ancho.

## Solución propuesta

### 1. Mejorar la tarjeta `PortalPropertyCard`

Cambiar la disposición de las etiquetas superiores para que no dependan de tener mucho ancho horizontal.

En vez de poner las dos etiquetas una a la izquierda y otra a la derecha en la misma línea, usar una disposición más segura:

```text
┌──────────────────────────────┐
│ DISPONIBLE DESDE 1 MAY. 2026 │
│ DESTACADA                    │
│                              │
│            FOTO              │
└──────────────────────────────┘
```

O sea:

- Las etiquetas irán agrupadas arriba a la izquierda.
- Si hay dos etiquetas, se apilan una debajo de la otra.
- La etiqueta larga podrá ocupar el ancho necesario sin chocar con “Destacada”.
- Se mantiene el diseño premium con colores actuales.

### 2. Mejorar legibilidad de las etiquetas largas

Ajustar la etiqueta “Disponible desde…” para que sea más clara y resistente en tarjetas angostas:

- Mantener fondo naranja.
- Mantener texto blanco.
- Usar tamaño legible.
- Evitar que se corte de forma fea.
- Permitir que ocupe el ancho disponible.
- En pantallas muy pequeñas, mantener buena lectura.

Ejemplo esperado:

```text
DISPONIBLE DESDE 1 MAY. 2026
DESTACADA
```

### 3. Mantener intacto el comportamiento actual

No voy a cambiar:

- Las fotos.
- Los enlaces de las propiedades.
- El orden de propiedades.
- Los filtros.
- El buscador.
- La vista de celular que ya se ve bien.
- Los datos de disponibilidad.
- El estado de destacada.
- El diseño general del portal.

Solo se ajusta la presentación visual de las etiquetas dentro de la tarjeta.

### 4. Revisar las dos variantes de tarjeta

La tarjeta tiene dos modos:

- Vista grilla.
- Vista lista.

Voy a aplicar el ajuste principalmente a la vista grilla, que es donde ocurre el problema. También revisaré la vista lista para asegurar que no quede ningún solapamiento.

### 5. Mantener consistencia entre Inicio y Alquileres

El mismo componente se usa en:

- Inicio.
- Propiedades destacadas.
- Últimos inmuebles.
- Alquileres.
- Ventas.
- Catálogo completo.

Por eso el arreglo quedará aplicado de forma consistente en todo el portal.

## Resultado esperado

Después del cambio:

- En Inicio se leerá bien “Disponible desde…”.
- “Destacada” ya no tapará ni chocará con la fecha.
- En PC seguirá viéndose ordenado y profesional.
- En celular se mantendrá como está o mejorará levemente.
- No se romperán filtros, navegación ni tarjetas existentes.

## Archivos a tocar

- `src/components/portal/PortalPropertyCard.tsx`

Posiblemente no sea necesario tocar otros archivos.
