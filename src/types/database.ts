export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskPriority = "low" | "medium" | "high";
export type TransactionType = "income" | "expense";

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  currency: string;
  language: string;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface Note {
  id: string;
  user_id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  category: string;
  folder_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface NoteFolder {
  id: string;
  user_id: string;
  name: string;
  color: string;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface UserBank {
  id: string;
  user_id: string;
  name: string;
  position: number;
  created_at: string;
}

export interface TransactionCategory {
  id: string;
  user_id: string;
  type: TransactionType;
  name: string;
  position: number;
  created_at: string;
}

export interface CalendarEvent {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  start_at: string;
  end_at: string | null;
  all_day: boolean;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface Wallet {
  id: string;
  user_id: string;
  name: string;
  balance: number;
  currency: string;
  icon: string;
  color: string;
  bank: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface FinanceTransaction {
  id: string;
  user_id: string;
  wallet_id: string | null;
  goal_id: string | null;
  type: TransactionType;
  amount: number;
  category: string | null;
  description: string | null;
  transaction_date: string;
  created_at: string;
}

export interface SavingsGoal {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  color: string;
  currency: string;
  exchange_rate: number;
  default_wallet_id: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}
