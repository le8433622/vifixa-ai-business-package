#!/bin/bash
# Vifixa AI — Run All Tests
# Usage: ./scripts/test-all.sh

set -e
echo ""
echo "═══════════════════════════════════════════════════"
echo "  VIFIXA AI — RUNNING ALL TESTS"
echo "═══════════════════════════════════════════════════"
echo ""

# Shared module tests
echo "[Step 1/4] Testing shared modules..."
deno test --no-check --allow-read --allow-env \
  supabase/functions/_shared/personality.test.ts \
  supabase/functions/_shared/service-registry.test.ts \
  supabase/functions/_shared/reasoning-engine.test.ts \
  supabase/functions/_shared/learning-engine.test.ts \
  supabase/functions/_shared/personalization-engine.test.ts \
  supabase/functions/_shared/web-search.test.ts 2>&1 | grep -E "(ok|FAILED|passed|failed|VIFIXA_TEST)"

# Run web tests
echo ""
echo "[Step 2/4] Testing web components..."
cd web && npx vitest run --reporter=verbose 2>&1 | tail -5
cd ..

echo ""
echo "═══════════════════════════════════════════════════"
echo "  ALL TESTS COMPLETE"
echo "═══════════════════════════════════════════════════"
echo ""
