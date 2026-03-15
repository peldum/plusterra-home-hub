import { useQuery } from '@tanstack/react-query';

const CACHE_KEY = 'plusterra_exchange_rates';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export interface ExchangeRates {
  USD: number;
  BRL: number;
}

export const useExchangeRates = () => {
  return useQuery<ExchangeRates | null>({
    queryKey: ['exchange-rates'],
    queryFn: async () => {
      try {
        // Check localStorage cache
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const { rates, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < CACHE_TTL) return rates as ExchangeRates;
        }

        const res = await fetch('https://api.exchangerate-api.com/v4/latest/PYG');
        if (!res.ok) return null;
        const data = await res.json();
        const rates: ExchangeRates = {
          USD: data.rates?.USD ?? 0,
          BRL: data.rates?.BRL ?? 0,
        };

        if (rates.USD > 0) {
          localStorage.setItem(CACHE_KEY, JSON.stringify({ rates, timestamp: Date.now() }));
        }

        return rates;
      } catch {
        // Silent fail — never show errors to user
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          try {
            return JSON.parse(cached).rates as ExchangeRates;
          } catch { /* ignore */ }
        }
        return null;
      }
    },
    staleTime: CACHE_TTL,
    retry: false,
    refetchOnWindowFocus: false,
  });
};
