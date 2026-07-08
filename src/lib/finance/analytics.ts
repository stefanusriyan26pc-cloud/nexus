import type { FinanceTransaction, SavingsGoal, Wallet } from "@/types/database";
import { filterTransactions, getMonthStart } from "@/lib/filters/transaction-filters";

export type FinanceHealth = {
  score: number;
  labelKey: "excellent" | "good" | "fair" | "attention";
  monthlyIncome: number;
  monthlyExpense: number;
  netBalance: number;
  savingsRate: number;
  walletTotal: number;
  savingsProgress: number;
  topExpenseCategories: { category: string; amount: number }[];
};

export function sumByType(transactions: FinanceTransaction[], type: "income" | "expense") {
  return transactions
    .filter((t) => t.type === type)
    .reduce((s, t) => s + Number(t.amount), 0);
}

export function groupExpensesByCategory(transactions: FinanceTransaction[]) {
  const map = new Map<string, number>();
  for (const tx of transactions) {
    if (tx.type !== "expense") continue;
    const key = tx.category || "Other";
    map.set(key, (map.get(key) ?? 0) + Number(tx.amount));
  }
  return [...map.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
}

export function computeFinanceHealth(
  transactions: FinanceTransaction[],
  wallets: Wallet[],
  goals: SavingsGoal[]
): FinanceHealth {
  const monthStart = getMonthStart();
  const monthly = transactions.filter((t) => t.transaction_date >= monthStart);
  const monthlyIncome = sumByType(monthly, "income");
  const monthlyExpense = sumByType(monthly, "expense");
  const netBalance = monthlyIncome - monthlyExpense;
  const savingsRate = monthlyIncome > 0 ? netBalance / monthlyIncome : 0;

  const walletTotal = wallets.reduce((s, w) => s + Number(w.balance), 0);

  const savingsProgress =
    goals.length > 0
      ? goals.reduce((s, g) => {
          const target = Number(g.target_amount);
          if (target <= 0) return s;
          return s + Math.min(Number(g.current_amount) / target, 1);
        }, 0) / goals.length
      : 0;

  let score = 40;
  if (monthlyIncome > 0) {
    score += Math.max(0, Math.min(30, savingsRate * 100 * 0.35));
    const expenseRatio = monthlyExpense / monthlyIncome;
    score += Math.max(0, 20 - expenseRatio * 25);
  } else if (netBalance >= 0) {
    score += 10;
  }
  score += savingsProgress * 30;
  score = Math.round(Math.min(100, Math.max(0, score)));

  let labelKey: FinanceHealth["labelKey"] = "attention";
  if (score >= 80) labelKey = "excellent";
  else if (score >= 60) labelKey = "good";
  else if (score >= 40) labelKey = "fair";

  return {
    score,
    labelKey,
    monthlyIncome,
    monthlyExpense,
    netBalance,
    savingsRate,
    walletTotal,
    savingsProgress,
    topExpenseCategories: groupExpensesByCategory(monthly).slice(0, 5),
  };
}

export function filterMonthlyTransactions(transactions: FinanceTransaction[]) {
  return filterTransactions(transactions, {
    type: "all",
    category: "all",
    period: "this_month",
    search: "",
    walletId: "all",
  });
}
