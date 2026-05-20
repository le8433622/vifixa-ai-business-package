-- AI Orchestrator audit + idempotency layer

create table if not exists public.ai_orchestrator_audit_logs (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null,
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  persona text,
  tool text,
  mode text not null default 'readonly',
  risk text not null default 'low',
  decision text not null default 'allow',
  status text not null default 'success',
  reason text,
  input_redacted jsonb not null default '{}'::jsonb,
  output_redacted jsonb,
  latency_ms integer,
  idempotency_key text,
  created_at timestamptz not null default now()
);

create index if not exists idx_ai_orchestrator_audit_logs_user_created
  on public.ai_orchestrator_audit_logs (user_id, created_at desc);

create index if not exists idx_ai_orchestrator_audit_logs_request
  on public.ai_orchestrator_audit_logs (request_id);

create index if not exists idx_ai_orchestrator_audit_logs_action_created
  on public.ai_orchestrator_audit_logs (action, created_at desc);

alter table public.ai_orchestrator_audit_logs enable row level security;

drop policy if exists "Users can read their own AI orchestrator audit logs" on public.ai_orchestrator_audit_logs;
create policy "Users can read their own AI orchestrator audit logs"
  on public.ai_orchestrator_audit_logs
  for select
  using (auth.uid() = user_id);

create table if not exists public.ai_orchestrator_idempotency_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  idempotency_key text not null,
  action text not null,
  request_hash text not null,
  response_body jsonb not null,
  status_code integer not null default 200,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);

create index if not exists idx_ai_orchestrator_idempotency_user_expires
  on public.ai_orchestrator_idempotency_keys (user_id, expires_at desc);

alter table public.ai_orchestrator_idempotency_keys enable row level security;

drop policy if exists "Users can read their own AI orchestrator idempotency keys" on public.ai_orchestrator_idempotency_keys;
create policy "Users can read their own AI orchestrator idempotency keys"
  on public.ai_orchestrator_idempotency_keys
  for select
  using (auth.uid() = user_id);

create or replace function public.set_ai_orchestrator_idempotency_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_ai_orchestrator_idempotency_updated_at on public.ai_orchestrator_idempotency_keys;
create trigger trg_ai_orchestrator_idempotency_updated_at
before update on public.ai_orchestrator_idempotency_keys
for each row
execute function public.set_ai_orchestrator_idempotency_updated_at();
