# Rollback & Recovery Plan

> **Status**: Production-ready candidate — this document covers rollback for Phase 25-26 launch operations.

## 1. Code Rollback

### If a Next.js deploy fails
```bash
vercel rollback --scope vifixa --token $VERCEL_TOKEN
```
This reverts to the last successful production deployment. Rollback completes in < 30s.

### If a Supabase migration breaks
```bash
# Check current migration version
supabase migration list

# Rollback last migration
supabase migration repair --status reverted <offending_version>

# If data loss is risk, restore from backup instead (see §2)
```

### If both need rollback
1. Rollback Vercel first (fastest)
2. Then rollback Supabase migrations
3. Document the failure in `docs/INCIDENT_LOG.md`

## 2. Database Recovery

### Automated backup strategy
| Backup type | Frequency | Retention | Tool |
|------------|-----------|-----------|------|
| Point-in-time | Continuous (7 days) | 7 days | Supabase PITR |
| Daily dump | Every 24h | 30 days | `supabase db dump` → S3 |
| Pre-migration | Before each migration | Manual | `supabase db dump -f pre_<name>.sql` |

### Restore procedure
```bash
# Option A: PITR (fastest, Supabase Dashboard)
# Go to Database → Backups → Restore → select timestamp

# Option B: SQL dump (best for partial restore)
supabase db dump --db-url "$PROD_DB_URL" -f backup_$(date +%Y%m%d).sql
psql "$PROD_DB_URL" -f backup_$(date +%Y%m%d).sql
```

### Data integrity check
```sql
-- After restore, verify row counts match pre-deploy snapshot
SELECT 'profiles' as tbl, count(*) from profiles
UNION ALL
SELECT 'orders', count(*) from orders
UNION ALL
SELECT 'transactions', count(*) from transactions;
```

## 3. Payment Reconciliation Rollback

### Transaction state machine
```
pending → processing → completed
  ↓          ↓
failed     refunded
```

### If a payment webhook is misprocessed
```sql
-- Mark misprocessed intents for re-processing
UPDATE payment_intents SET status = 'pending' WHERE gateway_payment_id = '<id>';

-- Then re-trigger webhook manually or via dashboard
```

### Refund procedure
```bash
# Stripe: Dashboard → Payments → <id> → Refund
# VNPay: Dashboard → Giao dịch → <id> → Hoàn tiền (within 180 days)
```

## 4. Edge Function Rollback

### If a function deployment fails
```bash
supabase functions deploy <function_name> --no-verify-jwt
# Reverts to last successful deploy
```

### Fallback to previous version
Supabase keeps 1 previous version. If the current deploy is broken:
1. Go to Edge Functions dashboard
2. Select the function
3. Click "Rollback" to restore previous version

## 5. Incident Response

### Severity levels
| Level | Response time | Example |
|-------|--------------|---------|
| P0 - Critical | < 15 min | Payment processing down, data loss |
| P1 - High | < 1 hour | Major feature broken, degraded UX |
| P2 - Medium | < 1 day | Non-critical UI bug |
| P3 - Low | Next sprint | Cosmetic, minor text error |

### Communication
1. Open incident in #incidents Slack channel
2. Update status page (if applicable)
3. Document in `docs/INCIDENT_LOG.md`

## 6. Pre-Launch Checklist (verify before every deploy)

In order to reduce the time to recovery, the following must be verified before every deploy:

- [ ] Working tree is clean (`git status`)
- [ ] No secrets committed (`git diff --check`)
- [ ] Pre-commit hook passes (lint + typecheck)
- [ ] Unit tests pass (vitest + deno + mobile)
- [ ] E2E tests pass (Playwright)
- [ ] `supabase db dump` taken for current state
- [ ] Last known good migration version recorded
- [ ] Vercel rollback verified (dry run)
