import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Owner } from '@/hooks/useOwners';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import {
  Mail, Phone, MapPin, FileText, Home, Loader2, ArrowLeft,
  ReceiptText, Building2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface OwnerDetailDrawerProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  owner: Owner | null;
  onOpenStatement: (owner: Owner) => void;
}

const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  available: { label: 'Disponible', variant: 'default' },
  rented: { label: 'Alquilado', variant: 'secondary' },
  sold: { label: 'Vendido', variant: 'outline' },
  reserved: { label: 'Reservado', variant: 'secondary' },
  draft: { label: 'Borrador', variant: 'outline' },
  archived: { label: 'Archivado', variant: 'destructive' },
};

const typeLabels: Record<string, string> = {
  apartment: 'Departamento',
  house: 'Casa',
  land: 'Terreno',
  office: 'Oficina',
  commercial: 'Comercial',
  other: 'Otro',
};

export const OwnerDetailDrawer = ({ open, onOpenChange, owner, onOpenStatement }: OwnerDetailDrawerProps) => {
  const { data: properties, isLoading } = useQuery({
    queryKey: ['owner-properties', owner?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('properties')
        .select('id, property_code, title, address, status, property_type, city, neighborhood')
        .eq('owner_id', owner!.id)
        .order('property_code');
      if (error) throw error;
      return data;
    },
    enabled: !!owner?.id && open,
  });

  if (!owner) return null;

  const initials = owner.full_name
    .split(' ')
    .map(w => w[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        {/* Sticky header */}
        <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => onOpenChange(false)}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <SheetHeader className="flex-1 space-y-0">
            <SheetTitle className="text-base">{owner.full_name}</SheetTitle>
            <SheetDescription className="text-xs">
              {owner.document_type || 'CI'}: {owner.document_number || '—'}
            </SheetDescription>
          </SheetHeader>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Owner info card */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-lg font-bold text-primary">{initials}</span>
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-foreground text-lg leading-tight">{owner.full_name}</h2>
                {owner.document_number && (
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {owner.document_type || 'CI'}: {owner.document_number}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              {owner.email && (
                <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                  <Mail className="w-4 h-4 flex-shrink-0 text-primary/60" />
                  <span className="truncate">{owner.email}</span>
                </div>
              )}
              {owner.phone && (
                <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                  <Phone className="w-4 h-4 flex-shrink-0 text-primary/60" />
                  <span>{owner.phone}</span>
                </div>
              )}
              {owner.address && (
                <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4 flex-shrink-0 text-primary/60" />
                  <span className="truncate">{owner.address}</span>
                </div>
              )}
            </div>

            {owner.notes && (
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-xs text-muted-foreground">{owner.notes}</p>
              </div>
            )}
          </div>

          {/* Properties section */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" />
                Propiedades
                {properties && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {properties.length}
                  </Badge>
                )}
              </h3>
            </div>

            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            )}

            {!isLoading && properties && properties.length === 0 && (
              <div className="text-center py-8">
                <Home className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">Sin propiedades asignadas</p>
              </div>
            )}

            {!isLoading && properties && properties.length > 0 && (
              <div className="space-y-2">
                {properties.map((prop) => {
                  const st = statusLabels[prop.status] || { label: prop.status, variant: 'outline' as const };
                  return (
                    <div
                      key={prop.id}
                      className="rounded-lg border border-border bg-card p-3 hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-mono font-medium text-primary">
                              {prop.property_code}
                            </span>
                            <Badge variant={st.variant} className="text-[10px] px-1.5 py-0">
                              {st.label}
                            </Badge>
                          </div>
                          <p className="text-sm font-medium text-foreground leading-tight truncate">
                            {prop.title}
                          </p>
                          {prop.address && (
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">
                              {prop.address}{prop.city ? `, ${prop.city}` : ''}
                            </p>
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded flex-shrink-0">
                          {typeLabels[prop.property_type] || prop.property_type}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Sticky footer */}
        <div className="sticky bottom-0 bg-background border-t border-border p-4">
          <button
            onClick={() => {
              onOpenChange(false);
              onOpenStatement(owner);
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <ReceiptText className="w-4 h-4" />
            Ver Estado de Cuenta
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
