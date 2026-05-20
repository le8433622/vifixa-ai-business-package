# AI-Orchestrator Gateway

`supabase/functions/ai-orchestrator` is the canonical AI runtime gateway.

## Boundary

```txt
Intent -> Policy -> Plan -> Preview/Audit -> Read-only Tool Execution
```

V2 remains read-only / proposal-only.

It does not execute commerce, payment, wallet, refund, ledger, order, dispute, or admin mutations.

## Supported actions

- `healthcheck`
- `list_action_catalog`
- `load_my_context`
- `inspect_intent`
- `plan_readonly`
- `preview_action_policy`
- `execute_readonly_tool`

## Catalog modes

- `read_only`: safe to preview and execute through bounded gateway.
- `proposal_only`: can be planned, but not executed by AI in v2.
- `blocked`: unknown or unauthorized action.

## Read-only executable tools v2

Payment read-only via `payment-ledger` gateway:

- `payment.list_my_payment_intents`
- `payment.get_my_wallets`
- `payment.list_my_ledger_entries`
- `payment.list_my_transactions`

Service read-only inside the AI gateway:

- `service.detect`
- `service.collect_slots`

## Proposal-only tools

Commerce actions remain proposal-only:

- `commerce.create_income_source`
- `commerce.create_offer`
- `commerce.create_demand`
- `commerce.suggest_match`

## Auth

Requires a valid user bearer token.

The function verifies the caller using Supabase Auth.

## Rules

- AI never executes write/mutation actions in v2.
- AI may execute only actions with catalog mode `read_only`.
- Payment read-only tools must route through `payment-ledger`.
- Write actions are proposal-only.
- Payment mutation, wallet mutation, refund, ledger mutation, order mutation, and admin mutation are excluded.
- Unknown action IDs are blocked.
- Persona mismatch is blocked.

## Next phase

After v2 passes staging:

1. Add durable audit table and idempotency key support.
2. Add `execute_tool` for more read-only domains only.
3. Keep all write actions behind approval policy.
4. Add UI review surface for generated plans.
5. Deprecate overlapping legacy AI entrypoints after parity tests.
