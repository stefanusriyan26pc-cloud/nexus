"use client";

import { FinancePageShell } from "@/components/layout/finance-page-shell";
import { useTranslation } from "@/components/providers/i18n-provider";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import {
  defaultTransactionFilters,
  filterTransactions,
  getTransactionCategories,
  type TransactionPeriodFilter,
  type TransactionTypeFilter,
} from "@/lib/filters/transaction-filters";
import { sumByType } from "@/lib/finance/analytics";
import {
  applyWalletDeltaLocally,
  syncWalletForTransaction,
  transactionWalletDelta,
} from "@/lib/finance/wallets";
import { formatRupiah, parseRupiahInput } from "@/lib/currency";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { FinanceTransaction, SavingsGoal, Wallet } from "@/types/database";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  List,
  Plus,
  Search,
  Trash2,
  TrendingDown,
  TrendingUp,
  X,
  PiggyBank,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const DEFAULT_CATEGORIES = {
  income: ["Salary", "Freelance", "Investment", "Gift"],
  expense: ["Food", "Transport", "Shopping", "Bills", "Health", "Entertainment", "Savings"],
};

const CUSTOM_CATS_KEY = "nexus_custom_categories";

function loadCustomCategories(): { income: string[]; expense: string[] } {
  try {
    return JSON.parse(localStorage.getItem(CUSTOM_CATS_KEY) ?? "{}") ?? { income: [], expense: [] };
  } catch {
    return { income: [], expense: [] };
  }
}

const DAY_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type ViewMode = "list" | "calendar";

