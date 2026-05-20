-- Extend AI action request approval policy to support proposal-only commerce actions.

alter table public.ai_action_requests
  drop constraint if exists ai_action_requests_action_type_check;

alter table public.ai_action_requests
  add constraint ai_action_requests_action_type_check
  check (
    action_type = any (array[
      'create_order'::text,
      'assign_worker'::text,
      'cancel_order'::text,
      'refund'::text,
      'resolve_dispute'::text,
      'commerce.create_income_source'::text,
      'commerce.create_offer'::text,
      'commerce.create_demand'::text,
      'commerce.suggest_match'::text
    ])
  );

create index if not exists idx_ai_action_requests_user_status_created
  on public.ai_action_requests (user_id, status, created_at desc);

create index if not exists idx_ai_action_requests_type_status_created
  on public.ai_action_requests (action_type, status, created_at desc);
