

## Plan: Buscador inteligente en Comisiones — incluye propiedad + monto

### Dónde

En el tab **Finanzas → Com. Alq. y Ventas**, entre los filtros (agente / tipo / mes) y los botones PDF/Excel.

### Comportamiento

**Input único** con icono lupa, placeholder: _"Buscar por propiedad, código, cliente o monto… (ej: 4to costanera, PLT-2026, 2.500.000)"_, botón ✕ para limpiar.

**Campos donde busca**:
- 🏠 **Nombre/título de propiedad** (`_property_title`, `deal.properties.title`)
- 🔖 **Código de propiedad** (`_property_code`, ej: PLT-2026-0019)
- 📍 **Dirección libre** (`property_address` — para Comisiones Rápidas sin propiedad ligada)
- 👤 **Nombre del cliente** (`deal.clients.full_name`)
- 💰 **Monto / precio** (gross_amount, net_amount, deal.amount) — **NUEVO**
- 📝 **Notas** (`notes`)

**Tolerancia inteligente**:
1. Normaliza acentos (á→a, ñ→n) y mayúsculas → "Costanera" = "costanera" = "cóstanera".
2. Divide la consulta en palabras sueltas. Cada palabra debe aparecer en algún campo (AND entre palabras, OR entre campos). Ej: `"4to costanera"` encuentra "Departamento 4to piso vista costanera".
3. Match por substring → "depto" matchea "departamento".
4. **Búsqueda por monto inteligente** — NUEVO:
   - Si el usuario escribe un número (ignorando puntos/comas/Gs.), se compara contra `gross_amount`, `net_amount` y `deal.amount`.
   - Tolerancia ±5% para errores de tipeo: `2500000` matchea montos entre 2.375.000 y 2.625.000.
   - Acepta formatos: `2500000`, `2.500.000`, `2,500,000`, `Gs 2500000`, `2500 mil`, `2.5M` (millones).
   - Ejemplos: `"2500000"` → encuentra todas las comisiones con monto cercano a 2.5M; `"50000"` → encuentra comisiones de ~50.000.

**Feedback visual**:
- Contador en tiempo real al lado de cada heading: _"3 resultados de 46"_.
- Sin resultados: _"Sin coincidencias para «xyz». Probá con menos palabras o revisá el monto."_
- Combinable con filtros agente / tipo / mes (filtra DENTRO de lo ya filtrado).
- Esc limpia el campo.

### Cambios técnicos

**Archivo único**: `src/components/finances/ComisionesTab.tsx`

1. State: `const [searchQuery, setSearchQuery] = useState('')`.
2. Helper `normalizeText(s)` — minúsculas + `.normalize('NFD').replace(/[\u0300-\u036f]/g,'')`.
3. Helper `parseAmountQuery(q)` — extrae número limpio: remueve `Gs`, puntos, comas, espacios; soporta sufijos `M` (×1.000.000) y `mil`/`k` (×1.000). Devuelve `null` si no es numérico.
4. Helper `matchesSearch(item, query)`:
   - Para cada palabra de la query:
     - Si parece monto (`parseAmountQuery` ≠ null) → compara contra `[gross_amount, net_amount, deal.amount]` con tolerancia ±5%.
     - Si no → match substring contra `[title, code, address, client, notes]` normalizados.
   - Devuelve `true` si TODAS las palabras matchean en algún campo.
5. Aplicar a `filtered` (deals) y `filteredQuick` (comisiones rápidas).
6. UI: insertar `<Input>` con icono `<Search>` (lucide-react) entre los selects y los botones export. Width `w-full md:w-80`.
7. Badge de resultados al lado de los headings cuando `searchQuery.trim() !== ''`.

### Garantías

- **Cero cambios en BD** — todo client-side sobre datos ya cargados.
- **PDF/Excel respetan el buscador** automáticamente (consumen los arrays filtrados).
- **Cero impacto en otros tabs/módulos**.
- **Sin debounce** — filtrado instantáneo en memoria.

### Resultado esperado

- `"casa francisco"` → "Casa San Francisco"
- `"4to"` → "Departamento 4to piso"
- `"costanera"` → todas con esa palabra
- `"PLT-2026"` → todas las del año
- `"2500000"` o `"2.5M"` → comisiones con monto cercano a 2.5M ±5%
- `"50.000"` → comisiones de ~50K
- `"lujoso lago 2500000"` → combinación texto + monto
- Combinable con filtros de agente / mes / tipo.

### Memoria a actualizar

Agregar a `mem://features/ux-crm-busqueda-y-filtros`: *"El tab Comisiones de Finanzas incluye un buscador tolerante (acentos, mayúsculas, palabras parciales en cualquier orden) que matchea sobre título de propiedad, código PLT, dirección, cliente, notas y montos (gross/net/deal con tolerancia ±5% y formatos `2.500.000`, `2.5M`, `2500 mil`, `Gs`)."*

### Archivos modificados

- `src/components/finances/ComisionesTab.tsx`

