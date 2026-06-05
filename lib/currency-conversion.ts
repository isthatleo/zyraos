type RateCacheEntry = {
  rate: number;
  date: string | null;
  provider: string;
  fetchedAt: number;
};

export type ConvertedMoney = {
  originalAmount: number;
  originalCurrency: string;
  displayAmount: number;
  displayCurrency: string;
  exchangeRate: number;
  exchangeRateDate: string | null;
  exchangeRateProvider: string;
  exchangeRateStale: boolean;
  conversionAvailable: boolean;
};

const RATE_CACHE = new Map<string, RateCacheEntry>();
const CACHE_TTL_MS = 30 * 60 * 1000;
const STALE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const PROVIDER_TIMEOUT_MS = 1500;

function normalizeCurrency(value: unknown, fallback = "ZAR") {
  const currency = String(value || fallback).trim().toUpperCase();
  return /^[A-Z]{3}$/.test(currency) ? currency : fallback;
}

function roundMoney(value: number) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

async function fetchFrankfurterRate(from: string, to: string): Promise<RateCacheEntry | null> {
  const response = await fetch(`https://api.frankfurter.dev/v1/latest?base=${from}&symbols=${to}`, {
    cache: "no-store",
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
  });
  if (!response.ok) return null;
  const payload = (await response.json().catch(() => null)) as { date?: string; rates?: Record<string, number> } | null;
  const rate = Number(payload?.rates?.[to]);
  if (!Number.isFinite(rate) || rate <= 0) return null;
  return {
    rate,
    date: payload?.date || null,
    provider: "Frankfurter",
    fetchedAt: Date.now(),
  };
}

async function fetchOpenExchangeRate(from: string, to: string): Promise<RateCacheEntry | null> {
  const response = await fetch(`https://open.er-api.com/v6/latest/${from}`, {
    cache: "no-store",
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
  });
  if (!response.ok) return null;
  const payload = (await response.json().catch(() => null)) as {
    result?: string;
    time_last_update_utc?: string;
    rates?: Record<string, number>;
  } | null;
  if (payload?.result && payload.result !== "success") return null;
  const rate = Number(payload?.rates?.[to]);
  if (!Number.isFinite(rate) || rate <= 0) return null;
  return {
    rate,
    date: payload?.time_last_update_utc ? new Date(payload.time_last_update_utc).toISOString().slice(0, 10) : null,
    provider: "ExchangeRate-API",
    fetchedAt: Date.now(),
  };
}

async function fetchCurrencyApiRate(from: string, to: string): Promise<RateCacheEntry | null> {
  const base = from.toLowerCase();
  const target = to.toLowerCase();
  const response = await fetch(`https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${base}.json`, {
    cache: "no-store",
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
  });
  if (!response.ok) return null;
  const payload = (await response.json().catch(() => null)) as { date?: string } & Record<string, Record<string, number>>;
  const rate = Number(payload?.[base]?.[target]);
  if (!Number.isFinite(rate) || rate <= 0) return null;
  return {
    rate,
    date: payload.date || null,
    provider: "Currency API CDN",
    fetchedAt: Date.now(),
  };
}

export async function getExchangeRate(fromInput: unknown, toInput: unknown) {
  const from = normalizeCurrency(fromInput);
  const to = normalizeCurrency(toInput);
  if (from === to) {
    return {
      rate: 1,
      date: new Date().toISOString().slice(0, 10),
      provider: "native",
      stale: false,
      available: true,
    };
  }

  const key = `${from}:${to}`;
  const cached = RATE_CACHE.get(key);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return { ...cached, stale: false, available: true };
  }

  const providers = [fetchOpenExchangeRate, fetchFrankfurterRate, fetchCurrencyApiRate];
  try {
    const fresh = await Promise.any(
      providers.map(async (provider) => {
        const result = await provider(from, to);
        if (!result) throw new Error("No exchange rate returned");
        return result;
      })
    );
    RATE_CACHE.set(key, fresh);
    return { ...fresh, stale: false, available: true };
  } catch (error) {
    console.warn(`Currency conversion providers failed for ${from} to ${to}:`, error);
  }

  if (cached && Date.now() - cached.fetchedAt < STALE_CACHE_TTL_MS) return { ...cached, stale: true, available: true };
  return {
    rate: 1,
    date: null,
    provider: "unavailable",
    stale: true,
    available: false,
  };
}

export async function convertMoney(amountInput: unknown, fromInput: unknown, toInput: unknown): Promise<ConvertedMoney> {
  const originalAmount = Number(amountInput || 0);
  const originalCurrency = normalizeCurrency(fromInput);
  const displayCurrency = normalizeCurrency(toInput, originalCurrency);
  const rate = await getExchangeRate(originalCurrency, displayCurrency);
  const canConvert = rate.available || originalCurrency === displayCurrency;

  return {
    originalAmount: roundMoney(originalAmount),
    originalCurrency,
    displayAmount: roundMoney(canConvert ? originalAmount * rate.rate : originalAmount),
    displayCurrency: canConvert ? displayCurrency : originalCurrency,
    exchangeRate: rate.rate,
    exchangeRateDate: rate.date,
    exchangeRateProvider: rate.provider,
    exchangeRateStale: rate.stale,
    conversionAvailable: canConvert,
  };
}
