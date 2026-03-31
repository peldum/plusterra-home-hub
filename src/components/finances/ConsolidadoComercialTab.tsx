/**
 * ConsolidadoComercialTab — Monthly consolidated commercial report
 * matching the exact PDF format: Ventas y Alquileres with dashboard summary.
 */
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, FileText, Download, TrendingUp, BarChart3 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { exportConsolidadoPDF, exportConsolidadoExcel, type ConsolidadoRow } from '@/lib/consolidadoComercialExport';

const fmtPYG = (n: number) =>
  new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', minimumFractionDigits: 0 }).format(n);

const fmtNum = (n: number) =>
  new Intl.NumberFormat('es-PY', { maximumFractionDigits: 0 }).format(n);

const getMonthLabel = (ym: string) => {
  const [y, m] = ym.split('-');
  const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  return `${months[parseInt(m, 10) - 1]} ${y}`;
};

const getCurrentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

export const ConsolidadoComercialTab = () => {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());

  // Fetch all quick commissions (non-deleted)
  const { data: allQuickComms, isLoading: loadingQuick } = useQuery({
    queryKey: ['consolidado-quick-comms'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('quick_commissions')
        .select('*')
        .is('deleted_at', null)
        .order('operation_date', { ascending: true });
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  // Fetch deal-based commissions
  const { data: allDealComms, isLoading: loadingDeals } = useQuery({
    queryKey: ['consolidado-deal-comms'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('commissions')
        .select('*, deal:deal_id(deal_type, amount, currency, start_date, notes, properties(title, property_code), clients(full_name))')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  // Fetch agents
  const { data: agents } = useQuery({
    queryKey: ['consolidado-agents'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('profiles')
        .select('id, full_name')
        .order('full_name');
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  // Fetch properties for enrichment
  const { data: properties } = useQuery({
    queryKey: ['consolidado-properties'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('properties')
        .select('id, title, property_code');
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const agentName = (id: string) => (agents || []).find((a: any) => a.id === id)?.full_name || '—';
  const propMap = useMemo(() => new Map((properties || []).map((p: any) => [p.id, p])), [properties]);

  // Derive available months
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    (allQuickComms || []).forEach((q: any) => {
      if (q.operation_date) set.add(q.operation_date.slice(0, 7));
      else if (q.created_at) set.add((q.created_at as string).slice(0, 7));
    });
    (allDealComms || []).forEach((c: any) => {
      const d = c.deal?.start_date || c.created_at;
      if (d) set.add(d.slice(0, 7));
    });
    // Always include current month
    set.add(getCurrentMonth());
    return Array.from(set).sort().reverse();
  }, [allQuickComms, allDealComms]);

  // Build consolidated rows for selected month
  const rows: ConsolidadoRow[] = useMemo(() => {
    const result: ConsolidadoRow[] = [];

    // Quick commissions for the month
    (allQuickComms || []).forEach((q: any) => {
      const qMonth = q.operation_date ? q.operation_date.slice(0, 7) : (q.created_at as string).slice(0, 7);
      if (qMonth !== selectedMonth) return;

      const prop = q.property_id ? propMap.get(q.property_id) : null;
      const codigo = prop?.property_code || q._property_code || '—';
      const inmueble = prop?.title || q.property_address || q._property_title || 'Sin nombre';
      const tipo = q.operation_type === 'sale' ? 'Venta' : 'Alquiler';
      const comisionOfrecida = Number(q.comision_ofrecida || q.gross_amount || 0);
      const comisionFinal = Number(q.gross_amount || 0);
      const tipoComision = q.operation_type === 'sale' ? 'VENTA' : '50% MES + COMISIÓN';
      const totalAgentes85 = Number(q.net_amount || 0) + Number(q.co_agent_net_amount || 0);
      const captadorName = agentName(q.agent_id);
      const comisionCaptador = Number(q.agent_net_amount || q.net_amount || 0);
      const colocadorName = q.is_co_agent && q.co_agent_id ? agentName(q.co_agent_id) : captadorName;
      const comisionColocador = Number(q.co_agent_net_amount || 0);
      const plusterra15 = Number(q.company_amount || 0);

      // Payment distribution
      let montoBanco = Number(q.monto_banco || 0);
      let montoEfectivo = Number(q.monto_efectivo || 0);
      let montoPendiente = Number(q.monto_pendiente || 0);

      // If the new fields are empty, derive from payment_method and status
      if (!montoBanco && !montoEfectivo && !montoPendiente) {
        if (q.status === 'paid') {
          if (q.payment_method === 'transferencia') {
            montoBanco = comisionFinal;
          } else {
            montoEfectivo = comisionFinal;
          }
        } else {
          montoPendiente = comisionFinal;
        }
      }

      result.push({
        fecha: q.operation_date || (q.created_at as string).slice(0, 10),
        codigo,
        inmueble,
        tipo,
        comisionOfrecida,
        comisionFinal,
        tipoComision,
        totalAgentes85,
        agenteCaptador: captadorName,
        comisionCaptador,
        agenteColocador: colocadorName,
        comisionColocador,
        plusterra15,
        montoBanco,
        montoEfectivo,
        montoPendiente,
        facturaNumero: q.factura_numero || '',
        estado: q.status === 'paid' ? 'Cobrada' : 'Pendiente',
        observacion: q.notes || '',
        sourceId: q.id,
        sourceType: 'quick',
      });
    });

    // Deal-based commissions for the month (grouped by deal)
    const dealGroups = new Map<string, any[]>();
    (allDealComms || []).forEach((c: any) => {
      const d = c.deal?.start_date || c.created_at;
      const cMonth = d ? d.slice(0, 7) : '';
      if (cMonth !== selectedMonth) return;
      const key = c.deal_id || c.id;
      if (!dealGroups.has(key)) dealGroups.set(key, []);
      dealGroups.get(key)!.push(c);
    });

    dealGroups.forEach((comms) => {
      const first = comms[0];
      const deal = first?.deal;
      if (!deal) return;

      const tipo = deal.deal_type === 'sale' ? 'Venta' : 'Alquiler';
      const codigo = deal.properties?.property_code || '—';
      const inmueble = deal.properties?.title || 'Sin nombre';
      const captor = comms.find((c: any) => c.agent_role === 'captor') || first;
      const closer = comms.find((c: any) => c.agent_role === 'closer');
      const totalGross = comms.reduce((s: number, c: any) => s + Number(c.gross_amount || 0), 0);
      const totalNet = comms.reduce((s: number, c: any) => s + Number(c.net_amount || 0), 0);
      const totalCompany = comms.reduce((s: number, c: any) => s + Number(c.company_amount || 0), 0);

      result.push({
        fecha: (deal.start_date || first.created_at || '').slice(0, 10),
        codigo,
        inmueble,
        tipo,
        comisionOfrecida: totalGross,
        comisionFinal: totalGross,
        tipoComision: deal.deal_type === 'sale' ? 'VENTA' : '50% MES + COMISIÓN',
        totalAgentes85: totalNet,
        agenteCaptador: agentName(captor.agent_id),
        comisionCaptador: Number(captor.net_amount || 0),
        agenteColocador: closer ? agentName(closer.agent_id) : agentName(captor.agent_id),
        comisionColocador: closer ? Number(closer.net_amount || 0) : 0,
        plusterra15: totalCompany,
        montoBanco: 0,
        montoEfectivo: 0,
        montoPendiente: captor.status === 'paid' ? 0 : totalGross,
        facturaNumero: '',
        estado: captor.status === 'paid' ? 'Cobrada' : 'Pendiente',
        observacion: captor.notes || '',
        sourceId: first.deal_id,
        sourceType: 'deal',
      });
    });

    // Sort by date
    result.sort((a, b) => a.fecha.localeCompare(b.fecha));
    return result;
  }, [allQuickComms, allDealComms, selectedMonth, agents, propMap]);

  // Totals
  const totals = useMemo(() => {
    return {
      comisionOfrecida: rows.reduce((s, r) => s + r.comisionOfrecida, 0),
      comisionFinal: rows.reduce((s, r) => s + r.comisionFinal, 0),
      totalAgentes85: rows.reduce((s, r) => s + r.totalAgentes85, 0),
      plusterra15: rows.reduce((s, r) => s + r.plusterra15, 0),
      montoBanco: rows.reduce((s, r) => s + r.montoBanco, 0),
      montoEfectivo: rows.reduce((s, r) => s + r.montoEfectivo, 0),
      montoPendiente: rows.reduce((s, r) => s + r.montoPendiente, 0),
    };
  }, [rows]);

  // Dashboard summary
  const dashboard = useMemo(() => {
    const byType: Record<string, number> = {};
    const byAgent: Record<string, { ops: number; commission: number }> = {};
    let cobradas = 0;
    let pendientes = 0;

    rows.forEach(r => {
      byType[r.tipoComision] = (byType[r.tipoComision] || 0) + 1;
      if (!byAgent[r.agenteCaptador]) byAgent[r.agenteCaptador] = { ops: 0, commission: 0 };
      byAgent[r.agenteCaptador].ops += 1;
      byAgent[r.agenteCaptador].commission += r.comisionCaptador;
      if (r.estado === 'Cobrada') cobradas++;
      else pendientes++;
    });

    const topOps = Object.entries(byAgent).sort((a, b) => b[1].ops - a[1].ops)[0];
    const topComm = Object.entries(byAgent).sort((a, b) => b[1].commission - a[1].commission)[0];
    const tiposLabel = Object.entries(byType).map(([k, v]) => `${k} (${v})`).join(', ') || '—';

    return {
      tiposLabel,
      estadoLabel: pendientes > 0 ? `${cobradas} Cobradas / ${pendientes} Pendientes` : 'Todo Cobrado',
      totalOperaciones: rows.length,
      plusterra15Total: totals.plusterra15,
      ventasCount: rows.filter(r => r.tipo === 'Venta').length,
      alquileresCount: rows.filter(r => r.tipo === 'Alquiler').length,
      topAgentOps: topOps ? `${topOps[0]} (${topOps[1].ops})` : '—',
      topAgentComm: topComm ? `${topComm[0]} (${fmtPYG(topComm[1].commission)})` : '—',
    };
  }, [rows, totals]);

  const isLoading = loadingQuick || loadingDeals;

  return (
    <div className="space-y-4">
      {/* Month selector */}
      <div className="flex items-center gap-3 flex-wrap">
        <h3 className="text-lg font-bold text-foreground font-display">Consolidado Mensual - Comercial</h3>
        <select
          value={selectedMonth}
          onChange={e => setSelectedMonth(e.target.value)}
          className="px-3 py-2 rounded-lg border border-input bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {availableMonths.map(m => (
            <option key={m} value={m}>{getMonthLabel(m)}</option>
          ))}
        </select>
        <Badge variant="outline" className="text-xs">{rows.length} operaciones</Badge>

        {/* Export */}
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={() => {
              if (!rows.length) { toast.error('No hay datos para exportar'); return; }
              exportConsolidadoPDF(rows, totals, dashboard, getMonthLabel(selectedMonth));
              toast.success('PDF generado');
            }}
            disabled={!rows.length}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-input bg-background text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
          >
            <FileText className="w-4 h-4 text-destructive" /> PDF
          </button>
          <button
            onClick={() => {
              if (!rows.length) { toast.error('No hay datos para exportar'); return; }
              exportConsolidadoExcel(rows, totals, dashboard, getMonthLabel(selectedMonth));
              toast.success('Excel generado');
            }}
            disabled={!rows.length}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-input bg-background text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4 text-success" /> Excel
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : !rows.length ? (
        <div className="text-center py-12 bg-card border border-border rounded-xl">
          <BarChart3 className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Sin operaciones en {getMonthLabel(selectedMonth)}</p>
        </div>
      ) : (
        <>
          {/* Table */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-[hsl(var(--primary))] text-primary-foreground">
                    <th className="px-2 py-2.5 text-left font-semibold whitespace-nowrap">FECHA</th>
                    <th className="px-2 py-2.5 text-left font-semibold whitespace-nowrap">CÓDIGO</th>
                    <th className="px-2 py-2.5 text-left font-semibold whitespace-nowrap">INMUEBLE</th>
                    <th className="px-2 py-2.5 text-center font-semibold whitespace-nowrap">TIPO</th>
                    <th className="px-2 py-2.5 text-right font-semibold whitespace-nowrap">COM. OFRECIDA</th>
                    <th className="px-2 py-2.5 text-right font-semibold whitespace-nowrap">COM. FINAL</th>
                    <th className="px-2 py-2.5 text-center font-semibold whitespace-nowrap">TIPO COM.</th>
                    <th className="px-2 py-2.5 text-right font-semibold whitespace-nowrap">85% AGENTES</th>
                    <th className="px-2 py-2.5 text-left font-semibold whitespace-nowrap">CAPTADOR</th>
                    <th className="px-2 py-2.5 text-right font-semibold whitespace-nowrap">COM. CAPT.</th>
                    <th className="px-2 py-2.5 text-left font-semibold whitespace-nowrap">COLOCADOR</th>
                    <th className="px-2 py-2.5 text-right font-semibold whitespace-nowrap">COM. COLOC.</th>
                    <th className="px-2 py-2.5 text-right font-semibold whitespace-nowrap">PLUSTERRA 15%</th>
                    <th className="px-2 py-2.5 text-right font-semibold whitespace-nowrap">UENO BANK</th>
                    <th className="px-2 py-2.5 text-right font-semibold whitespace-nowrap">EFECTIVO</th>
                    <th className="px-2 py-2.5 text-right font-semibold whitespace-nowrap">PENDIENTE</th>
                    <th className="px-2 py-2.5 text-center font-semibold whitespace-nowrap">N° FACTURA</th>
                    <th className="px-2 py-2.5 text-center font-semibold whitespace-nowrap">ESTADO</th>
                    <th className="px-2 py-2.5 text-left font-semibold whitespace-nowrap">OBSERVACIÓN</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, idx) => (
                    <tr key={`${r.sourceType}-${r.sourceId}-${idx}`} className={idx % 2 === 1 ? 'bg-muted/30' : ''}>
                      <td className="px-2 py-2 whitespace-nowrap text-foreground">{r.fecha}</td>
                      <td className="px-2 py-2 whitespace-nowrap font-mono text-foreground">{r.codigo}</td>
                      <td className="px-2 py-2 text-foreground max-w-[150px] truncate" title={r.inmueble}>{r.inmueble}</td>
                      <td className="px-2 py-2 text-center">
                        <Badge variant="outline" className={`text-[10px] ${r.tipo === 'Venta' ? 'border-success/40 text-success' : 'border-primary/40 text-primary'}`}>
                          {r.tipo}
                        </Badge>
                      </td>
                      <td className="px-2 py-2 text-right font-medium text-foreground">{fmtNum(r.comisionOfrecida)}</td>
                      <td className="px-2 py-2 text-right font-medium text-foreground">{fmtNum(r.comisionFinal)}</td>
                      <td className="px-2 py-2 text-center text-[10px] text-muted-foreground">{r.tipoComision}</td>
                      <td className="px-2 py-2 text-right font-bold text-success">{fmtNum(r.totalAgentes85)}</td>
                      <td className="px-2 py-2 whitespace-nowrap text-foreground">{r.agenteCaptador}</td>
                      <td className="px-2 py-2 text-right text-foreground">{fmtNum(r.comisionCaptador)}</td>
                      <td className="px-2 py-2 whitespace-nowrap text-foreground">{r.agenteColocador}</td>
                      <td className="px-2 py-2 text-right text-foreground">{fmtNum(r.comisionColocador)}</td>
                      <td className="px-2 py-2 text-right font-bold text-primary">{fmtNum(r.plusterra15)}</td>
                      <td className="px-2 py-2 text-right text-foreground">{r.montoBanco ? fmtNum(r.montoBanco) : ''}</td>
                      <td className="px-2 py-2 text-right text-foreground">{r.montoEfectivo ? fmtNum(r.montoEfectivo) : ''}</td>
                      <td className="px-2 py-2 text-right text-warning font-medium">{r.montoPendiente ? fmtNum(r.montoPendiente) : ''}</td>
                      <td className="px-2 py-2 text-center text-foreground">{r.facturaNumero || ''}</td>
                      <td className="px-2 py-2 text-center">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${r.estado === 'Cobrada' ? 'bg-success/10 text-success border-success/30' : 'bg-warning/10 text-warning border-warning/30'}`}>
                          {r.estado}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-muted-foreground max-w-[120px] truncate" title={r.observacion}>{r.observacion}</td>
                    </tr>
                  ))}
                </tbody>
                {/* Totals row */}
                <tfoot>
                  <tr className="bg-[hsl(var(--accent))] font-bold text-foreground border-t-2 border-border">
                    <td className="px-2 py-2.5" colSpan={4}>TOTAL</td>
                    <td className="px-2 py-2.5 text-right">{fmtNum(totals.comisionOfrecida)}</td>
                    <td className="px-2 py-2.5 text-right">{fmtNum(totals.comisionFinal)}</td>
                    <td className="px-2 py-2.5"></td>
                    <td className="px-2 py-2.5 text-right text-success">{fmtNum(totals.totalAgentes85)}</td>
                    <td className="px-2 py-2.5" colSpan={2}></td>
                    <td className="px-2 py-2.5" colSpan={2}></td>
                    <td className="px-2 py-2.5 text-right text-primary">{fmtNum(totals.plusterra15)}</td>
                    <td className="px-2 py-2.5 text-right">{totals.montoBanco ? fmtNum(totals.montoBanco) : ''}</td>
                    <td className="px-2 py-2.5 text-right">{totals.montoEfectivo ? fmtNum(totals.montoEfectivo) : ''}</td>
                    <td className="px-2 py-2.5 text-right text-warning">{totals.montoPendiente ? fmtNum(totals.montoPendiente) : ''}</td>
                    <td className="px-2 py-2.5" colSpan={3}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Dashboard Summary */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h4 className="text-sm font-bold text-foreground font-display uppercase">Resumen Dashboard — {getMonthLabel(selectedMonth)}</h4>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-[10px] text-muted-foreground uppercase font-medium mb-1">Tipo de Comisión</p>
                <p className="text-xs font-semibold text-foreground">{dashboard.tiposLabel}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-[10px] text-muted-foreground uppercase font-medium mb-1">Estado</p>
                <p className="text-xs font-semibold text-foreground">{dashboard.estadoLabel}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-[10px] text-muted-foreground uppercase font-medium mb-1">Total Operaciones</p>
                <p className="text-lg font-bold text-foreground">{dashboard.totalOperaciones}</p>
                <p className="text-[10px] text-muted-foreground">{dashboard.ventasCount} Ventas · {dashboard.alquileresCount} Alquileres</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-[10px] text-muted-foreground uppercase font-medium mb-1">Comisión 15% Plusterra</p>
                <p className="text-lg font-bold text-primary">{fmtPYG(dashboard.plusterra15Total)}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-[10px] text-muted-foreground uppercase font-medium mb-1">Agente con más operaciones</p>
                <p className="text-xs font-semibold text-foreground">{dashboard.topAgentOps}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-[10px] text-muted-foreground uppercase font-medium mb-1">Agente con más comisiones</p>
                <p className="text-xs font-semibold text-foreground">{dashboard.topAgentComm}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-[10px] text-muted-foreground uppercase font-medium mb-1">Total Banco (Ueno)</p>
                <p className="text-sm font-bold text-foreground">{fmtPYG(totals.montoBanco)}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-[10px] text-muted-foreground uppercase font-medium mb-1">Total Efectivo</p>
                <p className="text-sm font-bold text-foreground">{fmtPYG(totals.montoEfectivo)}</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
