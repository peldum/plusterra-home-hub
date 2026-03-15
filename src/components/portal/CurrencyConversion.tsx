import { useExchangeRates } from '@/hooks/useExchangeRates';

interface Props {
  amount: number;
  currency?: string | null;
}

export const CurrencyConversion = ({ amount, currency }: Props) => {
  const { data: rates } = useExchangeRates();

  // Only show for PYG prices with valid rates
  if (!rates || currency === 'USD' || amount <= 0 || !rates.USD || !rates.BRL) return null;

  const usd = Math.round(amount * rates.USD);
  const brl = Math.round(amount * rates.BRL);

  return (
    <div className="mt-0.5">
      <p className="text-xs text-gray-400 font-normal">
        ~ USD {usd.toLocaleString('en-US')} · ~ BRL {brl.toLocaleString('pt-BR')}
      </p>
      <p className="text-[10px] text-gray-300 font-normal">Ref. tipo de cambio oficial</p>
    </div>
  );
};
