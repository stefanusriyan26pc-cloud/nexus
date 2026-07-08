"use client";

import { FinancePageShell } from "@/components/layout/finance-page-shell";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { EmptyState, ViewToggle } from "@/components/ui/view-toggle";
import { formatCurrency, formatRupiah, parseRupiahInput, parseDecimalInput, SUPPORTED_CURRENCIES } from "@/lib/currency";
import { Select } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { useCurrencyDisplay } from "@/hooks/use-currency-display";
import { useCurrencyRates } from "@/components/providers/currency-provider";
import type { UserBank, Wallet } from "@/types/database";
import {
  Plus, Trash2, Wallet as WalletIcon, RefreshCw, Loader2, TrendingUp,
  Pencil, GripVertical, LayoutGrid, Building2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "@/components/providers/i18n-provider";
import {
  DndContext, DragEndEvent, PointerSensor, useSensor, useSensors, closestCenter,
} from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const COLORS = [
  "#6366f1","#8b5cf6","#a855f7","#ec4899","#f43f5e",
  "#ef4444","#f97316","#f59e0b","#eab308","#84cc16",
  "#22c55e","#10b981","#14b8a6","#06b6d4","#0ea5e9",
  "#3b82f6","#64748b","#78716c","#d97706","#be185d",
];

const NO_BANK = "__no_bank__";

type LayoutView = "all" | "grouped";

function WalletCardBody({
  wallet, onEdit, onDelete, formatBalance, t,
}: {
  wallet: Wallet;
  onEdit: () => void;
  onDelete: () => void;
  formatBalance: (w: Wallet) => string;
  t: (k: string) => string;
}) {
  return (
    <Card className="overflow-hidden">
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
          <div className="flex items-center gap-1">
            <IconButton icon={Pencil} label={t("common.edit")} onClick={onEdit} />
            <IconButton
              icon={Trash2}
              label={t("common.delete")}
              onClick={onDelete}
              className="text-red-400 hover:text-red-500 dark:hover:text-red-300"
            />
          </div>
        </div>
        <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
          {formatBalance(wallet)}
        </p>
        {wallet.currency && wallet.currency !== "IDR" && (
          <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">↔ Transfer only (foreign currency)</p>
        )}
      </CardContent>
    </Card>
  );
}

function SortableWalletCard(props: {
  wallet: Wallet;
  onEdit: () => void;
  onDelete: () => void;
  formatBalance: (w: Wallet) => string;
  t: (k: string) => string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: props.wallet.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? "opacity-50" : ""}
    >
      <div className="relative">
        <button
          {...attributes}
          {...listeners}
          className="absolute -left-1 -top-1 z-10 flex h-6 w-6 cursor-grab items-center justify-center rounded-md bg-white text-slate-300 shadow-sm hover:text-slate-500 active:cursor-grabbing dark:bg-slate-800 dark:text-slate-600"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
        <WalletCardBody {...props} />
      </div>
    </div>
  );
}

