#!/bin/bash
# 🧪 Vifixa AI — Full Test Runner
# Chạy tất cả test suites
# Usage: bash scripts/run-all-tests.sh

set -e

GREEN='\033[32m'
RED='\033[31m'
BLUE='\033[34m'
NC='\033[0m'
PASS=0
FAIL=0

pass() { echo -e "${GREEN}✅ $1${NC}"; PASS=$((PASS+1)); }
fail() { echo -e "${RED}❌ $1${NC}"; FAIL=$((FAIL+1)); }
header() { echo -e "\n${BLUE}═══ $1 ═══${NC}"; }

header "1. DENO TYPE-CHECK — SHARED MODULES"
for fn in supabase/functions/_shared/ai-core.ts supabase/functions/_shared/ai-audit.ts supabase/functions/_shared/ai-rag.ts; do
  deno check "$fn" 2>/dev/null && pass "$fn" || fail "$fn"
done

header "2. DENO TYPE-CHECK — AI FUNCTIONS"
for fn in supabase/functions/ai-*/index.ts; do
  deno check "$fn" 2>/dev/null && pass "$fn" || fail "$fn"
done

header "3. DENO TYPE-CHECK — OSM FUNCTIONS"
for fn in supabase/functions/osm-*/index.ts; do
  deno check "$fn" 2>/dev/null && pass "$fn" || fail "$fn"
done

header "4. GOLDEN TESTS — ai-chat"
(cd supabase/functions/ai-chat && deno test --allow-read test.ts 2>/dev/null) && pass "ai-chat golden tests" || fail "ai-chat golden tests"

header "5. WEB LINT"
(cd web && npx eslint "src/app/admin/ai/" --no-cache 2>/dev/null) && pass "Web admin AI pages lint" || fail "Web admin AI pages lint"

header "6. API CONTRACT TESTS"
echo "  → Run: deno test --allow-net --allow-env tests/api/contracts.test.ts"

header "7. E2E TESTS"
echo "  → Run: npx playwright test tests/e2e/critical-flows.spec.ts --config=web/playwright.config.ts"

header "8. LOAD TESTS"
echo "  → Run: k6 run tests/load/scenario-100-users.js"

echo ""
echo "═══════════════════════════════════════"
echo -e "  ${GREEN}$PASS passed${NC}  ${RED}$FAIL failed${NC}"
echo "═══════════════════════════════════════"
echo ""
echo "To run API tests:  deno test --allow-net --allow-env tests/api/contracts.test.ts"
echo "To run E2E tests:  npx playwright test tests/e2e/"
echo "To run load tests: k6 run tests/load/scenario-100-users.js"