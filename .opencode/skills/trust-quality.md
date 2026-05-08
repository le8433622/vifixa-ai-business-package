# Skill: Trust & Quality

description: "Implement trust scores, quality checks, warranties, and complaints - Step 7"
trigger: "step 7|trust score|quality check|warranty|complaint|before/after photos"

## Instructions

Execute Step 7 from /agent.md: Trust & Quality

### Tasks:

1. **Dynamic Trust Scores** (per 12_OPERATIONS_AND_TRUST.md):
   - /supabase/migrations/002_trust_scores.sql (trust score functions)
   - /mobile/app/(worker)/trust.tsx (display trust score)

2. **Photo Upload Requirements**:
   - Mandatory before/after photo uploads to Supabase Storage
   - Configure storage buckets: service-media, worker-documents, order-evidence

3. **Quality Checklists**:
   - /supabase/functions/quality-check/index.ts

4. **Warranty/Complaint Flows**:
   - /mobile/app/(customer)/warranty.tsx
   - /mobile/app/(customer)/complaint.tsx
   - /web/app/admin/complaints/page.tsx
   - /web/app/admin/warranties/page.tsx

5. **RLS Policies**:
   - Implement per 22_SECURITY_PLAN.md for protected data

### Files to read first:
- /agent.md (Step 7)
- /12_OPERATIONS_AND_TRUST.md
- /22_SECURITY_PLAN.md

### Verification:
- All trust/quality features tested
- 100% test pass required
- Photos upload correctly to Supabase Storage
