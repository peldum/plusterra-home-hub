import { useState, useMemo, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Search, X, Users } from 'lucide-react';
import type { BuildingUnit } from '@/hooks/useBuildingDetail';

export interface OwnerOption {
  id: string;
  full_name: string;
  document_number?: string | null;
  email?: string | null;
  phone?: string | null;
}

interface Props {
  units: BuildingUnit[];
  selectedOwnerId: string | null;
  onOwnerChange: (ownerId: string | null) => void;
  groupByOwner: boolean;
  onGroupByOwnerChange: (v: boolean) => void;
}

export const LiquidationOwnerFilter = ({
  units,
  selectedOwnerId,
  onOwnerChange,
  groupByOwner,
  onGroupByOwnerChange,
}: Props) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Deduplicate owners from units
  const owners = useMemo(() => {
    const map = new Map<string, OwnerOption>();
    units.forEach(u => {
      u.owners.forEach(o => {
        if (!map.has(o.id)) {
          map.set(o.id, { id: o.id, full_name: o.full_name });
        }
      });
    });
    return Array.from(map.values()).sort((a, b) => a.full_name.localeCompare(b.full_name));
  }, [units]);

  const filtered = useMemo(() => {
    if (!query.trim()) return owners;
    const q = query.toLowerCase();
    return owners.filter(o =>
      o.full_name.toLowerCase().includes(q) ||
      (o.document_number && o.document_number.toLowerCase().includes(q)) ||
      (o.email && o.email.toLowerCase().includes(q)) ||
      (o.phone && o.phone.includes(q))
    );
  }, [owners, query]);

  const selectedOwner = owners.find(o => o.id === selectedOwnerId);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (owner: OwnerOption) => {
    onOwnerChange(owner.id);
    setQuery('');
    setOpen(false);
  };

  const handleClear = () => {
    onOwnerChange(null);
    setQuery('');
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
      {/* Owner search */}
      <div className="relative w-full sm:w-[220px]" ref={wrapperRef}>
        {selectedOwnerId ? (
          <div className="flex items-center gap-1.5 h-9 px-3 border border-border rounded-md bg-muted/50 text-sm">
            <Users className="w-3.5 h-3.5 text-primary flex-shrink-0" />
            <span className="truncate flex-1">{selectedOwner?.full_name ?? 'Propietario'}</span>
            <Button variant="ghost" size="icon" className="h-5 w-5 flex-shrink-0" onClick={handleClear}>
              <X className="w-3 h-3" />
            </Button>
          </div>
        ) : (
          <>
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Buscar propietario…"
              value={query}
              onChange={e => { setQuery(e.target.value); setOpen(true); }}
              onFocus={() => setOpen(true)}
              className="pl-8 h-9 text-xs"
            />
          </>
        )}

        {/* Dropdown */}
        {open && !selectedOwnerId && (
          <div className="absolute z-50 top-full mt-1 w-full bg-popover border border-border rounded-md shadow-lg max-h-[200px] overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-xs text-muted-foreground p-3 text-center">Sin resultados</p>
            ) : (
              filtered.map(o => (
                <button
                  key={o.id}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex items-center gap-2"
                  onClick={() => handleSelect(o)}
                >
                  <Users className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium">{o.full_name}</p>
                    {o.document_number && (
                      <p className="text-[10px] text-muted-foreground">{o.document_number}</p>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Group toggle */}
      <div className="flex items-center gap-2">
        <Switch
          id="group-owner"
          checked={groupByOwner}
          onCheckedChange={onGroupByOwnerChange}
          className="scale-90"
        />
        <Label htmlFor="group-owner" className="text-xs cursor-pointer whitespace-nowrap">
          Agrupar por propietario
        </Label>
      </div>
    </div>
  );
};
