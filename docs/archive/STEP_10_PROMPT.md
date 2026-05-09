> [!WARNING]
> **ARCHIVED DOCUMENT**
> This document is kept for historical purposes only. Please refer to `docs/CHECKPOINT_SYSTEM_STATE.md` for the current, single source of truth regarding the system state.

# Step 10: Final Verification Prompt for opencode CLI

## Context
Vifixa AI business package is now fully built through Steps 1-9. All code is complete, Supabase Edge Functions deployed, web app deployed to Vercel. Step 10 is the final verification to ensure production readiness.

## Your Task
Run final verification checks per `agent.md` Step 10 requirements. Validate ALL of the following:

### 1. AI KPI Verification (Per 15_CODEX_BUSINESS_CONTEXT.md)
- [ ] Run `supabase functions invoke ai-diagnose --project-ref lipjakzhzosrhttsltwo` with test input
- [ ] Run `supabase functions invoke ai-estimate-price --project-ref lipjakzhzosrhttsltwo` with test input
- [ ] Run `supabase functions invoke ai-fraud-check --project-ref lipjakzhzosrhttsltwo` with test input
- [ ] Run `supabase functions invoke ai-matching --project-ref lipjakzhzosrhttsltwo` with test input
- [ ] Run `supabase functions invoke ai-dispute --project-ref lipjakzhzosrhttsltwo` with test input
- [ ] Run `supabase functions invoke ai-quality --project-ref lipjakzhzosrhttsltwo` with test input
- [ ] Run `supabase functions invoke ai-coach --project-ref lipjakzhzosrhttsltwo` with test input
- [ ] Verify all AI functions return valid JSON (not mock data)
- [ ] Check response times < 3 seconds per function

### 2. No Mock Data in Production
- [ ] Search codebase for `mock`, `fake`, `dummy`, `placeholder` data in `/web`, `/mobile`, `/supabase/functions`
- [ ] Verify all data comes from Supabase database or real AI API calls
- [ ] Check Edge Functions don't have hardcoded responses

### 3. No Frontend Secrets
- [ ] Verify `.env.local` is in `.gitignore`
- [ ] Check web app doesn't expose `SUPABASE_SERVICE_ROLE_KEY` in client-side code
- [ ] Check mobile app doesn't have any API keys or secrets in source code
- [ ] Verify all AI calls go through Supabase Edge Functions (not directly from frontend)

### 4. RLS (Row Level Security) Enforcement
- [ ] Run `supabase db query --project-ref lipjakzhzosrhttsltwo "SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public'"` to verify RLS enabled
- [ ] Test customer can only see own orders: Login as customer, try to access another customer's order
- [ ] Test worker can only see own jobs: Login as worker, try to access another worker's jobs
- [ ] Test admin can see all data: Login as admin, verify full access

### 5. End-to-End Flow Test
- [ ] Customer: Register → Login → Create service request → Get AI diagnosis → Get price estimate → Accept → Worker assigned
- [ ] Worker: Register → Login → Complete profile → Get verified → Accept job → Complete job → Get paid
- [ ] Admin: Login → View all orders → View AI logs → Handle dispute → Verify worker → View metrics

### 6. Performance & Security
- [ ] Run `npx @vercel/speed-insights` on web app
- [ ] Check Supabase Edge Functions logs for errors
- [ ] Verify Stripe webhooks configured (if Stripe keys available)
- [ ] Test rate limiting on API routes (if implemented)

### 7. Documentation Update
- [ ] Update `ACTUAL_PROGRESS_REPORT.md` to mark Step 10 COMPLETE
- [ ] Update GitHub issues #1-#6 to "Done" if all tasks verified
- [ ] Create `DEPLOYMENT_GUIDE.md` with:
  - Supabase project ID: `lipjakzhzosrhttsltwo`
  - Web URL: `https://web-eta-ochre-99.vercel.app`
  - Vercel project: `web` (le8433622-9187s-projects)
  - Environment variables needed for new deployments

## Commands to Run
```bash
# Test AI functions
cd /Users/lha/Documents/vifixa-ai-business-package/supabase
export PATH="/usr/local/Cellar/supabase/2.98.1/bin:$PATH"

# Test each AI function
supabase functions invoke ai-diagnose --project-ref lipjakzhzosrhttsltwo --body '{"description": "MacBook không lên nguồn"}'
supabase functions invoke ai-estimate-price --project-ref lipjakzhzosrhttsltwo --body '{"device_type": "laptop", "issue_type": "power"}'
supabase functions invoke ai-fraud-check --project-ref lipjakzhzosrhttsltwo --body '{"order_id": "test-123", "customer_id": "test-customer"}'

# Check RLS
supabase db query --project-ref lipjakzhzosrhttsltwo "SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public'"

# Search for mock data
cd /Users/lha/Documents/vifixa-ai-business-package
grep -r "mock\|fake\|dummy" web/src mobile/src supabase/functions --include="*.ts" --include="*.tsx" | grep -v "node_modules" | grep -v ".next"

# Check secrets
grep -r "SERVICE_ROLE\|API_KEY\|SECRET" mobile/src --include="*.ts" --include="*.tsx" | grep -v "supabase"
```

## Success Criteria
- All 7 AI Edge Functions return real AI-generated responses (< 3s)
- Zero mock data found in production code
- Zero secrets exposed in frontend
- RLS enabled on all tables
- End-to-end flow works (customer → worker → admin)
- Web app loads without errors at `https://web-eta-ochre-99.vercel.app`
- All 14 Supabase Edge Functions show STATUS: ACTIVE

## Output
After verification, update `ACTUAL_PROGRESS_REPORT.md`:
```markdown
## Step 10: Final Verification - ✅ COMPLETE
- Date: 2026-05-05
- AI KPIs: 7/7 functions verified (< 3s response)
- Mock data: 0 instances found
- Frontend secrets: 0 exposed
- RLS: Enabled on all tables
- E2E flow: ✅ Working
- Web: https://web-eta-ochre-99.vercel.app (LIVE)
- Status: **PRODUCTION READY**
```

## Notes
- Use `export PATH="/usr/local/Cellar/supabase/2.98.1/bin:$PATH"` for Supabase CLI
- Use `export PATH="/usr/local/Cellar/node/25.9.0_3/bin:$PATH"` for Node.js 25.9.0_3
- Deno at `/Users/lha/.deno/bin/deno` for local Edge Function testing
- Web Vercel URL: https://web-eta-ochre-99.vercel.app
- Supabase Dashboard: https://supabase.com/dashboard/project/lipjakzhzosrhttsltwo