export default function IncomeExpensePage() {
  const { t } = useTranslation();
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [customCategories, setCustomCategories] = useState<{ income: string[]; expense: string[] }>({ income: [], expense: [] });
  const [newCategoryInput, setNewCategoryInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [view, setView] = useState<ViewMode>("list");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [form, setForm] = useState({
    type: "expense" as "income" | "expense" | "transfer",
    amount: "",
    category: "",
    description: "",
    wallet_id: "",
    transferToWalletId: "",
    goal_id: "",
    transaction_date: format(new Date(), "yyyy-MM-dd"),
  });
  const [saving, setSaving] = useState(false);
  const [detailFilter, setDetailFilter] = useState<"all" | "income" | "expense">("all");
  const [typeFilter, setTypeFilter] = useState<TransactionTypeFilter>(defaultTransactionFilters.type);
  const [categoryFilter, setCategoryFilter] = useState(defaultTransactionFilters.category);
  const [periodFilter, setPeriodFilter] = useState<TransactionPeriodFilter>(
    defaultTransactionFilters.period
  );
  const [search, setSearch] = useState("");

  const hasActiveFilters =
    typeFilter !== "all" || categoryFilter !== "all" || periodFilter !== "all" || search !== "";

  const filteredTransactions = useMemo(
    () =>
      filterTransactions(transactions, {
        type: typeFilter,
        category: categoryFilter,
        period: periodFilter,
        search,
      }),
    [transactions, typeFilter, categoryFilter, periodFilter, search]
  );

  const categories = useMemo(() => getTransactionCategories(transactions), [transactions]);
  const income = sumByType(filteredTransactions, "income");
  const expense = sumByType(filteredTransactions, "expense");

  const txByDate = useMemo(() => {
    const map: Record<string, FinanceTransaction[]> = {};
    for (const tx of transactions) {
      const date = tx.transaction_date.slice(0, 10);
      if (!map[date]) map[date] = [];
      map[date].push(tx);
    }
    return map;
  }, [transactions]);

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const selectedTxs = useMemo(
    () =>
      selectedDate
        ? [...(txByDate[selectedDate] ?? [])].sort((a, b) =>
            b.created_at.localeCompare(a.created_at)
          )
        : [],
    [selectedDate, txByDate]
  );
  const selectedIncome = selectedTxs
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + Number(t.amount), 0);
  const selectedExpense = selectedTxs
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + Number(t.amount), 0);
  const visibleDetailTxs = useMemo(
    () => detailFilter === "all" ? selectedTxs : selectedTxs.filter((t) => t.type === detailFilter),
    [selectedTxs, detailFilter]
  );

  useEffect(() => {
    setCustomCategories(loadCustomCategories());
    async function load() {
      const supabase = createClient();
      const [txRes, walletRes, goalsRes] = await Promise.all([
        supabase.from("finance_transactions").select("*").order("created_at", { ascending: false }),
        supabase.from("wallets").select("*"),
        supabase.from("savings_goals").select("*").order("created_at"),
      ]);
      setTransactions(txRes.data ?? []);
      setWallets(walletRes.data ?? []);
      setGoals(goalsRes.data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  const clearFilters = () => {
    setTypeFilter("all");
    setCategoryFilter("all");
    setPeriodFilter("all");
    setSearch("");
  };

  const resetForm = () =>
    setForm({
      type: "expense",
      amount: "",
      category: "",
      description: "",
      wallet_id: "",
      transferToWalletId: "",
      goal_id: "",
      transaction_date: format(new Date(), "yyyy-MM-dd"),
    });

  const addCustomCategory = (type: "income" | "expense") => {
    const name = newCategoryInput.trim();
    if (!name) return;
    const next = {
      ...customCategories,
      [type]: [...(customCategories[type] ?? []).filter((c) => c !== name), name],
    };
    setCustomCategories(next);
    localStorage.setItem(CUSTOM_CATS_KEY, JSON.stringify(next));
    setForm((f) => ({ ...f, category: name }));
    setNewCategoryInput("");
  };

  const allCategories = (type: "income" | "expense") => [
    ...DEFAULT_CATEGORIES[type],
    ...(customCategories[type] ?? []),
  ];

  const handleSave = async () => {
    const amount = parseRupiahInput(form.amount);
    if (!amount) return;
    setSaving(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (form.type === "transfer") {
      const fromWallet = wallets.find((w) => w.id === form.wallet_id);
      const toWallet = wallets.find((w) => w.id === form.transferToWalletId);
      const desc = form.description || "Transfer";
      const [expRes, incRes] = await Promise.all([
        supabase
          .from("finance_transactions")
          .insert({
            user_id: user!.id,
            type: "expense",
            amount,
            category: "Transfer",
            description: toWallet ? `${desc} → ${toWallet.name}` : desc,
            wallet_id: form.wallet_id || null,
            transaction_date: form.transaction_date,
          })
          .select()
          .single(),
        supabase
          .from("finance_transactions")
          .insert({
            user_id: user!.id,
            type: "income",
            amount,
            category: "Transfer",
            description: fromWallet ? `${desc} ← ${fromWallet.name}` : desc,
            wallet_id: form.transferToWalletId || null,
            transaction_date: form.transaction_date,
          })
          .select()
          .single(),
      ]);
      const newTxs: FinanceTransaction[] = [];
      let updatedWallets = [...wallets];
      if (expRes.data) {
        newTxs.push(expRes.data);
        const nb = await syncWalletForTransaction(supabase, expRes.data);
        if (expRes.data.wallet_id && nb !== null)
          updatedWallets = updatedWallets.map((w) =>
            w.id === expRes.data!.wallet_id ? { ...w, balance: nb } : w
          );
      }
      if (incRes.data) {
        newTxs.push(incRes.data);
        const nb = await syncWalletForTransaction(supabase, incRes.data);
        if (incRes.data.wallet_id && nb !== null)
          updatedWallets = updatedWallets.map((w) =>
            w.id === incRes.data!.wallet_id ? { ...w, balance: nb } : w
          );
      }
      setTransactions([...newTxs, ...transactions]);
      setWallets(updatedWallets);
    } else {
      const { data } = await supabase
        .from("finance_transactions")
        .insert({
          user_id: user!.id,
          type: form.type,
          amount,
          category: form.category || null,
          description: form.description || null,
          wallet_id: form.wallet_id || null,
          transaction_date: form.transaction_date,
        })
        .select()
        .single();

      if (data) {
        setTransactions([data, ...transactions]);
        const nextBalance = await syncWalletForTransaction(supabase, data);
        if (data.wallet_id && nextBalance !== null) {
          setWallets(
            wallets.map((wallet) =>
              wallet.id === data.wallet_id ? { ...wallet, balance: nextBalance } : wallet
            )
          );
        }
      }
      // Link to savings goal if set
      if (data && form.goal_id) {
        const goal = goals.find((g) => g.id === form.goal_id);
        if (goal) {
          const newAmount = Number(goal.current_amount) + amount;
          const supabaseCl = createClient();
          const { data: updatedGoal } = await supabaseCl
            .from("savings_goals")
            .update({ current_amount: newAmount })
            .eq("id", goal.id)
            .select()
            .single();
          if (updatedGoal) setGoals((prev) => prev.map((g) => (g.id === updatedGoal.id ? updatedGoal : g)));
        }
      }
    }

    setSaving(false);
    setModalOpen(false);
    resetForm();
  };

  const deleteTx = async (id: string) => {
    const tx = transactions.find((t) => t.id === id);
    if (!tx) return;
    const supabase = createClient();
    const nextBalance = await syncWalletForTransaction(supabase, tx, true);
    await supabase.from("finance_transactions").delete().eq("id", id);
    setTransactions(transactions.filter((t) => t.id !== id));
    if (tx.wallet_id && nextBalance !== null) {
      setWallets(applyWalletDeltaLocally(wallets, tx.wallet_id, transactionWalletDelta(tx, true)));
    }
  };

  const typeOptions: [TransactionTypeFilter, string][] = [
    ["all", t("filters.all")],
    ["income", t("finance.income")],
    ["expense", t("finance.expense")],
  ];

  const periodOptions: [TransactionPeriodFilter, string][] = [
    ["all", t("filters.all")],
    ["this_month", t("filters.thisMonth")],
    ["last_month", t("filters.lastMonth")],
    ["this_year", t("filters.thisYear")],
  ];

  return (
    <FinancePageShell
      action={
        <Button onClick={() => setModalOpen(true)} size="sm">
          <Plus className="h-4 w-4" />
          {t("finance.addTransaction")}
        </Button>
      }
    >
      {view === "list" ? (
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* Improved filter bar */}
          <div className="mb-5 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {/* Type pills */}
              <div className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-800/50">
                {typeOptions.map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => setTypeFilter(val)}
                    className={cn(
                      "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                      typeFilter === val
                        ? val === "income"
                          ? "bg-emerald-500 text-white shadow-sm"
                          : val === "expense"
                          ? "bg-red-500 text-white shadow-sm"
                          : "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-100"
                        : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Period pills */}
              <div className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-800/50">
                {periodOptions.map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => setPeriodFilter(val)}
                    className={cn(
                      "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                      periodFilter === val
                        ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-100"
                        : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Clear all */}
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  <X className="h-3 w-3" />
                  Clear
                </button>
              )}

              {/* View toggle (right-aligned) */}
              <div className="ml-auto inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-800">
                <button onClick={() => setView("list")} title="List view" className={cn("flex h-7 w-7 items-center justify-center rounded-md transition-colors", "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-100")}>
                  <List className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => { setView("calendar"); setSelectedDate(null); }} title="Calendar view" className={cn("flex h-7 w-7 items-center justify-center rounded-md transition-colors", "text-slate-500 hover:text-slate-700 dark:text-slate-400")}>
                  <CalendarDays className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Category + search */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              {categories.length > 0 && (
                <Select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full sm:w-44"
                >
                  <option value="all">{t("filters.all")} {t("filters.category").toLowerCase()}</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </Select>
              )}
              <div className="relative flex-1 sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder={t("filters.search")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 pr-9"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Summary cards */}
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/40">
                  <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{t("finance.totalIncome")}</p>
                  <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">{formatRupiah(income)}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 dark:bg-red-950/40">
                  <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{t("finance.totalExpenses")}</p>
                  <p className="text-lg font-semibold text-red-600 dark:text-red-400">{formatRupiah(expense)}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 p-5">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{t("finance.netBalance")}</p>
                  <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">{formatRupiah(income - expense)}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Transaction list */}
          {loading ? (
            <div className="h-64 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
                <h2 className="font-semibold text-slate-900 dark:text-slate-100">{t("finance.recentTransactions")}</h2>
                {filteredTransactions.length > 0 && (
                  <span className="text-xs text-slate-400">{filteredTransactions.length} transaksi</span>
                )}
              </div>
              {filteredTransactions.length === 0 ? (
                <p className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                  {transactions.length === 0 ? t("finance.noTransactions") : t("common.noData")}
                </p>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredTransactions.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-lg",
                          tx.type === "income" ? "bg-emerald-50 dark:bg-emerald-950/40" : "bg-red-50 dark:bg-red-950/40"
                        )}>
                          {tx.type === "income"
                            ? <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                            : <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                          }
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                            {tx.description || tx.category || (tx.type === "income" ? t("finance.income") : t("finance.expense"))}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {format(parseISO(tx.transaction_date), "MMM d, yyyy")}
                            {" · "}
                            {format(parseISO(tx.created_at), "h:mm a")}
                            {tx.category && ` · ${tx.category}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={cn(
                          "text-sm font-semibold",
                          tx.type === "income" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                        )}>
                          {tx.type === "income" ? "+" : "-"}{formatRupiah(Number(tx.amount))}
                        </span>
                        <IconButton
                          icon={Trash2}
                          label={t("common.delete")}
                          onClick={() => deleteTx(tx.id)}
                          className="text-red-400 hover:text-red-500 dark:hover:text-red-300"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      ) : (
        /* Calendar view */
        <div className="flex flex-1 overflow-hidden">
          <div className={cn("flex-1 overflow-y-auto p-4 sm:p-6", selectedDate && "hidden sm:block")}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {format(currentMonth, "MMMM yyyy")}
              </h2>
              <div className="flex items-center gap-2">
                <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-800">
                  <button onClick={() => setView("list")} title="List view" className={cn("flex h-7 w-7 items-center justify-center rounded-md transition-colors", "text-slate-500 hover:text-slate-700 dark:text-slate-400")}>
                    <List className="h-3.5 w-3.5" />
                  </button>
                  <button title="Calendar view" className={cn("flex h-7 w-7 items-center justify-center rounded-md transition-colors", "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-100")}>
                    <CalendarDays className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="flex items-center gap-1">
                  <IconButton icon={ChevronLeft} label="Previous month" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} />
                  <button
                    onClick={() => setCurrentMonth(new Date())}
                    className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    {t("common.today")}
                  </button>
                  <IconButton icon={ChevronRight} label="Next month" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} />
                </div>
              </div>
            </div>

            <div className="mb-1 grid grid-cols-7 gap-1">
              {DAY_HEADERS.map((d) => (
                <div key={d} className="py-2 text-center text-xs font-medium text-slate-500 dark:text-slate-400">
                  {d}
                </div>
              ))}
            </div>

            {loading ? (
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: 35 }).map((_, i) => (
                  <div key={i} className="h-20 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day) => {
                  const dateStr = format(day, "yyyy-MM-dd");
                  const txs = txByDate[dateStr] ?? [];
                  const dayIncome = txs
                    .filter((t) => t.type === "income")
                    .reduce((s, t) => s + Number(t.amount), 0);
                  const dayExpense = txs
                    .filter((t) => t.type === "expense")
                    .reduce((s, t) => s + Number(t.amount), 0);
                  const isCurrentMonth = isSameMonth(day, currentMonth);
                  const isSelected = selectedDate === dateStr;
                  const isTodayDate = isToday(day);

                  return (
                    <button
                      key={dateStr}
                      onClick={() => { setSelectedDate(isSelected ? null : dateStr); setDetailFilter("all"); }}
                      className={cn(
                        "relative flex min-h-20 flex-col rounded-lg p-1.5 text-left transition-colors",
                        !isCurrentMonth && "opacity-30",
                        isSelected
                          ? "bg-blue-50 ring-1 ring-inset ring-blue-400 dark:bg-blue-950/40 dark:ring-blue-500"
                          : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      )}
                    >
                      <span className={cn(
                        "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                        isTodayDate ? "bg-blue-600 text-white" : "text-slate-700 dark:text-slate-300"
                      )}>
                        {format(day, "d")}
                      </span>
                      {txs.length > 0 && (
                        <div className="mt-1 w-full space-y-0.5">
                          {dayIncome > 0 && (
                            <div className="truncate rounded px-1 py-0.5 text-xs font-medium text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400">
                              +{formatRupiah(dayIncome)}
                            </div>
                          )}
                          {dayExpense > 0 && (
                            <div className="truncate rounded px-1 py-0.5 text-xs font-medium text-red-700 bg-red-50 dark:bg-red-950/40 dark:text-red-400">
                              -{formatRupiah(dayExpense)}
                            </div>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Detail panel */}
          {selectedDate && (
            <aside className="flex w-full flex-col border-l border-slate-200 dark:border-slate-800 sm:w-80 lg:w-96">
              <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/50">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                      {format(parseISO(selectedDate), "EEEE, d MMM yyyy")}
                    </h3>
                    <div className="mt-1 flex gap-3 text-xs">
                      {selectedIncome > 0 && (
                        <span className="font-medium text-emerald-600 dark:text-emerald-400">
                          +{formatRupiah(selectedIncome)}
                        </span>
                      )}
                      {selectedExpense > 0 && (
                        <span className="font-medium text-red-600 dark:text-red-400">
                          -{formatRupiah(selectedExpense)}
                        </span>
                      )}
                      {selectedTxs.length === 0 && (
                        <span className="text-slate-400">No transactions</span>
                      )}
                    </div>
                  </div>
                  <IconButton icon={X} label="Close panel" onClick={() => { setSelectedDate(null); setDetailFilter("all"); }} />
                </div>
                {selectedTxs.length > 0 && (
                  <div className="mt-3 inline-flex items-center rounded-lg border border-slate-200 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-800">
                    {(["all", "income", "expense"] as const).map((f) => (
                      <button
                        key={f}
                        onClick={() => setDetailFilter(f)}
                        className={cn(
                          "rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors",
                          detailFilter === f
                            ? f === "income"
                              ? "bg-emerald-500 text-white shadow-sm"
                              : f === "expense"
                              ? "bg-red-500 text-white shadow-sm"
                              : "bg-slate-900 text-white shadow-sm dark:bg-slate-100 dark:text-slate-900"
                            : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                        )}
                      >
                        {f === "all" ? "All" : f === "income" ? "Income" : "Expense"}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {selectedTxs.length === 0 ? (
                <div className="flex flex-1 items-center justify-center">
                  <p className="text-sm text-slate-400 dark:text-slate-500">No transactions this day</p>
                </div>
              ) : visibleDetailTxs.length === 0 ? (
                <div className="flex flex-1 items-center justify-center">
                  <p className="text-sm text-slate-400 dark:text-slate-500">No {detailFilter} transactions</p>
                </div>
              ) : (
                <div className="flex-1 divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
                  {visibleDetailTxs.map((tx) => (
                    <div key={tx.id} className="flex items-center gap-3 px-4 py-3">
                      <div className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                        tx.type === "income" ? "bg-emerald-50 dark:bg-emerald-950/40" : "bg-red-50 dark:bg-red-950/40"
                      )}>
                        {tx.type === "income"
                          ? <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                          : <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                        }
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                          {tx.description || tx.category || (tx.type === "income" ? "Income" : "Expense")}
                        </p>
                        {tx.category && (
                          <p className="text-xs text-slate-500 dark:text-slate-400">{tx.category}</p>
                        )}
                      </div>
                      <span className={cn(
                        "shrink-0 text-sm font-semibold",
                        tx.type === "income" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                      )}>
                        {tx.type === "income" ? "+" : "-"}{formatRupiah(Number(tx.amount))}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </aside>
          )}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={t("finance.addTransactionTitle")}>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {(["income", "expense", "transfer"] as const).map((type) => (
              <button
                key={type}
                onClick={() => setForm({ ...form, type, category: "", transferToWalletId: "" })}
                className={cn(
                  "rounded-lg border py-2 text-sm font-medium capitalize transition-colors",
                  form.type === type
                    ? type === "income"
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:border-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-400"
                      : type === "expense"
                      ? "border-red-500 bg-red-50 text-red-700 dark:border-red-500 dark:bg-red-950/40 dark:text-red-400"
                      : "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-400"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                )}
              >
                {type === "transfer" ? "Transfer" : type}
              </button>
            ))}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Amount (IDR)</label>
            <Input
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              placeholder="e.g. 500000"
            />
            {form.amount && (
              <p className="mt-1 text-xs text-slate-500">{formatRupiah(parseRupiahInput(form.amount))}</p>
            )}
          </div>
          {form.type !== "transfer" && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Category</label>
              <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                <option value="">Select category</option>
                {allCategories(form.type as "income" | "expense").map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </Select>
              <div className="mt-2 flex gap-2">
                <Input
                  value={newCategoryInput}
                  onChange={(e) => setNewCategoryInput(e.target.value)}
                  placeholder="Add custom category..."
                  className="text-xs"
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomCategory(form.type as "income" | "expense"); } }}
                />
                <Button type="button" size="sm" variant="outline" onClick={() => addCustomCategory(form.type as "income" | "expense")} disabled={!newCategoryInput.trim()}>
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Description</label>
            <Input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Optional description"
            />
          </div>
          {wallets.length > 0 && form.type !== "transfer" && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Wallet</label>
              <Select value={form.wallet_id} onChange={(e) => setForm({ ...form, wallet_id: e.target.value })}>
                <option value="">No wallet</option>
                {wallets.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </Select>
            </div>
          )}
          {form.type === "transfer" && wallets.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">From Wallet</label>
                <Select value={form.wallet_id} onChange={(e) => setForm({ ...form, wallet_id: e.target.value })}>
                  <option value="">Select wallet</option>
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">To Wallet</label>
                <Select value={form.transferToWalletId} onChange={(e) => setForm({ ...form, transferToWalletId: e.target.value })}>
                  <option value="">Select wallet</option>
                  {wallets.filter((w) => w.id !== form.wallet_id).map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </Select>
              </div>
            </div>
          )}
          {form.type === "expense" && goals.length > 0 && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                <span className="flex items-center gap-1.5">
                  <PiggyBank className="h-3.5 w-3.5 text-amber-500" />
                  Link to Savings Goal (optional)
                </span>
              </label>
              <Select value={form.goal_id} onChange={(e) => setForm({ ...form, goal_id: e.target.value })}>
                <option value="">No goal</option>
                {goals.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </Select>
              {form.goal_id && (
                <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                  Amount will be added to this goal&apos;s progress.
                </p>
              )}
            </div>
          )}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Date</label>
            <Input
              type="date"
              value={form.transaction_date}
              onChange={(e) => setForm({ ...form, transaction_date: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSave}
              disabled={
                saving ||
                !form.amount ||
                (form.type === "transfer" && (!form.wallet_id || !form.transferToWalletId))
              }
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </Modal>
    </FinancePageShell>
  );
}
