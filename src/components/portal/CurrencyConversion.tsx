import { useExchangeRates } from '@/hooks/useExchangeRates';

interface Props {
  amount: number;
  currency?: string | null;
}

export const CurrencyConversion = ({ amount, currency }: Props) => {
  const { data: rates } = useExchangeRates();

  // Only show for PYG prices with valid rates
  if (!rates || currency === 'USD' || !amount || amount <= 0 || !rates.USD || !rates.BRL) return null;

  let usd: number;
  let brl: number;
  try {
    usd = Math.round(amount * rates.USD);
    brl = Math.round(amount * rates.BRL);
  } catch {
    return null;
  }

  if (!isFinite(usd) || !isFinite(brl)) return null;

  return (
    <div className="mt-0.5">
      <p className="text-xs text-muted-foreground font-normal">
        ~ USD {usd.toLocaleString('en-US')} · ~ BRL {brl.toLocaleString('pt-BR')}
      </p>
      <p className="text-[10px] text-muted-foreground/60 font-normal">Ref. tipo de cambio oficial</p>
    </div>
  );
};
