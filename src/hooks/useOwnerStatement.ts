import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type OwnerStatementLine = {
  id: string;
  date: string;
  type: 'income' | 'expense';
  category: string;
  description: string;
  amount: number;
  currency: string;
  property_title?: string;
  source: 'payment' | 'maintenance';
};

export const useOwnerStatement = (ownerId: string | null, month: string) => {
  return useQuery({
    queryKey: ['owner-statement', ownerId, month],
    queryFn: async () => {
      if (!ownerId) return { lines: [], properties: [] };

      // Get owner's properties
      const { data: properties, error: propErr } = await supabase
        .from('properties')
        .select('id, title, property_code')
        .eq('owner_id', ownerId);
      if (propErr) throw propErr;
      if (!properties || properties.length === 0) return { lines: [], properties: [] };

      const propertyIds = properties.map(p => p.id);
      const propMap = Object.fromEntries(properties.map(p => [p.id, `${p.property_code} - ${p.title}`]));

      const [startDate, endDate] = getMonthRange(month);

      // Get payments for these properties in the month
      const { data: payments, error: payErr } = await supabase
        .from('payments')
        .select('id, payment_date, payment_type, category, description, amount, currency, property_id')
        .in('property_id', propertyIds)
        .gte('payment_date', startDate)
        .lte('payment_date', endDate)
        .order('payment_date');
      if (payErr) throw payErr;

      // Get maintenance tickets completed in the month with actual cost
      const { data: tickets, error: tickErr } = await supabase
        .from('maintenance_tickets')
        .select('id, completed_date, description, actual_cost, currency, property_id')
        .in('property_id', propertyIds)
        .not('actual_cost', 'is', null)
        .gte('completed_date', startDate)
        .lte('completed_date', endDate);
      if (tickErr) throw tickErr;

      const lines: OwnerStatementLine[] = [];

      (payments || []).forEach(p => {
        lines.push({
          id: p.id,
          date: p.payment_date,
          type: p.payment_type as 'income' | 'expense',
          category: p.category,
          description: p.description,
          amount: p.amount,
          currency: p.currency || 'PYG',
          property_title: propMap[p.property_id!] || 'Sin propiedad',
          source: 'payment',
        });
      });

      (tickets || []).forEach(t => {
        lines.push({
          id: t.id,
          date: t.completed_date!,
          type: 'expense',
          category: 'Mantenimiento',
          description: t.description,
          amount: t.actual_cost!,
          currency: t.currency || 'PYG',
          property_title: propMap[t.property_id] || 'Sin propiedad',
          source: 'maintenance',
        });
      });

      lines.sort((a, b) => a.date.localeCompare(b.date));

      return { lines, properties };
    },
    enabled: !!ownerId && !!month,
  });
};

function getMonthRange(month: string): [string, string] {
  const [year, m] = month.split('-').map(Number);
  const start = `${year}-${String(m).padStart(2, '0')}-01`;
  const lastDay = new Date(year, m, 0).getDate();
  const end = `${year}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return [start, end];
}
