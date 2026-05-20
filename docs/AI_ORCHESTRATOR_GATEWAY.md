# AI-Orchestrator Gateway

`supabase/functions/ai-orchestrator` is the canonical AI runtime gateway.

## Boundary

```txt
Intent -> Policy -> Plan -> Preview/Audit
```

V1 is intentionally read-only / proposal-only.

It does not execute commerce, payment, wallet, refund, ledger, order, dispute, or admin mutations.

## Supported actions

- `healthcheck`
- `list_action_catalog`
- `load_my_context`
- `inspect_intent`
- `plan_readonly`
- `preview_action_policy`

## Catalog modes

- `read_only`: safe to preview and later route through bounded gateway.
- `proposal_only`: can be planned, but not executed by AI in v1.
- `blocked`: unknown or unauthorized action.

## Safe catalog v1

Commerce proposal-only:

- `commerce.create_income_source`
- `commerce.create_offer`
- `commerce.create_demand`
- `commerce.suggest_match`

Payment read-only:

- `payment.list_my_payment_intents`
- `payment.get_my_wallets`
- `payment.list_my_ledger_entries`
- `payment.list_my_transactions`

Service read-only:

- `service.detect`
- `service.collect_slots`

## Auth

Requires a valid user bearer token.

The function verifies the caller using Supabase Auth.

## Rules

- AI never calls payment or commerce directly in v1.
- AI only returns intent classification, suggested actions, policy preview, and readonly plans.
- Write actions are proposal-only.
- Payment, wallet, refund, ledger, and order mutation are excluded.
- Unknown action IDs are blocked.
- Persona mismatch is blocked.

## Next phase

After v1 passes staging:

1. Add audit table and idempotency key support.
2. Add `execute_tool` only for read-only actions.
3. Route read-only actions to `commerce` and `payment-ledger` gateways.
4. Keep all write actions behind approval policy.
5. Deprecate overlapping legacy AI entrypoints after parity tests.
