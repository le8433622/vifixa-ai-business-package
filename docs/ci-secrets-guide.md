# Vifixa AI — CI/CD Secrets & Environments Guide

## GitHub Environments

Three environments configured on GitHub:

| Environment | Branch | Purpose |
|---|---|---|
| **Production** | `main` | Production deployment |
| **staging** | `staging` | Staging/Canary deployment |
| **Preview** | Any (PR) | PR preview deployments |

## Environment Secrets

### Production (`gh secret set --env Production`)

| Secret | Value | Required For |
|---|---|---|
| `VERCEL_ORG_ID` | `team_p9zzgsjm4RqgqACv9HdRXVEj` | Vercel CI deploy |
| `VERCEL_PROJECT_ID` | `prj_1TwlDIScmuYjb6dwcc6qpOqxmA08` | Vercel CI deploy |
| `VERCEL_TOKEN` | *(Vercel access token)* | Vercel CI deploy |
| `SUPABASE_PROJECT_REF` | `lipjakzhzosrhttsltwo` | Supabase deploy |
| `SUPABASE_URL` | `https://lipjakzhzosrhttsltwo.supabase.co` | Integration tests |
| `SUPABASE_ANON_KEY` | *(anon key)* | Integration tests |

### Staging (`gh secret set --env staging`)

| Secret | Value | Required For |
|---|---|---|
| `VERCEL_ORG_ID` | `team_p9zzgsjm4RqgqACv9HdRXVEj` | Vercel CI deploy |
| `VERCEL_PROJECT_ID` | `prj_1TwlDIScmuYjb6dwcc6qpOqxmA08` | Vercel CI deploy |
| `VERCEL_TOKEN` | *(Vercel access token)* | Vercel CI deploy |
| `SUPABASE_PROJECT_REF` | *(staging ref)* | Supabase deploy |
| `SUPABASE_URL` | *(staging URL)* | Integration tests |
| `VERCEL_PROJECT_NAME` | `vifixa-ai-staging` | Deployment tracking |

### Preview (`gh secret set --env Preview`)

| Secret | Value | Required For |
|---|---|---|
| `VERCEL_ORG_ID` | `team_p9zzgsjm4RqgqACv9HdRXVEj` | Vercel CI deploy |
| `VERCEL_PROJECT_ID` | `prj_1TwlDIScmuYjb6dwcc6qpOqxmA08` | Vercel CI deploy |
| `VERCEL_TOKEN` | *(Vercel access token)* | Vercel CI deploy |

## Repository-level Secrets (Shared)

Set once, used by all environments:

| Secret | Required For |
|---|---|
| `SUPABASE_ACCESS_TOKEN` | Supabase CLI auth |
| `SUPABASE_ANON_KEY` | Integration tests (fallback) |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin operations |
| `TEST_USER_EMAIL` | Integration test login |
| `TEST_USER_PASSWORD` | Integration test login |
| `VERCEL_TOKEN` | Vercel CI deploy (fallback) |

## How to Set a Secret

```bash
# Repo-level
gh secret set SUPABASE_ACCESS_TOKEN --body "sbp_..."

# Environment-level
echo -n "lipjakzhzosrhttsltwo" | gh secret set SUPABASE_PROJECT_REF --env Production
```

## Branch Protection

### `main` branch
- ✅ Require PR with 1 approval
- ✅ Require status checks: `typecheck`, `build`
- ✅ Strict status checks (branch must be up-to-date)
- ✅ Require linear history
- ✅ Enforce for admins
- ❌ Force pushes disabled
- ❌ Deletions disabled

### `staging` branch
- Protected when created (same rules as main minus admin enforcement)

## CI Workflows

### `ci.yml` — On every push/PR to main/staging
1. **lint** — ESLint for web app
2. **typecheck** — TypeScript check for web app
3. **edge-quality-gate** — Deno check all edge functions + prohibit `auth.user.` pattern + verify imports
4. **build** — Web app production build
5. **test-edge-functions** — Integration tests with real Supabase

### `ai-tests.yml` — On AI function changes
1. **lint** — Deno check AI functions
2. **integration-test** — Run integration test script

### `deploy-vercel.yml` — On push to main/staging, PR open/sync
1. **deploy-preview** — PR preview (Preview env)
2. **deploy-staging** — Push to staging (staging env)
3. **deploy-production** — Push to main (Production env)

### `deploy-supabase.yml` — On supabase/ changes
1. **lint** — Deno check + quality gates
2. **deploy-staging** — Push to staging branch (staging env)
3. **deploy-production** — Push to main branch (Production env)

## One-time Setup

```bash
# 1. Create Vercel access token at https://vercel.com/account/tokens
# 2. Set it as a GitHub secret
gh secret set VERCEL_TOKEN --body "your_vercel_token_here"

# 3. Create Supabase access token at https://supabase.com/dashboard/account/tokens
gh secret set SUPABASE_ACCESS_TOKEN --body "sbp_..."

# 4. For staging, create a staging Supabase project and set:
#    SUPABASE_PROJECT_REF, SUPABASE_URL for staging env

# 5. Create staging branch (if not exists)
git branch staging
git push origin staging
```
