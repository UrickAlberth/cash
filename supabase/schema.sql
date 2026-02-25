-- Supabase schema for RosaCash
-- Run this in the Supabase SQL editor to create tables and enable RLS

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ── Categories ────────────────────────────────────────────────────────────────
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text not null,
  icon text,
  created_at timestamptz not null default now()
);

alter table public.categories enable row level security;

create policy "Users can manage their own categories"
  on public.categories for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Cards ─────────────────────────────────────────────────────────────────────
create table if not exists public.cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  "limit" numeric(12,2) not null default 0,
  closing_day int not null,
  due_day int not null,
  color text not null,
  created_at timestamptz not null default now()
);

alter table public.cards enable row level security;

create policy "Users can manage their own cards"
  on public.cards for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Transactions ──────────────────────────────────────────────────────────────
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  category text not null,
  subcategory text not null default '',
  description text not null,
  value numeric(12,2) not null,
  type text not null,
  card_id uuid references public.cards(id) on delete set null,
  installments int,
  current_installment int,
  is_recurring boolean not null default false,
  is_virtual boolean not null default false,
  is_paid boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.transactions enable row level security;

create policy "Users can manage their own transactions"
  on public.transactions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Recurring expenses ────────────────────────────────────────────────────────
create table if not exists public.recurring (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  description text not null,
  value numeric(12,2) not null,
  day_of_month int not null,
  category text not null,
  subcategory text not null default '',
  type text not null,
  start_date date not null,
  created_at timestamptz not null default now()
);

alter table public.recurring enable row level security;

create policy "Users can manage their own recurring expenses"
  on public.recurring for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
