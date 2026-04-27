## Qué se va a cambiar

Voy a rediseñar el flyer (`FlyerGeneratorDialog.tsx`) para que se vea **exactamente como la 3ra captura**, siguiendo las medidas exactas de la guía (2da captura).

### Diferencias entre el flyer actual (1ra) y el deseado (3ra)

| Elemento | Actual | Nuevo |
|---|---|---|
| Fondo general | Azul oscuro pegado a la foto | **Blanco**, con foto y caja flotantes |
| Foto | Pegada a los bordes, esquinas rectas | Esquinas **redondeadas (40px)**, con margen 30px |
| Caja azul | Llega hasta los bordes | **Caja flotante** con esquinas redondeadas (40px), margen 30px lateral |
| Línea naranja inferior | Sí | **Eliminada** (no aparece en la 3ra captura) |
| Textos en caja | Título grande + código abajo | **Badge → Título → Ubicación → Precio → Código** (más abajo) |
| Footer (m², cochera, logo) | Dentro de banda blanca separada | Sobre el **fondo blanco general**, debajo de la caja azul |

### Layout exacto (1080×1350px) según la guía de medidas

```text
┌──────────────────────────────────────┐  ← fondo blanco
│  30px margen superior                │
│  ┌────────────────────────────────┐  │
│  │                                │  │  ← Foto, esquinas r=40
│  │           FOTO                 │  │     30px laterales
│  │                                │  │
│  └────────────────────────────────┘  │
│  30px gap                            │
│  ┌────────────────────────────────┐  │
│  │  60px padding interno          │  │  ← Caja azul #1e3a5f
│  │  [ALQUILER] (badge blanco)     │  │     esquinas r=40
│  │  30px                          │  │     30px laterales
│  │  AMPLIO SALÓN COMERCIAL        │  │     60px padding interno
│  │  30px                          │  │
│  │  📍 EDIFICIO SURNYAK           │  │
│  │  30px                          │  │
│  │  GS. 3.500.000                 │  │
│  │  60px (separador grande)       │  │
│  │  CÓDIGO: PLT-2026-0246         │  │
│  │  60px padding interno          │  │
│  └────────────────────────────────┘  │
│                                      │
│  40 m2 · 1 ambiente · cochera   [LOGO PLUSTERRA]
│                                      │
└──────────────────────────────────────┘
```

### Detalles tipográficos (según 3ra captura)

- **Badge "ALQUILER/VENTA/TEMPORAL"**: fondo blanco, texto azul oscuro, esquinas suaves, padding generoso.
- **Título principal** (ej. "AMPLIO SALÓN COMERCIAL"): blanco, bold, ~52px, MAYÚSCULAS.
- **Ubicación** con pin 📍 (ej. "EDIFICIO SURNYAK"): blanco, regular, ~36px, MAYÚSCULAS.
- **Precio** (ej. "GS. 3.500.000"): blanco, bold, ~44px.
- **Código** (ej. "CÓDIGO: PLT-2026-0246"): blanco, regular, más chico ~26px, separado del precio.
- **Footer** (m², ambientes, cochera + logo): texto gris oscuro sobre fondo blanco, logo Plusterra a la derecha.

### Comportamiento dinámico

- El badge muestra `ALQUILER`, `VENTA` o `TEMPORAL` según `operationType`.
- Si la propiedad **no tiene barrio/edificio**, se usa la dirección como fallback (igual que hoy).
- El precio se formatea según moneda (`USD` o `Gs.`); para alquiler se muestra **sin** sufijo "/mes" (la 3ra captura no lo incluye).
- Si la propiedad no tiene dormitorios/baños, esos valores se omiten del footer (ya funciona así).
- El título se trunca a 2 líneas con "…" si es muy largo (ya funciona así).

### Archivos a modificar

- `src/components/properties/FlyerGeneratorDialog.tsx` — reescribir la función `drawFlyer` con el nuevo layout (fondo blanco, foto y caja flotantes redondeadas, nuevo orden de textos, footer sobre blanco, sin línea naranja).

No se tocan hooks, datos ni base de datos. Es un cambio puramente visual del canvas.
