// 🏋️ Vifixa AI — k6 Load Test
// Mô phỏng 100 concurrent users gọi AI endpoints
// Run: k6 run tests/load/scenario-100-users.js
// Install: brew install k6

import http from 'k6/http'
import { check, sleep, group } from 'k6'
import { Rate, Trend } from 'k6/metrics'

const BASE_URL = __ENV.SUPABASE_URL || 'https://lipjakzhzosrhttsltwo.supabase.co'
const TOKEN = __ENV.TEST_TOKEN || ''

const errorRate = new Rate('errors')
const latencyP95 = new Trend('latency_p95')
const latencyP99 = new Trend('latency_p99')

// Giả lập user IDs
const USER_IDS = Array.from({ length: 100 }, (_, i) => `user-${i.toString().padStart(3, '0')}`)

// Kịch bản test: user chat → diagnose → price → feedback
const SCENARIOS = [
  // 50% users: chat + diagnose
  { weight: 50, fn: 'ai-chat', body: { message: 'Máy lạnh không mát, chảy nước', context: {} } },
  { weight: 15, fn: 'ai-diagnose', body: { category: 'air_conditioning', description: 'Máy lạnh chảy nước, không mát' } },
  { weight: 10, fn: 'ai-estimate-price', body: { category: 'air_conditioning', diagnosis: 'Thiếu gas', location: { lat: 10.77, lng: 106.69 }, urgency: 'medium' } },
  { weight: 5, fn: 'ai-matching', body: { order_id: '00000000-0000-0000-0000-000000000001', skills_required: ['may lanh'], location: { lat: 10.77, lng: 106.69 }, urgency: 'medium' } },
  { weight: 5, fn: 'ai-fraud-check', body: { check_type: 'price_change', order_id: '00000000-0000-0000-0000-000000000001' } },
  { weight: 5, fn: 'ai-upsell', body: { trigger_type: 'after_diagnosis', category: 'air_conditioning', is_first_time: true } },
  { weight: 5, fn: 'ai-feedback', body: { agent_type: 'diagnosis', rating: 4, is_correct: true, comment: 'Test load' } },
  { weight: 5, fn: 'osm-route', body: { diemDi: { viDo: 10.77, kinhDo: 106.69 }, diemDen: { viDo: 10.82, kinhDo: 106.71 } } },
]

// Chọn ngẫu nhiên theo weight
function pickScenario() {
  const total = SCENARIOS.reduce((s, sc) => s + sc.weight, 0)
  let r = Math.random() * total
  for (const sc of SCENARIOS) {
    r -= sc.weight
    if (r <= 0) return sc
  }
  return SCENARIOS[0]
}

export const options = {
  stages: [
    { duration: '1m', target: 10 },    // Ramp up to 10 users
    { duration: '2m', target: 50 },    // Ramp to 50
    { duration: '2m', target: 100 },   // Ramp to 100
    { duration: '3m', target: 100 },   // Stay at 100
    { duration: '1m', target: 0 },     // Ramp down
  ],
  thresholds: {
    errors: ['rate<0.15'],              // <15% errors
    http_req_duration: ['p(95)<30000', 'avg<15000'], // p95 < 30s
    http_req_failed: ['rate<0.10'],     // <10% HTTP failures
  },
}

export default function () {
  const userId = USER_IDS[Math.floor(Math.random() * USER_IDS.length)]
  const scenario = pickScenario()

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${TOKEN}`,
  }

  group(`User ${userId.slice(-4)} — ${scenario.fn}`, () => {
    const url = `${BASE_URL}/functions/v1/${scenario.fn}`
    const res = http.post(url, JSON.stringify(scenario.body), { headers })
    const isError = res.status >= 400

    errorRate.add(isError)
    latencyP95.add(res.timings.duration)
    latencyP99.add(res.timings.duration)

    check(res, {
      [`${scenario.fn} status < 500`]: (r) => r.status < 500,
      [`${scenario.fn} latency < 30s`]: (r) => r.timings.duration < 30000,
    })

    sleep(Math.random() * 2 + 0.5) // 0.5-2.5s between requests
  })
}

export function handleSummary(data: any) {
  return {
    'stdout': JSON.stringify({
      summary: 'Vifixa AI Load Test Results',
      duration: `${data.state.testRunDurationMs / 1000}s`,
      total_requests: data.metrics.http_reqs?.values?.count || 0,
      avg_latency_ms: Math.round(data.metrics.http_req_duration?.values?.avg || 0),
      p95_latency_ms: Math.round(data.metrics.http_req_duration?.values?.['p(95)'] || 0),
      error_rate: `${((data.metrics.errors?.values?.rate || 0) * 100).toFixed(1)}%`,
      http_failures: `${((data.metrics.http_req_failed?.values?.rate || 0) * 100).toFixed(1)}%`,
    }, null, 2),
  }
}