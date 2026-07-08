import type { SupabaseClient } from "@supabase/supabase-js";
import type { FinanceTransaction, SavingsGoal } from "@/types/database";
import { syncWalletForTransaction } from "./wallets";

/**
 * Moves money from a wallet into a savings goal the same way a wallet-to-wallet
 * transfer works: an expense transaction deducts the wallet balance, and the
 * goal's current_amount is bumped by the same amount.
 */
export async function contributeToGoal(
  supabase: SupabaseClient,
  {
    userId,
    goal,
    walletId,
    amount,
    description,
    date,
  }: {
    userId: string;
    goal: SavingsGoal;
    walletId: string;
    amount: number;
    description?: string;
    date: string;
  }
): Promise<{ transaction: FinanceTransaction; goal: SavingsGoal } | null> {
  const { data: transaction } = await supabase
    .from("finance_transactions")
    .insert({
      user_id: userId,
      type: "expense",
      amount,
      category: "Transfer",
      description: description || `Transfer to ${goal.name}`,
      wallet_id: walletId,
      goal_id: goal.id,
      transaction_date: date,
    })
    .select()
    .single();

  if (!transaction) return null;

  await syncWalletForTransaction(supabase, transaction);

  const newAmount = Number(goal.current_amount) + amount;
  const { data: updatedGoal } = await supabase
    .from("savings_goals")
    .update({ current_amount: newAmount })
    .eq("id", goal.id)
    .select()
    .single();

  if (!updatedGoal) return null;
  return { transaction, goal: updatedGoal };
}

/** Reverses a goal's current_amount when a goal-linked transaction is deleted. */
export async function reverseGoalContribution(
  supabase: SupabaseClient,
  tx: Pick<FinanceTransaction, "goal_id" | "amount">
): Promise<SavingsGoal | null> {
  if (!tx.goal_id) return null;
  const { data: goal } = await supabase
    .from("savings_goals")
    .select("*")
    .eq("id", tx.goal_id)
    .single();
  if (!goal) return null;

  const newAmount = Number(goal.current_amount) - Number(tx.amount);
  const { data: updatedGoal } = await supabase
    .from("savings_goals")
    .update({ current_amount: newAmount })
    .eq("id", tx.goal_id)
    .select()
    .single();
  return updatedGoal ?? null;
}
