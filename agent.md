# Agent Coding Directive

## Purpose
Strict sequential process for opencode CLI to auto-complete 100% of Vifixa AI codebase in order, zero deviation.

## Source of Truth
All requirements defined in:
- docs/specs/15_CODEX_BUSINESS_CONTEXT.md
- docs/specs/11_AI_OPERATING_MODEL.md
- docs/specs/05_PRODUCT_SOLUTION.md
- docs/specs/12_OPERATIONS_AND_TRUST.md
- docs/specs/14_OKR_KPI.md
- docs/specs/13_RISKS_LEGAL_COMPLIANCE.md
- docs/specs/18_FINANCIAL_PLAN.md
- docs/specs/19_TECHNICAL_ARCHITECTURE.md
- docs/specs/20_DATABASE_SCHEMA.md
- docs/specs/21_API_SPECIFICATION.md
- docs/specs/22_SECURITY_PLAN.md
- SUPABASE_SPEC.md
- VERCEL_SPEC.md
- MASTER_SPEC.md

## Mandatory Execution Rules
- Execute steps in strict order: 1 → 2 → ... → 10
- Complete 100% of a step before moving to next
- No parallel steps, no skipping, no reordering
- Only use Source of Truth docs for requirements
- Match 15_CODEX tech stack exactly (Supabase + Vercel + Next.js web)

## Step 1: Project Initialization
- Read all Source of Truth docs in full (01-22 .md files + SUPABASE_SPEC.md, VERCEL_SPEC.md, MASTER_SPEC.md)
- Create directory structure:
  - /supabase/migrations, /supabase/functions, /supabase/seed.sql
  - /mobile/app/(customer), /mobile/app/(worker), /mobile/app/(admin)
  - /web/app, /web/components, /web/lib, /web/app/api
  - /tests/mobile, /tests/web, /tests/integration
- Initialize git repo, commit all business docs
- Verify shell tools: Supabase CLI, npm, Node.js (v18+), Expo CLI, Vercel CLI
- Create .gitignore with node_modules/, .expo/, .next/, .vercel/, .supabase/

## Step 2: Backend Foundation (Supabase Stack)
- Initialize Supabase project: `supabase init`
- Create /supabase/config.toml with:
  - Auth enabled (email/password, later Phone OTP, Google login)
  - Storage buckets: avatars, service-media, worker-documents, order-evidence, brand-assets
  - Edge Functions: ai-diagnose, ai-estimate-price, ai-fraud-check, upload-complete, notify
  - Environment variables: SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY, AI_PROVIDER
- Define Postgres schema per docs/specs/20_DATABASE_SCHEMA.md adapted for Supabase:
  - profiles (linked to Auth users), workers, orders, ai_logs, trust_scores tables
  - Row Level Security (RLS) policies for protected data
- Create /supabase/migrations/001_init.sql with full schema
- Create /supabase/seed.sql with test data
- Create Edge Functions:
  - /supabase/functions/ai-diagnose/index.ts (Diagnosis Agent)
  - /supabase/functions/ai-estimate-price/index.ts (Pricing Agent)
  - /supabase/functions/ai-fraud-check/index.ts (Fraud Risk Agent)
- Implement RLS policies per docs/specs/22_SECURITY_PLAN.md
- Test: `supabase db reset && supabase functions serve` (all foundation tests pass)

## Step 3: Core Backend & Web APIs
- Create Supabase Edge Functions per docs/specs/21_API_SPECIFICATION.md adapted for Supabase:
  - /supabase/functions/auth-register/index.ts, auth-login/index.ts (Supabase Auth wrapper)
  - /supabase/functions/customer-requests/index.ts (service requests, orders, reviews)
  - /supabase/functions/worker-jobs/index.ts (profile, jobs, earnings)
  - /supabase/functions/admin-dashboard/index.ts (dashboard, users, workers, disputes)
