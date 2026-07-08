import type { SupabaseClient } from "@supabase/supabase-js";

export const DEFAULT_CATEGORIES = {
  income: ["Salary", "Freelance", "Investment", "Gift"],
  expense: ["Food", "Transport", "Shopping", "Bills", "Health", "Entertainment", "Savings"],
};

/** Seeds sensible default categories the first time a user has none (e.g. a new signup). */
export async function ensureDefaultCategories(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase.from("transaction_categories").select("id").eq("user_id", userId).limit(1);
  if (data && data.length > 0) return;

  const rows = [
    ...DEFAULT_CATEGORIES.income.map((name, i) => ({ user_id: userId, type: "income", name, position: i })),
    ...DEFAULT_CATEGORIES.expense.map((name, i) => ({ user_id: userId, type: "expense", name, position: i })),
  ];
  await supabase.from("transaction_categories").insert(rows);
}
