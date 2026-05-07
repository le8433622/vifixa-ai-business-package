# Staging + Canary Deployment

## Infrastructure

| Environment | Project Ref | URL | Plan |
|---|---|---|---|
| Production | `lipjakzhzosrhttsltwo` | `https://lipjakzhzosrhttsltwo.supabase.co` | Pro |
| Staging | `drapjraegrygkakzalog` | `https://drapjraegrygkakzalog.supabase.co` | Free |

## Local Setup

```bash
# Link to staging for dev work
supabase link --project-ref drapjraegrygkakzalog

# After testing, deploy all functions
supabase functions deploy ai-diagnose ai-estimate-price ai-matching ai-quality ai-dispute ai-coach ai-predict ai-chat --project-ref drapjraegrygkakzalog

# Push DB changes
supabase db push --linked
```

## Canary Strategy

Since all AI functions share one NVIDIA API key, canary is per-version rather than per-user:

### Stage 1: Smoke Tests (5 min)
```bash
# Run integration tests against staging
chmod +x scripts/test-ai-functions.sh
export SUPABASE_URL="https://drapjraegrygkakzalog.supabase.co"
export SUPABASE_ANON_KEY="<staging_anon_key>"
./scripts/test-ai-functions.sh
```

### Stage 2: Internal QA (30 min)
- Test all 8 functions manually via Supabase Dashboard → Edge Functions → each function → Run test
- Verify responses, latency, error handling

### Stage 3: 5% Traffic
- Use Supabase Dashboard: Go to Edge Functions → select function → click "Traffic" tab
- Route 5% of traffic to new version
- Monitor ai_logs in production for 15 min

**OR** if Dashboard traffic splitting is not available:
- Deploy new version with suffix: `ai-diagnose-v2`, `ai-estimate-price-v2`, etc.
- Update mobile app config to send X% of traffic to `-v2` endpoints via feature flag

### Stage 4: 50% (1 hour)
- Increase to 50% traffic
- Monitor v_ai_health_dashboard and v_ai_recent_errors

### Stage 5: 100% Rollout
- Full deploy to all functions

### Rollback During Canary
```bash
# If issues detected at any stage:
supabase functions deploy ai-<name> --project-ref lipjakzhzosrhttsltwo --version <previous_stable>
```

## CI/CD Pipeline

The `.github/workflows/ai-tests.yml` handles:
1. Lint → Test → Deploy to staging (on `develop` branch push)
2. Lint → Test → Deploy to production (on `main` branch push)

### Required GitHub Secrets
| Secret | Value |
|---|---|
| `SUPABASE_ANON_KEY` | Anon key for production |
| `SUPABASE_ACCESS_TOKEN` | Your Supabase PAT |
| `STAGING_PROJECT_REF` | `drapjraegrygkakzalog` |
| `PRODUCTION_PROJECT_REF` | `lipjakzhzosrhttsltwo` |
| `TEST_USER_EMAIL` | `test@vifixa.ai` |
| `TEST_USER_PASSWORD` | `Test123!` |
