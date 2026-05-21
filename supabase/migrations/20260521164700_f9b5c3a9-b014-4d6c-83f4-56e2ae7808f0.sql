INSERT INTO public.ai_manual_sections (title, category, content, display_order, is_active) VALUES
(
  'Cómo corregir una garantía cargada en el mes equivocado',
  'garantias',
  E'Si una garantía quedó registrada en el mes equivocado (por ejemplo, se cargó en abril pero correspondía a mayo), seguí estos pasos:\n\n**Opción A — Solución rápida (recomendada para Gerente/Admin):**\n1. Andá a **Administración → Garantías del propietario**.\n2. Buscá la garantía equivocada y tocá **Eliminar**.\n3. Volvé a **cargar** la garantía dentro del mes correcto (la fecha de carga será la de hoy, pero quedará en el período correcto).\n4. Verificá en el reporte mensual que aparece en el mes deseado.\n\n**Opción B — Si el reporte del mes anterior ya fue enviado al propietario:**\n- No vuelvas a cargarla en el mes nuevo si ya fue declarada al propietario. Avisale al SuperAdmin y se ajusta manualmente.\n\n**Importante:**\n- El sistema asigna el período (mes contable) automáticamente según la fecha en que se carga la garantía.\n- Si solés cargar garantías de meses anteriores, hacelo dentro del mes que corresponde para evitar este problema.\n- Si no podés borrar (porque ya se liquidó), avisá al SuperAdmin.',
  2,
  true
),
(
  'Cómo evitar y resolver garantías duplicadas',
  'garantias',
  E'Una garantía duplicada aparece cuando se carga dos veces el mismo monto para el mismo propietario en el mismo período. Para evitarlas y resolverlas:\n\n**Para evitar duplicados:**\n1. Antes de cargar una garantía, andá a **Administración → Garantías del propietario** y filtrá por el propietario.\n2. Revisá si ya existe un registro del mismo monto en el mes actual.\n3. Si ya existe, NO la cargues de nuevo: editá la existente si hace falta cambiar algo.\n\n**Para resolver un duplicado existente:**\n1. Andá a **Administración → Garantías del propietario**.\n2. Identificá los dos registros iguales (mismo propietario, monto y período).\n3. Eliminá el más reciente (o el que tenga estado *Pendiente* si el otro ya está *Registrada*).\n4. Verificá que el reporte mensual ya muestre un solo registro.\n\n**Consejo:** Si dudás cuál borrar, avisá al SuperAdmin antes — siempre se puede recuperar.',
  3,
  true
);