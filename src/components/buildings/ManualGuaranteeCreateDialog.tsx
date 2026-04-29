import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2, Plus, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

interface ManagedUnitOption {
  property_id: string;
  unit_id: string;
  building_id: string;
  building_name: string;
  unit_code: string;
  property_title: string;
  property_code: string;
  owner_id: string | null;
  owner_name: string;
  status: string;
}

export const ManualGuaranteeCreateDialog = ({ open, onOpenChange }: Props) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [creatingId, setCreatingId] = useState<string | null>(null);

  const { data: options, isLoading } = useQuery({
    queryKey: ['managed-units-for-guarantee'],
    queryFn: async (): Promise<ManagedUnitOption[]> => {
      const { data: units, error } = await supabase
        .from('units')
        .select('id, unit_code, building_id, property_id')
        .not('building_id', 'is', null)
        .not('property_id', 'is', null);
      if (error) throw error;
      const propIds = (units || []).map((u: any) => u.property_id).filter(Boolean);
      const bIds = Array.from(new Set((units || []).map((u: any) => u.building_id).filter(Boolean)));
      if (propIds.length === 0) return [];
      const [propsRes, bldgsRes] = await Promise.all([
        supabase.from('properties').select('id, title, property_code, owner_id, status').in('id', propIds),
        supabase.from('buildings').select('id, name').in('id', bIds),
      ]);
      const ownerIds = Array.from(new Set((propsRes.data || []).map((p: any) => p.owner_id).filter(Boolean)));
      const ownersRes = ownerIds.length
        ? await supabase.from('owners').select('id, full_name').in('id', ownerIds)
        : { data: [] as any[] };
      const pMap = new Map((propsRes.data || []).map((p: any) => [p.id, p]));
      const bMap = new Map((bldgsRes.data || []).map((b: any) => [b.id, b]));
      const oMap = new Map((ownersRes.data || []).map((o: any) => [o.id, o]));
      return (units || [])
        .map((u: any) => {
          const p = pMap.get(u.property_id);
          if (!p) return null;
          return {
            property_id: u.property_id,
            unit_id: u.id,
            building_id: u.building_id,
            building_name: bMap.get(u.building_id)?.name || 'Sin edificio',
            unit_code: u.unit_code,
            property_title: p.title,
            property_code: p.property_code,
            owner_id: p.owner_id,
            owner_name: oMap.get(p.owner_id)?.full_name || '—',
            status: p.status,
          } as ManagedUnitOption;
        })
        .filter(Boolean) as ManagedUnitOption[];
    },
    enabled: open,
    staleTime: 30_000,
  });

  const filtered = (options || []).filter((o) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      o.unit_code?.toLowerCase().includes(s) ||
      o.building_name?.toLowerCase().includes(s) ||
      o.property_title?.toLowerCase().includes(s) ||
      o.property_code?.toLowerCase().includes(s) ||
      o.owner_name?.toLowerCase().includes(s)
    );
  });

  const create = async (opt: ManagedUnitOption) => {
    setCreatingId(opt.unit_id);
    const today = new Date();
    const period = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const { error } = await (supabase as any)
      .from('owner_guarantee_records')
      .insert({
        property_id: opt.property_id,
        unit_id: opt.unit_id,
        building_id: opt.building_id,
        owner_id: opt.owner_id,
        period,
        monto_garantia_total: 0,
        porcentaje_propietario: 50,
        currency: 'PYG',
        status: 'pending',
        created_by: user?.id,
      });
    setCreatingId(null);
    if (error) {
      toast.error('Error al crear: ' + error.message);
      return;
    }
    toast.success('Garantía pendiente creada. Ahora registrala con el monto.');
    qc.invalidateQueries({ queryKey: ['owner-guarantees'] });
    qc.invalidateQueries({ queryKey: ['owner-guarantees-pending-count'] });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" />
            Generar garantía manual
          </DialogTitle>
          <DialogDescription>
            Para casos ya alquilados antes de activar este módulo. Elegí la unidad de edificio y se creará una garantía pendiente para que la registres.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por edificio, unidad, propietario, código..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex-1 overflow-auto border rounded-md">
          {isLoading ? (
            <div className="p-8 text-center"><Loader2 className="w-5 h-5 animate-spin inline" /></div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No se encontraron unidades de edificios.
            </div>
          ) : (
            <ul className="divide-y">
              {filtered.map((o) => (
                <li key={o.unit_id} className="p-3 flex items-center justify-between gap-3 hover:bg-muted/40">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {o.building_name} — Unidad {o.unit_code}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {o.property_code} · Propietario: {o.owner_name} · Estado: {o.status}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => create(o)}
                    disabled={creatingId === o.unit_id}
                  >
                    {creatingId === o.unit_id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Crear'}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
