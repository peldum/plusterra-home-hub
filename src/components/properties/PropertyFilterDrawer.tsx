import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ChevronLeft, X } from 'lucide-react';

const typeOptions = [
  { value: 'apartment', label: 'Departamento' },
  { value: 'house', label: 'Casa' },
  { value: 'land', label: 'Terreno' },
  { value: 'office', label: 'Oficina' },
  { value: 'commercial', label: 'Local' },
  { value: 'other', label: 'Otro' },
];

export interface PropertyFilters {
  status: string;
  operation: string;
  type: string;
  currency: string;
  garage: string;
  bedrooms: string;
  neighborhood: string;
  priceMin: string;
  priceMax: string;
  agent: string;
}

export const defaultFilters: PropertyFilters = {
  status: 'all',
  operation: 'all',
  type: 'all',
  currency: 'all',
  garage: 'all',
  bedrooms: 'all',
  neighborhood: 'all',
  priceMin: '',
  priceMax: '',
  agent: 'all',
};

interface PropertyFilterDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: PropertyFilters;
  setFilters: (f: PropertyFilters) => void;
  neighborhoods: string[];
  agents?: { id: string; name: string }[];
}

export const getActiveFilterCount = (f: PropertyFilters) => {
  return [f.status, f.operation, f.type, f.currency, f.garage, f.bedrooms, f.neighborhood, f.agent]
    .filter(v => v !== 'all').length + (f.priceMin ? 1 : 0) + (f.priceMax ? 1 : 0);
};

export const getActiveFilterChips = (f: PropertyFilters, agentsList?: { id: string; name: string }[]): { key: string; label: string }[] => {
  const chips: { key: string; label: string }[] = [];
  if (f.status !== 'all') chips.push({ key: 'status', label: f.status === 'available' ? 'Disponible' : f.status === 'reservation_request' ? 'Solicitud' : f.status === 'reserved' ? 'Reservada' : f.status === 'rented' ? 'Alquilada' : 'Vendida' });
  if (f.operation !== 'all') chips.push({ key: 'operation', label: f.operation === 'rent' ? 'Alquiler' : f.operation === 'sale' ? 'Venta' : 'Temporal' });
  if (f.type !== 'all') chips.push({ key: 'type', label: typeOptions.find(t => t.value === f.type)?.label || f.type });
  if (f.currency !== 'all') chips.push({ key: 'currency', label: f.currency });
  if (f.garage !== 'all') chips.push({ key: 'garage', label: f.garage === 'yes' ? 'Con cochera' : 'Sin cochera' });
  if (f.bedrooms !== 'all') chips.push({ key: 'bedrooms', label: `${f.bedrooms}+ Dorm.` });
  if (f.neighborhood !== 'all') chips.push({ key: 'neighborhood', label: f.neighborhood });
  if (f.agent !== 'all') chips.push({ key: 'agent', label: agentsList?.find(a => a.id === f.agent)?.name || 'Agente' });
  if (f.priceMin) chips.push({ key: 'priceMin', label: `Desde ${Number(f.priceMin).toLocaleString()}` });
  if (f.priceMax) chips.push({ key: 'priceMax', label: `Hasta ${Number(f.priceMax).toLocaleString()}` });
  return chips;
};

const SelectField = ({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: React.ReactNode }) => (
  <div>
    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{label}</label>
    <select value={value} onChange={e => onChange(e.target.value)}
      className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm">
      {children}
    </select>
  </div>
);

export const PropertyFilterDrawer = ({ open, onOpenChange, filters, setFilters, neighborhoods, agents }: PropertyFilterDrawerProps) => {
  const update = (key: keyof PropertyFilters, value: string) => setFilters({ ...filters, [key]: value });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-80 sm:w-96 overflow-y-auto">
        <SheetHeader className="sr-only">
          <SheetTitle>Filtros</SheetTitle>
        </SheetHeader>
        <div className="sticky top-0 z-10 bg-card pt-3 pb-2 flex items-center justify-between">
          <button
            onClick={() => onOpenChange(false)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            <span>Volver</span>
          </button>
          <span className="font-display font-semibold text-base">Filtros</span>
          <button
            onClick={() => onOpenChange(false)}
            className="p-1.5 rounded-full hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
        <div className="space-y-4 mt-4">
          <SelectField label="Estado" value={filters.status} onChange={v => update('status', v)}>
            <option value="all">Todos</option>
            <option value="available">Disponible</option>
            <option value="reservation_request">Solicitud de Reserva</option>
            <option value="reserved">Reservada</option>
            <option value="rented">Alquilada</option>
            <option value="sold">Vendida</option>
          </SelectField>

          <SelectField label="Operación" value={filters.operation} onChange={v => update('operation', v)}>
            <option value="all">Todas</option>
            <option value="rent">Alquiler</option>
            <option value="sale">Venta</option>
            <option value="temporary">Temporal</option>
          </SelectField>

          <SelectField label="Tipo" value={filters.type} onChange={v => update('type', v)}>
            <option value="all">Todos</option>
            {typeOptions.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </SelectField>

          <SelectField label="Moneda" value={filters.currency} onChange={v => update('currency', v)}>
            <option value="all">Todas</option>
            <option value="PYG">Guaraníes</option>
            <option value="USD">Dólares</option>
          </SelectField>

          <SelectField label="Cochera" value={filters.garage} onChange={v => update('garage', v)}>
            <option value="all">Todas</option>
            <option value="yes">Con cochera</option>
            <option value="no">Sin cochera</option>
          </SelectField>

          <SelectField label="Dormitorios mín." value={filters.bedrooms} onChange={v => update('bedrooms', v)}>
            <option value="all">Todos</option>
            <option value="1">1+</option>
            <option value="2">2+</option>
            <option value="3">3+</option>
            <option value="4">4+</option>
          </SelectField>

          <SelectField label="Zona / Barrio" value={filters.neighborhood} onChange={v => update('neighborhood', v)}>
            <option value="all">Todas</option>
            {neighborhoods.map(n => <option key={n} value={n}>{n}</option>)}
          </SelectField>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Precio mín.</label>
              <input type="number" value={filters.priceMin} onChange={e => update('priceMin', e.target.value)}
                placeholder="0" className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Precio máx.</label>
              <input type="number" value={filters.priceMax} onChange={e => update('priceMax', e.target.value)}
                placeholder="∞" className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm" />
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-border">
            <button
              onClick={() => setFilters(defaultFilters)}
              className="flex-1 px-4 py-2.5 rounded-lg bg-muted text-muted-foreground text-sm font-medium hover:bg-muted/80 transition-colors"
            >
              Limpiar todo
            </button>
            <button
              onClick={() => onOpenChange(false)}
              className="flex-1 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Aplicar
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
