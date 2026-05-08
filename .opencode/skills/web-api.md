# Skill: Core Backend & Web APIs

description: "Implement web APIs and core backend flows for Vifixa AI - Step 3"
trigger: "step 3|web api|next.js api|customer flow|worker flow|admin flow"

## Instructions

Execute Step 3 from /agent.md: Core Backend & Web APIs

### Tasks:
1. Create Supabase Edge Functions per 21_API_SPECIFICATION.md:
   - /supabase/functions/auth-register/index.ts
   - /supabase/functions/auth-login/index.ts
   - /supabase/functions/customer-requests/index.ts
   - /supabase/functions/worker-jobs/index.ts
   - /supabase/functions/admin-dashboard/index.ts

2. Create Next.js API routes:
   - /web/app/api/ai/[...path]/route.ts (AI proxy to Edge Functions)
   - /web/app/api/webhooks/route.ts

3. Build customer flows via Supabase JS client
4. Build worker flows via Supabase JS client
5. Build admin flows via Supabase JS + Server-side

### Files to read first:
- /agent.md (Step 3)
- /21_API_SPECIFICATION.md
- /05_PRODUCT_SOLUTION.md
- /VERCEL_SPEC.md

### Verification:
- `npm test /supabase` passes
- `npm test /web` passes (100% required)
