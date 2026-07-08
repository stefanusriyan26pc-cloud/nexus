"use client";

import { FinancePageShell } from "@/components/layout/finance-page-shell";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/view-toggle";
import { formatCurrency, formatRupiah, parseRupiahInput, parseDecimalInput, SUPPORTED_CURRENCIES } from "@/lib/currency";
import { Select } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import type { Wallet } from "@/types/database";
import { Plus, Trash2, Wallet as WalletIcon, RefreshCw, Loader2, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "@/components/providers/i18n-provider";

const COLORS = [
  "#6366f1","#8b5cf6","#a855f7","#ec4899","#f43f5e",
  "#ef4444","#f97316","#f59e0b","#eab308","#84cc16",
  "#22c55e","#10b981","#14b8a6","#06b6d4","#0ea5e9",
  "#3b82f6","#64748b","#78716c","#d97706","#be185d",
];

export default function WalletsPage() {
  const { t } = useTranslation();
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: "", balance: "", color: COLORS[0], currency: "IDR" });
  const [saving, setSaving] = useState(false);
  const [rates, setRates] = useState<Record<string, number>>({});
  const [fetchingRates, setFetchingRates] = useState(false);
  const [ratesDate, setRatesDate] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase.from("wallets").select("*").order("created_at");
      setWallets(data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  // Only sum IDR wallets for the total (foreign wallets have different currency)
  const totalBalanceIDR = wallets.filter((w) => !w.currency || w.currency === "IDR").reduce((s, w) => s + Number(w.balance), 0);
  const hasForeignWallets = wallets.some((w) => w.currency && w.currency !== "IDR");

  const fetchRates = async () => {
    setFetchingRates(true);
    try {
      const res = await fetch("https://open.er-api.com/v6/latest/IDR");
      const json = await res.json();
      if (json.rates) { setRates(json.rates); setRatesDate(new Date().toLocaleTimeString()); }
    } catch { /* ignore */ } finally { setFetchingRates(false); }
  };

  const toIDR = (amount: number, currency: string): number => {
    if (!currency || currency === "IDR") return amount;
    const rate = rates[currency];
    return rate ? Math.round(amount / rate) : 0;
  };

  const totalAllInIDR = hasForeignWallets && Object.keys(rates).length > 0
    ? wallets.reduce((s, w) => s + toIDR(Number(w.balance), w.currency ?? "IDR"), 0)
    : null;

  const formatBalance = (wallet: Wallet) => {
    const amt = Number(wallet.balance);
    const cur = wallet.currency ?? "IDR";
    if (cur === "IDR") return formatRupiah(amt);
    // For foreign: use parseDecimalInput precision (already stored as decimal)
    return formatCurrency(amt, cur);
  };

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const balanceNum = form.currency === "IDR"
      ? parseRupiahInput(form.balance)
      : parseDecimalInput(form.balance);
    const { data } = await supabase
      .from("wallets")
      .insert({
        user_id: user!.id,
        name: form.name,
        balance: balanceNum,
        color: form.color,
        currency: form.currency,
      })
      .select()
      .single();

    if (data) setWallets([...wallets, data]);
    setSaving(false);
    setModalOpen(false);
    setForm({ name: "", balance: "", color: COLORS[0], currency: "IDR" });
  };

  const deleteWallet = async (id: string) => {
    const supabase = createClient();
    await supabase.from("wallets").delete().eq("id", id);
    setWallets(wallets.filter((w) => w.id !== id));
  };

  return (
    <FinancePageShell
      action={
        <Button onClick={() => setModalOpen(true)} size="sm">
          <Plus className="h-4 w-4" />
          {t("finance.newWallet")}
        </Button>
      }
    >
      <main className="flex-1 overflow-y-auto p-4 sm:p-6">
        <Card className="mb-6">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t("finance.totalBalance")} {hasForeignWallets && <span className="text-slate-400">(IDR only)</span>}
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{formatRupiah(totalBalanceIDR)}</p>
              </div>
              {hasForeignWallets && (
                <button
                  onClick={fetchRates}
                  disabled={fetchingRates}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  {fetchingRates ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  {fetchingRates ? t("finance.fetchingRates") : t("finance.fetchRates")}
                </button>
              )}
            </div>
            {hasForeignWallets && totalAllInIDR !== null && (
              <div className="mt-3 flex items-center justify-between rounded-xl bg-blue-50 px-4 py-3 dark:bg-blue-950/30">
                <div>
                  <p className="text-xs font-medium text-blue-600 dark:text-blue-400">
                    <TrendingUp className="mr-1 inline h-3.5 w-3.5" />
                    {t("finance.totalAllCurrencies")}
                  </p>
                  <p className="text-lg font-bold text-blue-700 dark:text-blue-300">{formatRupiah(totalAllInIDR)}</p>
                  {ratesDate && <p className="text-xs text-blue-400">Updated {ratesDate} · {t("finance.convertedEstimate")}</p>}
                </div>
              </div>
            )}
            {hasForeignWallets && totalAllInIDR === null && (
              <p className="mt-2 text-xs text-slate-400">{t("finance.ratesNeeded")}</p>
            )}
          </CardContent>
        </Card>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-32 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
            ))}
          </div>
        ) : wallets.length === 0 ? (
          <EmptyState
            icon={WalletIcon}
            title="No wallets yet"
            description="Create a wallet to track your balances across accounts."
            action={
              <Button onClick={() => setModalOpen(true)}>
                <Plus className="h-4 w-4" />
                Create Wallet
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {wallets.map((wallet) => (
              <Card key={wallet.id} className="overflow-hidden">
                <div className="h-1.5" style={{ backgroundColor: wallet.color }} />
                <CardContent className="p-5">
                  <div className="mb-4 flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-lg"
                        style={{ backgroundColor: `${wallet.color}20` }}
                      >
                        <WalletIcon className="h-5 w-5" style={{ color: wallet.color }} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900 dark:text-slate-100">{wallet.name}</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{wallet.currency}</p>
                      </div>
                    </div>
                    <IconButton
                      icon={Trash2}
                      label={t("common.delete")}
                      onClick={() => deleteWallet(wallet.id)}
                      className="text-red-400 hover:text-red-500 dark:hover:text-red-300"
                    />
                  </div>
                  <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    {formatBalance(wallet)}
                  </p>
                  {wallet.currency && wallet.currency !== "IDR" && (
                    <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">↔ Transfer only (foreign currency)</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New Wallet">
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Wallet Name</label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. BCA, Cash, GoPay" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Currency</label>
            <Select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value, balance: "" })}>
              {SUPPORTED_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Initial Balance ({form.currency})
            </label>
            <Input value={form.balance} onChange={(e) => setForm({ ...form, balance: e.target.value })} placeholder={form.currency === "IDR" ? "0" : "0.00"} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Color</label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setForm({ ...form, color: c })}
                  className={`h-7 w-7 rounded-full transition-transform hover:scale-110 ${form.color === c ? "ring-2 ring-offset-2 ring-blue-500" : ""}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving || !form.name.trim()}>
              {saving ? "Creating..." : "Create"}
            </Button>
          </div>
        </div>
      </Modal>
    </FinancePageShell>
  );
}
