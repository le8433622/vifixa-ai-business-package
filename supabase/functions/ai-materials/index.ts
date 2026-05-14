// 🔧 AI Vật tư — Tự động tạo danh sách vật tư từ chẩn đoán

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createAICore } from '../_shared/ai-core.ts'
import { createAIAudit } from '../_shared/ai-audit.ts'
import { verifyAuth, checkRateLimit, jsonResponse, handleOptions } from '../_shared/auth-helper.ts'

Deno.serve(async (req) => {
  const opt = handleOptions(req)
  if (opt) return opt

  try {
    const user = await verifyAuth(req)
    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    checkRateLimit(user.id, clientIp, { maxRequests: 20 })

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { diagnosis, category, description } = await req.json()
    if (!diagnosis || !category) return jsonResponse({ error: 'Thiếu: chan_doan, danh_muc' }, 400)

    const { data: materialPrices } = await supabase.from('ai_material_prices').select('*').eq('category', category).eq('is_active', true)

    const requestId = crypto.randomUUID()
    const ai = createAICore(supabase, { requestId, userId: user.id })

    const result = await ai.orchestrateInternal('vat_tu', async () => ({
      systemPrompt: `Bạn là chuyên gia vật tư. Liệt kê vật tư cần thiết.
Trả về JSON: {vatTu: [{ten, soLuong, donVi, giaUocTinh, nhaCungCap?}], tongChiPhi: number, ghiChu?: string}`,
      userPrompt: `Chẩn đoán: ${diagnosis}\nDanh mục: ${category}\nMô tả: ${description || ''}\nVật tư TK: ${(materialPrices || []).slice(0, 10).map((m: any) => `${m.material_name}: ${m.min_price}-${m.max_price}đ`).join(', ')}\nTrả về JSON:`,
    }))

    const duLieuRa = result.success ? result.data : {
      vatTu: [{ ten: 'Vật tư cơ bản', soLuong: 1, donVi: 'bộ', giaUocTinh: 0 }],
      tongChiPhi: 0, ghiChu: 'AI không khả dụng',
    }

    const audit = createAIAudit(supabase)
    await audit.log({
      agentType: 'vat_tu', input: { danhMuc: category, chanDoan: diagnosis },
      output: duLieuRa, userId: user.id, requestId,
    })

    return jsonResponse(duLieuRa)
  } catch (error: any) {
    if (error.name === 'AuthError') return jsonResponse({ error: error.message, code: error.code }, 401)
    if (error.name === 'RateLimitError') return jsonResponse({ error: error.message }, 429)
    console.error('Lỗi vật tư:', error)
    return jsonResponse({ error: error.message || 'Lỗi máy chủ nội bộ' }, 500)
  }
})