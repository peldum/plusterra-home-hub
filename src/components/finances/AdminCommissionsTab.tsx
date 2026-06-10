/**
 * AdminCommissionsTab — Comisiones por administración de propiedades.
 * Muestra el desglose de ingresos de Plusterra por administración de edificios:
 * - Comisión interna (5% Plusterra)
 * - Comisión externa (3% Glosker/tercero)
 * - IVA 5%
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Building2 } from 'lucide-react';
import { DualScrollArea } from '@/components/ui/dual-scroll-area';

const fmtPYG = (n: number) =>
  new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', minimumFractionDigits: 0 }).format(n);

export const AdminCommissionsTab = () => {
  // Get paid rent receivables with building
  const { data: receivables, isLoading: loadingRecv } = useQuery({
    queryKey: ['admin-comm-receivables'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('receivables')
        .select('id, building_id, unit_code, debtor_name, total_cobrado, paid_amount, amount, paid_date, due_date, description')
        .eq('concept', 'alquiler')
        .eq('status', 'paid')
        .not('building_id', 'is', null)
        .order('paid_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: buildings, isLoading: loadingBldg } = useQuery({
    queryKey: ['admin-comm-buildings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('buildings')
        .select('id, name, admin_fee_total_pct, admin_fee_internal_pct, admin_fee_external_pct, is_third_party_admin, external_admin_company')
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  const isLoading = loadingRecv || loadingBldg;

  const buildingMap = useMemo(() => {
    return new Map((buildings || []).map(b => [b.id, b]));
  }, [buildings]);

  // Group by building and calculate admin fees
  const buildingGroups = useMemo(() => {
    const groups = new Map<string, {
      building: any;
      entries: any[];
      totalRent: number;
      adminTotal: number;
      plusterraFee: number;
      externalFee: number;
      iva: number;
    }>();

    (receivables || []).forEach(r => {
      const b = buildingMap.get(r.building_id);
      if (!b) return;

      const paid = Number(r.total_cobrado || r.paid_amount || r.amount || 0);
      const adminTotal = Math.round(paid * (b.admin_fee_total_pct || 8) / 100);
      const plusterraFee = Math.round(paid * (b.admin_fee_internal_pct || 5) / 100);
      const externalFee = b.is_third_party_admin ? Math.round(paid * (b.admin_fee_external_pct || 3) / 100) : 0;

      if (!groups.has(r.building_id)) {
        groups.set(r.building_id, {
          building: b,
          entries: [],
          totalRent: 0,
          adminTotal: 0,
          plusterraFee: 0,
          externalFee: 0,
          iva: 0,
        });
      }

      const g = groups.get(r.building_id)!;
      g.entries.push({ ...r, paid, adminTotal, plusterraFee, externalFee });
      g.totalRent += paid;
      g.adminTotal += adminTotal;
      g.plusterraFee += plusterraFee;
      g.externalFee += externalFee;
    });

    // Calculate IVA 5% on total admin fee per building
    groups.forEach(g => {
      g.iva = Math.round(g.adminTotal * 0.05);
    });

    return Array.from(groups.values()).sort((a, b) => b.plusterraFee - a.plusterraFee);
  }, [receivables, buildingMap]);

  const grandTotals = useMemo(() => {
    return buildingGroups.reduce((acc, g) => ({
      totalRent: acc.totalRent + g.totalRent,
      adminTotal: acc.adminTotal + g.adminTotal,
      plusterraFee: acc.plusterraFee + g.plusterraFee,
      externalFee: acc.externalFee + g.externalFee,
      iva: acc.iva + g.iva,
      ingresoPlusterra: acc.ingresoPlusterra + g.plusterraFee + g.iva,
    }), { totalRent: 0, adminTotal: 0, plusterraFee: 0, externalFee: 0, iva: 0, ingresoPlusterra: 0 });
  }, [buildingGroups]);

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Alquileres Administrados</p>
          <p className="text-lg font-bold text-foreground font-display">{fmtPYG(grandTotals.totalRent)}</p>
          <p className="text-[10px] text-muted-foreground mt-1">Fondos de terceros (no son ingreso)</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Comisión Plusterra (5%)</p>
          <p className="text-lg font-bold text-success font-display">{fmtPYG(grandTotals.plusterraFee)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">IVA 5% Facturado</p>
          <p className="text-lg font-bold text-success font-display">{fmtPYG(grandTotals.iva)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 border-success/30">
          <p className="text-xs text-muted-foreground mb-1">Ingreso Real Plusterra</p>
          <p className="text-lg font-bold text-success font-display">{fmtPYG(grandTotals.ingresoPlusterra)}</p>
          <p className="text-[10px] text-muted-foreground mt-1">Comisión 5% + IVA 5%</p>
        </div>
      </div>

      {grandTotals.externalFee > 0 && (
        <div className="bg-muted/50 border border-border rounded-xl px-4 py-2.5 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Comisión tercero (Glosker 3%)</span>
          <span className="text-sm font-bold text-muted-foreground">{fmtPYG(grandTotals.externalFee)}</span>
        </div>
      )}

      {/* Per-building breakdown */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : !buildingGroups.length ? (
        <div className="text-center py-12 bg-card border border-border rounded-xl">
          <Building2 className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Sin comisiones de administración registradas</p>
        </div>
      ) : (
        <div className="space-y-4">
          {buildingGroups.map(g => (
            <div key={g.building.id} className="bg-card border border-border rounded-xl">
              <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-primary" />
                  <h4 className="text-sm font-semibold text-foreground">{g.building.name}</h4>
                  <span className="text-xs text-muted-foreground">({g.entries.length} cobro{g.entries.length !== 1 ? 's' : ''})</span>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-muted-foreground">Comisión 5%: <strong className="text-success">{fmtPYG(g.plusterraFee)}</strong></span>
                  <span className="text-muted-foreground">IVA: <strong className="text-success">{fmtPYG(g.iva)}</strong></span>
                </div>
              </div>
              <DualScrollArea>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/20">
                      <th className="text-left px-4 py-2 font-medium text-muted-foreground text-xs">Unidad</th>
                      <th className="text-left px-4 py-2 font-medium text-muted-foreground text-xs">Inquilino</th>
                      <th className="text-right px-4 py-2 font-medium text-muted-foreground text-xs">Alquiler</th>
                      <th className="text-right px-4 py-2 font-medium text-muted-foreground text-xs">Admin 8%</th>
                      <th className="text-right px-4 py-2 font-medium text-muted-foreground text-xs">Plusterra 5%</th>
                      <th className="text-left px-4 py-2 font-medium text-muted-foreground text-xs">Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.entries.map((e: any) => (
                      <tr key={e.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-2 font-medium text-foreground">{e.unit_code || '—'}</td>
                        <td className="px-4 py-2 text-foreground">{e.debtor_name || '—'}</td>
                        <td className="px-4 py-2 text-right text-muted-foreground">{fmtPYG(e.paid)}</td>
                        <td className="px-4 py-2 text-right text-foreground">{fmtPYG(e.adminTotal)}</td>
                        <td className="px-4 py-2 text-right font-semibold text-success">{fmtPYG(e.plusterraFee)}</td>
                        <td className="px-4 py-2 text-muted-foreground">{e.paid_date || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </DualScrollArea>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
