# AI Commerce Executor

`supabase/functions/ai-commerce-executor` is the bounded execution gateway for approved commerce proposal requests.

## Boundary

```txt
Approved AI Action Request -> Admin Execution -> Commerce Table Write -> Audit
```

## Supported actions

- `list_executable_requests`
- `execute_approved_request`

## Executable request action types

- `commerce.create_income_source`
- `commerce.create_offer`
- `commerce.create_demand`
- `commerce.suggest_match`

## Rules

- Only admins can execute approved requests.
- The request must already have `status = approved`.
- Execution changes the request status to `executed`.
- Execution result is stored in request metadata.
- Audit logs are written through `ai_orchestrator_audit_logs`.
- Payment, wallet, refund, ledger, order, and admin mutations remain blocked.

## Non-goals

This gateway does not execute payment, wallet, refund, ledger, order, or admin actions.
