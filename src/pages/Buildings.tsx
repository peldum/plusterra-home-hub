import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Building2, MapPin, Layers, Loader2, Plus, LayoutGrid, TableIcon, Users, FileText, TrendingUp, BarChart3, CalendarPlus, Coins, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BuildingFormDialog } from '@/components/buildings/BuildingFormDialog';
import { AdminSummaryDashboard } from '@/components/buildings/AdminSummaryDashboard';
import { PlusterraGainsTab } from '@/components/buildings/PlusterraGainsTab';
import { OwnerGuaranteesTab } from '@/components/buildings/OwnerGuaranteesTab';
import { useOwnerGuaranteesPendingCount } from '@/hooks/useOwnerGuarantees';
import { PrepaidRentDialog } from '@/components/buildings/PrepaidRentDialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DualScrollArea } from '@/components/ui/dual-scroll-area';
import { format } from 'date-fns';

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
  paidCount: number;
  pendingCount: number;
}

const Buildings = () => {
  const navigate = useNavigate();
  const { role } = useAuth();
  const canCreate = role === 'superadmin' || role === 'admin' || role === 'accounting' || role === 'secretaria';
  const isAdminLike = role === 'superadmin' || role === 'admin' || role === 'accounting' || role === 'secretaria';
  const [showCreate, setShowCreate] = useState(false);
  const [showPrepaid, setShowPrepaid] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const { data: pendingGuarantees = 0 } = useOwnerGuaranteesPendingCount();

  const currentPeriod = format(new Date(), 'yyyy-MM');

  const { data: buildings, isLoading } = useQuery({
    queryKey: ['buildings-list-enriched'],
    queryFn: async () => {
      const { data: rawBuildings, error } = await supabase
        .from('buildings')
        .select('id, name, address, city, floors, total_units, category, admin_model, external_admin_company')
        .order('name');
      if (error) throw error;
      if (!rawBuildings || rawBuildings.length === 0) return [];

      const buildingIds = rawBuildings.map(b => b.id);

      const { data: units } = await supabase
        .from('units')
        .select('id, building_id')
        .in('building_id', buildingIds);

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

        const propIds = (properties || []).map(p => p.id);
        if (propIds.length > 0) {
          const { data: contracts } = await supabase
            .from('contracts')
            .select('id, property_id')
            .in('property_id', propIds)
            .in('status', ['active', 'near_expiration']);

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

      const { data: unitOwners } = await supabase
        .from('unit_owners')
        .select('unit_id, owner_id')
        .in('unit_id', unitIds);

      // Fetch collection records for current period to build semaphore
      const { data: collectionRecords } = await supabase
        .from('unit_collection_records')
        .select('building_id, payment_status')
        .in('building_id', buildingIds)
        .eq('period', currentPeriod);

      const paidByBuilding: Record<string, number> = {};
      const pendingByBuilding: Record<string, number> = {};
      (collectionRecords || []).forEach((r: any) => {
        if (r.payment_status === 'paid') {
          paidByBuilding[r.building_id] = (paidByBuilding[r.building_id] || 0) + 1;
        } else {
          pendingByBuilding[r.building_id] = (pendingByBuilding[r.building_id] || 0) + 1;
        }
      });

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
          paidCount: paidByBuilding[b.id] || 0,
          pendingCount: pendingByBuilding[b.id] || 0,
        } as BuildingEnriched;
      });
    },
  });

  // All units for the prepaid dialog
  const allUnitsForPrepaid = useQuery({
    queryKey: ['all-units-for-prepaid'],
    enabled: showPrepaid,
    queryFn: async () => {
      const { data: units } = await supabase
        .from('units')
        .select('id, unit_code, building_id');
      if (!units) return [];
      const unitIds = units.map(u => u.id);
      const { data: unitOwners } = await supabase
        .from('unit_owners')
        .select('unit_id, owner_id, owners:owner_id(id, full_name)')
        .in('unit_id', unitIds);
      const { data: properties } = await supabase
        .from('properties')
        .select('unit_id, rental_price, currency')
        .in('unit_id', unitIds);

      const ownersMap: Record<string, { id: string; full_name: string }[]> = {};
      (unitOwners || []).forEach((uo: any) => {
        if (!ownersMap[uo.unit_id]) ownersMap[uo.unit_id] = [];
        if (uo.owners) ownersMap[uo.unit_id].push(uo.owners);
      });
      const propMap: Record<string, { rental_price: number | null; currency: string | null }> = {};
      (properties || []).forEach((p: any) => {
        if (p.unit_id) propMap[p.unit_id] = { rental_price: p.rental_price, currency: p.currency };
      });

      return units.map(u => ({
        id: u.id,
        unit_code: u.unit_code,
        owners: ownersMap[u.id] || [],
        property: propMap[u.id] || null,
      }));
    },
  });

  // Global stats
  const totalBuildings = buildings?.length || 0;
  const totalUnits = buildings?.reduce((s, b) => s + b.unitCount, 0) || 0;
  const totalOccupied = buildings?.reduce((s, b) => s + b.occupiedCount, 0) || 0;
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

  const getCollectionBadge = (paid: number, pending: number, total: number) => {
    if (total === 0) return null;
    if (paid === total) return <Badge className="text-[9px] bg-emerald-100 text-emerald-800 border-0 dark:bg-emerald-900/30 dark:text-emerald-400">✓ Al día</Badge>;
    if (paid === 0 && pending === 0) return <Badge variant="outline" className="text-[9px] text-muted-foreground">Sin datos</Badge>;
    const pct = Math.round((paid / (paid + pending)) * 100);
    if (pct >= 80) return <Badge className="text-[9px] bg-emerald-100 text-emerald-800 border-0 dark:bg-emerald-900/30 dark:text-emerald-400">{paid}/{paid + pending}</Badge>;
    if (pct >= 50) return <Badge className="text-[9px] bg-amber-100 text-amber-800 border-0 dark:bg-amber-900/30 dark:text-amber-400">{paid}/{paid + pending}</Badge>;
    return <Badge className="text-[9px] bg-red-100 text-red-800 border-0 dark:bg-red-900/30 dark:text-red-400">{paid}/{paid + pending}</Badge>;
  };

  return (
    <MainLayout title="Propiedades en Administración">
      {/* Stats globales */}
      {!isLoading && buildings && buildings.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-card border border-border rounded-xl p-4 text-center">
            <Building2 className="w-5 h-5 mx-auto mb-1 text-primary" />
            <p className="text-2xl font-bold text-foreground">{totalBuildings}</p>
            <p className="text-xs text-muted-foreground">Propiedades</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 text-center">
            <Layers className="w-5 h-5 mx-auto mb-1 text-blue-500" />
            <p className="text-2xl font-bold text-foreground">{totalUnits}</p>
            <p className="text-xs text-muted-foreground">Unidades totales</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 text-center">
            <TrendingUp className={`w-5 h-5 mx-auto mb-1 ${getOccupancyColor(globalOccupancy)}`} />
            <p className={`text-2xl font-bold ${getOccupancyColor(globalOccupancy)}`}>{globalOccupancy}%</p>
            <p className="text-xs text-muted-foreground">Ocupación global</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 text-center">
            <Users className="w-5 h-5 mx-auto mb-1 text-orange-500" />
            <p className="text-2xl font-bold text-foreground">{totalOwnersGlobal}</p>
            <p className="text-xs text-muted-foreground">Propietarios</p>
          </div>
        </div>
      )}

      {/* Tabs: Propiedades + Dashboard Gerencial */}
      <Tabs defaultValue="properties" className="w-full">
        <TabsList className="w-full justify-start bg-muted/50 mb-4">
          <TabsTrigger value="properties" className="gap-1.5">
            <Building2 className="w-3.5 h-3.5" />
            Propiedades
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="gap-1.5">
            <BarChart3 className="w-3.5 h-3.5" />
            Resumen Gerencial
          </TabsTrigger>
          <TabsTrigger value="plusterra-gains" className="gap-1.5">
            <Coins className="w-3.5 h-3.5" />
            Ganancia Plusterra
          </TabsTrigger>
          {isAdminLike && (
            <TabsTrigger value="owner-guarantees" className="gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              Garantías
              {pendingGuarantees > 0 && (
                <Badge variant="destructive" className="ml-1 h-4 px-1.5 text-[10px]">{pendingGuarantees}</Badge>
              )}
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="properties">
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-muted-foreground">
              Gestión de edificios, casas y propiedades en administración.
            </p>
            <div className="flex items-center gap-2">
              {buildings && buildings.length > 0 && (
                <>
                  <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => setShowPrepaid(true)}>
                    <CalendarPlus className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Pago Adelantado</span>
                  </Button>
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
                </>
              )}
              {canCreate && (
                <Button onClick={() => setShowCreate(true)} className="gap-1.5">
                  <Plus className="w-4 h-4" />
                  Nueva Propiedad
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
              <p className="text-muted-foreground mb-4">No hay propiedades en administración.</p>
              {canCreate && (
                <Button variant="outline" onClick={() => setShowCreate(true)} className="gap-1.5">
                  <Plus className="w-4 h-4" />
                  Agregar primera propiedad
                </Button>
              )}
            </div>
          )}

          {/* TABLE VIEW */}
          {!isLoading && buildings && buildings.length > 0 && viewMode === 'table' && (
            <div className="bg-card border border-border rounded-xl">
              <DualScrollArea stickyTopOffset={64}>
              <Table className="min-w-[900px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 z-20 bg-card">Nombre</TableHead>
                    <TableHead className="hidden sm:table-cell">Dirección</TableHead>
                    <TableHead className="text-center">Unidades</TableHead>
                    <TableHead className="text-center">Ocupación</TableHead>
                    <TableHead className="text-center">Cobros</TableHead>
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
                        <TableCell className="sticky left-0 z-10 bg-card group-hover:bg-muted/50">
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
                        <TableCell className="text-center">
                          {getCollectionBadge(b.paidCount, b.pendingCount, b.unitCount)}
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
              </DualScrollArea>
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
                      {getCollectionBadge(b.paidCount, b.pendingCount, b.unitCount)}
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
        </TabsContent>

        <TabsContent value="dashboard">
          <AdminSummaryDashboard />
        </TabsContent>

        <TabsContent value="plusterra-gains">
          <PlusterraGainsTab />
        </TabsContent>

        {isAdminLike && (
          <TabsContent value="owner-guarantees">
            <OwnerGuaranteesTab />
          </TabsContent>
        )}
      </Tabs>

      <BuildingFormDialog open={showCreate} onOpenChange={setShowCreate} />

      {/* Prepaid dialog at list level */}
      {showPrepaid && (
        <PrepaidRentDialog
          open={showPrepaid}
          onOpenChange={setShowPrepaid}
          buildingId=""
          units={allUnitsForPrepaid.data || []}
        />
      )}
    </MainLayout>
  );
};

export default Buildings;
