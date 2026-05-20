# AI Approval Policy

`supabase/functions/ai-approval` is the approval gateway for proposal-only AI actions.

## Boundary

```txt
AI Proposal -> Action Request -> Admin Review -> Approved/Rejected
```

This gateway does not execute write actions.

## Supported actions

- `create_action_request`
- `list_my_action_requests`
- `approve_action_request`
- `reject_action_request`

## Proposal-only action types

- `commerce.create_income_source`
- `commerce.create_offer`
- `commerce.create_demand`
- `commerce.suggest_match`

## Rules

- Users can create proposal action requests.
- Users can list their own requests.
- Admins can list all requests.
- Only admins can approve or reject.
- Approved requests are not executed automatically.
- Every operation writes redacted audit logs when the audit table exists.

## Next phase

After this phase is stable:

1. Add UI review queue.
2. Add bounded execution for approved commerce proposals.
3. Keep payment, wallet, refund, ledger, order, and admin mutation blocked until separate policy gates exist.
