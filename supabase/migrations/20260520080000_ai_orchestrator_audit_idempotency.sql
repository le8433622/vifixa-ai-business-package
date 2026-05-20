-- AI Orchestrator audit and idempotency layer
-- Purpose: observe AI runtime decisions and prevent replay of identical read-only tool requests.
-- This migration does not enable write actions.

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

create index if not exists idx_ai_orch_audit_user_created
  on public.ai_orchestrator_audit_logs(user_id, created_at desc);

create index if not exists idx_ai_orch_audit_request
  on public.ai_orchestrator_audit_logs(request_id);

create index if not exists idx_ai_orch_audit_action_created
  on public.ai_orchestrator_audit_logs(action, created_at desc);

create table if not exists public.ai_orchestrator_idempotency_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  idempotency_key text not null,
  action text not null,
  request_hash text not null,
  response_body jsonb,
  status_code integer not null default 200,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '24 hours',
  unique(user_id, idempotency_key)
);

create index if not exists idx_ai_orch_idempotency_expiry
  on public.ai_orchestrator_idempotency_keys(expires_at);

alter table public.ai_orchestrator_audit_logs enable row level security;
alter table public.ai_orchestrator_idempotency_keys enable row level security;

drop policy if exists "Users can read own AI orchestrator audit logs" on public.ai_orchestrator_audit_logs;
create policy "Users can read own AI orchestrator audit logs"
  on public.ai_orchestrator_audit_logs
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can read own AI orchestrator idempotency rows" on public.ai_orchestrator_idempotency_keys;
create policy "Users can read own AI orchestrator idempotency rows"
  on public.ai_orchestrator_idempotency_keys
  for select
  using (auth.uid() = user_id);

-- Inserts are performed by Edge Functions with the service role.
-- No user insert/update/delete policies are granted here.
