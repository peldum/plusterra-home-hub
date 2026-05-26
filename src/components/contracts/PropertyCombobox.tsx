import { useState, useMemo } from 'react';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';

interface PropertyOption {
  id: string;
  title?: string | null;
  internal_title?: string | null;
  property_code?: string | null;
}

interface PropertyComboboxProps {
  properties: PropertyOption[] | undefined;
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export const PropertyCombobox = ({ properties, value, onChange, placeholder = 'Seleccionar...', disabled }: PropertyComboboxProps) => {
  const [open, setOpen] = useState(false);

  const selected = useMemo(
    () => properties?.find((p) => p.id === value),
    [properties, value]
  );

  const selectedLabel = selected
    ? `${(selected as any).property_code || ''} · ${((selected as any).internal_title?.trim() || selected.title || '').slice(0, 45)}`
    : '';

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          <span className={cn('truncate', !selected && 'text-muted-foreground')}>
            {selected ? selectedLabel : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command
          filter={(value, search) => {
            if (!search) return 1;
            return value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0;
          }}
        >
          <CommandInput placeholder="Buscar por código o título..." />
          <CommandList>
            <CommandEmpty>Sin resultados.</CommandEmpty>
            <CommandGroup>
              {properties?.map((p) => {
                const code = (p as any).property_code || '';
                const label = ((p as any).internal_title?.trim() || p.title || '').slice(0, 60);
                const searchValue = `${code} ${label} ${p.title || ''}`;
                return (
                  <CommandItem
                    key={p.id}
                    value={searchValue}
                    onSelect={() => {
                      onChange(p.id);
                      setOpen(false);
                    }}
                  >
                    <Check className={cn('mr-2 h-4 w-4', value === p.id ? 'opacity-100' : 'opacity-0')} />
                    <span className="font-mono text-xs text-muted-foreground mr-2">{code}</span>
                    <span className="font-medium truncate">{label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};