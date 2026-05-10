# Agent Execution Steps

## Purpose
Sequential build process for Vifixa AI. Complete 100% of each step before moving to next. No skipping, no reordering.

## Source of Truth
- `docs/BUSINESS.md` — Business context, market, model, OKRs
- `docs/ARCHITECTURE.md` — Stack, DB schema, Edge Functions, security
- `docs/AI.md` — AI agents, chat system, KPIs
- `supabase/migrations/` — Actual database schema (37 migrations)
- `supabase/functions/` — All Edge Functions (35 total)

## Mandatory Rules
- Execute steps in strict order: 1 → 2 → ... → 10
- All AI calls via Supabase Edge Functions only
- No secrets in mobile or web frontend
- No mock data in production flows
- Service-role keys server-side only
- Run lint + typecheck after every change

## Step 1: Project Initialization
- Read all source of truth docs
- Verify tools: Supabase CLI, Node.js v20+, Deno, Vercel CLI
- Verify .gitignore, AGENTS.md, agent.md exist

## Step 2: Database & Edge Functions
- Review existing migrations in `supabase/migrations/`
- Review existing functions in `supabase/functions/`
- Create new migration for any schema changes
- Deploy: `supabase db push && supabase functions deploy`
- Test: `supabase functions serve`

## Step 3: Web Admin (Next.js)
- Pages in `web/src/app/admin/`
- Components in `web/src/components/`
- Run: `npm run lint` + `npm run typecheck` before PR
- Deploy: Vercel auto-deploy on push to `main`

## Step 4: Mobile (Expo)
- Stacks: customer, worker, admin in `mobile/app/`
- Run: `npx expo start`
- Build: `eas build --platform ios|android`

## Step 5: AI Integration
- Edge Functions use `_shared/ai-provider.ts` abstraction
- Log all AI in/out to `ai_logs` table
- Meet KPIs: 80% diagnosis, 60% price accuracy

## Step 6: Trust & Quality
- Before/after photo uploads mandatory
- Trust scores dynamic per behavior
- Quality checklists per service category

## Step 7: Testing
- Unit: `npm test /web`
- Integration: `npm test /tests/integration`
- E2E: `npm test /tests/e2e`
- Supabase: `supabase db test`

## Step 8: Deployment
- Supabase: `supabase db push && supabase functions deploy`
- Web: Vercel auto-deploy
- Mobile: EAS Build

## Step 9: Final Verification
- All AI KPIs met
- All tests pass
- No mock data in production
- No secrets in frontend
