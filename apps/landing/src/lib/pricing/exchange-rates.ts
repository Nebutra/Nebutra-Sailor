import { unstable_cache } from "next/cache";

interface ExchangeRateResponse {
  result: string;
  base_code: string;
  rates: Record<string, number>;
}

/**
 * Fallback static rates in case the API is down to guarantee graceful degradation.
 * These are approx values to ensure the page always renders a reasonable number.
 */
const FALLBACK_RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  CNY: 7.23,
  JPY: 151.3,
  AUD: 1.53,
  CAD: 1.35,
  CHF: 0.9,
  INR: 83.3,
  SGD: 1.34,
  HKD: 7.82,
  NZD: 1.66,
  KRW: 1350.0,
  TWD: 32.0,
};

async function fetchExchangeRates() {
  try {
    const response = await fetch("https://open.er-api.com/v6/latest/USD", {
      // It's cached by unstable_cache anyway, but cache: 'force-cache' helps inside Next.js data cache.
      cache: "force-cache",
      next: { revalidate: 3600 }, // 1 hour
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch exchange rates: ${response.statusText}`);
    }

    const data: ExchangeRateResponse = await response.json();
    return data.rates;
  } catch (error) {
    console.error("Pricing Exchange Rate API Error:", error);
    return FALLBACK_RATES;
  }
}

/**
 * Returns the exchange rate multiplier for a target currency compared to USD (1.0).
 * Caches the response for 1 hour to prevent rate limiting and improve latency.
 */
export const getExchangeRate = unstable_cache(
  async (targetCurrency: string): Promise<number> => {
    // If USD, bypass fetching for speed.
    if (targetCurrency.toUpperCase() === "USD") return 1;

    const rates = await fetchExchangeRates();
    const rate = rates[targetCurrency.toUpperCase()];

    // Fallback to 1 (USD) if currency is not found.
    return rate || 1;
  },
  ["exchange-rates-cache"],
  {
    revalidate: 3600, // Regenerate every 1 hour
  },
);