- Create Next.js API routes for web admin dashboard:
  - /web/app/api/ai/[...path]/route.ts (AI proxy to Edge Functions)
  - /web/app/api/webhooks/route.ts (webhook handlers)
- Build customer flows: service requests, order tracking, reviews (via Supabase JS client)
- Build worker flows: profile, job management, earnings (via Supabase JS client)
- Build admin flows: dashboard, user/worker/order management (via Supabase JS + Server-side)
- Match docs/specs/05_PRODUCT_SOLUTION.md flows exactly
- Test: `npm test /supabase && npm test /web` (100% pass required)

## Step 4: AI Integration (Supabase Edge Functions)
- Create /supabase/functions/_shared/ai-provider.ts (abstraction layer for OpenAI/Anthropic)
- Implement 7 AI agents per docs/specs/11_AI_OPERATING_MODEL.md:
  - /supabase/functions/ai-diagnose/index.ts (Diagnosis Agent)
  - /supabase/functions/ai-estimate-price/index.ts (Pricing Agent)
  - /supabase/functions/ai-matching/index.ts (Matching Agent)
  - /supabase/functions/ai-quality/index.ts (Quality Agent)
  - /supabase/functions/ai-dispute/index.ts (Dispute Agent)
  - /supabase/functions/ai-coach/index.ts (Worker Coach Agent)
  - /supabase/functions/ai-fraud-check/index.ts (Fraud Risk Agent)
- Connect agents to Edge Functions: auto-diagnosis on service request, pricing, matching
- Log all AI inputs/outputs to ai_logs table per docs/specs/13_RISKS_LEGAL_COMPLIANCE.md
- Meet AI KPIs in docs/specs/14_OKR_KPI.md (80% category accuracy, 60% price accuracy)
- Test: `supabase functions serve` + `npm test /supabase/functions` (100% pass required)

## Step 5: Mobile Foundation (Expo/React Native)
- Initialize Expo + TypeScript per 15_CODEX: `npx create-expo-app@latest --template blank-typescript`
- Create files:
  - /mobile/app/(customer)/_layout.tsx, index.tsx, service-request.tsx, orders.tsx
  - /mobile/app/(worker)/_layout.tsx, index.tsx, jobs.tsx, profile.tsx
  - /mobile/app/(admin)/_layout.tsx, index.tsx, dashboard.tsx
- Set up Expo Router with role-based stacks per 15_CODEX
- Integrate TanStack Query (Supabase JS client), Zustand (state), Zod (validation)
- Integrate Expo SecureStore (auth tokens), Expo Image Picker (media upload)
- Integrate Expo Location (worker matching), Expo Notifications (push notifications)
- Configure environment: EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY
- Test: `npx expo start -- npm test /mobile` (foundation tests pass)

## Step 6: Mobile & Web Flows
- Implement customer flow per docs/specs/05_PRODUCT_SOLUTION.md:
  - /mobile/app/(customer)/service-request.tsx (description, media upload, AI diagnosis display)
  - /mobile/app/(customer)/orders/[id].tsx (order tracking, review)
- Implement worker flow per docs/specs/05_PRODUCT_SOLUTION.md:
  - /mobile/app/(worker)/jobs/[id].tsx (accept, status update, before/after photos)
  - /mobile/app/(worker)/earnings.tsx (earnings tracking, trust score)
- Implement admin web dashboard per VERCEL_SPEC.md:
  - /web/app/admin/login/page.tsx, dashboard/page.tsx
  - /web/app/admin/users/page.tsx, workers/page.tsx, orders/page.tsx
  - /web/app/admin/complaints/page.tsx, warranties/page.tsx, audit-logs/page.tsx
- Implement public landing page per VERCEL_SPEC.md:
  - /web/app/page.tsx (Hero, How it works, AI diagnosis, Pricing, Trust, FAQ, CTA)
  - /web/app/for-workers/page.tsx, for-business/page.tsx
- Match docs/specs/05_PRODUCT_SOLUTION.md flows exactly
- 100% mobile + web test pass required before next step

