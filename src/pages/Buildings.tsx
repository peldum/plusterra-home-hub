import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Building2, MapPin, Layers, Loader2, Plus, LayoutGrid, TableIcon, Users, FileText, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { BuildingFormDialog } from '@/components/buildings/BuildingFormDialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface BuildingEnriched {
  id: string;
  name: string;
  address: string;
  city: string | null;
  floors: number | null;
  total_units: number | null;
  category: string | null;
  admin_model: string;
  external_admin_company: string | null;
  unitCount: number;
  occupiedCount: number;
  ownerCount: number;
  contractCount: number;
}

const Buildings = () => {
  const navigate = useNavigate();
  const { role } = useAuth();
  const canCreate = role === 'superadmin' || role === 'admin' || role === 'accounting' || role === 'secretaria';
  const [showCreate, setShowCreate] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  const { data: buildings, isLoading } = useQuery({
    queryKey: ['buildings-list-enriched'],
    queryFn: async () => {
      // 1. Get buildings
      const { data: rawBuildings, error } = await supabase
        .from('buildings')
        .select('id, name, address, city, floors, total_units, category, admin_model, external_admin_company')
        .order('name');
      if (error) throw error;
      if (!rawBuildings || rawBuildings.length === 0) return [];

      const buildingIds = rawBuildings.map(b => b.id);

      // 2. Get units per building
      const { data: units } = await supabase
        .from('units')
        .select('id, building_id')
        .in('building_id', buildingIds);

      // 3. Get properties linked to units (to know occupancy)
      const unitIds = (units || []).map(u => u.id);
      let propertiesByUnit: Record<string, { id: string; status: string }> = {};
      let contractCountByBuilding: Record<string, number> = {};

      if (unitIds.length > 0) {
        const { data: properties } = await supabase
          .from('properties')
          .select('id, unit_id, status')
          .in('unit_id', unitIds);

        (properties || []).forEach(p => {
          if (p.unit_id) propertiesByUnit[p.unit_id] = { id: p.id, status: p.status };
        });

        // 4. Get active contracts for these properties
        const propIds = (properties || []).map(p => p.id);
        if (propIds.length > 0) {
          const { data: contracts } = await supabase
            .from('contracts')
            .select('id, property_id')
            .in('property_id', propIds)
            .in('status', ['active', 'near_expiration']);

          // Map contracts back to buildings
          const propToBuilding: Record<string, string> = {};
          (properties || []).forEach(p => {
            if (p.unit_id) {
              const unit = (units || []).find(u => u.id === p.unit_id);
              if (unit) propToBuilding[p.id] = unit.building_id;
            }
          });

          (contracts || []).forEach(c => {
            const bId = propToBuilding[c.property_id!];
            if (bId) contractCountByBuilding[bId] = (contractCountByBuilding[bId] || 0) + 1;
          });
        }
      }

      // 5. Get unique owners per building
      const { data: unitOwners } = await supabase
        .from('unit_owners')
        .select('unit_id, owner_id')
        .in('unit_id', unitIds);

      // Build enriched data
      const unitsByBuilding: Record<string, string[]> = {};
      (units || []).forEach(u => {
        if (!unitsByBuilding[u.building_id]) unitsByBuilding[u.building_id] = [];
        unitsByBuilding[u.building_id].push(u.id);
      });

      const ownersByBuilding: Record<string, Set<string>> = {};
      (unitOwners || []).forEach((uo: any) => {
        const unit = (units || []).find(u => u.id === uo.unit_id);
        if (unit) {
          if (!ownersByBuilding[unit.building_id]) ownersByBuilding[unit.building_id] = new Set();
          ownersByBuilding[unit.building_id].add(uo.owner_id);
        }
      });

      return rawBuildings.map(b => {
        const bUnits = unitsByBuilding[b.id] || [];
        const occupied = bUnits.filter(uid => {
          const prop = propertiesByUnit[uid];
          return prop && prop.status === 'rented';
        }).length;

        return {
          ...b,
          unitCount: bUnits.length,
          occupiedCount: occupied,
          ownerCount: ownersByBuilding[b.id]?.size || 0,
          contractCount: contractCountByBuilding[b.id] || 0,
        } as BuildingEnriched;
      });
    },
  });

  // Global stats
  const totalBuildings = buildings?.length || 0;
  const totalUnits = buildings?.reduce((s, b) => s + b.unitCount, 0) || 0;
  const totalOccupied = buildings?.reduce((s, b) => s + b.occupiedCount, 0) || 0;
  const totalOwners = new Set(buildings?.flatMap(() => []) || []).size; // unique across
  const globalOccupancy = totalUnits > 0 ? Math.round((totalOccupied / totalUnits) * 100) : 0;
  const totalContracts = buildings?.reduce((s, b) => s + b.contractCount, 0) || 0;
  const totalOwnersGlobal = buildings?.reduce((s, b) => s + b.ownerCount, 0) || 0;

  const getOccupancyColor = (pct: number) => {
    if (pct >= 80) return 'text-green-600 dark:text-green-400';
    if (pct >= 50) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getOccupancyBadge = (pct: number) => {
    if (pct >= 80) return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    if (pct >= 50) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
  };

  const getProgressColor = (pct: number) => {
    if (pct >= 80) return '[&>div]:bg-green-500';
    if (pct >= 50) return '[&>div]:bg-yellow-500';
    return '[&>div]:bg-red-500';
  };

  const getAdminLabel = (model: string, company?: string | null) => {
    if (model === 'modelo_1') return company || 'Tercerizada';
    if (model === 'modelo_2') return 'Directa';
    if (model === 'modelo_3') return 'Prop. directo';
    return model;
  };

  return (
    <MainLayout title="Propiedades en Administración">
      {/* Stats globales */}
      {!isLoading && buildings && buildings.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-card border border-border rounded-xl p-4 text-center">
            <Building2 className="w-5 h-5 mx-auto mb-1 text-primary" />
            <p className="text-2xl font-bold text-foreground">{totalBuildings}</p>
            <p className="text-xs text-muted-foreground">Edificios</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 text-center">
            <Layers className="w-5 h-5 mx-auto mb-1 text-info" />
            <p className="text-2xl font-bold text-foreground">{totalUnits}</p>
            <p className="text-xs text-muted-foreground">Unidades totales</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 text-center">
            <TrendingUp className={`w-5 h-5 mx-auto mb-1 ${getOccupancyColor(globalOccupancy)}`} />
            <p className={`text-2xl font-bold ${getOccupancyColor(globalOccupancy)}`}>{globalOccupancy}%</p>
            <p className="text-xs text-muted-foreground">Ocupación global</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 text-center">
            <Users className="w-5 h-5 mx-auto mb-1 text-secondary" />
            <p className="text-2xl font-bold text-foreground">{totalOwnersGlobal}</p>
            <p className="text-xs text-muted-foreground">Propietarios</p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-muted-foreground">
          Gestión de edificios, casas y propiedades en administración.
        </p>
        <div className="flex items-center gap-2">
          {buildings && buildings.length > 0 && (
            <div className="flex bg-muted rounded-lg p-0.5">
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                className="h-7 px-2"
                onClick={() => setViewMode('table')}
              >
                <TableIcon className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'cards' ? 'default' : 'ghost'}
                size="sm"
                className="h-7 px-2"
                onClick={() => setViewMode('cards')}
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
            </div>
          )}
          {canCreate && (
            <Button onClick={() => setShowCreate(true)} className="gap-1.5">
              <Plus className="w-4 h-4" />
              Nuevo Edificio
            </Button>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}

      {!isLoading && (!buildings || buildings.length === 0) && (
        <div className="text-center py-16">
          <Building2 className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground mb-4">No hay edificios registrados.</p>
          {canCreate && (
            <Button variant="outline" onClick={() => setShowCreate(true)} className="gap-1.5">
              <Plus className="w-4 h-4" />
              Crear tu primer edificio
            </Button>
          )}
        </div>
      )}

      {/* TABLE VIEW */}
      {!isLoading && buildings && buildings.length > 0 && viewMode === 'table' && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Edificio</TableHead>
                <TableHead className="hidden sm:table-cell">Dirección</TableHead>
                <TableHead className="text-center">Unidades</TableHead>
                <TableHead className="text-center">Ocupación</TableHead>
                <TableHead className="text-center hidden md:table-cell">Dueños</TableHead>
                <TableHead className="text-center hidden md:table-cell">Contratos</TableHead>
                <TableHead className="hidden lg:table-cell">Admin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {buildings.map(b => {
                const occPct = b.unitCount > 0 ? Math.round((b.occupiedCount / b.unitCount) * 100) : 0;
                return (
                  <TableRow
                    key={b.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/edificios/${b.id}`)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-foreground">{b.name}</p>
                          <p className="text-xs text-muted-foreground sm:hidden truncate max-w-[140px]">
                            {b.address}{b.city ? `, ${b.city}` : ''}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <p className="text-xs text-muted-foreground flex items-center gap-1 truncate max-w-[200px]">
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        {b.address}{b.city ? `, ${b.city}` : ''}
                      </p>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-medium text-sm">{b.unitCount}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col items-center gap-1 min-w-[80px]">
                        <Badge className={`text-[10px] border-0 ${getOccupancyBadge(occPct)}`}>
                          {b.occupiedCount}/{b.unitCount} ({occPct}%)
                        </Badge>
                        <Progress value={occPct} className={`h-1.5 w-16 ${getProgressColor(occPct)}`} />
                      </div>
                    </TableCell>
                    <TableCell className="text-center hidden md:table-cell">
                      <div className="flex items-center justify-center gap-1">
                        <Users className="w-3 h-3 text-muted-foreground" />
                        <span className="text-sm">{b.ownerCount}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center hidden md:table-cell">
                      <div className="flex items-center justify-center gap-1">
                        <FileText className="w-3 h-3 text-muted-foreground" />
                        <span className="text-sm">{b.contractCount}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <Badge variant="outline" className="text-[10px]">
                        {getAdminLabel(b.admin_model, b.external_admin_company)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* CARDS VIEW */}
      {!isLoading && buildings && buildings.length > 0 && viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {buildings.map(b => {
            const occPct = b.unitCount > 0 ? Math.round((b.occupiedCount / b.unitCount) * 100) : 0;
            return (
              <div
                key={b.id}
                onClick={() => navigate(`/edificios/${b.id}`)}
                className="bg-card border border-border rounded-xl p-5 hover:shadow-lg hover:border-primary/30 transition-all cursor-pointer group"
              >
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground text-sm leading-tight group-hover:text-primary transition-colors">
                      {b.name}
                    </h3>
                    {b.address && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1 truncate">
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        {b.address}{b.city ? `, ${b.city}` : ''}
                      </p>
                    )}
                  </div>
                </div>

                {/* Occupancy bar */}
                <div className="mt-3 space-y-1">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-muted-foreground">Ocupación</span>
                    <span className={`font-semibold ${getOccupancyColor(occPct)}`}>{occPct}%</span>
                  </div>
                  <Progress value={occPct} className={`h-1.5 ${getProgressColor(occPct)}`} />
                </div>

                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <Badge variant="secondary" className="text-[10px]">
                    <Layers className="w-3 h-3 mr-1" />
                    {b.unitCount} unid.
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    <Users className="w-3 h-3 mr-1" />
                    {b.ownerCount} dueños
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    <FileText className="w-3 h-3 mr-1" />
                    {b.contractCount} contratos
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    {getAdminLabel(b.admin_model, b.external_admin_company)}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <BuildingFormDialog open={showCreate} onOpenChange={setShowCreate} />
    </MainLayout>
  );
};

export default Buildings;
