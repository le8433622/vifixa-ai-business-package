-- Allow admins to read AI orchestrator audit logs for the Admin AI Operations Console.

create policy if not exists "Admins can read all AI orchestrator audit logs"
  on public.ai_orchestrator_audit_logs
  for select
  using (is_admin());
