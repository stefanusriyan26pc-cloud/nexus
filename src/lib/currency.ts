const IDR_FORMATTER = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatRupiah(amount: number): string {
  return IDR_FORMATTER.format(amount);
}

export function formatCurrency(amount: number, currency: string): string {
  if (currency === "IDR") return formatRupiah(amount);
  const locale = SUPPORTED_CURRENCIES.find((c) => c.code === currency)?.locale ?? "en-US";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function parseRupiahInput(value: string): number {
  const cleaned = value.replace(/[^\d]/g, "");
  return cleaned ? parseInt(cleaned, 10) : 0;
}

export function parseDecimalInput(value: string): number {
  const cleaned = value.replace(/[^\d.]/g, "");
  return cleaned ? parseFloat(cleaned) : 0;
}

// Supported currencies with display info
export const SUPPORTED_CURRENCIES = [
  { code: "IDR", label: "Indonesian Rupiah (IDR)", symbol: "Rp", locale: "id-ID" },
  { code: "USD", label: "US Dollar (USD)", symbol: "$", locale: "en-US" },
  { code: "EUR", label: "Euro (EUR)", symbol: "€", locale: "de-DE" },
  { code: "MYR", label: "Malaysian Ringgit (MYR)", symbol: "RM", locale: "ms-MY" },
  { code: "SGD", label: "Singapore Dollar (SGD)", symbol: "S$", locale: "en-SG" },
  { code: "JPY", label: "Japanese Yen (JPY)", symbol: "¥", locale: "ja-JP" },
  { code: "CNY", label: "Chinese Yuan (CNY)", symbol: "¥", locale: "zh-CN" },
  { code: "GBP", label: "British Pound (GBP)", symbol: "£", locale: "en-GB" },
] as const;

export type SupportedCurrencyCode = typeof SUPPORTED_CURRENCIES[number]["code"];
