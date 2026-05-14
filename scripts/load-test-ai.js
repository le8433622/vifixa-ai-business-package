// k6 Load Test — Vifixa AI Edge Functions
// Run: k6 run scripts/load-test-ai.js
// Install k6: brew install k6

import http from 'k6/http'
import { check, sleep, group } from 'k6'
import { Rate, Trend } from 'k6/metrics'

const BASE_URL = __ENV.SUPABASE_URL || 'https://lipjakzhzosrhttsltwo.supabase.co'
const TOKEN = __ENV.TEST_TOKEN || ''

const errorRate = new Rate('errors')
const latencyTrend = new Trend('latency_ms')

const AGENTS = [
  { name: 'ai-diagnose', body: { category: 'air_conditioning', description: 'Máy lạnh không mát, chảy nước' } },
  { name: 'ai-estimate-price', body: { category: 'air_conditioning', diagnosis: 'Thiếu gas, cần nạp gas', location: { lat: 10.77, lng: 106.69 }, urgency: 'medium' } },
  { name: 'ai-matching', body: { order_id: crypto.randomUUID(), skills_required: ['sửa máy lạnh'], location: { lat: 10.77, lng: 106.69 }, urgency: 'medium' } },
  { name: 'ai-quality', body: { order_id: crypto.randomUUID(), worker_id: crypto.randomUUID(), before_media: [], after_media: [] } },
  { name: 'ai-dispute', body: { order_id: crypto.randomUUID(), complainant_id: crypto.randomUUID(), complaint_type: 'quality', description: 'Chất lượng không tốt' } },
  { name: 'ai-coach', body: { worker_id: crypto.randomUUID() } },
  { name: 'ai-fraud-check', body: { transaction_id: crypto.randomUUID(), amount: 500000, user_id: crypto.randomUUID(), check_type: 'price_change', order_id: crypto.randomUUID() } },
  { name: 'ai-predict', body: { device_type: 'air_conditioner', brand: 'Daikin', usage_frequency: 'high' } },
  { name: 'ai-care-agent', body: { user_id: crypto.randomUUID(), devices: [], orders: [], total_spent: 0, device_count: 0, completed_orders: 0, repeat_rate: 0 } },
  { name: 'ai-warranty', body: { order_id: crypto.randomUUID(), customer_id: crypto.randomUUID(), claim_reason: 'Máy lạnh không lạnh sau 2 tuần' } },
  { name: 'ai-upsell', body: { trigger_type: 'after_diagnosis', category: 'air_conditioning', is_first_time: true } },
  { name: 'ai-feedback', body: { agent_type: 'diagnosis', rating: 4, is_correct: true, comment: 'Tốt' } },
  { name: 'smart-suggestions', get: true },
  { name: 'ai-report', get: true },
]

export const options = {
  stages: [
    { duration: '30s', target: 5 },
    { duration: '30s', target: 20 },
    { duration: '30s', target: 50 },
    { duration: '30s', target: 100 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    errors: ['rate<0.10'],
    latency_ms: ['p(95)<10000', 'avg<5000'],
    http_req_failed: ['rate<0.10'],
  },
}

export default function () {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${TOKEN}`,
  }

  group('AI Agent Load Test', () => {
    for (const agent of AGENTS) {
      const url = `${BASE_URL}/functions/v1/${agent.name}`
      const method = agent.get ? 'GET' : 'POST'

      const start = Date.now()
      const res = method === 'GET' ? http.get(url, { headers }) : http.post(url, JSON.stringify(agent.body), { headers })
      const latency = Date.now() - start

      latencyTrend.add(latency)
      errorRate.add(res.status >= 400)

      check(res, {
        [`${agent.name} status 200/400`]: (r) => r.status < 500,
        [`${agent.name} latency < 10s`]: () => latency < 10000,
      })

      sleep(0.1)
    }
  })
}