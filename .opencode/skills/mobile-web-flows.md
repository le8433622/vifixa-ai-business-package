# Skill: Mobile & Web Flows

description: "Implement customer, worker, and admin flows for mobile and web - Step 6"
trigger: "step 6|mobile flows|web flows|customer flow|worker flow|admin dashboard"

## Instructions

Execute Step 6 from /agent.md: Mobile & Web Flows

### Tasks:

1. **Customer Flow** (per 05_PRODUCT_SOLUTION.md):
   - /mobile/app/(customer)/service-request.tsx (description, media upload, AI diagnosis)
   - /mobile/app/(customer)/orders/[id].tsx (order tracking, review)

2. **Worker Flow** (per 05_PRODUCT_SOLUTION.md):
   - /mobile/app/(worker)/jobs/[id].tsx (accept, status update, before/after photos)
   - /mobile/app/(worker)/earnings.tsx (earnings tracking, trust score)

3. **Admin Web Dashboard** (per VERCEL_SPEC.md):
   - /web/app/admin/login/page.tsx
   - /web/app/admin/dashboard/page.tsx
   - /web/app/admin/users/page.tsx
   - /web/app/admin/workers/page.tsx
   - /web/app/admin/orders/page.tsx
   - /web/app/admin/complaints/page.tsx
   - /web/app/admin/warranties/page.tsx
   - /web/app/admin/audit-logs/page.tsx

4. **Public Landing Page** (per VERCEL_SPEC.md):
   - /web/app/page.tsx (Hero, How it works, AI diagnosis, Pricing, Trust, FAQ, CTA)
   - /web/app/for-workers/page.tsx
   - /web/app/for-business/page.tsx

### Files to read first:
- /agent.md (Step 6)
- /05_PRODUCT_SOLUTION.md
- /VERCEL_SPEC.md

### Verification:
- 100% mobile + web test pass required
- All flows match 05_PRODUCT_SOLUTION.md exactly
