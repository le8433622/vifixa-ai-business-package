# Skill: Supabase Backend Foundation

description: "Implement Supabase backend (database, auth, storage, edge functions) for Vifixa AI - Step 2"
trigger: "step 2|backend|supabase|database schema|edge functions"

## Instructions

Execute Step 2 from /agent.md: Backend Foundation (Supabase Stack)

### Tasks:
1. Initialize Supabase: `supabase init` (if not done)
2. Create /supabase/config.toml with auth, storage buckets, edge functions config
3. Define Postgres schema per 20_DATABASE_SCHEMA.md adapted for Supabase
4. Create tables: profiles, workers, orders, ai_logs, trust_scores
5. Implement Row Level Security (RLS) policies per 22_SECURITY_PLAN.md
6. Create /supabase/migrations/001_init.sql
7. Create Edge Functions:
   - /supabase/functions/ai-diagnose/index.ts
   - /supabase/functions/ai-estimate-price/index.ts
   - /supabase/functions/ai-fraud-check/index.ts
8. Create /supabase/seed.sql with test data
9. Test: `supabase db reset && supabase functions serve`

### Files to read first:
- /agent.md (Step 2)
- /20_DATABASE_SCHEMA.md
- /22_SECURITY_PLAN.md
- /SUPABASE_SPEC.md

### Verification:
- All migrations run successfully
- RLS policies protect data correctly
- Edge functions serve without errors
