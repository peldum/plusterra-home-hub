UPDATE public.system_updates
SET description = 'Realizado por: Marco González
Programador Full Stack & Analista de Ciberseguridad
Fecha: 28 de marzo de 2026

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

RESUMEN EJECUTIVO

Se realizó una auditoría completa de seguridad en todo el sistema Pluspy (base de datos + aplicación). El objetivo fue identificar y corregir posibles vulnerabilidades que pudieran comprometer la información de usuarios, agentes, propietarios y datos sensibles de la inmobiliaria.

Resultado final: Todas las vulnerabilidades detectadas fueron corregidas. No quedan problemas de seguridad pendientes.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔴 RIESGOS ALTOS (2/2 corregidos)

#1 — Vista perfiles_publicos sin protección
   Detalle: Cualquier persona (incluso sin iniciar sesión) podía ver datos de todos los usuarios y agentes (nombres, fotos, estado, etc.).
   Corrección: Se aplicó security_invoker = true. Ahora la vista respeta las políticas RLS y solo muestra información a usuarios autenticados.

#2 — Error en política de auditores
   Detalle: Los auditores no podían ver los edificios asignados porque la regla comparaba un campo consigo mismo.
   Corrección: Se corrigió la condición: ahora compara correctamente building_auditors.building_id = buildings.id.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🟠 RIESGOS MEDIOS (3/3 corregidos)

#3 — Tabla portal_visits permitía INSERT anónimo
   Detalle: Cualquiera podía registrar visitas falsas.
   Corrección: Se agregó rate-limit de 1 visita cada 5 segundos por visitor_id y validación de campos.

#4 — Tabla showroom_leads permitía INSERT sin validación
   Detalle: Riesgo de spam en la sala de exposición.
   Corrección: Se reforzó la validación (nombre min 2 chars, teléfono min 6 chars) y el rate-limit existente.

#5 — Política de portal_leads sin validación de agente
   Detalle: Permitía asignar leads a cualquier agente, incluso inactivos.
   Corrección: Se agregó validación para que solo se asignen agentes activos + validación de inputs.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🟢 RIESGOS BAJOS (1/1 corregido)

#8 — Subida de fotos demasiado permisiva
   Detalle: Cualquier usuario autenticado podía subir fotos al bucket property-photos.
   Corrección: Ahora solo agentes y administradores pueden subir fotos al bucket correspondiente.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ESTADO FINAL DE LA AUDITORÍA

- Riesgos Altos:    2/2 corregidos
- Riesgos Medios:   3/3 corregidos
- Riesgos Bajos:    1/1 corregido
- Nuevos riesgos:   0
- Pendientes:       Ninguno

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

RECOMENDACIONES

- Realizar auditorías de seguridad periódicas (cada 3-4 meses)
- Continuar con buenas prácticas: no exponer claves en el frontend
- Mantener actualizadas las políticas de acceso

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

El sistema se encuentra en un estado de seguridad mucho más robusto y profesional.'
WHERE id = 'a8deaf2b-d56e-43da-bcf7-32425b268ea8';