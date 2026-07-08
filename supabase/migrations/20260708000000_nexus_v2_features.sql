-- v2 feature additions

-- Notes: category column
ALTER TABLE notes ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'General';

-- Savings goals: foreign currency support
ALTER TABLE savings_goals ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'IDR';
ALTER TABLE savings_goals ADD COLUMN IF NOT EXISTS exchange_rate decimal(14,6) NOT NULL DEFAULT 1.0;

-- Finance transactions: optional link to a savings goal
ALTER TABLE finance_transactions ADD COLUMN IF NOT EXISTS goal_id uuid REFERENCES savings_goals(id) ON DELETE SET NULL;
