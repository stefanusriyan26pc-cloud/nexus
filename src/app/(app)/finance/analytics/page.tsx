"use client";

import { FinancePageShell } from "@/components/layout/finance-page-shell";
import { useTranslation } from "@/components/providers/i18n-provider";
import { Card, CardContent } from "@/components/ui/card";
import { formatRupiah } from "@/lib/currency";
import { computeFinanceHealth } from "@/lib/finance/analytics";
import { createClient } from "@/lib/supabase/client";
import type { FinanceTransaction, SavingsGoal, Wallet } from "@/types/database";
import {
  Activity,
  PiggyBank,
  TrendingDown,
  TrendingUp,
  Wallet as WalletIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

export default function FinanceAnalyticsPage() {
  const { t } = useTranslation();
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const [txRes, walletRes, goalsRes] = await Promise.all([
        supabase.from("finance_transactions").select("*"),
        supabase.from("wallets").select("*"),
        supabase.from("savings_goals").select("*"),
      ]);
      setTransactions(txRes.data ?? []);
      setWallets(walletRes.data ?? []);
      setGoals(goalsRes.data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  const health = useMemo(
    () => computeFinanceHealth(transactions, wallets, goals),
    [transactions, wallets, goals]
  );

  const healthColor =
    health.score >= 80
      ? "text-emerald-600 dark:text-emerald-400"
      : health.score >= 60
        ? "text-blue-600 dark:text-blue-400"
        : health.score >= 40
          ? "text-amber-600 dark:text-amber-400"
          : "text-red-600 dark:text-red-400";

  const healthRing =
    health.score >= 80
      ? "stroke-emerald-500"
      : health.score >= 60
        ? "stroke-blue-500"
        : health.score >= 40
          ? "stroke-amber-500"
          : "stroke-red-500";

  const maxCategory = health.topExpenseCategories[0]?.amount ?? 1;

  return (
    <FinancePageShell>
      <main className="flex-1 overflow-y-auto p-4 sm:p-6">
        {loading ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-40 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            <Card>
              <CardContent className="flex flex-col items-center gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative flex h-24 w-24 items-center justify-center">
                    <svg className="h-24 w-24 -rotate-90" viewBox="0 0 100 100">
                      <circle
                        cx="50"
                        cy="50"
                        r="42"
                        fill="none"
                        strokeWidth="8"
                        className="stroke-slate-200 dark:stroke-slate-800"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="42"
                        fill="none"
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={`${health.score * 2.64} 264`}
                        className={healthRing}
                      />
                    </svg>
                    <span className={cn("absolute text-2xl font-bold", healthColor)}>
                      {health.score}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {t("finance.healthScore")}
                    </p>
                    <p className={cn("text-xl font-semibold", healthColor)}>
                      {t(`finance.health.${health.labelKey}`)}
                    </p>
                    <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">
                      {t("finance.healthHint")}
                    </p>
                  </div>
                </div>
                <Activity className="hidden h-10 w-10 text-slate-300 dark:text-slate-600 sm:block" />
              </CardContent>
            </Card>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                icon={TrendingUp}
                label={t("finance.monthlyIncome")}
                value={formatRupiah(health.monthlyIncome)}
                tone="emerald"
              />
              <MetricCard
                icon={TrendingDown}
                label={t("finance.monthlyExpenses")}
                value={formatRupiah(health.monthlyExpense)}
                tone="red"
              />
              <MetricCard
                icon={WalletIcon}
                label={t("finance.totalBalance")}
                value={formatRupiah(health.walletTotal)}
                tone="slate"
              />
              <MetricCard
                icon={PiggyBank}
                label={t("finance.savingsRate")}
                value={`${Math.round(health.savingsRate * 100)}%`}
                tone="indigo"
              />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardContent className="p-6">
                  <h3 className="mb-4 font-semibold text-slate-900 dark:text-slate-100">
                    {t("finance.topExpenses")}
                  </h3>
                  {health.topExpenseCategories.length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {t("finance.noExpenseData")}
                    </p>
                  ) : (
                    <ul className="space-y-3">
                      {health.topExpenseCategories.map(({ category, amount }) => (
                        <li key={category}>
                          <div className="mb-1 flex justify-between text-sm">
                            <span className="text-slate-700 dark:text-slate-300">{category}</span>
                            <span className="font-medium text-slate-900 dark:text-slate-100">
                              {formatRupiah(amount)}
                            </span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                            <div
                              className="h-full rounded-full bg-red-500/80"
                              style={{ width: `${(amount / maxCategory) * 100}%` }}
                            />
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <h3 className="mb-4 font-semibold text-slate-900 dark:text-slate-100">
                    {t("finance.savingsOverview")}
                  </h3>
                  {goals.length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {t("finance.savingsEmptyTitle")}
                    </p>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <div className="mb-1 flex justify-between text-sm">
                          <span className="text-slate-500 dark:text-slate-400">
                            {t("finance.overallProgress")}
                          </span>
                          <span className="font-medium text-slate-900 dark:text-slate-100">
                            {Math.round(health.savingsProgress * 100)}%
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                          <div
                            className="h-full rounded-full bg-emerald-500"
                            style={{ width: `${health.savingsProgress * 100}%` }}
                          />
                        </div>
                      </div>
                      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                        {goals.map((goal) => {
                          const progress = Math.min(
                            (Number(goal.current_amount) / Number(goal.target_amount)) * 100,
                            100
                          );
                          return (
                            <li key={goal.id} className="flex items-center justify-between py-2 text-sm">
                              <span className="text-slate-700 dark:text-slate-300">{goal.name}</span>
                              <span className="text-slate-500 dark:text-slate-400">
                                {progress.toFixed(0)}%
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardContent className="p-6">
                <h3 className="mb-2 font-semibold text-slate-900 dark:text-slate-100">
                  {t("finance.netBalance")}
                </h3>
                <p
                  className={cn(
                    "text-2xl font-bold",
                    health.netBalance >= 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-red-600 dark:text-red-400"
                  )}
                >
                  {health.netBalance >= 0 ? "+" : ""}
                  {formatRupiah(health.netBalance)}
                </p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {t("finance.monthlyNetHint")}
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </FinancePageShell>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone: "emerald" | "red" | "indigo" | "slate";
}) {
  const tones = {
    emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400",
    red: "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400",
    indigo: "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400",
    slate: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  };

  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", tones[tone])}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
          <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
