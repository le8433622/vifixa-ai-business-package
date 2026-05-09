#!/usr/bin/env bash
set -euo pipefail

# AI Function Integration Test Runner
# Tests all 8 AI functions with real JWT against production Supabase
# Usage: ./scripts/test-ai-functions.sh <email> <password>

if [ $# -lt 2 ]; then
  echo "Usage: $0 <email> <password>"
  echo "  Sign in at https://lipjakzhzosrhttsltwo.supabase.co first if needed"
  exit 1
fi

EMAIL="$1"
PASSWORD="$2"
SUPABASE_URL="${SUPABASE_URL:-https://lipjakzhzosrhttsltwo.supabase.co}"
ANON_KEY="${SUPABASE_ANON_KEY:-sb_publishable_8ZQN98zLEfCsvoAn2OR85g_gB9QjWEF}"

echo "=== Vifixa AI Function Test Suite ==="
echo ""

# Get JWT
JWT=$(curl -s -X POST "$SUPABASE_URL/auth/v1/token?grant_type=password" \
  -H "Content-Type: application/json" \
  -H "apikey: $ANON_KEY" \
  -d "{\"email\": \"$EMAIL\", \"password\": \"$PASSWORD\"}" | python3 -c "import sys, json; print(json.load(sys.stdin).get('access_token',''))")

if [ ${#JWT} -lt 100 ]; then
  echo "ERROR: Failed to get JWT. Check email/password."
  exit 1
fi
echo "JWT obtained (${#JWT} chars)"
echo ""

AUTH="Authorization: Bearer $JWT"
PASS=0
FAIL=0

test_endpoint() {
  local name="$1"
  local endpoint="$2"
  local payload="$3"
  local expected_field="$4"

  echo -n "  [$name] $endpoint ... "
  local response=$(curl -s -X POST "$SUPABASE_URL/functions/v1/$endpoint" \
    -H "Content-Type: application/json" \
    -H "$AUTH" \
    -d "$payload" --max-time 120)

  if echo "$response" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('$expected_field',''))" 2>/dev/null | head -1 | grep -q .; then
    echo "PASS"
    PASS=$((PASS + 1))
  else
    echo "FAIL: $response" | head -c 200
    echo ""
    FAIL=$((FAIL + 1))
  fi
}

echo "1. ai-diagnose"
test_endpoint "engine_no_start" "ai-diagnose" \
  '{"category":"engine","description":"Xe khong khoi dong duoc, co tieng keu tach tach"}' \
  "diagnosis"

echo "2. ai-estimate-price"
test_endpoint "engine_price" "ai-estimate-price" \
  '{"category":"engine","diagnosis":"Hỏng bộ khởi động","location":{"lat":10.7769,"lng":106.7009},"urgency":"medium"}' \
  "estimated_price"

echo "3. ai-matching"
test_endpoint "match_electrician" "ai-matching" \
  '{"order_id":"test-order-1","skills_required":["electrical"],"location":{"lat":10.7769,"lng":106.7009},"urgency":"medium"}' \
  "matched_worker_id"

echo "4. ai-quality"
test_endpoint "quality_check" "ai-quality" \
  '{"order_id":"test-order-1","worker_id":"test-worker","before_media":["img1.jpg"],"after_media":["img2.jpg"]}' \
  "quality_score"

echo "5. ai-dispute"
test_endpoint "dispute_quality" "ai-dispute" \
  '{"order_id":"test-order-1","complainant_id":"cust-1","complaint_type":"quality","description":"Sửa chữa không đạt yêu cầu","evidence_urls":["video.mp4"]}' \
  "summary"

echo "6. ai-coach"
test_endpoint "coach_worker" "ai-coach" \
  '{"worker_id":"test-worker","job_type":"engine repair","issue_description":"Cần cải thiện kỹ năng chẩn đoán điện"}' \
  "suggestions"

echo "7. ai-predict"
test_endpoint "washing_machine" "ai-predict" \
  '{"device_type":"Máy giặt","brand":"Samsung","model":"WA80M","purchase_date":"2021-01-15","usage_frequency":"high"}' \
  "next_maintenance_date"

echo "8. ai-chat"
test_endpoint "chat_start" "ai-chat" \
  '{"message":"Xe của tôi không khởi động được"}' \
  "reply"

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
exit $FAIL
