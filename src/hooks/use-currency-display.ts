import { useCurrencyRates } from "@/components/providers/currency-provider";
import { formatCurrency, formatRupiah } from "@/lib/currency";
import { useCurrencyPreference } from "./use-currency-preference";

/**
 * Converts and formats an IDR-denominated amount into the user's chosen
 * display currency (Settings → Regional), using the shared live exchange
 * rate cache. Falls back to IDR if the rate isn't available yet.
 */
export function useCurrencyDisplay() {
  const { currency: displayCurrency } = useCurrencyPreference();
  const { rates, ratesUpdatedAt, ratesLoading, refreshRates } = useCurrencyRates();

  const convert = (amountIDR: number): number => {
    if (displayCurrency === "IDR") return amountIDR;
    const rate = rates[displayCurrency];
    return rate ? amountIDR * rate : amountIDR;
  };

  const formatDisplay = (amountIDR: number): string => {
    if (displayCurrency === "IDR") return formatRupiah(amountIDR);
    const rate = rates[displayCurrency];
    if (!rate) return formatRupiah(amountIDR); // rate not loaded yet — show IDR rather than a wrong number
    return formatCurrency(amountIDR * rate, displayCurrency);
  };

  return { displayCurrency, convert, formatDisplay, ratesUpdatedAt, ratesLoading, refreshRates };
}
