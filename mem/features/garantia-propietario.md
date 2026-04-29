---
name: garantia-propietario
description: Owner guarantee records — managed-only, configurable percentage, owner statement only
type: feature
---
Owner guarantee module (Edificios → tab "Garantías"):

- Tabla `owner_guarantee_records` con `monto_propietario` GENERATED `(monto_garantia_total * porcentaje_propietario / 100)`.
- Trigger `trg_auto_create_owner_guarantee` se dispara al cambiar `properties.status` a 'rented' SOLO si la propiedad pertenece a una `units.building_id` no nulo (administrada). Crea fila `pending` con monto sugerido del contrato activo.
- Admin/Gerente/Secretaría/SuperAdmin gestionan vía `OwnerGuaranteesTab`. Agentes NUNCA ven este módulo.
- Porcentaje configurable por operación (default 50, casos: 65, 70). Editable en UI.
- Solo afecta el Informe del Propietario (`useOwnerStatement` agrega línea income source='guarantee' cuando status='registered' y period coincide).
- NO toca Finanzas, Comisiones, Ganancia Plusterra ni Liquidaciones de edificio.
- Estados: pending | registered | no_aplica (con motivo).
