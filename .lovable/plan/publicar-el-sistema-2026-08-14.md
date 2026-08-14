# Publicar el sistema

## Situación
El publicado está bloqueado por 2 alertas del escáner de seguridad sobre el portal público:
la configuración del portal y los datos de propiedades. Ya verifiqué en la base de datos que
los visitantes anónimos **no** tienen acceso a la tabla completa: solo tienen permiso de lectura
sobre las columnas públicas (logo, colores, contacto, título, precio, fotos, ubicación aproximada).
Los campos internos (WhatsApp de mantenimiento, agente asignado, llaves, propietario,
comisión, NIS/ISSAN, datos de reserva) están bloqueados columna por columna.

Es decir: las 2 alertas son falsas alarmas del escáner, que solo mira la regla de acceso
general y no los permisos por columna.

## Pasos
1. Marcar esas 2 alertas como falsas alarmas (queda registrado el motivo y se pueden
   restaurar desde la pestaña Seguridad).
2. Publicar el sistema en plusterra-hub.lovable.app.
3. Confirmar que la publicación quedó en marcha.

## Notas técnicas
- Verificación hecha con consulta a `pg_attribute` / `aclexplode`: el rol `anon` no tiene
  privilegio SELECT a nivel de tabla en `portal_settings` ni en `properties`; solo tiene
  GRANT por columna sobre el subconjunto público.
- No se requieren cambios de código ni de base de datos para publicar.
