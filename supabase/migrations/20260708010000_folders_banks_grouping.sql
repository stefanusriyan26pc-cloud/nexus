-- v3 feature additions: note folders, user bank list, wallet/goal grouping + custom ordering

-- Note folders (replaces hardcoded NOTE_CATEGORIES on the client)
create table if not exists public.note_folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  color text default '#3b82f6' not null,
  position integer default 0 not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.notes add column if not exists folder_id uuid references public.note_folders(id) on delete set null;

-- One-time data migration: turn existing free-text categories into real folders
insert into public.note_folders (user_id, name)
select distinct user_id, category from public.notes
where category is not null and category <> ''
on conflict do nothing;

update public.notes n set folder_id = f.id
from public.note_folders f
where f.user_id = n.user_id and f.name = n.category
  and n.folder_id is null and n.category is not null and n.category <> '';

-- User-managed bank list (Settings)
create table if not exists public.user_banks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  position integer default 0 not null,
  created_at timestamptz default now() not null
);

-- Wallets: bank + custom ordering
alter table public.wallets add column if not exists bank text;
alter table public.wallets add column if not exists position integer default 0 not null;

with ranked as (
  select id, row_number() over (partition by user_id order by created_at) - 1 as rn
  from public.wallets
)
update public.wallets w set position = ranked.rn from ranked where ranked.id = w.id;

-- Savings goals: default/source wallet (for grouping) + custom ordering
alter table public.savings_goals add column if not exists default_wallet_id uuid references public.wallets(id) on delete set null;
alter table public.savings_goals add column if not exists position integer default 0 not null;

with ranked as (
  select id, row_number() over (partition by user_id order by created_at) - 1 as rn
  from public.savings_goals
)
update public.savings_goals g set position = ranked.rn from ranked where ranked.id = g.id;

-- Transaction categories (income/expense), user-managed from Settings
create table if not exists public.transaction_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  type text not null check (type in ('income', 'expense')),
  name text not null,
  position integer default 0 not null,
  created_at timestamptz default now() not null
);

-- Seed sensible defaults for existing users (one-time; matches the previous
-- hardcoded/localStorage defaults so nobody loses their category list)
insert into public.transaction_categories (user_id, type, name, position)
select p.id, 'income', v.name, v.ord
from public.profiles p
cross join (values ('Salary', 0), ('Freelance', 1), ('Investment', 2), ('Gift', 3)) as v(name, ord)
where not exists (
  select 1 from public.transaction_categories tc where tc.user_id = p.id and tc.type = 'income'
);

insert into public.transaction_categories (user_id, type, name, position)
select p.id, 'expense', v.name, v.ord
from public.profiles p
cross join (
  values ('Food', 0), ('Transport', 1), ('Shopping', 2), ('Bills', 3),
         ('Health', 4), ('Entertainment', 5), ('Savings', 6)
) as v(name, ord)
where not exists (
  select 1 from public.transaction_categories tc where tc.user_id = p.id and tc.type = 'expense'
);

-- Indexes
create index if not exists note_folders_user_id_idx on public.note_folders (user_id);
create index if not exists user_banks_user_id_idx on public.user_banks (user_id);
create index if not exists transaction_categories_user_id_idx on public.transaction_categories (user_id);

-- updated_at trigger for note_folders
create trigger note_folders_updated_at before update on public.note_folders
  for each row execute function public.update_updated_at();

-- Row Level Security
alter table public.note_folders enable row level security;
alter table public.user_banks enable row level security;
alter table public.transaction_categories enable row level security;

-- Note folders policies
create policy "Users can view own note folders" on public.note_folders for select using (auth.uid() = user_id);
create policy "Users can insert own note folders" on public.note_folders for insert with check (auth.uid() = user_id);
create policy "Users can update own note folders" on public.note_folders for update using (auth.uid() = user_id);
create policy "Users can delete own note folders" on public.note_folders for delete using (auth.uid() = user_id);

-- User banks policies
create policy "Users can view own banks" on public.user_banks for select using (auth.uid() = user_id);
create policy "Users can insert own banks" on public.user_banks for insert with check (auth.uid() = user_id);
create policy "Users can update own banks" on public.user_banks for update using (auth.uid() = user_id);
create policy "Users can delete own banks" on public.user_banks for delete using (auth.uid() = user_id);

-- Transaction categories policies
create policy "Users can view own categories" on public.transaction_categories for select using (auth.uid() = user_id);
create policy "Users can insert own categories" on public.transaction_categories for insert with check (auth.uid() = user_id);
create policy "Users can update own categories" on public.transaction_categories for update using (auth.uid() = user_id);
create policy "Users can delete own categories" on public.transaction_categories for delete using (auth.uid() = user_id);

-- Data API grants
grant select, insert, update, delete on public.note_folders to authenticated;
grant select, insert, update, delete on public.user_banks to authenticated;
grant select, insert, update, delete on public.transaction_categories to authenticated;
