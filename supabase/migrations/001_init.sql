-- Vifixa AI Database Schema - Initial Migration
-- Based on 20_DATABASE_SCHEMA.md

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles table (linked to Supabase Auth)
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade not null primary key,
  email text unique not null,
  phone text unique,
  role text not null check (role in ('customer', 'worker', 'admin')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Workers table
create table if not exists public.workers (
  user_id uuid references public.profiles(id) on delete cascade not null primary key,
  skills jsonb not null default '[]'::jsonb,
  service_areas jsonb not null default '[]'::jsonb,
  trust_score integer default 50,
  is_verified boolean default false,
  avg_earnings numeric default 0,
  created_at timestamptz default now()
);

-- Orders table
create table if not exists public.orders (
  id uuid default gen_random_uuid() primary key,
  customer_id uuid references public.profiles(id) not null,
  worker_id uuid references public.workers(user_id),
  category text not null,
  description text not null,
  media_urls jsonb,
  ai_diagnosis jsonb,
  estimated_price numeric not null,
  final_price numeric,
  status text not null check (status in ('pending', 'matched', 'in_progress', 'completed', 'cancelled', 'disputed')),
  before_media jsonb,
  after_media jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- AI_Logs table
create table if not exists public.ai_logs (
  id uuid default gen_random_uuid() primary key,
  order_id uuid references public.orders(id),
  agent_type text not null check (agent_type in ('diagnosis', 'pricing', 'matching', 'quality', 'dispute', 'coach', 'fraud')),
  input jsonb not null,
  output jsonb not null,
  created_at timestamptz default now()
);

-- Trust_Scores table
create table if not exists public.trust_scores (
  user_id uuid references public.profiles(id) on delete cascade not null primary key,
  score integer not null,
  last_updated timestamptz default now(),
  history jsonb default '[]'::jsonb
);

-- Enable Row Level Security
alter table public.profiles enable row level security;
alter table public.workers enable row level security;
alter table public.orders enable row level security;
alter table public.ai_logs enable row level security;
alter table public.trust_scores enable row level security;

-- RLS Policies for profiles
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Workers can view customer profiles for assigned orders"
  on public.profiles for select
  using (
    exists (
      select 1 from public.orders
      where orders.customer_id = profiles.id
      and orders.worker_id = auth.uid()
    )
  );

create policy "Admins can view all profiles"
  on public.profiles for select
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- RLS Policies for workers
create policy "Workers can manage own worker profile"
  on public.workers for all
  using (auth.uid() = user_id);

create policy "Customers can view verified worker profiles"
  on public.workers for select
  using (is_verified = true);

create policy "Admins can manage all worker profiles"
  on public.workers for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- RLS Policies for orders
create policy "Customers can view own orders"
  on public.orders for select
  using (auth.uid() = customer_id);

create policy "Customers can create orders"
  on public.orders for insert
  with check (auth.uid() = customer_id);

create policy "Workers can view assigned orders"
  on public.orders for select
  using (auth.uid() = worker_id);

create policy "Workers can update assigned orders"
  on public.orders for update
  using (auth.uid() = worker_id);

create policy "Admins can manage all orders"
  on public.orders for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- RLS Policies for ai_logs
create policy "Only admins can view AI logs"
  on public.ai_logs for select
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- RLS Policies for trust_scores
create policy "Users can view own trust score"
  on public.trust_scores for select
  using (auth.uid() = user_id);

create policy "Admins can manage trust scores"
  on public.trust_scores for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- Indexes for performance
create index if not exists idx_orders_customer_id on public.orders(customer_id);
create index if not exists idx_orders_worker_id on public.orders(worker_id);
create index if not exists idx_orders_status on public.orders(status);
create index if not exists idx_ai_logs_order_id on public.ai_logs(order_id);

-- Function to update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Triggers for updated_at
create trigger handle_profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.handle_updated_at();

create trigger handle_orders_updated_at
  before update on public.orders
  for each row
  execute function public.handle_updated_at();
