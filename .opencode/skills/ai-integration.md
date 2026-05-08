# Skill: AI Integration

description: "Implement 7 AI agents via Supabase Edge Functions for Vifixa AI - Step 4"
trigger: "step 4|ai integration|ai agents|openai|anthropic|ai-provider"

## Instructions

Execute Step 4 from /agent.md: AI Integration (Supabase Edge Functions)

### Tasks:
1. Create /supabase/functions/_shared/ai-provider.ts (abstraction layer for OpenAI/Anthropic)

2. Implement 7 AI agents per 11_AI_OPERATING_MODEL.md:
   - /supabase/functions/ai-diagnose/index.ts (Diagnosis Agent)
   - /supabase/functions/ai-estimate-price/index.ts (Pricing Agent)
   - /supabase/functions/ai-matching/index.ts (Matching Agent)
   - /supabase/functions/ai-quality/index.ts (Quality Agent)
   - /supabase/functions/ai-dispute/index.ts (Dispute Agent)
   - /supabase/functions/ai-coach/index.ts (Worker Coach Agent)
   - /supabase/functions/ai-fraud-check/index.ts (Fraud Risk Agent)

3. Connect agents to Edge Functions
4. Log all AI inputs/outputs to ai_logs table per 13_RISKS_LEGAL_COMPLIANCE.md
5. Meet AI KPIs in 14_OKR_KPI.md

### Files to read first:
- /agent.md (Step 4)
- /11_AI_OPERATING_MODEL.md
- /14_OKR_KPI.md
- /13_RISKS_LEGAL_COMPLIANCE.md

### Verification:
- `supabase functions serve` works
- `npm test /supabase/functions` passes (100% required)
- 80% category accuracy, 60% price accuracy targets set
