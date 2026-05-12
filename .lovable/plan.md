## Regularización PLT-2026-0107 — Salón en Alquiler

Mismo patrón que aplicamos al PLT-2026-0029. Sandra Benitez captó, Lidiane Giménez cerró → comisión compartida 50/50.

### Datos
- Propiedad: PLT-2026-0107 — Salón en Alquiler (id `381e241b-…`)
- Marcado alquilado: 11/05/2026 09:50
- Captadora: Sandra Benitez (`ecec2ea5-…`)
- Co-agente (colocadora): **Lidiane Giménez** (`fb3e9de2-…`) — uso esa por defecto; si era "Lidiane Giménez López", lo corrijo después.
- Alquiler mensual: ₲ 1.500.000

### Cálculo comisión (85/15, co-agente 50/50)
- Bruto: ₲ 1.500.000
- Empresa (15%): ₲ 225.000
- Neto agentes (85%): ₲ 1.275.000
  - Sandra: ₲ 637.500
  - Lidiane: ₲ 637.500

### Acciones (vía supabase--insert)

1. **Insert en `quick_commissions`**
   - `property_id`, `agent_id` = Sandra, `gross_amount` = 1.500.000, `company_pct` = 15, `net_amount` = 1.275.000
   - `is_co_agent` = true, `co_agent_id` = Lidiane
   - `agent_net_amount` = 637.500, `co_agent_net_amount` = 637.500
   - `operation_date` = 2026-05-11, `status` = pending, currency PYG
   - `notes`: "Regularización post-marcado alquilado 11/05. Captadora Sandra, colocadora Lidiane (50/50)."

2. **Insert en `contracts`**
   - `property_id`, `contract_type` = rental, `start_date` = 2026-05-11, `end_date` = 2027-05-11
   - `monthly_rent` = 1.500.000, `currency` = PYG
   - `tenant_name` = "Por confirmar (regularización)"
   - `responsible_agent_id` = Sandra, `status` = active, `created_by` = Sandra

### Efectos esperados
- Aparece en Comisiones → Alquileres y Ventas (mes mayo)
- Aparece en Consolidado Comercial (mayo)
- Contrato activo visible en Contratos
- Receivable de mayo (₲ 1.500.000, vence 15/05) se autogenera por trigger
- Sale de "Comisiones pendientes"
- Lidiane ve la comisión compartida en su dashboard (RLS de co-agente)

### Reversión (si algo sale mal)
Eliminar los 2 registros recién creados por `notes` / `reference` y listo — no toco la propiedad ni el status.

### Verificación
Tras insertar, leo de vuelta `quick_commissions` + `contracts` + `receivables` para confirmar y te muestro.