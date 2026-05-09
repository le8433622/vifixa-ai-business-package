# Vifixa AI — System State Checkpoint

> Tag: `v0.1.0-payment-smart-system`  
> Date: 2026-05-09 (Updated: 2026-05-09)  
> Commit: `2cea968`

---

## 1. Deployments

### Production

| Component | URL / Ref | Status |
|-----------|-----------|--------|
| Web App | https://web-eta-ochre-99.vercel.app | ✅ Active (47 routes) |
| Supabase | lipjakzhzosrhttsltwo | ✅ Active |
| GitHub | le8433622/vifixa-ai-business-package | ✅ main + staging |
| Staging Web | https://vifixa-ai-staging.vercel.app | ✅ Active |
| Staging Supabase | drapjraegrygkakzalog | ✅ Active, all functions deployed |

### Supabase Edge Functions (16 active)

| Function | Notes |
|----------|-------|
| ai-diagnose | ✅ |
| ai-estimate-price | ✅ |
| ai-fraud-check | ✅ |
| notify | ✅ |
| upload-complete | ✅ |
| ai-dispute | ✅ |
| ai-matching | ✅ |
| auth-login | ✅ |
| auth-register | ✅ Public registration |
| ai-quality | ✅ |
| customer-requests | ✅ |
| worker-jobs | ✅ |
| admin-dashboard | ✅ |
| ai-coach | ✅ |
| stripe-connect | ✅ |
| ai-warranty | ✅ |
| stripe-payment-intent | ✅ |
| stripe-webhook | ✅ |
| ai-chat | ✅ Orchestrator |
| ai-predict | ✅ |
| ai-care-agent | ✅ |
| subscription-manage | ✅ |
| stripe-checkout | ✅ |
| **feature-flag** | ✅ New - v3 |
| **payment-process** | ✅ New - v3 |
| **user-preferences** | ✅ New - v3 |
| **behavioral-analytics** | ✅ New - v3 |
| **smart-suggestions** | ✅ New - v5 |
| **wallet-manager** | ✅ New - v5 |

---

## 2. Database Migrations (31 total)

| # | Migration | Status |
|---|-----------|--------|
| 001 | 001_init.sql | ✅ |
| 002 | 002_trust_scores.sql | ✅ |
| 003 | 003_payments.sql | ✅ |
| 004 | 004_fix_rls_recursion.sql | ✅ |
| 5-23 | AI Chat migrations (19 files) | ✅ |
| 24 | 20260508000000_subscription_plans.sql | ✅ |
| 25 | 20260508001000_fix_admin_profile_and_auth_trigger.sql | ✅ |
| 26-28 | Stripe + Realtime (3 files) | ✅ |
| 29-33 | Payment/Smart/AB Testing (5 files) | ✅ |
| 34 | **20260511000000_add_customer_update_orders.sql** | ✅ NEW |
| 35 | **20260511000001_add_rating_to_orders.sql** | ✅ NEW |

---

## 3. Git History

```
11a8c6f Add customer UPDATE RLS policy for orders
ab9f148 Fix: Customer cannot cancel orders (RLS + rating column)
b751bfa Feat: Payment gateway abstraction + wallet + smart system
401e868 Step 10: Final Verification
a23d810 Step1: Project initialization
3d66e51 Merge PR #7: AI Chat Service Closer
...
```

---

## 4. Known Issues

### Critical
- None currently

### Medium
- `worker_id` = NULL for all existing orders (no worker assignments)
- Wallets and payouts tables empty (no wallet created for any user)
- Mobile app needs `npm install` + `.env` before running

### Low
- `20260510000006_add_ab_test_id_to_suggestions.sql` migration file missing (not critical — smart-suggestions function was fixed to not depend on `ab_test_id` column)
- `review` page on mobile missing cancel button for customers
- `cancel_order` action type defined in `ai_action_requests` table but never used
- **RESOLVED** VERCEL_TOKEN — now set with real value

---

## 5. Key Configuration

### Environment Variables (Vercel Production)
| Variable | Set |
|----------|-----|
| NEXT_PUBLIC_SUPABASE_URL | ✅ |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | ✅ |
| NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY | ✅ |
| STRIPE_SECRET_KEY | ✅ |
| AI_PROVIDER | nvidia |
| NEXT_PUBLIC_APP_URL | ✅ |

### Environment Variables (Mobile)
| Variable | Set |
|----------|-----|
| EXPO_PUBLIC_SUPABASE_URL | ✅ (in .env) |
| EXPO_PUBLIC_SUPABASE_ANON_KEY | ✅ (in .env) |

---

## 6. Web Routes (47 total)

### Public (4)
`/`, `/login`, `/register`, `/for-workers`

### Customer (14)
Dashboard, Chat AI, Care Hub, Service Request, Orders list/detail,
Profile, Complaint, Settings, Devices list/detail, Warranty, Review

### Worker (10)
Dashboard, Jobs list/detail, History, **Earnings**, **AI Coach**,
Trust, Verify, Profile, **Settings**

### Admin (9)
Dashboard, Users, Workers, Orders, Complaints, Disputes, AI Logs,
Approvals, Chat KPIs, Price Accuracy

### Admin Settings (8)
General, **Features**, **Payments**, **Wallet**, Notifications,
AI Config, Security, Gateway config dynamic

---

## 7. CI/CD Pipeline

| Workflow | Trigger | Environment | Action |
|---|---|---|---|
| `ci.yml` | Push/PR main, staging | — | Lint, typecheck, quality gates, build, integration tests |
| `deploy-vercel.yml` | Push main/staging, PR | Preview/staging/Production | Vercel auto-deploy |
| `deploy-supabase.yml` | Push supabase/ changes | staging/Production | Edge functions + migrations |
| `ai-tests.yml` | AI function changes | — | Deno check + integration tests |

## 8. GitHub Configuration

| Item | Status |
|---|---|
| Environments | ✅ Production, staging, Preview |
| Branch protection (main) | ✅ PR + 1 review, status checks, linear history |
| Branch protection (staging) | ✅ Same as main, admins bypass |
| Secrets (repo) | ✅ SUPABASE_ACCESS_TOKEN, ANON_KEY, SERVICE_ROLE_KEY, TEST_USER/PASS, VERCEL_TOKEN |
| Secrets (Production env) | ✅ VERCEL, SUPABASE_PROJECT_REF, URL, ANON_KEY |
| Secrets (staging env) | ✅ VERCEL, SUPABASE_PROJECT_REF, URL, ANON_KEY |
| Secrets (Preview env) | ✅ VERCEL_ORG_ID, PROJECT_ID, TOKEN |
| Quality gates | Deno check, `auth.user.` prohibition, cors import validation |

## 9. Quick Commands

```bash
# Supabase Production
supabase functions deploy <name> --project-ref lipjakzhzosrhttsltwo
supabase db push

# Supabase Staging
supabase functions deploy <name> --project-ref drapjraegrygkakzalog
supabase db push --linked

# Vercel Production (from web/)
vercel deploy --prod --token <token>

# Vercel Staging (from web/ on staging branch)
vercel deploy --token <token>

# Git
git tag v0.1.0-payment-smart-system
git push origin v0.1.0-payment-smart-system
```
