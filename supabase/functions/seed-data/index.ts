// Vifixa AI — Seed Test Data
// Run: supabase functions serve seed-data --env-file .env.local
// Then: curl -X POST http://localhost:54321/functions/v1/seed-data -H "Authorization: Bearer <anon-key>"

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

const CORS = {
  headers: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  },
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

async function supabaseRpc(method: string, path: string, body?: unknown) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'apikey': SERVICE_KEY,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  return res.ok ? res.json().catch(() => null) : null
}

async function createAuthUser(email: string, password: string) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'apikey': SERVICE_KEY,
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    if ((err as { code?: number }).code === 422) return null
    return null
  }
  return res.json() as unknown as { id: string }
}

const FIRST_NAMES = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý']
const MIDDLE_NAMES = ['Văn', 'Thị', 'Đức', 'Minh', 'Quốc', 'Hữu', 'Công', 'Thanh', 'Ngọc', 'Anh']
const LAST_NAMES = ['Nam', 'Hùng', 'Dũng', 'Mạnh', 'Tuấn', 'Linh', 'Hương', 'Mai', 'Lan', 'Phương', 'Long', 'Thắng', 'Hiếu', 'Tâm', 'Sơn']

const CATEGORIES = ['electricity', 'plumbing', 'appliance', 'air_conditioning', 'camera', 'painting', 'lock_smith', 'carpentry', 'cleaning', 'hvac']
const DISTRICTS = ['Dist 1', 'Dist 2', 'Dist 3', 'Dist 4', 'Dist 5', 'Dist 6', 'Dist 7', 'Dist 8', 'Dist 9', 'Dist 10', 'Dist 11', 'Dist 12', 'Binh Thanh', 'Phu Nhuan', 'Go Vap', 'Tan Binh', 'Tan Phu', 'Thu Duc']
const STATUSES = ['pending', 'matched', 'in_progress', 'completed', 'cancelled']

