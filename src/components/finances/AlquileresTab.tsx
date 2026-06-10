/**
 * AlquileresTab — Ingresos de alquileres (pagos de inquilinos).
 * Muestra desglose Ueno Bank / Efectivo / Total por cada registro.
 */
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Home } from 'lucide-react';
import { DualScrollArea } from '@/components/ui/dual-scroll-area';

const fmtPYG = (n: number) =>
  new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', minimumFractionDigits: 0 }).format(n);

export const AlquileresTab = () => {
  const [filterProperty, setFilterProperty] = useState('all');
  const [filterMonth, setFilterMonth] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const { data: payments, isLoading } = useQuery({
    queryKey: ['rental-payments-finance'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('id, description, amount, currency, payment_type, payment_date, status, property_id, client_id, category, monto_banco, monto_efectivo')
        .eq('payment_type', 'income')
        .eq('category', 'alquiler')
        .order('payment_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: properties } = useQuery({
    queryKey: ['properties-for-rental-filter'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('properties')
        .select('id, title')
        .order('title');
      if (error) throw error;
      return data || [];
    },
  });

  const months = useMemo(() => {
    const set = new Set((payments || []).map(p => p.payment_date?.slice(0, 7)));
    return Array.from(set).filter(Boolean).sort().reverse();
  }, [payments]);

  const filtered = useMemo(() => {
    return (payments || []).filter(p => {
      if (filterProperty !== 'all' && p.property_id !== filterProperty) return false;
      if (filterMonth !== 'all' && !p.payment_date?.startsWith(filterMonth)) return false;
      if (filterStatus !== 'all' && p.status !== filterStatus) return false;
      return true;
    });
  }, [payments, filterProperty, filterMonth, filterStatus]);

  const totalCobrado = filtered.filter(p => p.status === 'paid').reduce((s, p) => s + Number(p.amount), 0);
  const totalPendiente = filtered.filter(p => p.status === 'pending').reduce((s, p) => s + Number(p.amount), 0);
  const totalUeno = filtered.reduce((s, p) => s + Number(p.monto_banco || 0), 0);
  const totalEfectivo = filtered.reduce((s, p) => s + Number(p.monto_efectivo || 0), 0);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Cobrado</p>
          <p className="text-lg font-bold text-success font-display">{fmtPYG(totalCobrado)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Pendiente</p>
          <p className="text-lg font-bold text-warning font-display">{fmtPYG(totalPendiente)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Total Ueno Bank</p>
          <p className="text-lg font-bold text-primary font-display">{fmtPYG(totalUeno)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Total Efectivo</p>
          <p className="text-lg font-bold text-foreground font-display">{fmtPYG(totalEfectivo)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <select value={filterProperty} onChange={e => setFilterProperty(e.target.value)}
          className="px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="all">Todas las propiedades</option>
          {(properties || []).map(p => (
            <option key={p.id} value={p.id}>{p.title}</option>
          ))}
        </select>
        <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
          className="px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="all">Todos los meses</option>
          {months.map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="all">Todos los estados</option>
          <option value="paid">Pagado</option>
          <option value="pending">Pendiente</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl">
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : !filtered.length ? (
          <div className="text-center py-12">
            <Home className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Sin ingresos de alquiler registrados</p>
          </div>
        ) : (
          <DualScrollArea>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Descripción</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">Estado</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Fecha</th>
                  <th className="text-right px-4 py-3 font-medium text-primary">Ueno Bank</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Efectivo</th>
                  <th className="text-right px-4 py-3 font-medium text-success">Total</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const banco = Number(p.monto_banco || 0);
                  const efectivo = Number(p.monto_efectivo || 0);
                  const total = Number(p.amount);
                  return (
                    <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">{p.description}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${p.status === 'paid' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                          {p.status === 'paid' ? 'Pagado' : 'Pendiente'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{p.payment_date}</td>
                      <td className="px-4 py-3 text-right font-semibold text-primary">{banco > 0 ? fmtPYG(banco) : '—'}</td>
                      <td className="px-4 py-3 text-right font-semibold text-foreground">{efectivo > 0 ? fmtPYG(efectivo) : '—'}</td>
                      <td className="px-4 py-3 text-right font-bold text-success">{fmtPYG(total)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-muted/30">
                  <td colSpan={3} className="px-4 py-3 font-bold text-foreground">Totales</td>
                  <td className="px-4 py-3 text-right font-bold text-primary">{fmtPYG(totalUeno)}</td>
                  <td className="px-4 py-3 text-right font-bold text-foreground">{fmtPYG(totalEfectivo)}</td>
                  <td className="px-4 py-3 text-right font-bold text-success">{fmtPYG(totalCobrado + totalPendiente)}</td>
                </tr>
              </tfoot>
            </table>
          </DualScrollArea>
        )}
      </div>
    </div>
  );
};
