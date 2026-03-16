INSERT INTO public.eventos_internos (autor_id, aviso_id, titulo, descripcion, fecha_inicio, fecha_fin, destinatarios, recordatorio_24h, recordatorio_1h, lugar)
VALUES (
  '7daee416-7e32-4e69-85f0-ff3f201c9222',
  '53e20a17-3f30-4fb6-897b-916ea38c4ead',
  '🚨 Reunión Plusterra – martes 15:00 hs',
  'Reunión del equipo para mostrar las últimas modificaciones de Pluspy, capacitación y consultas.

Se requiere la presencia de todos.',
  '2026-03-17T15:00:00-03:00',
  '2026-03-17T16:00:00-03:00',
  ARRAY['todos'],
  true,
  true,
  'Oficina Plusterra'
);