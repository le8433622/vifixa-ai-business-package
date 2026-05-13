// Vifixa AI — Seed 1000 Test Users + Data
// Run: npx tsx supabase/scripts/seed-data.ts
// Uses service_role key via SUPABASE env vars

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

// Config — point to staging!
const SUPABASE_URL = process.env.SEED_SUPABASE_URL || 'https://drapjraegrygkakzalog.supabase.co'
const SERVICE_KEY = process.env.SEED_SERVICE_KEY || ''

if (!SERVICE_KEY) {
  console.error('❌ Set SEED_SERVICE_KEY env var')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ========== DATA GENERATORS ==========
const FIRST_NAMES = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý']
const MIDDLE_NAMES = ['Văn', 'Thị', 'Đức', 'Minh', 'Quốc', 'Hữu', 'Công', 'Thanh', 'Ngọc', 'Anh']
const LAST_NAMES = ['Nam', 'Hùng', 'Dũng', 'Mạnh', 'Tuấn', 'Linh', 'Hương', 'Mai', 'Lan', 'Phương', 'Long', 'Thắng', 'Hiếu', 'Tâm', 'Sơn']
const CATEGORIES = ['electricity', 'plumbing', 'appliance', 'air_conditioning', 'camera', 'painting', 'lock_smith', 'carpentry', 'cleaning', 'hvac']
const DISTRICTS = ['Dist 1', 'Dist 2', 'Dist 3', 'Dist 4', 'Dist 5', 'Dist 6', 'Dist 7', 'Dist 8', 'Dist 9', 'Dist 10', 'Dist 11', 'Dist 12', 'Binh Thanh', 'Phu Nhuan', 'Go Vap', 'Tan Binh', 'Tan Phu', 'Thu Duc']
const STATUSES = ['pending', 'matched', 'in_progress', 'completed', 'cancelled']
const COMPLAINT_TYPES = ['poor_quality', 'late_arrival', 'wrong_price', 'damaged_property', 'rude_behavior', 'wrong_parts', 'incomplete_work', 'other']
const COMPLAINT_DESCS = ['Thợ làm việc cẩu thả', 'Đến trễ 2 tiếng', 'Báo giá sai so với thực tế', 'Thái độ không chuyên nghiệp']
const CHAT_MSGS = [
  'Máy lạnh nhà tôi không lạnh', 'Vòi nước bị rò rỉ', 'Tủ lạnh kêu to quá',
  'Đèn bếp bị chập', 'Camera không kết nối được', 'Tường nhà bị nứt',
  'Cửa bị kẹt', 'Bồn cầu bị tắc', 'Máy giặt không vắt được', 'Ổ điện bị hở',
]
const DIAGNOSES = ['Lỗi bo mạch', 'Hỏng tụ điện', 'Gãy dây curoa', 'Tắc đường ống', 'Mòn gioăng cao su', 'Chạm mass', 'Đứt dây điện']
const DESCRIPTIONS = [
  'Sửa chữa vòi nước bị rò rỉ', 'Thay bóng đèn', 'Sửa ổ điện bị hở',
  'Vệ sinh máy lạnh', 'Sửa tủ lạnh không lạnh', 'Lắp đặt camera mới',
  'Sơn lại tường nhà', 'Sửa khóa cửa bị kẹt', 'Thông bồn cầu bị tắc',
  'Sửa máy giặt không vắt',
]

let counter = 0
function uid() { return crypto.randomUUID() }
function rand(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min }
function pick<T>(arr: T[]): T { return arr[rand(0, arr.length - 1)] }
function picks<T>(arr: T[], n: number): T[] { return [...arr].sort(() => Math.random() - 0.5).slice(0, n) }
function randName() { return `${pick(FIRST_NAMES)} ${pick(MIDDLE_NAMES)} ${pick(LAST_NAMES)}` }
function randDate(daysBack: number) { return new Date(Date.now() - rand(0, daysBack) * 86400000).toISOString() }

async function main() {
  const start = Date.now()
  const log: string[] = []
  function info(m: string) { log.push(m); console.log(m) }

  info('=== VIFIXA AI — SEED 1000 TEST USERS ===')
  info(`Target: ${SUPABASE_URL}`)

  // Helper: insert with auth admin API
  async function createAuthUser(email: string, password: string): Promise<string | null> {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'apikey': SERVICE_KEY,
      },
      body: JSON.stringify({ email, password, email_confirm: true }),
    })
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({})) as { code?: number; message?: string; msg?: string }
      if (errBody.code === 422 || `${res.status}` === '422') return null // already exists
      return null
    }
    const data = await res.json() as { id: string }
    return data.id
  }

  // Helper: upsert profiles
  async function upsertProfile(id: string, data: Record<string, unknown>) {
    const { error } = await supabase.from('profiles').upsert({ id, ...data })
    if (error) console.warn('  profile upsert warn:', error.message)
  }

  // ===== 1. CREATE USERS =====
  info('\n📦 Phase 1: Creating 1000 users...')
  const PASSWORD = 'Test123!@#'
  const users: Array<{ id: string; email: string; role: string; name: string }> = []

  for (let i = 1; i <= 1000; i++) {
    const role = i <= 400 ? 'customer' : i <= 800 ? 'worker' : 'admin'
    const email = `${role}.test${i}@vifixa.test`
    
    let userId = await createAuthUser(email, PASSWORD)
    if (!userId) {
      // Find existing user
      const { data: existing } = await supabase.from('profiles').select('id').eq('email', email).maybeSingle()
      if (existing?.id) userId = existing.id
      else continue
    }

    const name = role === 'admin' ? `Admin Vifixa ${i}` : randName()
    await upsertProfile(userId, {
      email,
      phone: `09${rand(10000000, 99999999)}`,
      role,
      full_name: name,
    })

    if (role === 'worker') {
      const { error: we } = await supabase.from('workers').upsert({
        user_id: userId,
        skills: picks(CATEGORIES, rand(2, 5)),
        service_areas: picks(DISTRICTS, rand(2, 6)),
        trust_score: rand(30, 100),
        is_verified: Math.random() > 0.3,
        avg_earnings: rand(500000, 5000000),
      })
      if (we) console.warn('  worker upsert warn:', we.message)
    }

    users.push({ id: userId, email, role, name })
    if (i % 100 === 0) info(`  [${i}/1000] Created ${role}s`)
  }

  const customers = users.filter(u => u.role === 'customer')
  const workers = users.filter(u => u.role === 'worker')
  info(`✅ Created ${users.length} users (${customers.length}C / ${workers.length}W / ${users.filter(u => u.role === 'admin').length}A)`)

  // ===== 2. CREATE ORDERS =====
  info('\n📦 Phase 2: Creating 1000 orders...')
  let ordersCreated = 0
  const orderIds: string[] = []
  const BATCH = 50

  for (let i = 0; i < 1000; i += BATCH) {
    const batch = []
    for (let j = 0; j < BATCH && i + j < 1000; j++) {
      const customer = pick(customers)
      const worker = Math.random() > 0.15 ? pick(workers) : null
      const status = worker ? pick(STATUSES) : 'pending'
      const estimated = rand(200000, 5000000)
      batch.push({
        customer_id: customer.id,
        worker_id: worker?.id || null,
        category: pick(CATEGORIES),
        description: pick(DESCRIPTIONS),
        estimated_price: estimated,
        final_price: status === 'completed' ? estimated + rand(-50000, 500000) : null,
        status,
        rating: status === 'completed' && Math.random() > 0.2 ? rand(3, 5) : null,
        created_at: randDate(30),
      })
    }
    const { data, error } = await supabase.from('orders').insert(batch).select('id')
    if (error) console.warn('  orders batch insert error:', error.message)
    if (data) {
      ordersCreated += data.length
      orderIds.push(...data.map(d => d.id))
    }
    if ((i + BATCH) % 200 === 0) info(`  [${Math.min(i + BATCH, 1000)}/1000] orders`)
  }
  info(`✅ Created ${ordersCreated} orders`)

  // ===== 3. CREATE CHAT SESSIONS & MESSAGES =====
  info('\n📦 Phase 3: Creating chat data...')
  let sessionsCreated = 0
  let messagesCreated = 0

  for (let i = 0; i < 300; i += BATCH) {
    const batch = []
    for (let j = 0; j < BATCH && i + j < 300; j++) {
      const customer = pick(customers)
      batch.push({
        user_id: customer.id,
        session_type: pick(['support', 'diagnosis', 'booking']),
        status: pick(['active', 'completed', 'abandoned']),
        context: { category: pick(CATEGORIES) },
      })
    }
    const { data, error } = await supabase.from('chat_sessions').insert(batch).select('id')
    if (error) console.warn('  sessions error:', error.message)
    if (data) {
      sessionsCreated += data.length
      for (const session of data) {
        const msgBatch = []
        const numMsgs = rand(2, 15)
        for (let m = 0; m < numMsgs; m++) {
          msgBatch.push({
            session_id: session.id,
            role: m % 2 === 0 ? 'user' : 'assistant',
            content: pick(CHAT_MSGS),
            metadata: m % 3 === 0 ? { diagnosis: pick(DIAGNOSES) } : {},
          })
        }
        const { error: me } = await supabase.from('chat_messages').insert(msgBatch)
        if (!me) messagesCreated += msgBatch.length
      }
    }
    info(`  [${Math.min(i + BATCH, 300)}/300] sessions + messages`)
  }
  info(`✅ Created ${sessionsCreated} sessions, ${messagesCreated} messages`)

  // ===== 4. CREATE COMPLAINTS =====
  info('\n📦 Phase 4: Creating complaints...')
  const { data: completedOrders } = await supabase
    .from('orders')
    .select('id, customer_id')
    .eq('status', 'completed')
    .limit(80)
  
  if (completedOrders) {
    const complaints = completedOrders.slice(0, 50).map(o => ({
      order_id: o.id,
      customer_id: o.customer_id,
      complaint_type: pick(COMPLAINT_TYPES),
      description: pick(COMPLAINT_DESCS),
      status: pick(['pending', 'investigating', 'resolved']),
    }))
    const { error: ce } = await supabase.from('complaints').insert(complaints)
    if (ce) console.warn('  complaints error:', ce.message)
    info(`✅ Created ${complaints.length} complaints`)
  }

  // ===== 5. TRUST SCORES =====
  info('\n📦 Phase 5: Calculating trust scores...')
  for (const w of workers) {
    await supabase.rpc('calculate_trust_score', { worker_uuid: w.id }).catch(() => {})
  }
  info('✅ Calculated trust scores')

  const elapsed = ((Date.now() - start) / 1000).toFixed(1)
  info(`\n🎉 SEED COMPLETE in ${elapsed}s`)
  info(`Summary: ${users.length} users | ${ordersCreated} orders | ${sessionsCreated} sessions | ${messagesCreated} msgs`)
}

main().catch(console.error)
