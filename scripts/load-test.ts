// Load test — surge pricing endpoint (most DB-intensive)
// Usage: deno run -A supabase/functions/_shared/load-test.js
// or: node supabase/functions/_shared/load-test.js

const TARGET_URL = Deno.env.get('LOAD_TEST_URL') || 'http://localhost:54321/functions/v1/pricing-surge'
const CONCURRENCY = parseInt(Deno.args[0] || '20')
const TOTAL_REQUESTS = parseInt(Deno.args[1] || '100')
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || ''

const SERVICE_TYPES = ['repair', 'cleaning', 'delivery', 'moving', 'massage', 'tutoring', 'pet_care', 'elder_care', 'child_care']
const LOCATIONS = [
  { lat: 10.8231, lng: 106.6297 }, // HCMC center
  { lat: 10.7623, lng: 106.6825 }, // District 1
  { lat: 10.8012, lng: 106.6346 }, // District 3
  { lat: 10.7591, lng: 106.6560 }, // District 4
  { lat: 10.7697, lng: 106.6728 }, // District 5
  { lat: 10.7477, lng: 106.6421 }, // District 7
  { lat: 10.8561, lng: 106.6237 }, // Tan Binh
  { lat: 10.8764, lng: 106.8023 }, // Thu Duc
]

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

async function sendRequest(): Promise<{ ok: boolean; ms: number }> {
  const body = {
    service_type: randomItem(SERVICE_TYPES),
    lat: randomItem(LOCATIONS).lat,
    lng: randomItem(LOCATIONS).lng,
    base_price: Math.floor(Math.random() * 500000) + 50000,
    currency: randomItem(['VND', 'USD', 'THB']),
  }

  const start = performance.now()
  try {
    const res = await fetch(TARGET_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`,
      },
      body: JSON.stringify(body),
    })
    const ms = performance.now() - start
    return { ok: res.ok, ms }
  } catch {
    return { ok: false, ms: performance.now() - start }
  }
}

async function runBatch(count: number): Promise<{ ok: number; fail: number; times: number[] }> {
  const tasks: Promise<{ ok: boolean; ms: number }>[] = []
  for (let i = 0; i < count; i++) {
    tasks.push(sendRequest())
  }
  const results = await Promise.all(tasks)
  const ok = results.filter(r => r.ok).length
  const fail = count - ok
  const times = results.map(r => r.ms)
  return { ok, fail, times }
}

async function main() {
  console.log(`\n🚀 Load test: ${TARGET_URL}`)
  console.log(`   Concurrency: ${CONCURRENCY}, Total requests: ${TOTAL_REQUESTS}\n`)

  const batches = Math.ceil(TOTAL_REQUESTS / CONCURRENCY)
  let totalOk = 0, totalFail = 0
  const allTimes: number[] = []

  for (let b = 0; b < batches; b++) {
    const count = Math.min(CONCURRENCY, TOTAL_REQUESTS - b * CONCURRENCY)
    const result = await runBatch(count)
    totalOk += result.ok
    totalFail += result.fail
    allTimes.push(...result.times)

    const avg = result.times.reduce((a, b) => a + b, 0) / result.times.length
    const max = Math.max(...result.times)
    const p95 = result.times.sort((a, b) => a - b)[Math.floor(result.times.length * 0.95)]
    console.log(`   Batch ${b + 1}/${batches}: ${result.ok} OK, ${result.fail} FAIL | avg=${avg.toFixed(0)}ms p95=${p95.toFixed(0)}ms max=${max.toFixed(0)}ms`)
  }

  console.log(`\n📊 RESULTS`)
  console.log(`   Total:   ${TOTAL_REQUESTS}`)
  console.log(`   OK:      ${totalOk}`)
  console.log(`   Fail:    ${totalFail}`)
  console.log(`   Rate:    ${(totalOk / TOTAL_REQUESTS * 100).toFixed(1)}%`)

  if (allTimes.length > 0) {
    allTimes.sort((a, b) => a - b)
    const avg = allTimes.reduce((a, b) => a + b, 0) / allTimes.length
    const median = allTimes[Math.floor(allTimes.length / 2)]
    const p95 = allTimes[Math.floor(allTimes.length * 0.95)]
    const p99 = allTimes[Math.floor(allTimes.length * 0.99)]
    const max = allTimes[allTimes.length - 1]
    console.log(`   Avg:     ${avg.toFixed(0)}ms`)
    console.log(`   Median:  ${median.toFixed(0)}ms`)
    console.log(`   P95:     ${p95.toFixed(0)}ms`)
    console.log(`   P99:     ${p99.toFixed(0)}ms`)
    console.log(`   Max:     ${max.toFixed(0)}ms`)
  }

  console.log('')
}

main()
