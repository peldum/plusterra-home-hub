export const typeColors: Record<string, string> = {
  inquilino: 'bg-info/10 text-info border-info/20',
  Inquilino: 'bg-info/10 text-info border-info/20',
  propietario: 'bg-secondary/10 text-secondary border-secondary/20',
  Propietario: 'bg-secondary/10 text-secondary border-secondary/20',
  comprador: 'bg-success/10 text-success border-success/20',
  Comprador: 'bg-success/10 text-success border-success/20',
};

export const paymentColors: Record<string, { label: string; class: string; icon: string }> = {
  al_dia: { label: 'Al día', class: 'bg-success/10 text-success', icon: '🟢' },
  por_vencer: { label: 'Por vencer', class: 'bg-warning/10 text-warning', icon: '🟡' },
  vencido: { label: 'Vencido', class: 'bg-destructive/10 text-destructive', icon: '🔴' },
  na: { label: 'Sin cobros', class: 'bg-muted text-muted-foreground', icon: '⚪' },
};

export const formatCurrency = (amount: number | null | undefined, currency: string | null | undefined) => {
  if (!amount) return '—';
  const sym = currency === 'USD' ? 'US$' : '₲';
  return `${sym} ${amount.toLocaleString('es-PY')}`;
};

export const formatDate = (d: string | null | undefined) => {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
};

/** Clean phone number for wa.me link — removes non-digits, strips leading 0 */
export const cleanPhone = (phone: string): string => {
  let digits = phone.replace(/[^0-9]/g, '');
  // If starts with 0 (local Paraguay), replace with 595
  if (digits.startsWith('0')) {
    digits = '595' + digits.slice(1);
  }
  // If doesn't start with country code, prepend 595
  if (!digits.startsWith('595') && digits.length <= 10) {
    digits = '595' + digits;
  }
  return digits;
};
