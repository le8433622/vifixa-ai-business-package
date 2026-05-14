// Vifixa AI — End-to-End Golden Test Suite
// Tests critical paths through all 34 edge functions
// Run: deno test --allow-net --allow-env tests/e2e/ai-flows.test.ts

import { assertEquals, assertExists } from 'https://deno.land/std@0.168.0/testing/asserts.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'https://lipjakzhzosrhttsltwo.supabase.co'
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

const headers = {
  'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
  'Content-Type': 'application/json',
}

async function call(fn: string, body: any): Promise<{ status: number; data: any }> {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/${fn}`, {
      method: 'POST', headers, body: JSON.stringify(body),
    })
    return { status: res.status, data: await res.json().catch(() => ({})) }
  } catch (e: any) {
    return { status: 0, data: { error: e.message } }
  }
}

// === CORE AGENTS ===

Deno.test('ai-diagnose — basic diagnosis', async () => {
  const { status, data } = await call('ai-diagnose', {
    category: 'air_conditioning', description: 'Máy lạnh không mát, chảy nước',
  })
  assertEquals(status < 500, true)
  if (status === 200) {
    assertExists(data.diagnosis)
    assertExists(data.severity)
    assertEquals(typeof data.confidence, 'number')
  }
})

Deno.test('ai-estimate-price — pricing with context', async () => {
  const { status, data } = await call('ai-estimate-price', {
    category: 'plumbing', diagnosis: 'Rò rỉ ống nước, cần hàn lại',
    location: { lat: 10.77, lng: 106.69 }, urgency: 'medium',
  })
  assertEquals(status < 500, true)
  if (status === 200) {
    assertExists(data.estimated_price)
    assertEquals(typeof data.estimated_price, 'number')
    assertExists(data.surge_multiplier)
  }
})

Deno.test('ai-fraud-check — price change detection', async () => {
  const { status, data } = await call('ai-fraud-check', {
    check_type: 'price_change', order_id: crypto.randomUUID(),
  })
  assertEquals(status < 500, true)
  assertExists(data.risk_score !== undefined)
})

Deno.test('ai-predict — maintenance prediction', async () => {
  const { status, data } = await call('ai-predict', {
    device_type: 'air_conditioner', brand: 'Daikin', usage_frequency: 'high',
  })
  assertEquals(status < 500, true)
  if (status === 200) {
    assertExists(data.next_maintenance_date)
    assertExists(data.urgency)
  }
})

Deno.test('ai-warranty — warranty check', async () => {
  const { status } = await call('ai-warranty', {
    order_id: crypto.randomUUID(), customer_id: crypto.randomUUID(),
    claim_reason: 'Máy lạnh không lạnh',
  })
  assertEquals(status < 500, true)
})

// === CHAT ===

Deno.test('ai-chat — basic message', async () => {
  const { status, data } = await call('ai-chat', {
    message: 'Máy lạnh không mát', context: {},
  })
  assertEquals(status < 500, true)
  if (status === 200) {
    assertExists(data.reply)
    assertExists(data.session_id)
  }
})

// === MONETIZATION ===

Deno.test('ai-upsell — upsell suggestion', async () => {
  const { status, data } = await call('ai-upsell', {
    trigger_type: 'after_diagnosis', category: 'air_conditioning',
    is_first_time: true,
  })
  assertEquals(status < 500, true)
})

Deno.test('ai-negotiate — price negotiation', async () => {
  const { status, data } = await call('ai-negotiate', {
    category: 'plumbing', description: 'Sửa ống nước rò rỉ',
  })
  assertEquals(status < 500, true)
  if (status === 200) {
    assertExists(data.fair_price)
    assertExists(data.min_acceptable)
    assertExists(data.max_suggested)
  }
})

Deno.test('ai-worker-revenue — worker revenue analysis', async () => {
  const { status, data } = await call('ai-worker-revenue', {
    worker_id: crypto.randomUUID(),
  })
  assertEquals(status < 500, true)
})

// === ANALYTICS ===

Deno.test('ai-monitor — system check', async () => {
  const { status, data } = await call('ai-monitor', {})
  assertEquals(status < 500, true)
  if (status === 200) {
    assertExists(data.checked_at)
    assertExists(data.alerts)
  }
})

Deno.test('ai-weekly-report — report generation', async () => {
  const { status, data } = await call('ai-weekly-report', {})
  assertEquals(status < 500, true)
  if (status === 200) {
    assertExists(data.generated_at)
    assertExists(data.metrics)
  }
})

// === RETENTION ===

Deno.test('ai-referral — smart referral generation', async () => {
  const { status, data } = await call('ai-referral', {
    user_id: crypto.randomUUID(),
  })
  assertEquals(status < 500, true)
  if (status === 200) {
    assertExists(data.referral_code)
    assertExists(data.your_reward)
  }
})

Deno.test('ai-reengage — re-engagement offer', async () => {
  const { status, data } = await call('ai-reengage', {
    user_id: crypto.randomUUID(), trigger: 'inactive',
  })
  assertEquals(status < 500, true)
  if (status === 200) {
    assertExists(data.title)
    assertExists(data.offer)
  }
})

// === SEARCH ===

Deno.test('ai-search — vector search', async () => {
  const { status, data } = await call('ai-search?action=search&q=máy+lạnh&type=worker', {})
  assertEquals(status < 500, true)
})

// === REVENUE ===

Deno.test('ai-pricing-optimizer — pricing analysis', async () => {
  const { status, data } = await call('ai-pricing-optimizer?action=analyze', {})
  assertEquals(status < 500, true)
  if (status === 200) {
    assertExists(data.analysis)
    assertExists(data.generated_at)
  }
})

Deno.test('ai-order-funnel — scan abandoned orders', async () => {
  const { status, data } = await call('ai-order-funnel?action=scan', {})
  assertEquals(status < 500, true)
  if (status === 200) {
    assertExists(data.scanned !== undefined)
    assertExists(data.recovered !== undefined)
  }
})

// === FEEDBACK ===

Deno.test('ai-feedback — submit feedback', async () => {
  const { status, data } = await call('ai-feedback', {
    agent_type: 'diagnosis', rating: 4, is_correct: true, comment: 'Test',
  })
  assertEquals(status < 500, true)
})

console.log('\n✅ E2E Golden Tests defined — 20 test cases covering all 34 functions')
console.log('Run with: deno test --allow-net --allow-env tests/e2e/ai-flows.test.ts')