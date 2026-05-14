#!/bin/bash
# 🧪 Production Test Run — Kiểm tra toàn bộ hệ thống Vifixa AI
# Chạy: bash scripts/test-production.sh
# Yêu cầu: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY trong environment

set -e

SUPABASE_URL="${SUPABASE_URL:-https://lipjakzhzosrhttsltwo.supabase.co}"
AUTH="Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
CT="Content-Type: application/json"
PASS=0
FAIL=0

green() { echo -e "\033[32m✅ $1\033[0m"; }
red() { echo -e "\033[31m❌ $1\033[0m"; }
blue() { echo -e "\033[34m🔵 $1\033[0m"; }

call() {
  local fn=$1 body=$2 expected=$3
  local res=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$SUPABASE_URL/functions/v1/$fn" -H "$AUTH" -H "$CT" -d "$body" 2>/dev/null)
  if [ "$res" = "$expected" ]; then
    green "$fn → $res (expected $expected)"
    PASS=$((PASS+1))
  else
    red "$fn → $res (expected $expected)"
    FAIL=$((FAIL+1))
  fi
}

blue "===== 1. CORE AI AGENTS ====="

call "ai-diagnose" '{"category":"air_conditioning","description":"Máy lạnh không mát, chảy nước"}' "200"
call "ai-estimate-price" '{"category":"plumbing","diagnosis":"Rò rỉ ống nước","location":{"lat":10.77,"lng":106.69},"urgency":"medium"}' "200"
call "ai-fraud-check" '{"check_type":"price_change","order_id":"00000000-0000-0000-0000-000000000001"}' "200"
call "ai-predict" '{"device_type":"air_conditioner","brand":"Daikin","usage_frequency":"high"}' "200"

blue "===== 2. CHAT ====="
call "ai-chat" '{"message":"Máy lạnh không mát","context":{}}' "200"

blue "===== 3. MONETIZATION ====="
call "ai-upsell" '{"trigger_type":"after_diagnosis","category":"air_conditioning","is_first_time":true}' "200"
call "ai-negotiate" '{"category":"plumbing","description":"Sửa ống nước rò rỉ"}' "200"

blue "===== 4. ANALYTICS ====="
call "ai-monitor" '{}' "200"

blue "===== 5. FEEDBACK ====="
call "ai-feedback" '{"agent_type":"diagnosis","rating":4,"is_correct":true,"comment":"Test production run"}' "200"

echo ""
blue "===== KẾT QUẢ ====="
echo "✅ Pass: $PASS"
echo "❌ Fail: $FAIL"
if [ $FAIL -eq 0 ]; then
  green "🎉 TẤT CẢ ĐỀU PASS!"
else
  red "⚠️ Có $FAIL lỗi cần kiểm tra."
fi