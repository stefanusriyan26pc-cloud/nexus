"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

const RATES_CACHE_KEY = "nexus_exchange_rates";
const RATES_MAX_AGE_MS = 60 * 60 * 1000; // 1 hour

type RatesCache = { rates: Record<string, number>; updatedAt: string };

type CurrencyContextValue = {
  /** How many units of `code` equal 1 IDR (base = IDR, from open.er-api.com). */
  rates: Record<string, number>;
  ratesUpdatedAt: string | null;
  ratesLoading: boolean;
  refreshRates: () => Promise<void>;
};

const CurrencyCtx = createContext<CurrencyContextValue | null>(null);

function readCache(): RatesCache | null {
  try {
    const raw = localStorage.getItem(RATES_CACHE_KEY);
    return raw ? (JSON.parse(raw) as RatesCache) : null;
  } catch {
    return null;
  }
}

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [rates, setRates] = useState<Record<string, number>>({});
  const [ratesUpdatedAt, setRatesUpdatedAt] = useState<string | null>(null);
  const [ratesLoading, setRatesLoading] = useState(false);

  const refreshRates = useCallback(async () => {
    setRatesLoading(true);
    try {
      const res = await fetch("https://open.er-api.com/v6/latest/IDR");
      const json = await res.json();
      if (json.rates) {
        const updatedAt = new Date().toISOString();
        setRates(json.rates);
        setRatesUpdatedAt(updatedAt);
        localStorage.setItem(RATES_CACHE_KEY, JSON.stringify({ rates: json.rates, updatedAt }));
      }
    } catch {
      /* keep whatever rates we already have */
    } finally {
      setRatesLoading(false);
    }
  }, []);

  useEffect(() => {
    const cached = readCache();
    if (cached) {
      setRates(cached.rates);
      setRatesUpdatedAt(cached.updatedAt);
    }
    const age = cached ? Date.now() - new Date(cached.updatedAt).getTime() : Infinity;
    if (age > RATES_MAX_AGE_MS) {
      refreshRates();
    }
  }, [refreshRates]);

  return (
    <CurrencyCtx.Provider value={{ rates, ratesUpdatedAt, ratesLoading, refreshRates }}>
      {children}
    </CurrencyCtx.Provider>
  );
}

export function useCurrencyRates() {
  const ctx = useContext(CurrencyCtx);
  if (!ctx) throw new Error("useCurrencyRates must be used within a CurrencyProvider");
  return ctx;
}
