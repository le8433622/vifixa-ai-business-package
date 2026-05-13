// Vifixa AI — Seed 1000 users to production Supabase
// Run: SUPABASE_URL=<url> SERVICE_KEY=<key> node seed-prod.mjs

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://lipjakzhzosrhttsltwo.supabase.co'
const SERVICE_KEY = process.env.SERVICE_KEY || ''

if (!SERVICE_KEY) { console.error('❌ Set SERVICE_KEY env var'); process.exit(1) }

const headers = {
  'Authorization': `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
  'apikey': SERVICE_KEY,
}

async function api(method, path, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const text = await res.text()
    if (res.status !== 409 && res.status !== 400) console.warn(`  ${method} ${path}: ${res.status} ${text.slice(0, 100)}`)
  }
  return res
}

async function authAdmin(email, password) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ email, password, email_confirm: true }),
  })
  if (res.status === 422) return null
  if (!res.ok) return null
  const data = await res.json()
  return data.id
}

function uid() { return crypto.randomUUID() }
function rand(m, M) { return Math.floor(Math.random() * (M - m + 1)) + m }
function pick(a) { return a[rand(0, a.length - 1)] }
function picks(a, n) { return [...a].sort(() => Math.random() - 0.5).slice(0, n) }
function randName(fn, mn, ln) { return `${pick(fn)} ${pick(mn)} ${pick(ln)}` }

const F = ['Nguyễn','Trần','Lê','Phạm','Hoàng','Huỳnh','Phan','Vũ','Đặng','Bùi','Đỗ','Hồ','Ngô','Dương','Lý']
const M = ['Văn','Thị','Đức','Minh','Quốc','Hữu','Công','Thanh','Ngọc','Anh']
const L = ['Nam','Hùng','Dũng','Mạnh','Tuấn','Linh','Hương','Mai','Lan','Phương','Long','Thắng','Hiếu','Tâm','Sơn']
const CATS = ['electricity','plumbing','appliance','air_conditioning','camera','painting','lock_smith','carpentry','cleaning','hvac']
const DISTS = ['Dist 1','Dist 2','Dist 3','Dist 4','Dist 5','Dist 6','Dist 7','Dist 8','Dist 9','Dist 10','Dist 11','Dist 12','Binh Thanh','Phu Nhuan','Go Vap']
const STATS = ['pending','matched','in_progress','completed','cancelled']
const DESCS = ['Sửa vòi nước rò rỉ','Thay bóng đèn','Sửa ổ điện hở','Vệ sinh máy lạnh','Sửa tủ lạnh','Lắp camera','Sơn tường','Sửa khóa cửa','Thông bồn cầu','Sửa máy giặt']
const MSGS = ['Máy lạnh không lạnh','Vòi nước rò rỉ','Tủ lạnh kêu to','Đèn bếp chập','Camera mất kết nối','Tường nứt','Cửa kẹt','Bồn cầu tắc','Máy giặt không vắt','Ổ điện hở']
const DIAGS = ['Lỗi bo mạch','Hỏng tụ điện','Gãy dây curoa','Tắc đường ống','Mòn gioăng cao su','Chạm mass','Đứt dây điện']

async function main() {
  const start = Date.now()
  console.log('=== SEED PRODUCTION ===')

  // 1. USERS
  console.log('\n📦 Step 1: 1000 users...')
  const users = []  // { id, email, role }
  const PW = 'Test123!@#'

  for (let i = 1; i <= 1000; i++) {
    const role = i <= 400 ? 'customer' : i <= 800 ? 'worker' : 'admin'
    const email = `${role}.test${i}@vifixa.test`
    let id = await authAdmin(email, PW)
    if (!id) {
      // find existing
      const res = await api('GET', `profiles?email=eq.${email}&select=id`)
      if (res.status === 200) {
        const data = await res.json()
        if (data?.[0]?.id) id = data[0].id
      }
    }
    if (!id) { console.log(`  SKIP ${email} - no id`); continue }

    const phone = `09${String(rand(10000000, 99999999))}`
    const name = role === 'admin' ? `Admin ${i}` : randName(F, M, L)
    await api('POST', 'profiles', { id, email, phone, role, full_name: name }).catch(() =>
      api('PATCH', `profiles?id=eq.${id}`, { phone, full_name, role })
    )

    if (role === 'worker') {
      await api('POST', 'workers', {
        user_id: id,
        skills: picks(CATS, rand(2, 5)),
        service_areas: picks(DISTS, rand(2, 6)),
        trust_score: rand(30, 100),
        is_verified: Math.random() > 0.3,
        avg_earnings: rand(500000, 5000000),
      }).catch(() => {})
    }
    users.push({ id, email, role })
    if (i % 100 === 0) console.log(`  [${i}/1000]`)
  }
  const custs = users.filter(u => u.role === 'customer')
  const wrkrs = users.filter(u => u.role === 'worker')
  console.log(`✅ ${users.length} users (${custs.length}C / ${wrkrs.length}W / ${users.filter(u => u.role === 'admin').length}A)`)

  // 2. ORDERS
  console.log('\n📦 Step 2: 1000 orders...')
  for (let i = 0; i < 1000; i += 50) {
    const batch = []
    for (let j = 0; j < 50 && i + j < 1000; j++) {
      const worker = Math.random() > 0.15 ? pick(wrkrs) : null
      const status = worker ? pick(STATS) : 'pending'
      const est = rand(200000, 5000000)
      batch.push({
        customer_id: pick(custs).id,
        worker_id: worker?.id || null,
        category: pick(CATS),
        description: pick(DESCS),
        estimated_price: est,
        final_price: status === 'completed' ? est + rand(-50000, 500000) : null,
        status,
        rating: status === 'completed' && Math.random() > 0.2 ? rand(3, 5) : null,
        created_at: new Date(Date.now() - rand(0, 30) * 86400000).toISOString(),
      })
    }
    await api('POST', 'orders', batch)
    if ((i + 50) % 200 === 0) console.log(`  [${Math.min(i+50, 1000)}/1000]`)
  }
  console.log('✅ 1000 orders')

  // 3. CHAT
  console.log('\n📦 Step 3: Chat sessions...')
  let msgs = 0
  for (let i = 0; i < 300; i += 50) {
    const sb = []
    for (let j = 0; j < 50 && i + j < 300; j++) {
      sb.push({
        user_id: pick(custs).id,
        session_type: pick(['support','diagnosis','booking']),
        status: pick(['active','completed','abandoned']),
        context: { category: pick(CATS) },
      })
    }
    const sRes = await api('POST', 'chat_sessions?select=id', sb)
    if (sRes.status === 201) {
      const sessions = await sRes.json()
      for (const s of sessions) {
        const mb = []
        const n = rand(2, 15)
        for (let m = 0; m < n; m++) {
          mb.push({
            session_id: s.id,
            role: m % 2 === 0 ? 'user' : 'assistant',
            content: pick(MSGS),
            metadata: m % 3 === 0 ? { diagnosis: pick(DIAGS) } : {},
          })
        }
        await api('POST', 'chat_messages', mb)
        msgs += mb.length
      }
    }
    console.log(`  [${Math.min(i+50, 300)}/300] sessions`)
  }
  console.log(`✅ 300 sessions, ~${msgs} messages`)

  // 4. COMPLAINTS
  console.log('\n📦 Step 4: Complaints...')
  const oRes = await api('GET', 'orders?status=eq.completed&select=id,customer_id&limit=80')
  if (oRes.status === 200) {
    const completed = await oRes.json()
    const ctypes = ['poor_quality','late_arrival','wrong_price','rude_behavior','wrong_parts']
    const cdescs = ['Thợ làm cẩu thả','Đến trễ','Báo giá sai','Thái độ không tốt','Sai linh kiện']
    const complaints = completed.slice(0, 50).map(o => ({
      order_id: o.id,
      customer_id: o.customer_id,
      complaint_type: pick(ctypes),
      description: pick(cdescs),
      status: pick(['pending','investigating','resolved']),
    }))
    await api('POST', 'complaints', complaints)
    console.log(`✅ ${complaints.length} complaints`)
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1)
  console.log(`\n🎉 DONE in ${elapsed}s`)
}

main().catch(console.error)
