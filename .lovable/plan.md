

## Plan: Ajustar tipografía del Hero del portal público

### Cambio único en `src/pages/portal/PortalHome.tsx` (líneas 117-124)

**Sección hero actual** usa clases Tailwind genéricas (`text-2xl md:text-5xl`, `text-sm md:text-xl`, `py-6 md:py-16`). Se reemplazarán con valores inline precisos para cumplir las especificaciones exactas.

**Cambios:**

1. **Contenedor `<section>`**: Cambiar padding de `py-6 md:py-16` → `py-4 md:py-8` (16px mobile, 32px desktop)

2. **Título `<h1>`**: Reemplazar `text-2xl md:text-5xl` con estilo inline responsive:
   - Mobile: 24px / bold
   - Tablet (768-1024px): 28px
   - Desktop: 36px
   - Usar clases `text-[24px] md:text-[28px] lg:text-[36px] font-bold`

3. **Subtítulo `<p>`**: Reemplazar `text-sm md:text-xl` con:
   - Mobile: 14px / normal
   - Tablet: 16px
   - Desktop: 18px
   - Usar clases `text-[14px] md:text-[16px] lg:text-[18px] font-normal`

4. **Ancho del texto**: Agregar `max-w-[90%] mx-auto` al contenedor interno para mobile

No se tocan colores, fondos, imágenes ni otros bloques.

