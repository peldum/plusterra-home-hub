import { useState, useMemo, Fragment } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useBuildingDetail } from '@/hooks/useBuildingDetail';
import { useBuildingLiquidation, LiquidationLine } from '@/hooks/useBuildingLiquidation';
import { exportUnitLiquidationPDF, exportBuildingSummaryCSV } from '@/lib/buildingExport';
import { exportBuildingLiquidationPDF } from '@/lib/buildingLiquidationPDF';
import { LiquidationExportPanel } from '@/components/buildings/LiquidationExportPanel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  ArrowLeft, Building2, Layers, Users, Loader2, MapPin,
  ChevronLeft, ChevronRight, Download, FileSpreadsheet, FileText,
  TrendingUp, TrendingDown, DollarSign, Percent, ReceiptText, ClipboardList,
  ChevronDown, ChevronUp, Trash2, Pencil, Check, X, Plus, Home, UserPlus,
} from 'lucide-react';
import { CollectionControlTab } from '@/components/buildings/CollectionControlTab';
import { LiquidationOwnerFilter } from '@/components/buildings/LiquidationOwnerFilter';
import { BuildingAdminConfig } from '@/components/buildings/BuildingAdminConfig';
import { PropertyFormDialog } from '@/components/properties/PropertyFormDialog';
import { QuickTenantDialog } from '@/components/buildings/QuickTenantDialog';
import { format, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';

const formatCurrency = (amount: number, currency: string = 'PYG') => {
  if (currency === 'USD') return `US$ ${amount.toLocaleString('es-PY', { minimumFractionDigits: 2 })}`;
  return `₲ ${amount.toLocaleString('es-PY')}`;
};

const BuildingDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { role, user } = useAuth();
  const queryClient = useQueryClient();
  const canDelete = role === 'superadmin' || role === 'admin' || role === 'accounting' || role === 'secretaria';
  const canEdit = role === 'superadmin' || role === 'admin' || role === 'accounting' || role === 'secretaria';
  const { building, buildingLoading, units, unitsLoading } = useBuildingDetail(id);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [savingName, setSavingName] = useState(false);

  // Property creation from unit
  const [showPropertyForm, setShowPropertyForm] = useState(false);
  const [propertyFormUnitId, setPropertyFormUnitId] = useState<string>('');

  // Link existing property to unit
  const [showLinkPropertyDialog, setShowLinkPropertyDialog] = useState(false);
  const [linkPropertyUnitId, setLinkPropertyUnitId] = useState<string>('');
  const [linkPropertySearch, setLinkPropertySearch] = useState('');

  // Quick tenant assignment
  const [showTenantDialog, setShowTenantDialog] = useState(false);
  const [tenantDialogUnit, setTenantDialogUnit] = useState<any>(null);
  const [savingLink, setSavingLink] = useState(false);

  // Fetch unlinked properties for linking
  const { data: unlinkedProperties } = useQuery({
    queryKey: ['unlinked-properties'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('properties')
        .select('id, title, property_code, address, city')
        .is('unit_id', null)
        .order('title');
      if (error) throw error;
      return data || [];
    },
    enabled: showLinkPropertyDialog,
  });

  const filteredUnlinkedProperties = (unlinkedProperties || []).filter(p =>
    !linkPropertySearch ||
    p.title.toLowerCase().includes(linkPropertySearch.toLowerCase()) ||
    p.property_code.toLowerCase().includes(linkPropertySearch.toLowerCase()) ||
    (p.address || '').toLowerCase().includes(linkPropertySearch.toLowerCase())
  );

  const handleLinkProperty = async (propertyId: string) => {
    if (!linkPropertyUnitId) return;
    setSavingLink(true);
    try {
      const { error } = await supabase
        .from('properties')
        .update({ unit_id: linkPropertyUnitId } as any)
        .eq('id', propertyId);
      if (error) throw error;
      toast.success('Propiedad vinculada a la unidad');
      queryClient.invalidateQueries({ queryKey: ['building-units', id] });
      queryClient.invalidateQueries({ queryKey: ['unlinked-properties'] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      setShowLinkPropertyDialog(false);
    } catch (err: any) {
      toast.error('Error al vincular: ' + err.message);
    } finally {
      setSavingLink(false);
    }
  };
  // Owner assignment
  const [showOwnerDialog, setShowOwnerDialog] = useState(false);
  const [ownerAssignUnitId, setOwnerAssignUnitId] = useState<string>('');
  const [ownerSearchText, setOwnerSearchText] = useState('');
  const [savingOwner, setSavingOwner] = useState(false);

  // Unit creation
  const [showUnitForm, setShowUnitForm] = useState(false);
  const [newUnitCode, setNewUnitCode] = useState('');
  const [newUnitFloor, setNewUnitFloor] = useState('');
  const [newUnitArea, setNewUnitArea] = useState('');
  const [newUnitBedrooms, setNewUnitBedrooms] = useState('');
  const [newUnitBathrooms, setNewUnitBathrooms] = useState('');
  const [savingUnit, setSavingUnit] = useState(false);

  // Unit editing
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);
  const [editUnitCode, setEditUnitCode] = useState('');
  const [editUnitFloor, setEditUnitFloor] = useState('');
  const [editUnitArea, setEditUnitArea] = useState('');
  const [editUnitBedrooms, setEditUnitBedrooms] = useState('');
  const [editUnitBathrooms, setEditUnitBathrooms] = useState('');
  const [savingEditUnit, setSavingEditUnit] = useState(false);

  const startEditUnit = (unit: any) => {
    setEditingUnitId(unit.id);
    setEditUnitCode(unit.unit_code || '');
    setEditUnitFloor(unit.floor?.toString() || '');
    setEditUnitArea(unit.area_m2?.toString() || '');
    setEditUnitBedrooms(unit.bedrooms?.toString() || '');
    setEditUnitBathrooms(unit.bathrooms?.toString() || '');
  };

  const handleSaveEditUnit = async () => {
    if (!editingUnitId || !editUnitCode.trim()) return;
    setSavingEditUnit(true);
    try {
      const { error } = await supabase.from('units').update({
        unit_code: editUnitCode.trim(),
        floor: editUnitFloor ? parseInt(editUnitFloor) : null,
        area_m2: editUnitArea ? parseFloat(editUnitArea) : null,
        bedrooms: editUnitBedrooms ? parseInt(editUnitBedrooms) : 0,
        bathrooms: editUnitBathrooms ? parseInt(editUnitBathrooms) : 0,
      }).eq('id', editingUnitId);
      if (error) throw error;
      toast.success('Unidad actualizada');
      queryClient.invalidateQueries({ queryKey: ['building-units', id] });
      setEditingUnitId(null);
    } catch (err: any) {
      toast.error('Error al actualizar: ' + err.message);
    } finally {
      setSavingEditUnit(false);
    }
  };

  // Unit deletion
  const [deletingUnitId, setDeletingUnitId] = useState<string | null>(null);
  const [showDeleteUnitDialog, setShowDeleteUnitDialog] = useState(false);
  const [isDeletingUnit, setIsDeletingUnit] = useState(false);

  const handleDeleteUnit = async () => {
    if (!deletingUnitId) return;
    setIsDeletingUnit(true);
    try {
      // Unlink properties first
      await supabase.from('properties').update({ unit_id: null } as any).eq('unit_id', deletingUnitId);
      // Remove owners
      await supabase.from('unit_owners').delete().eq('unit_id', deletingUnitId);
      // Delete unit
      const { error } = await supabase.from('units').delete().eq('id', deletingUnitId);
      if (error) throw error;
      toast.success('Unidad eliminada');
      queryClient.invalidateQueries({ queryKey: ['building-units', id] });
    } catch (err: any) {
      toast.error('Error al eliminar unidad: ' + err.message);
    } finally {
      setIsDeletingUnit(false);
      setShowDeleteUnitDialog(false);
      setDeletingUnitId(null);
    }
  };

  const handleCreateUnit = async () => {
    if (!newUnitCode.trim() || !id) return;
    setSavingUnit(true);
    try {
      const { error } = await supabase.from('units').insert({
        building_id: id,
        unit_code: newUnitCode.trim(),
        floor: newUnitFloor ? parseInt(newUnitFloor) : null,
        area_m2: newUnitArea ? parseFloat(newUnitArea) : null,
        bedrooms: newUnitBedrooms ? parseInt(newUnitBedrooms) : 0,
        bathrooms: newUnitBathrooms ? parseInt(newUnitBathrooms) : 0,
        created_by: user!.id,
      });
      if (error) throw error;
      toast.success(`Unidad ${newUnitCode.trim()} creada`);
      queryClient.invalidateQueries({ queryKey: ['building-units', id] });
      setNewUnitCode('');
      setNewUnitFloor('');
      setNewUnitArea('');
      setNewUnitBedrooms('');
      setNewUnitBathrooms('');
      setShowUnitForm(false);
    } catch (err: any) {
      toast.error('Error al crear unidad: ' + err.message);
    } finally {
      setSavingUnit(false);
    }
  };

  // Fetch owners for quick assignment
  const { data: allOwners } = useQuery({
    queryKey: ['owners-list-building'],
    queryFn: async () => {
      const { data, error } = await supabase.from('owners').select('id, full_name').order('full_name');
      if (error) throw error;
      return data || [];
    },
    staleTime: 60_000,
  });

  const filteredOwners = useMemo(() => {
    if (!allOwners) return [];
    if (!ownerSearchText.trim()) return allOwners.slice(0, 20);
    const q = ownerSearchText.toLowerCase();
    return allOwners.filter(o => o.full_name.toLowerCase().includes(q)).slice(0, 20);
  }, [allOwners, ownerSearchText]);

  const handleAssignOwner = async (ownerId: string) => {
    if (!ownerAssignUnitId) return;
    setSavingOwner(true);
    try {
      // Check if already assigned
      const { data: existing } = await supabase.from('unit_owners')
        .select('id').eq('unit_id', ownerAssignUnitId).eq('owner_id', ownerId).maybeSingle();
      if (existing) {
        toast.info('Este propietario ya está asignado a esta unidad');
        setSavingOwner(false);
        return;
      }
      const { error } = await supabase.from('unit_owners').insert({
        unit_id: ownerAssignUnitId,
        owner_id: ownerId,
        ownership_percentage: 100,
      } as any);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['building-units', id] });
      toast.success('Propietario asignado correctamente');
      setShowOwnerDialog(false);
      setOwnerSearchText('');
    } catch (err: any) {
      toast.error('Error: ' + (err.message || 'Error desconocido'));
    } finally {
      setSavingOwner(false);
    }
  };

  const linkedPropertiesCount = units.filter(u => u.property).length;

  const handleDeleteBuilding = async () => {
    if (!id) return;
    setIsDeleting(true);
    try {
      // Unlink properties from units first (set unit_id = null)
      const unitIds = units.map(u => u.id);
      if (unitIds.length > 0) {
        await supabase.from('properties').update({ unit_id: null }).in('unit_id', unitIds);
        // Delete unit_owners
        await supabase.from('unit_owners').delete().in('unit_id', unitIds);
        // Delete units
        await supabase.from('units').delete().eq('building_id', id);
      }
      // Delete building
      const { error } = await supabase.from('buildings').delete().eq('id', id);
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['buildings-list'] });
      toast.success('Edificio eliminado correctamente');
      navigate('/edificios');
    } catch (err: any) {
      toast.error('Error al eliminar: ' + (err.message || 'Error desconocido'));
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  // Liquidation month
  const [monthDate, setMonthDate] = useState(new Date());
  const month = format(monthDate, 'yyyy-MM');
  const monthLabel = format(monthDate, 'MMMM yyyy', { locale: es });

  // Owner filter & grouping (persisted across month changes)
  const [selectedOwnerId, setSelectedOwnerId] = useState<string | null>(null);
  const [groupByOwner, setGroupByOwner] = useState(false);
  const [expandedOwners, setExpandedOwners] = useState<Set<string>>(new Set());

  const { data: liquidation, isLoading: liqLoading } = useBuildingLiquidation(id, units, month, building);
  const liquidationLines = liquidation ?? [];
  const adminModel = building?.admin_model ?? (building?.is_third_party_admin ? 'modelo_1' : 'modelo_2');
  const isThirdParty = adminModel === 'modelo_1';

  const prevMonth = () => setMonthDate(prev => subMonths(prev, 1));
  const nextMonth = () => {
    setMonthDate(prev => {
      const next = new Date(prev);
      next.setMonth(next.getMonth() + 1);
      return next > new Date() ? prev : next;
    });
  };

  // Filtered lines
  const filteredLines = useMemo(() => {
    if (!selectedOwnerId) return liquidationLines;
    return liquidationLines.filter(l => {
      // A unit may have multiple owners; check if owner matches
      const unit = units.find(u => u.id === l.unit_id);
      return unit?.owners.some(o => o.id === selectedOwnerId) ?? false;
    });
  }, [liquidationLines, selectedOwnerId, units]);

  // Owner groups
  const ownerGroups = useMemo(() => {
    if (!groupByOwner) return [];
    const map = new Map<string, { owner_id: string; owner_name: string; lines: LiquidationLine[] }>();
    filteredLines.forEach(l => {
      const unit = units.find(u => u.id === l.unit_id);
      const ownerList = unit?.owners ?? [];
      if (ownerList.length === 0) {
        const key = '__no_owner';
        if (!map.has(key)) map.set(key, { owner_id: key, owner_name: 'Sin propietario', lines: [] });
        map.get(key)!.lines.push(l);
      } else {
        ownerList.forEach(o => {
          if (!map.has(o.id)) map.set(o.id, { owner_id: o.id, owner_name: o.full_name, lines: [] });
          map.get(o.id)!.lines.push(l);
        });
      }
    });
    return Array.from(map.values()).map(g => ({
      ...g,
      rental: g.lines.reduce((s, l) => s + l.rental_price, 0),
      admin: g.lines.reduce((s, l) => s + l.admin_fee_amount, 0),
      adminInternal: g.lines.reduce((s, l) => s + l.admin_fee_internal_amount, 0),
      adminExternal: g.lines.reduce((s, l) => s + l.admin_fee_external_amount, 0),
      income: g.lines.reduce((s, l) => s + l.income_total, 0),
      expense: g.lines.reduce((s, l) => s + l.expense_total, 0),
      maintenance: g.lines.reduce((s, l) => s + l.maintenance_total, 0),
      net: g.lines.reduce((s, l) => s + l.net_balance, 0),
    }));
  }, [filteredLines, groupByOwner, units]);

  // Totals (based on filtered lines)
  const totals = useMemo(() => {
    const t = { rental: 0, admin: 0, adminInternal: 0, adminExternal: 0, income: 0, expense: 0, maintenance: 0, net: 0 };
    filteredLines.forEach(l => {
      t.rental += l.rental_price;
      t.admin += l.admin_fee_amount;
      t.adminInternal += l.admin_fee_internal_amount;
      t.adminExternal += l.admin_fee_external_amount;
      t.income += l.income_total;
      t.expense += l.expense_total;
      t.maintenance += l.maintenance_total;
      t.net += l.net_balance;
    });
    return t;
  }, [filteredLines]);

  const toggleOwnerExpand = (ownerId: string) => {
    setExpandedOwners(prev => {
      const next = new Set(prev);
      next.has(ownerId) ? next.delete(ownerId) : next.add(ownerId);
      return next;
    });
  };

  const hasActiveFilter = !!selectedOwnerId || groupByOwner;

  // Conditional columns: hide if all values are zero
  const hasExpenses = filteredLines.some(l => l.expense_total > 0);
  const hasMaintenance = filteredLines.some(l => l.maintenance_total > 0);

  // Payment status helper
  const getPaymentStatusColor = (line: LiquidationLine) => {
    if (line.income_total >= line.rental_price && line.rental_price > 0) return 'text-success'; // al día
    if (line.income_total > 0 && line.income_total < line.rental_price) return 'text-yellow-600 dark:text-yellow-400'; // parcial
    return 'text-destructive'; // sin pago
  };

  const getPaymentStatusBadge = (line: LiquidationLine) => {
    if (line.income_total >= line.rental_price && line.rental_price > 0)
      return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 text-[9px] px-1.5">Al día</Badge>;
    if (line.income_total > 0 && line.income_total < line.rental_price)
      return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 text-[9px] px-1.5">Parcial</Badge>;
    if (line.rental_price > 0)
      return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 text-[9px] px-1.5">Pendiente</Badge>;
    return null;
  };

  if (buildingLoading) {
    return (
      <MainLayout title="Edificio">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!building) {
    return (
      <MainLayout title="Edificio no encontrado">
        <div className="text-center py-16">
          <p className="text-muted-foreground mb-4">El edificio solicitado no existe.</p>
          <button onClick={() => navigate('/edificios')} className="text-primary hover:underline text-sm">
            Volver a Edificios
          </button>
        </div>
      </MainLayout>
    );
  }

  const handleExportPDF = async (line: typeof liquidationLines[0]) => {
    try {
      await exportUnitLiquidationPDF(building.name, line, month);
      toast.success(`PDF generado para ${line.unit_code}`);
    } catch {
      toast.error('Error al generar PDF');
    }
  };

  const handleExportCSV = () => {
    try {
      exportBuildingSummaryCSV(building.name, liquidationLines, month);
      toast.success('Excel/CSV descargado');
    } catch {
      toast.error('Error al exportar');
    }
  };

  return (
    <MainLayout title="">
      {/* Header */}
      <div className="mb-6">
        <button onClick={() => navigate('/edificios')} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" />
          Volver a Edificios
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-7 h-7 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              {editingName ? (
                <>
                  <input
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    className="text-2xl font-bold bg-background border border-input rounded-lg px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-ring flex-1 min-w-0"
                    autoFocus
                  />
                  <button
                    onClick={async () => {
                      if (!newName.trim() || !id) return;
                      setSavingName(true);
                      const { error } = await supabase.from('buildings').update({ name: newName.trim() }).eq('id', id);
                      setSavingName(false);
                      if (error) { toast.error('Error al guardar'); return; }
                      queryClient.invalidateQueries({ queryKey: ['building-detail', id] });
                      toast.success('Nombre actualizado');
                      setEditingName(false);
                    }}
                    disabled={savingName}
                    className="p-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    title="Guardar"
                  >
                    {savingName ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => setEditingName(false)}
                    className="p-1.5 rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
                    title="Cancelar"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <>
                  {building.name}
                  {canEdit && (
                    <button
                      onClick={() => { setNewName(building.name); setEditingName(true); }}
                      className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      title="Editar nombre"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  )}
                </>
              )}
            </h1>
            <div className="flex flex-wrap items-center gap-3 mt-1">
              {building.address && (
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {building.address}{building.city ? `, ${building.city}` : ''}
                </span>
              )}
              {building.total_units && (
                <Badge variant="secondary" className="text-xs">
                  <Layers className="w-3 h-3 mr-1" />
                  {building.total_units} unidades
                </Badge>
              )}
            </div>
          </div>
          {canDelete && (
            <Button
              variant="outline"
              size="sm"
              className="text-destructive border-destructive/30 hover:bg-destructive/10 gap-1.5 flex-shrink-0"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="w-4 h-4" />
              Eliminar
            </Button>
          )}
        </div>
      </div>

      {/* Admin config panel */}
      <BuildingAdminConfig building={building} />

      {/* Tabs */}
      <Tabs defaultValue="units" className="w-full">
        <TabsList className="w-full justify-start bg-muted/50 mb-4">
          <TabsTrigger value="units" className="gap-1.5">
            <Layers className="w-3.5 h-3.5" />
            Unidades
            <Badge variant="secondary" className="ml-1 text-[10px] px-1.5">{units.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="liquidation" className="gap-1.5">
            <ReceiptText className="w-3.5 h-3.5" />
            Liquidación Mensual
          </TabsTrigger>
          <TabsTrigger value="collections" className="gap-1.5">
            <ClipboardList className="w-3.5 h-3.5" />
            Control de Cobros
          </TabsTrigger>
        </TabsList>

        {/* ── Tab: Unidades ── */}
        <TabsContent value="units">
          {/* Add unit button + inline form */}
          {!unitsLoading && canEdit && (
            <div className="mb-4">
              {!showUnitForm ? (
                <Button onClick={() => setShowUnitForm(true)} className="gap-1.5">
                  <Plus className="w-4 h-4" />
                  Nueva Unidad
                </Button>
              ) : (
                <div className="bg-card border border-border rounded-xl p-4 space-y-3">
                  <p className="text-sm font-semibold text-foreground">Crear nueva unidad</p>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground">Código *</label>
                      <input
                        value={newUnitCode}
                        onChange={e => setNewUnitCode(e.target.value)}
                        placeholder="Ej: 1A, 201"
                        className="w-full mt-1 px-3 py-1.5 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Piso</label>
                      <input
                        type="number"
                        value={newUnitFloor}
                        onChange={e => setNewUnitFloor(e.target.value)}
                        placeholder="1"
                        className="w-full mt-1 px-3 py-1.5 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Área m²</label>
                      <input
                        type="number"
                        value={newUnitArea}
                        onChange={e => setNewUnitArea(e.target.value)}
                        placeholder="45"
                        className="w-full mt-1 px-3 py-1.5 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Dormitorios</label>
                      <select
                        value={newUnitBedrooms}
                        onChange={e => setNewUnitBedrooms(e.target.value)}
                        className="w-full mt-1 px-3 py-1.5 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="">—</option>
                        <option value="0">0 — Monoambiente</option>
                        <option value="1">1</option>
                        <option value="2">2</option>
                        <option value="3">3</option>
                        <option value="4">4</option>
                        <option value="5">5</option>
                        <option value="6">6+</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Baños</label>
                      <input
                        type="number"
                        value={newUnitBathrooms}
                        onChange={e => setNewUnitBathrooms(e.target.value)}
                        placeholder="1"
                        className="w-full mt-1 px-3 py-1.5 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleCreateUnit} disabled={!newUnitCode.trim() || savingUnit} size="sm" className="gap-1.5">
                      {savingUnit ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                      Guardar
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setShowUnitForm(false)} className="gap-1">
                      <X className="w-3 h-3" />
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {unitsLoading && <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>}
          {!unitsLoading && units.length === 0 && !showUnitForm && (
            <div className="text-center py-12">
              <Layers className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">Sin unidades registradas</p>
              {canEdit && (
                <Button variant="outline" className="mt-3 gap-1.5" onClick={() => setShowUnitForm(true)}>
                  <Plus className="w-4 h-4" />
                  Crear tu primera unidad
                </Button>
              )}
            </div>
          )}
          {!unitsLoading && units.length > 0 && (
             <div className="rounded-xl border border-border bg-card overflow-hidden">
               <Table>
                 <TableHeader>
                   <TableRow className="bg-muted/30">
                     <TableHead className="font-semibold">Unidad</TableHead>
                     <TableHead className="font-semibold">Piso</TableHead>
                     <TableHead className="font-semibold">Propietario(s)</TableHead>
                     <TableHead className="font-semibold">Propiedad</TableHead>
                     <TableHead className="font-semibold">Estado</TableHead>
                     <TableHead className="font-semibold">Inquilino</TableHead>
                     <TableHead className="font-semibold text-right">Alquiler</TableHead>
                     <TableHead className="font-semibold text-center">Acciones</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {units.map(unit => {
                      const statusLabel: Record<string, string> = {
                        available: 'Disponible', rented: 'Alquilado', sold: 'Vendido',
                        reserved: 'Reservado', draft: 'Borrador', archived: 'Archivado',
                      };
                      const statusColor: Record<string, string> = {
                        rented: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
                        available: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
                        reserved: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
                        sold: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
                        draft: 'bg-muted text-muted-foreground',
                        archived: 'bg-muted text-muted-foreground',
                      };
                      const status = unit.property?.status || '';
                      const isEditing = editingUnitId === unit.id;

                      return (
                        <TableRow key={unit.id} className="hover:bg-muted/30">
                          <TableCell className="font-mono font-semibold text-primary text-sm">
                            {isEditing ? (
                              <input value={editUnitCode} onChange={e => setEditUnitCode(e.target.value)} className="w-20 px-2 py-1 text-sm border border-input rounded bg-background focus:outline-none focus:ring-1 focus:ring-ring" />
                            ) : unit.unit_code}
                          </TableCell>
                          <TableCell className="text-sm">
                            {isEditing ? (
                              <input type="number" value={editUnitFloor} onChange={e => setEditUnitFloor(e.target.value)} className="w-16 px-2 py-1 text-sm border border-input rounded bg-background focus:outline-none focus:ring-1 focus:ring-ring" />
                            ) : (unit.floor ?? '-')}
                          </TableCell>
                          <TableCell>
                            {unit.owners.length === 0 ? (
                              <button
                                onClick={() => { setOwnerAssignUnitId(unit.id); setOwnerSearchText(''); setShowOwnerDialog(true); }}
                                className="text-xs text-primary hover:underline flex items-center gap-1 cursor-pointer"
                              >
                                <UserPlus className="w-3 h-3" />
                                Asignar propietario
                              </button>
                            ) : (
                              <div className="space-y-0.5">
                                {unit.owners.map(o => (
                                  <div key={o.id} className="flex items-center gap-1.5">
                                    <Users className="w-3 h-3 text-primary/60 flex-shrink-0" />
                                    <span className="text-sm">{o.full_name}</span>
                                    {o.ownership_percentage && o.ownership_percentage < 100 && (
                                      <Badge variant="outline" className="text-[9px] px-1">{o.ownership_percentage}%</Badge>
                                    )}
                                  </div>
                                ))}
                                <button
                                  onClick={() => { setOwnerAssignUnitId(unit.id); setOwnerSearchText(''); setShowOwnerDialog(true); }}
                                  className="text-[10px] text-primary/70 hover:text-primary flex items-center gap-0.5 mt-0.5"
                                >
                                  <Plus className="w-2.5 h-2.5" /> Agregar
                                </button>
                              </div>
                            )}
                          </TableCell>
                           <TableCell>
                             {unit.property ? (
                               <span className="text-xs font-mono text-muted-foreground">{unit.property.property_code}</span>
                             ) : (
                               <div className="flex flex-col gap-0.5">
                                 <button
                                   onClick={() => { setPropertyFormUnitId(unit.id); setShowPropertyForm(true); }}
                                   className="text-xs text-primary hover:underline flex items-center gap-1 cursor-pointer"
                                 >
                                   <Home className="w-3 h-3" />
                                   Crear propiedad
                                 </button>
                                 <button
                                   onClick={() => { setLinkPropertyUnitId(unit.id); setLinkPropertySearch(''); setShowLinkPropertyDialog(true); }}
                                   className="text-xs text-muted-foreground hover:text-primary hover:underline flex items-center gap-1 cursor-pointer"
                                 >
                                   <Plus className="w-3 h-3" />
                                   Vincular existente
                                 </button>
                               </div>
                             )}
                           </TableCell>
                          <TableCell>
                            {unit.property ? (
                              <Badge className={`text-[10px] ${statusColor[status] || ''}`}>
                                {statusLabel[status] || status}
                              </Badge>
                            ) : (
                              <Badge className="bg-muted text-muted-foreground text-[10px]">Vacío</Badge>
                            )}
                          </TableCell>
                           <TableCell>
                              {unit.property?.tenant_name ? (
                                <button
                                  onClick={() => { setTenantDialogUnit(unit); setShowTenantDialog(true); }}
                                  className="text-sm hover:text-primary hover:underline cursor-pointer transition-colors"
                                >
                                  {unit.property.tenant_name}
                                </button>
                              ) : (
                                <button
                                  onClick={() => { setTenantDialogUnit(unit); setShowTenantDialog(true); }}
                                  className="text-xs text-primary hover:underline flex items-center gap-1 cursor-pointer"
                                >
                                  <UserPlus className="w-3 h-3" />
                                  Agregar inquilino
                                </button>
                              )}
                            </TableCell>
                          <TableCell className="text-right text-sm font-medium">
                            {unit.property?.rental_price
                              ? formatCurrency(unit.property.rental_price, unit.property.currency || 'PYG')
                              : '—'}
                          </TableCell>
                           <TableCell className="text-center">
                             <div className="flex items-center justify-center gap-1">
                               {isEditing ? (
                                 <>
                                   <Button
                                     variant="ghost"
                                     size="sm"
                                     className="h-7 px-2 text-xs gap-1 text-primary"
                                     onClick={handleSaveEditUnit}
                                     disabled={savingEditUnit || !editUnitCode.trim()}
                                   >
                                     {savingEditUnit ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                     Guardar
                                   </Button>
                                   <Button
                                     variant="ghost"
                                     size="sm"
                                     className="h-7 px-2 text-xs gap-1"
                                     onClick={() => setEditingUnitId(null)}
                                   >
                                     <X className="w-3 h-3" />
                                   </Button>
                                 </>
                               ) : (
                                 <>
                                   {canEdit && (
                                     <Button
                                       variant="ghost"
                                       size="sm"
                                       className="h-7 px-2 text-xs gap-1 text-primary"
                                       onClick={() => startEditUnit(unit)}
                                     >
                                       <Pencil className="w-3 h-3" />
                                       Editar
                                     </Button>
                                   )}
                                   {!unit.property && (
                                     <>
                                       <Button
                                         variant="ghost"
                                         size="sm"
                                         className="h-7 px-2 text-xs gap-1 text-primary"
                                         onClick={() => { setPropertyFormUnitId(unit.id); setShowPropertyForm(true); }}
                                       >
                                         <Home className="w-3 h-3" />
                                         Crear
                                       </Button>
                                       <Button
                                         variant="ghost"
                                         size="sm"
                                         className="h-7 px-2 text-xs gap-1"
                                         onClick={() => { setLinkPropertyUnitId(unit.id); setLinkPropertySearch(''); setShowLinkPropertyDialog(true); }}
                                       >
                                         <Plus className="w-3 h-3" />
                                         Vincular
                                       </Button>
                                     </>
                                   )}
                                   <Button
                                     variant="ghost"
                                     size="sm"
                                     className="h-7 px-2 text-xs gap-1"
                                     onClick={() => { setOwnerAssignUnitId(unit.id); setOwnerSearchText(''); setShowOwnerDialog(true); }}
                                   >
                                     <UserPlus className="w-3 h-3" />
                                     Dueño
                                   </Button>
                                   {canDelete && (
                                     <Button
                                       variant="ghost"
                                       size="sm"
                                       className="h-7 px-2 text-xs gap-1 text-destructive hover:text-destructive"
                                       onClick={() => { setDeletingUnitId(unit.id); setShowDeleteUnitDialog(true); }}
                                     >
                                       <Trash2 className="w-3 h-3" />
                                     </Button>
                                   )}
                                 </>
                               )}
                             </div>
                           </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
          )}
        </TabsContent>

        {/* ── Tab: Liquidación Mensual ── */}
        <TabsContent value="liquidation">
          {/* Month navigation + filter + export buttons */}
          <div className="flex flex-col gap-3 mb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={prevMonth}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm font-semibold min-w-[140px] text-center capitalize">
                  {monthLabel}
                </span>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={nextMonth}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Owner filter row */}
            <LiquidationOwnerFilter
              units={units}
              selectedOwnerId={selectedOwnerId}
              onOwnerChange={setSelectedOwnerId}
              groupByOwner={groupByOwner}
              onGroupByOwnerChange={setGroupByOwner}
            />
          </div>

          {/* Export panel */}
          <div className="mb-4">
            <LiquidationExportPanel
              building={building}
              filteredLines={filteredLines}
              units={units}
              month={month}
              selectedOwnerId={selectedOwnerId}
              groupByOwner={groupByOwner}
              ownerGroups={ownerGroups}
            />
          </div>

          {/* Summary cards */}
          {!liqLoading && filteredLines.length > 0 && (
            <div className={`grid grid-cols-2 ${isThirdParty ? 'md:grid-cols-5' : 'md:grid-cols-4'} gap-3 mb-4`}>
              <div className="bg-card border border-border rounded-lg p-3">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Ingresos Totales</p>
                <p className="text-lg font-bold text-foreground flex items-center gap-1">
                  <TrendingUp className="w-4 h-4 text-success" />
                  {formatCurrency(totals.income)}
                </p>
              </div>
              <div className="bg-card border border-border rounded-lg p-3">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
                  Admin Total ({building?.admin_fee_total_pct ?? 5}%)
                </p>
                <p className="text-lg font-bold text-foreground flex items-center gap-1">
                  <Percent className="w-4 h-4 text-secondary" />
                  {formatCurrency(totals.admin)}
                </p>
                {isThirdParty && (
                  <div className="flex gap-2 mt-1">
                    <span className="text-[10px] text-primary font-medium">
                      Plusterra: {formatCurrency(totals.adminInternal)}
                    </span>
                    <span className="text-[10px] text-secondary font-medium">
                      {building?.external_admin_company || 'Externa'}: {formatCurrency(totals.adminExternal)}
                    </span>
                  </div>
                )}
              </div>
              {isThirdParty && (
                <div className="bg-card border border-border rounded-lg p-3">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
                    {building?.external_admin_company || 'Empresa Externa'}
                  </p>
                  <p className="text-lg font-bold text-secondary flex items-center gap-1">
                    <Building2 className="w-4 h-4" />
                    {formatCurrency(totals.adminExternal)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{building?.admin_fee_external_pct ?? 0}% del alquiler</p>
                </div>
              )}
              <div className="bg-card border border-border rounded-lg p-3">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Gastos + Mant.</p>
                <p className="text-lg font-bold text-foreground flex items-center gap-1">
                  <TrendingDown className="w-4 h-4 text-destructive" />
                  {formatCurrency(totals.expense + totals.maintenance)}
                </p>
                {building?.expense_payee_name && (
                  <p className="text-[10px] text-muted-foreground">Expensas → {building.expense_payee_name}</p>
                )}
              </div>
              <div className="bg-card border border-border rounded-lg p-3">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Neto Propietarios</p>
                <p className={`text-lg font-bold flex items-center gap-1 ${totals.net >= 0 ? 'text-success' : 'text-destructive'}`}>
                  <DollarSign className="w-4 h-4" />
                  {formatCurrency(totals.net)}
                </p>
              </div>
            </div>
          )}

          {/* Liquidation table */}
          {liqLoading && <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>}
          {!liqLoading && filteredLines.length === 0 && (
            <div className="text-center py-12">
              <ReceiptText className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">
                {selectedOwnerId ? 'Sin datos para este propietario en este período' : 'Sin datos de liquidación para este período'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Verificá que las unidades tengan propiedades vinculadas con pagos registrados.</p>
            </div>
          )}

          {/* Default view: per unit */}
          {!liqLoading && filteredLines.length > 0 && !groupByOwner && (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <Table>
                 <TableHeader>
                   <TableRow className="bg-muted/30">
                     <TableHead className="font-semibold">Unidad</TableHead>
                     <TableHead className="font-semibold">Propietario</TableHead>
                     <TableHead className="font-semibold">Inquilino</TableHead>
                     <TableHead className="font-semibold text-center">Estado</TableHead>
                     <TableHead className="font-semibold text-right">Alquiler</TableHead>
                     <TableHead className="font-semibold text-right">Admin</TableHead>
                     <TableHead className="font-semibold text-right">Ingresos</TableHead>
                     {hasExpenses && <TableHead className="font-semibold text-right">Gastos</TableHead>}
                     {hasMaintenance && <TableHead className="font-semibold text-right">Mant.</TableHead>}
                     <TableHead className="font-semibold text-right">Neto</TableHead>
                     <TableHead className="w-10"></TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {filteredLines.map(line => (
                     <TableRow key={line.unit_id} className="hover:bg-muted/30">
                       <TableCell className="font-mono font-semibold text-primary text-sm">{line.unit_code}</TableCell>
                       <TableCell className="text-sm max-w-[150px] truncate">{line.owner_name}</TableCell>
                       <TableCell className="text-sm max-w-[150px] truncate">
                         {line.tenant_name || <span className="text-xs text-muted-foreground italic">—</span>}
                       </TableCell>
                       <TableCell className="text-center">{getPaymentStatusBadge(line)}</TableCell>
                       <TableCell className="text-right text-sm">{formatCurrency(line.rental_price, line.currency)}</TableCell>
                        <TableCell className="text-right text-sm text-secondary font-medium">
                          {formatCurrency(line.admin_fee_amount, line.currency)}
                          <span className="text-[10px] text-muted-foreground ml-1">({line.admin_fee_pct}%)</span>
                          {isThirdParty && (
                            <div className="text-[9px] text-muted-foreground mt-0.5">
                              <span className="text-primary">P:{formatCurrency(line.admin_fee_internal_amount, line.currency)}</span>
                              {' · '}
                              <span className="text-secondary">{building?.external_admin_company?.[0] || 'E'}:{formatCurrency(line.admin_fee_external_amount, line.currency)}</span>
                            </div>
                          )}
                        </TableCell>
                       <TableCell className={`text-right text-sm font-medium ${getPaymentStatusColor(line)}`}>{formatCurrency(line.income_total, line.currency)}</TableCell>
                       {hasExpenses && <TableCell className="text-right text-sm text-destructive">{line.expense_total > 0 ? formatCurrency(line.expense_total, line.currency) : '—'}</TableCell>}
                       {hasMaintenance && <TableCell className="text-right text-sm text-destructive">{line.maintenance_total > 0 ? formatCurrency(line.maintenance_total, line.currency) : '—'}</TableCell>}
                       <TableCell className={`text-right text-sm font-bold ${line.net_balance >= 0 ? 'text-success' : 'text-destructive'}`}>
                         {formatCurrency(line.net_balance, line.currency)}
                       </TableCell>
                       <TableCell>
                         <Button variant="ghost" size="icon" className="h-7 w-7" title="Descargar PDF individual" onClick={() => handleExportPDF(line)}>
                           <FileText className="w-3.5 h-3.5" />
                         </Button>
                       </TableCell>
                     </TableRow>
                   ))}
                   <TableRow className="bg-muted/50 font-bold border-t-2">
                     <TableCell className="text-sm">TOTALES</TableCell>
                     <TableCell></TableCell>
                     <TableCell></TableCell>
                     <TableCell></TableCell>
                     <TableCell className="text-right text-sm">{formatCurrency(totals.rental)}</TableCell>
                     <TableCell className="text-right text-sm text-secondary">{formatCurrency(totals.admin)}</TableCell>
                     <TableCell className="text-right text-sm text-success">{formatCurrency(totals.income)}</TableCell>
                     {hasExpenses && <TableCell className="text-right text-sm text-destructive">{totals.expense > 0 ? formatCurrency(totals.expense) : '—'}</TableCell>}
                     {hasMaintenance && <TableCell className="text-right text-sm text-destructive">{totals.maintenance > 0 ? formatCurrency(totals.maintenance) : '—'}</TableCell>}
                     <TableCell className={`text-right text-sm font-bold ${totals.net >= 0 ? 'text-success' : 'text-destructive'}`}>
                       {formatCurrency(totals.net)}
                     </TableCell>
                     <TableCell></TableCell>
                   </TableRow>
                 </TableBody>
              </Table>
            </div>
          )}

          {/* Grouped view: per owner */}
          {!liqLoading && filteredLines.length > 0 && groupByOwner && (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <Table>
                <TableHeader>
                   <TableRow className="bg-muted/30">
                     <TableHead className="font-semibold w-8"></TableHead>
                     <TableHead className="font-semibold">Propietario</TableHead>
                     <TableHead className="font-semibold text-right">Alquiler</TableHead>
                     <TableHead className="font-semibold text-right">Admin</TableHead>
                     <TableHead className="font-semibold text-right">Ingresos</TableHead>
                     {hasExpenses && <TableHead className="font-semibold text-right">Gastos</TableHead>}
                     {hasMaintenance && <TableHead className="font-semibold text-right">Mant.</TableHead>}
                     <TableHead className="font-semibold text-right">Neto</TableHead>
                     <TableHead className="w-10"></TableHead>
                   </TableRow>
                </TableHeader>
                <TableBody>
                  {ownerGroups.map(group => {
                    const isExpanded = expandedOwners.has(group.owner_id);
                    return (
                      <Fragment key={group.owner_id}>
                        <TableRow
                          className="hover:bg-muted/30 cursor-pointer"
                          onClick={() => toggleOwnerExpand(group.owner_id)}
                        >
                          <TableCell className="w-8 px-2">
                            {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                          </TableCell>
                          <TableCell className="font-semibold text-sm">
                            <div className="flex items-center gap-1.5">
                              <Users className="w-3.5 h-3.5 text-primary" />
                              {group.owner_name}
                              <Badge variant="secondary" className="text-[10px] ml-1">{group.lines.length} uds</Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-right text-sm font-medium">{formatCurrency(group.rental)}</TableCell>
                          <TableCell className="text-right text-sm text-secondary font-medium">{formatCurrency(group.admin)}</TableCell>
                          <TableCell className="text-right text-sm text-success font-medium">{formatCurrency(group.income)}</TableCell>
                          {hasExpenses && <TableCell className="text-right text-sm text-destructive">{group.expense > 0 ? formatCurrency(group.expense) : '—'}</TableCell>}
                          {hasMaintenance && <TableCell className="text-right text-sm text-destructive">{group.maintenance > 0 ? formatCurrency(group.maintenance) : '—'}</TableCell>}
                          <TableCell className={`text-right text-sm font-bold ${group.net >= 0 ? 'text-success' : 'text-destructive'}`}>
                            {formatCurrency(group.net)}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              title={`Descargar PDF de ${group.owner_name}`}
                              onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                  await exportBuildingLiquidationPDF({
                                    buildingName: building.name,
                                    lines: group.lines,
                                    month,
                                    ownerName: group.owner_name,
                                  });
                                  toast.success(`PDF generado para ${group.owner_name}`);
                                } catch {
                                  toast.error('Error al generar PDF');
                                }
                              }}
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                        {isExpanded && group.lines.map(line => (
                          <TableRow key={`${group.owner_id}-${line.unit_id}`} className="bg-muted/10">
                            <TableCell></TableCell>
                            <TableCell className="text-xs text-muted-foreground pl-8">
                              <span className="font-mono">{line.unit_code}</span>
                              <span className="ml-2">{getPaymentStatusBadge(line)}</span>
                            </TableCell>
                            <TableCell className="text-right text-xs">{formatCurrency(line.rental_price, line.currency)}</TableCell>
                            <TableCell className="text-right text-xs text-secondary">{formatCurrency(line.admin_fee_amount, line.currency)}</TableCell>
                            <TableCell className={`text-right text-xs font-medium ${getPaymentStatusColor(line)}`}>{formatCurrency(line.income_total, line.currency)}</TableCell>
                            {hasExpenses && <TableCell className="text-right text-xs text-destructive">{line.expense_total > 0 ? formatCurrency(line.expense_total, line.currency) : '—'}</TableCell>}
                            {hasMaintenance && <TableCell className="text-right text-xs text-destructive">{line.maintenance_total > 0 ? formatCurrency(line.maintenance_total, line.currency) : '—'}</TableCell>}
                            <TableCell className={`text-right text-xs font-medium ${line.net_balance >= 0 ? 'text-success' : 'text-destructive'}`}>
                              {formatCurrency(line.net_balance, line.currency)}
                            </TableCell>
                            <TableCell></TableCell>
                          </TableRow>
                        ))}
                      </Fragment>
                    );
                  })}
                  <TableRow className="bg-muted/50 font-bold border-t-2">
                    <TableCell></TableCell>
                    <TableCell className="text-sm">TOTALES</TableCell>
                    <TableCell className="text-right text-sm">{formatCurrency(totals.rental)}</TableCell>
                    <TableCell className="text-right text-sm text-secondary">{formatCurrency(totals.admin)}</TableCell>
                    <TableCell className="text-right text-sm text-success">{formatCurrency(totals.income)}</TableCell>
                    {hasExpenses && <TableCell className="text-right text-sm text-destructive">{totals.expense > 0 ? formatCurrency(totals.expense) : '—'}</TableCell>}
                    {hasMaintenance && <TableCell className="text-right text-sm text-destructive">{totals.maintenance > 0 ? formatCurrency(totals.maintenance) : '—'}</TableCell>}
                    <TableCell className={`text-right text-sm font-bold ${totals.net >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {formatCurrency(totals.net)}
                    </TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* ── Tab: Control de Cobros ── */}
        <TabsContent value="collections">
          <CollectionControlTab buildingId={id!} units={units} unitsLoading={unitsLoading} />
        </TabsContent>
      </Tabs>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este edificio?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>Esta acción no se puede deshacer.</p>
                {linkedPropertiesCount > 0 && (
                  <p className="text-destructive font-medium">
                    Este edificio tiene {linkedPropertiesCount} propiedad{linkedPropertiesCount !== 1 ? 'es' : ''} vinculada{linkedPropertiesCount !== 1 ? 's' : ''}. Al eliminar, quedarán sin edificio asignado.
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBuilding}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Trash2 className="w-4 h-4 mr-1.5" />}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete unit confirmation dialog */}
      <AlertDialog open={showDeleteUnitDialog} onOpenChange={setShowDeleteUnitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta unidad?</AlertDialogTitle>
            <AlertDialogDescription>
              Se desvinculará la propiedad asociada (si existe) y se eliminarán los propietarios asignados. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingUnit}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUnit}
              disabled={isDeletingUnit}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeletingUnit ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Trash2 className="w-4 h-4 mr-1.5" />}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PropertyFormDialog
        open={showPropertyForm}
        onOpenChange={(open) => {
          setShowPropertyForm(open);
          if (!open) {
            queryClient.invalidateQueries({ queryKey: ['building-units', id] });
          }
        }}
        initialBuildingId={id}
        initialUnitId={propertyFormUnitId}
      />

      {/* Owner assignment dialog */}
      <Dialog open={showOwnerDialog} onOpenChange={setShowOwnerDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" />
              Asignar Propietario
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Buscar propietario por nombre..."
              value={ownerSearchText}
              onChange={e => setOwnerSearchText(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              autoFocus
            />
            <div className="max-h-60 overflow-y-auto space-y-1">
              {filteredOwners.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {ownerSearchText ? 'No se encontraron propietarios' : 'Sin propietarios registrados'}
                </p>
              ) : (
                filteredOwners.map(owner => (
                  <button
                    key={owner.id}
                    onClick={() => handleAssignOwner(owner.id)}
                    disabled={savingOwner}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-muted/60 transition-colors text-left disabled:opacity-50"
                  >
                    <Users className="w-4 h-4 text-primary/60 flex-shrink-0" />
                    <span className="text-sm font-medium">{owner.full_name}</span>
                  </button>
                ))
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Si el propietario no existe, crealo primero desde el módulo <strong>Propietarios</strong>.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Link existing property dialog */}
      <Dialog open={showLinkPropertyDialog} onOpenChange={setShowLinkPropertyDialog}>
        <DialogContent className="sm:max-w-2xl overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Home className="w-5 h-5 text-primary" />
              Vincular Propiedad Existente
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Buscar por título, código o dirección..."
              value={linkPropertySearch}
              onChange={e => setLinkPropertySearch(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              autoFocus
            />
            <div className="max-h-60 overflow-y-auto space-y-1">
              {filteredUnlinkedProperties.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {linkPropertySearch ? 'No se encontraron propiedades sin vincular' : 'No hay propiedades disponibles para vincular'}
                </p>
              ) : (
                filteredUnlinkedProperties.map(prop => (
                  <button
                    key={prop.id}
                    onClick={() => handleLinkProperty(prop.id)}
                    disabled={savingLink}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-muted/60 transition-colors text-left disabled:opacity-50 overflow-hidden"
                  >
                    <Home className="w-4 h-4 text-primary/60 flex-shrink-0" />
                    <div className="min-w-0 flex-1 overflow-hidden">
                      <span className="text-sm font-medium block truncate">{prop.title}</span>
                      <span className="text-xs text-muted-foreground block truncate">{prop.property_code} · {prop.address || prop.city || 'Sin dirección'}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Solo se muestran propiedades que no están vinculadas a ninguna unidad.
            </p>
          </div>
        </DialogContent>
      </Dialog>
      {/* Quick tenant dialog */}
      {showTenantDialog && tenantDialogUnit && (
        <QuickTenantDialog
          open={showTenantDialog}
          onOpenChange={setShowTenantDialog}
          propertyId={tenantDialogUnit.property?.id || null}
          propertyTitle={tenantDialogUnit.property?.title || tenantDialogUnit.property?.property_code || building?.name || ''}
          unitCode={tenantDialogUnit.unit_code}
          unitId={tenantDialogUnit.id}
          buildingId={id!}
          existingContractId={tenantDialogUnit.property?.contract_id}
          existingTenantName={tenantDialogUnit.property?.tenant_name}
        />
      )}
    </MainLayout>
  );
};

export default BuildingDetailPage;