export default function WalletsPage() {
  const { t } = useTranslation();
  const { formatDisplay } = useCurrencyDisplay();
  const { rates, ratesUpdatedAt, ratesLoading, refreshRates } = useCurrencyRates();
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [banks, setBanks] = useState<UserBank[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Wallet | null>(null);
  const [layoutView, setLayoutView] = useState<LayoutView>("all");
  const [form, setForm] = useState({ name: "", balance: "", color: COLORS[0], currency: "IDR", bank: "" });
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const [walletRes, bankRes] = await Promise.all([
        supabase.from("wallets").select("*").order("position"),
        supabase.from("user_banks").select("*").order("position"),
      ]);
      setWallets(walletRes.data ?? []);
      setBanks(bankRes.data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  // Only sum IDR wallets for the total (foreign wallets have different currency)
  const totalBalanceIDR = wallets.filter((w) => !w.currency || w.currency === "IDR").reduce((s, w) => s + Number(w.balance), 0);
  const hasForeignWallets = wallets.some((w) => w.currency && w.currency !== "IDR");

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
    return formatCurrency(amt, cur);
  };

  const groupedWallets = useMemo(() => {
    const groups = new Map<string, Wallet[]>();
    for (const w of wallets) {
      const key = w.bank || NO_BANK;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(w);
    }
    return Array.from(groups.entries());
  }, [wallets]);

  const openCreate = () => {
    setEditTarget(null);
    setForm({ name: "", balance: "", color: COLORS[0], currency: "IDR", bank: "" });
    setModalOpen(true);
  };

  const openEdit = (wallet: Wallet) => {
    setEditTarget(wallet);
    setForm({
      name: wallet.name,
      balance: "",
      color: wallet.color,
      currency: wallet.currency,
      bank: wallet.bank ?? "",
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const supabase = createClient();

    if (editTarget) {
      const { data } = await supabase
        .from("wallets")
        .update({ name: form.name, color: form.color, bank: form.bank || null })
        .eq("id", editTarget.id)
        .select()
        .single();
      if (data) setWallets(wallets.map((w) => (w.id === data.id ? data : w)));
    } else {
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
          bank: form.bank || null,
          position: wallets.length,
        })
        .select()
        .single();

      if (data) setWallets([...wallets, data]);
    }

    setSaving(false);
    setModalOpen(false);
  };

  const deleteWallet = async (id: string) => {
    const supabase = createClient();
    await supabase.from("wallets").delete().eq("id", id);
    setWallets(wallets.filter((w) => w.id !== id));
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = wallets.findIndex((w) => w.id === active.id);
    const newIndex = wallets.findIndex((w) => w.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(wallets, oldIndex, newIndex);
    setWallets(reordered);

    const supabase = createClient();
    await Promise.all(
      reordered.map((w, i) =>
        w.position === i ? null : supabase.from("wallets").update({ position: i }).eq("id", w.id)
      )
    );
  };

  return (
    <FinancePageShell
      action={
        <Button onClick={openCreate} size="sm">
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
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{formatDisplay(totalBalanceIDR)}</p>
              </div>
              {hasForeignWallets && (
                <button
                  onClick={refreshRates}
                  disabled={ratesLoading}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  {ratesLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  {ratesLoading ? t("finance.fetchingRates") : t("finance.fetchRates")}
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
                  <p className="text-lg font-bold text-blue-700 dark:text-blue-300">{formatDisplay(totalAllInIDR)}</p>
                  {ratesUpdatedAt && <p className="text-xs text-blue-400">Updated {new Date(ratesUpdatedAt).toLocaleTimeString()} · {t("finance.convertedEstimate")}</p>}
                </div>
              </div>
            )}
            {hasForeignWallets && totalAllInIDR === null && (
              <p className="mt-2 text-xs text-slate-400">{t("finance.ratesNeeded")}</p>
            )}
          </CardContent>
        </Card>

        {!loading && wallets.length > 0 && (
          <div className="mb-4 flex justify-end">
            <ViewToggle
              views={[
                { id: "all" as LayoutView, label: "All wallets", icon: LayoutGrid },
                { id: "grouped" as LayoutView, label: "Group by bank", icon: Building2 },
              ]}
              active={layoutView}
              onChange={setLayoutView}
            />
          </div>
        )}

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
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4" />
                Create Wallet
              </Button>
            }
          />
        ) : layoutView === "grouped" ? (
          <div className="space-y-6">
            {groupedWallets.map(([bankKey, group]) => (
              <div key={bankKey}>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {bankKey === NO_BANK ? "No bank" : bankKey}
                </h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {group.map((wallet) => (
                    <WalletCardBody
                      key={wallet.id}
                      wallet={wallet}
                      onEdit={() => openEdit(wallet)}
                      onDelete={() => deleteWallet(wallet.id)}
                      formatBalance={formatBalance}
                      t={t}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={wallets.map((w) => w.id)} strategy={rectSortingStrategy}>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {wallets.map((wallet) => (
                  <SortableWalletCard
                    key={wallet.id}
                    wallet={wallet}
                    onEdit={() => openEdit(wallet)}
                    onDelete={() => deleteWallet(wallet.id)}
                    formatBalance={formatBalance}
                    t={t}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </main>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editTarget ? "Edit Wallet" : "New Wallet"}>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Wallet Name</label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. BCA, Cash, GoPay" />
          </div>
          {!editTarget && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Currency</label>
              <Select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value, balance: "" })}>
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.label}</option>
                ))}
              </Select>
            </div>
          )}
          {!editTarget && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Initial Balance ({form.currency})
              </label>
              <Input value={form.balance} onChange={(e) => setForm({ ...form, balance: e.target.value })} placeholder={form.currency === "IDR" ? "0" : "0.00"} />
            </div>
          )}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Bank</label>
            <Select value={form.bank} onChange={(e) => setForm({ ...form, bank: e.target.value })}>
              <option value="">No bank</option>
              {banks.map((b) => (
                <option key={b.id} value={b.name}>{b.name}</option>
              ))}
            </Select>
            {banks.length === 0 && (
              <p className="mt-1 text-xs text-slate-400">Manage your bank list in Settings → Banks.</p>
            )}
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
            <Button onClick={handleSave} disabled={saving || !form.name.trim()}>
              {saving ? "Saving..." : editTarget ? "Save" : "Create"}
            </Button>
          </div>
        </div>
      </Modal>
    </FinancePageShell>
  );
}