function rand(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min }
function pick<T>(arr: T[]): T { return arr[rand(0, arr.length - 1)] }
function picks<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, n)
}
function randEmail(role: string, i: number) { return `${role}.test${i}@vifixa.test` }
function randName() { return `${pick(FIRST_NAMES)} ${pick(MIDDLE_NAMES)} ${pick(LAST_NAMES)}` }
function randPhone() { return `09${rand(10000000, 99999999)}` }
function randBirthYear() { return `${rand(1970, 2002)}-${String(rand(1, 12)).padStart(2, '0')}-${String(rand(1, 28)).padStart(2, '0')}T00:00:00Z` }

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', CORS)

  try {
    const started = Date.now()
    const logs: string[] = []
    function log(m: string) { logs.push(m); console.log(m) }

    log('=== SEEDING 1000 TEST USERS ===')

    // 1. CREATE AUTH USERS + PROFILES
    const created: Array<{ id: string; email: string; role: string; name: string }> = []
    const PASSWORD = 'Test123!@#'

    for (let i = 1; i <= 1000; i++) {
      const role = i <= 400 ? 'customer' : i <= 800 ? 'worker' : 'admin'
      const email = randEmail(role, i)
      let authUser = await createAuthUser(email, PASSWORD)
      if (!authUser) {
        // try to find existing
        const existing = await supabaseRpc('GET', `profiles?email=eq.${email}&select=id`)
        if (existing && existing.length > 0) {
          authUser = { id: existing[0].id }
          log(`  [${i}/1000] Using existing: ${email}`)
        } else {
          log(`  [${i}/1000] SKIP ${email} (create failed)`)
          continue
        }
      }

      const name = role === 'admin' ? `Admin ${i}` : randName()
      await supabaseRpc('PATCH', `profiles?id=eq.${authUser.id}`, {
        email,
        phone: randPhone(),
        role,
        full_name: name,
      }) || await supabaseRpc('POST', 'profiles', {
        id: authUser.id,
        email,
        phone: randPhone(),
        role,
        full_name: name,
      })

      if (role === 'worker') {
        await supabaseRpc('POST', 'workers', {
          user_id: authUser.id,
          skills: JSON.stringify(picks(CATEGORIES, rand(2, 5))),
          service_areas: JSON.stringify(picks(DISTRICTS, rand(2, 6))),
          trust_score: rand(30, 100),
          is_verified: Math.random() > 0.3,
          avg_earnings: rand(500000, 5000000),
        })
      }

      created.push({ id: authUser.id, email, role, name })

      if (i % 100 === 0) log(`  [${i}/1000] Created ${role}`)
    }

    log(`Created ${created.length} users (${created.filter(c => c.role === 'customer').length} customer, ${created.filter(c => c.role === 'worker').length} worker, ${created.filter(c => c.role === 'admin').length} admin)`)

    // 2. CREATE ORDERS
    const customers = created.filter(c => c.role === 'customer')
    const workers = created.filter(c => c.role === 'worker')
    const orderIds: string[] = []

    log('\n=== CREATING 1000 ORDERS ===')
    for (let i = 0; i < 1000; i++) {
      const customer = pick(customers)
      const worker = Math.random() > 0.2 ? pick(workers) : null
      const status = worker ? pick(STATUSES.filter(s => s !== 'pending')) : 'pending'
      const estimated = rand(200000, 5000000)
      const final = status === 'completed' ? estimated + rand(-50000, 500000) : null

      // create using direct insert
      const orderRes = await fetch(`${SUPABASE_URL}/rest/v1/orders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'Content-Type': 'application/json',
          'apikey': SERVICE_KEY,
          'Prefer': 'return=representation',
        },
        body: JSON.stringify({
          customer_id: customer.id,
          worker_id: worker?.id || null,
          category: pick(CATEGORIES),
          description: `Sửa chữa ${pick(['hỏng', 'gãy', 'rò rỉ', 'chập điện', 'không hoạt động', 'cần thay mới'])} ${pick(['vòi nước', 'đèn', 'ổ điện', 'máy lạnh', 'tủ lạnh', 'máy giặt', 'camera', 'tường', 'cửa', 'bồn cầu'])}`,
          estimated_price: estimated,
          final_price: final,
          status,
          rating: status === 'completed' && Math.random() > 0.2 ? rand(3, 5) : null,
          created_at: new Date(Date.now() - rand(0, 30) * 86400000).toISOString(),
        }),
      })
      if (orderRes.ok) {
        const data = await orderRes.json()
        if (Array.isArray(data) && data.length > 0) orderIds.push(data[0].id)
      }

      if ((i + 1) % 200 === 0) log(`  [${i + 1}/1000] orders created`)
    }
    log(`Created ${orderIds.length} orders`)

    // 3. CREATE CHAT SESSIONS + MESSAGES
    log('\n=== CREATING CHAT SESSIONS & MESSAGES ===')
    let msgCount = 0
    for (let i = 0; i < 300; i++) {
      const customer = pick(customers)
      const sessionRes = await fetch(`${SUPABASE_URL}/rest/v1/chat_sessions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'Content-Type': 'application/json',
          'apikey': SERVICE_KEY,
          'Prefer': 'return=representation',
        },
        body: JSON.stringify({
          user_id: customer.id,
          session_type: pick(['support', 'diagnosis', 'booking']),
          status: pick(['active', 'completed', 'abandoned']),
          context: { category: pick(CATEGORIES) },
        }),
      })
      if (!sessionRes.ok) continue
      const sessionData = await sessionRes.json()
      const sessionId = Array.isArray(sessionData) ? sessionData[0]?.id : null
      if (!sessionId) continue

      const numMsgs = rand(2, 15)
      for (let j = 0; j < numMsgs; j++) {
        await fetch(`${SUPABASE_URL}/rest/v1/chat_messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SERVICE_KEY}`,
            'Content-Type': 'application/json',
            'apikey': SERVICE_KEY,
          },
          body: JSON.stringify({
            session_id: sessionId,
            role: j % 2 === 0 ? 'user' : 'assistant',
            content: pick([
              'Máy lạnh nhà tôi không lạnh',
              'Vòi nước bị rò rỉ',
              'Tủ lạnh kêu to quá',
              'Đèn bếp bị chập',
              'Camera không kết nối được',
              'Tường nhà bị nứt',
              'Cửa bị kẹt',
              'Bồn cầu bị tắc',
              'Máy giặt không vắt được',
              'Ổ điện bị hở',
            ]),
            metadata: j % 3 === 0 ? { diagnosis: pick(['Lỗi bo mạch', 'Hỏng tụ điện', 'Gãy dây curoa', 'Tắc đường ống', 'Mòn gioăng cao su']) } : {},
          }),
        })
        msgCount++
      }
    }
    log(`Created ~${msgCount} chat messages`)

    // 4. CREATE COMPLAINTS
    log('\n=== CREATING COMPLAINTS ===')
    const completedOrders = await supabaseRpc('GET', `orders?status=eq.completed&select=id,customer_id&limit=100`)
    if (completedOrders && Array.isArray(completedOrders)) {
      for (const order of completedOrders.slice(0, 50)) {
        await fetch(`${SUPABASE_URL}/rest/v1/complaints`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SERVICE_KEY}`,
            'Content-Type': 'application/json',
            'apikey': SERVICE_KEY,
          },
          body: JSON.stringify({
            order_id: order.id,
            customer_id: order.customer_id,
            complaint_type: pick(['poor_quality', 'late_arrival', 'wrong_price', 'rude_behavior']),
            description: pick(['Thợ làm việc cẩu thả', 'Đến trễ 2 tiếng', 'Báo giá sai so với thực tế', 'Thái độ không chuyên nghiệp']),
            status: pick(['pending', 'investigating', 'resolved']),
          }),
        })
      }
      log('Created 50 complaints')
    }

    // 5. CALCULATE TRUST SCORES
    log('\n=== CALCULATING TRUST SCORES ===')
    for (const w of workers) {
      await fetch(`${SUPABASE_URL}/rest/v1/rpc/calculate_trust_score`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'Content-Type': 'application/json',
          'apikey': SERVICE_KEY,
        },
        body: JSON.stringify({ worker_uuid: w.id }),
      }).catch(() => {})
    }
    log('Calculated trust scores for all workers')

    const elapsed = ((Date.now() - started) / 1000).toFixed(1)
    log(`\n✅ SEED COMPLETE in ${elapsed}s`)

    return new Response(JSON.stringify({ success: true, logs, elapsed }), {
      headers: { ...CORS.headers, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Seed error:', err)
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...CORS.headers, 'Content-Type': 'application/json' },
    })
  }
})
