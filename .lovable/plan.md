Objetivo: dejar profesional y consistente el registro de operaciones compartidas, diferenciando claramente entre un segundo agente interno y un co-broker externo.

Plan:
1. Corregir el modal de edición de comisión rápida
   - Al elegir “Interno”, guardar siempre `is_co_agent=true` con `co_agent_id`.
   - Al elegir “Externo”, guardar solo datos de co-broker (`is_cobroker=true`) y limpiar cualquier `co_agent_id` interno.
   - Al cambiar agente principal, evitar que el mismo agente quede como segundo agente.

2. Corregir por qué Joel “aparece y desaparece”
   - La lista actual filtra solo por `agent_id`, entonces si se filtra por Joel como co-agente puede desaparecer.
   - Ajustar el filtro para que incluya comisiones donde el agente sea principal o co-agente interno.
   - Mostrar explícitamente en la tarjeta: “Sandra Benítez + Joel …” cuando sea interno.

3. Ajustar la lógica de externo
   - Un externo no debe figurar como “comisión de agente interno” ni como ganancia/canon de agente del sistema.
   - Si es co-broker externo, solo debe quedar como referencia informativa: nombre/empresa externa.
   - No debe recibir `co_agent_net_amount` ni `co_agent_retention` como si fuera agente interno.

4. Ajustar visualización y reportes
   - En el listado de comisiones, mostrar badge “Co-broker externo” y el nombre/empresa si existe.
   - En PDF/Excel, poner el externo en una columna descriptiva o como observación, pero sin sumarlo como ganancia de cerrador interno.
   - En cierre mensual/resumen por agente, contar retención separada solo para co-agentes internos; externo no suma como agente.

5. Validar impacto financiero
   - Mantener intacta la retención Plusterra 15% para operaciones internas normales.
   - Para co-agente interno, mantener split 50/50 de la ganancia entre agentes si ya fue calculado así.
   - Para externo, no recalcular ni crear una ganancia interna adicional; solo registrar quién participó externamente.

Notas técnicas:
- Archivos principales: `ComisionesTab.tsx`, `QuickCommissionDialog.tsx`, `useCierreMensual.ts` y exportador `commissionReportExport.ts`.
- No se tocarán montos históricos salvo que haga falta limpiar campos inconsistentes al guardar una edición futura.
- Si después querés corregir registros ya cargados que quedaron mal, conviene hacer una revisión puntual de esos IDs antes de migrar datos.