## Step 7: Trust & Quality
- Implement dynamic trust scores per docs/specs/12_OPERATIONS_AND_TRUST.md:
  - /supabase/migrations/002_trust_scores.sql (trust score functions)
  - /mobile/app/(worker)/trust.tsx (display trust score)
- Add mandatory before/after photo uploads to Supabase Storage per docs/specs/12_OPERATIONS_AND_TRUST.md
- Build quality checklists: /supabase/functions/quality-check/index.ts
- Build in-app warranty/complaint flows:
  - /mobile/app/(customer)/warranty.tsx, /mobile/app/(customer)/complaint.tsx
  - /web/app/admin/complaints/page.tsx, warranties/page.tsx
- Implement RLS policies for protected data per docs/specs/22_SECURITY_PLAN.md
- Test all trust/quality features (100% pass required)

## Step 8: Testing & Validation
- Run unit tests: `npm test /mobile`, `npm test /web`
- Run Supabase tests: `supabase db test`
- Run integration tests: `npm test /tests/integration`
- Run E2E tests: `npm test /tests/e2e`
- Validate against docs/specs/14_OKR_KPI.md OKRs:
  - 500 registered users, 100 service requests, 30 completed orders
  - 50 registered workers, 20 verified, 10 active weekly
  - 80% category accuracy, 60% price accuracy
- Confirm no mock data in production flows per 15_CODEX
- Confirm no AI secrets in mobile or web frontend per 15_CODEX
- Confirm service-role keys only server-side per SUPABASE_SPEC.md
- 100% test pass required before next step

## Step 9: Deployment
- Deploy Supabase: `supabase db push && supabase functions deploy`
- Deploy web to Vercel: `vercel --prod`
- Build iOS: `eas build --platform ios`, submit to App Store
- Build Android: `eas build --platform android`, submit to Google Play
- Verify all deployments are live:
  - Supabase project live: check Supabase dashboard
  - Web live: https://vifixa.com, admin.vifixa.com
  - Mobile apps downloadable from stores
- Monitor Vercel analytics, Supabase logs, app store reviews

## Step 10: Final Verification
- Confirm all AI KPIs met per docs/specs/14_OKR_KPI.md:
  - Diagnosis category accuracy >= 80%
  - Price estimate accuracy >= 60%
  - Matching success rate >= 50%
  - First-time fix rate tracked
- Audit 100% Source of Truth requirement completion:
  - All 22+ docs requirements implemented
  - All files created per steps 2-7 (Supabase, Mobile, Web)
  - All tests pass per step 8
- Verify Supabase + Vercel + Expo stacks fully operational
- Generate completion report: /docs/archive/COMPLETION_REPORT.md
- Notify Giám đốc (you) via email/log

## Opencode CLI Startup Config
Add to root `AGENTS.md` (auto-read by opencode on startup):
```
# Vifixa AI Opencode Directive
Follow strict sequential process in /agent.md
Source of truth: docs/specs/15_CODEX_BUSINESS_CONTEXT.md
All AI calls via Supabase Edge Functions only
No secrets in mobile or web frontend
No mock data in production
Stack: Supabase + Vercel + Expo
```

## References
- docs/specs/15_CODEX_BUSINESS_CONTEXT.md
- docs/specs/11_AI_OPERATING_MODEL.md
- docs/specs/05_PRODUCT_SOLUTION.md
- docs/specs/12_OPERATIONS_AND_TRUST.md
- docs/specs/14_OKR_KPI.md
- docs/specs/13_RISKS_LEGAL_COMPLIANCE.md
- docs/specs/18_FINANCIAL_PLAN.md
- docs/specs/19_TECHNICAL_ARCHITECTURE.md
- docs/specs/20_DATABASE_SCHEMA.md
- docs/specs/21_API_SPECIFICATION.md
- docs/specs/22_SECURITY_PLAN.md
- SUPABASE_SPEC.md
- VERCEL_SPEC.md
- MASTER_SPEC.md
