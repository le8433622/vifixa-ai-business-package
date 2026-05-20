# Commerce Gateway

Canonical gateway for commerce actions.

Loop:

```txt
Income Source -> Offer -> Demand -> Match
```

Supported actions:

- create_income_source
- create_offer
- create_demand
- suggest_match
- list_my_income_sources
- list_active_offers

Rules:

- Requires a valid user bearer token.
- Writes on behalf of the authenticated user.
- Offer creation requires ownership of the income source.
- Match creation requires ownership of the demand.
- Payment, refund, ledger, admin, and final dispute actions are excluded.

Next:

- Deploy to staging.
- Smoke test actions.
- Add audit log.
- Add order draft only after order-workflow boundary is defined.
