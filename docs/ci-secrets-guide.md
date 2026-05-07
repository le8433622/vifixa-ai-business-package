# CI/CD Secrets Setup

## GitHub Secrets for `.github/workflows/ai-tests.yml`

Go to GitHub repo → Settings → Secrets and variables → Actions → New repository secret.

| Secret | Value | Required For |
|---|---|---|
| `SUPABASE_ANON_KEY` | `sb_publishable_8ZQN98zLEfCsvoAn2OR85g_gB9QjWEF` | Test API calls |
| `TEST_USER_EMAIL` | `test@vifixa.ai` | JWT auth in tests |
| `TEST_USER_PASSWORD` | `Test123!` | JWT auth in tests |
| `SUPABASE_ACCESS_TOKEN` | *(your PAT)* | Deploy via CLI |
| `STAGING_PROJECT_REF` | *(staging ref)* | Staging deploy |
| `PRODUCTION_PROJECT_REF` | `lipjakzhzosrhttsltwo` | Production deploy |

## Create Test User (if not exists)

Run once in Supabase Dashboard → SQL Editor:
```sql
-- Create test user for CI
INSERT INTO auth.users (email, encrypted_password, email_confirmed_at)
VALUES (
  'test@vifixa.ai',
  crypt('Test123!', gen_salt('bf')),
  now()
);
```

## Local Test Run

```bash
export SUPABASE_URL="https://lipjakzhzosrhttsltwo.supabase.co"
export SUPABASE_ANON_KEY="sb_publishable_8ZQN98zLEfCsvoAn2OR85g_gB9QjWEF"
export TEST_EMAIL="test@vifixa.ai"
export TEST_PASSWORD="Test123!"

chmod +x scripts/test-ai-functions.sh
./scripts/test-ai-functions.sh
```

## Verifying Secrets Are Set Correctly

```bash
# Test from CLI
gh secret list -R <owner>/<repo>
```
