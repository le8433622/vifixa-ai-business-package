# Vifixa AI Functions - Rollback Plan

## Quick Rollback (Single Function)

```bash
# Rollback to previous version
supabase functions deploy ai-<name> --legacy-bundle

# Or deploy a specific previous version:
# 1. Go to Dashboard -> Edge Functions -> <function> -> Versions
# 2. Find the working version number
# 3. Re-deploy that version from CLI:
supabase functions deploy ai-<name> --version <N>
```

## Full System Rollback

### Phase 1: Functions (5 min)

```bash
# Deploy last known good versions
supabase functions deploy ai-diagnose ai-estimate-price ai-matching ai-quality ai-dispute ai-coach ai-predict ai-chat
# Use --version flag per function if specific versions are needed
```

### Phase 2: Migrations (15 min)

Check current migration status:
```bash
supabase db remote commits
```

To revert a migration:
```bash
# Create a down migration
supabase migration new rollback_<migration_name>

# In the generated file, add:
# REVERT <migration_name>:
#   - Drop columns: ALTER TABLE ai_logs DROP COLUMN IF EXISTS request_id;
#   - Drop tables: DROP TABLE IF EXISTS knowledge_base CASCADE;
#   - Drop tables: DROP TABLE IF EXISTS admin_review_queue CASCADE;
#   - Drop views: DROP VIEW IF EXISTS v_ai_health_dashboard, v_ai_recent_errors, v_ai_rate_limit_monitor, v_ai_hourly_usage, v_ai_top_users;

# Apply revert:
supabase db push --linked
```

### Phase 3: Verify (5 min)

```bash
# Check functions are active
supabase functions list --project-ref <ref>

# Test health endpoint
curl -X POST https://<ref>.supabase.co/functions/v1/ai-diagnose \
  -H "Authorization: Bearer <user_jwt>" \
  -H "Content-Type: application/json" \
  -d '{"category":"engine","description":"test"}'
```

### Phase 4: Notify

- Alert team via Slack/email
- Log incident in #incidents channel
- Update status page

## Migration Revert Commands (copy-paste)

```sql
-- REVERT 20260507000000_add_request_id_to_ai_logs
ALTER TABLE ai_logs
  DROP COLUMN IF EXISTS request_id,
  DROP COLUMN IF EXISTS user_id,
  DROP COLUMN IF EXISTS model,
  DROP COLUMN IF EXISTS latency_ms,
  DROP COLUMN IF EXISTS token_usage;

-- REVERT 20260507001000_add_knowledge_base
DROP TABLE IF EXISTS knowledge_base CASCADE;

-- REVERT 20260507002000_add_review_queue_rate_limit
DROP TABLE IF EXISTS admin_review_queue CASCADE;
ALTER TABLE profiles DROP COLUMN IF EXISTS role;

-- REVERT 20260507003000_ai_monitoring_views
DROP VIEW IF EXISTS v_ai_health_dashboard;
DROP VIEW IF EXISTS v_ai_recent_errors;
DROP VIEW IF EXISTS v_ai_rate_limit_monitor;
DROP VIEW IF EXISTS v_ai_hourly_usage;
DROP VIEW IF EXISTS v_ai_top_users;
```

## Decision Matrix

| Issue | Rollback? | Alternative |
|---|---|---|
| AI returns bad output | No | Fix prompt in code, re-deploy |
| Auth broken | Yes | Revert auth changes immediately |
| Migration causes DB errors | Yes | Revert migration, fix schema |
| Rate limiter too aggressive | No | Tune maxRequests, re-deploy |
| Performance regression | Maybe | Check ai_logs.latency_ms first |
