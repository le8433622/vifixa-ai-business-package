# Skill: Testing & Validation

description: "Run comprehensive tests and validate against KPIs - Step 8"
trigger: "step 8|testing|validation|unit tests|integration tests|e2e tests|okr|kpi"

## Instructions

Execute Step 8 from /agent.md: Testing & Validation

### Tasks:

1. **Run All Tests**:
   - `npm test /mobile` (unit tests)
   - `npm test /web` (unit tests)
   - `supabase db test` (database tests)
   - `npm test /tests/integration` (integration tests)
   - `npm test /tests/e2e` (end-to-end tests)

2. **Validate Against OKRs** (per 14_OKR_KPI.md):
   - 500 registered users
   - 100 service requests
   - 30 completed orders
   - 50 registered workers, 20 verified, 10 active weekly
   - 80% category accuracy
   - 60% price accuracy

3. **Security Validation** (per 15_CODEX):
   - ✓ No mock data in production flows
   - ✓ No AI secrets in mobile or web frontend
   - ✓ Service-role keys only server-side (SUPABASE_SPEC.md)

4. **Generate Test Reports**:
   - Update /TEST_REPORT.md
   - Update /ACTUAL_PROGRESS_REPORT.md

### Files to read first:
- /agent.md (Step 8)
- /14_OKR_KPI.md
- /TEST_REPORT.md
- /e2e-test-plan.md

### Verification:
- 100% test pass required before next step
- All OKRs validated
- Security requirements confirmed
