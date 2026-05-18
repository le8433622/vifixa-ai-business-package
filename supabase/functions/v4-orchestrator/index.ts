// 🧠 V4 Orchestrator — Super-Agent điều phối toàn bộ hệ thống
// Nhận đầu vào → phân tích ý định → điều phối → trả kết quả

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createAICore } from '../_shared/ai-core.ts'
import { jsonResponse, handleOptions, checkRateLimit } from '../_shared/auth-helper.ts'
import type { DauVaoOrchestrator, DauRaOrchestrator, BuocXuLy } from '../v4-core/index.ts'

Deno.serve(async (req) => {
  const opt = handleOptions(req)
  if (opt) return opt

  const batDau = Date.now()
  const cacBuoc: BuocXuLy[] = []
  const loi: string[] = []

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    checkRateLimit('v4-orchestrator', ip, { maxRequests: 20, windowMs: 60000 })

    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')
    let userId: string | null = null
    if (token) {
      const { data: { user } } = await supabase.auth.getUser(token)
      if (user) userId = user.id
    }

    const input: DauVaoOrchestrator = await req.json()
    const { hanhDong, noiDung, nguCanh } = input

    // Bước 1: Phân tích ý định
    cacBuoc.push({ ten: 'phan_tich_y_dinh', moTa: 'Phân tích ý định người dùng', trangThai: 'dang_xu_ly' })
    const ai = createAICore(supabase, { requestId: crypto.randomUUID(), userId: userId || undefined })

    const phanTich = await ai.orchestrateInternal('chat', async () => ({
      systemPrompt: `Bạn là AI Orchestrator của Vifixa. Phân tích ý định người dùng.
Trả về JSON: { yDinh: string, doTinCay: number, buocXuLy: string[], mucDo: "thap"|"trung_binh"|"cao"|"khan_cap" }`,
      userPrompt: `Hành động: ${hanhDong}
Nội dung: ${noiDung}
Ngữ cảnh: ${JSON.stringify(nguCanh || {})}
Phân tích ý định:`,
    }))

    const yDinh = phanTich.success ? phanTich.data.yDinh || 'khong_xac_dinh' : 'khong_xac_dinh'
    const doTinCay = phanTich.success ? phanTich.data.doHieuChinh || 0.5 : 0.5
    
    cacBuoc[cacBuoc.length - 1].trangThai = 'thanh_cong'
    cacBuoc[cacBuoc.length - 1].ketQua = { yDinh, doTinCay }

    // Bước 2: Xử lý theo hành động
    cacBuoc.push({ ten: `xu_ly_${hanhDong}`, moTa: `Xử lý ${hanhDong}`, trangThai: 'dang_xu_ly' })

    let ketQuaCuoi: unknown = null

    switch (hanhDong) {
      case 'xu_ly_chat': {
        // Canonical: companion/chat first, fall back to legacy ai-chat, then direct AI
        try {
          const companionRes = await fetch(`${supabaseUrl}/functions/v1/companion/chat`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({
              message: noiDung,
              context: {
                ...(nguCanh || {}),
                user_id: userId,
                persona: (nguCanh as any)?.persona || 'customer',
              },
            }),
          })
          if (companionRes.ok) {
            ketQuaCuoi = await companionRes.json()
          } else {
            throw new Error(`companion/chat returned ${companionRes.status}`)
          }
        } catch {
          // Fallback to legacy ai-chat
          try {
            const chatRes = await fetch(`${supabaseUrl}/functions/v1/ai-chat`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseKey}`,
              },
              body: JSON.stringify({
                session_id: (nguCanh as any)?.session_id || null,
                message: noiDung,
                context: nguCanh || {},
              }),
            })
            if (chatRes.ok) {
              ketQuaCuoi = await chatRes.json()
            } else {
              throw new Error(`ai-chat returned ${chatRes.status}`)
            }
          } catch {
            // Last resort: direct AI
            const humanizer = await ai.orchestrateInternal('chat', async () => ({
              systemPrompt: `Bạn là trợ lý Vifixa thân thiện. Trả lời ngắn gọn, tự nhiên, bằng tiếng Việt.
Trả về JSON: { traLoi: string, yDinhPhatHien: string, canLayThemThongTin: bool }`,
              userPrompt: `Người dùng: ${noiDung}\nTrả lời:`,
            }))
            ketQuaCuoi = {
              reply: humanizer.success ? humanizer.data.traLoi : 'Xin lỗi, chưa hiểu.',
              session_id: null,
              state: 'problem_capture',
              session_complete: false,
              actions: [],
            }
          }
        }
        break
      }

      case 'nhan_don': {
        // Nhận đơn hàng mới
        const { data: donHang } = await supabase.from('orders').select('*').eq('id', noiDung).single()
        if (!donHang) { loi.push('Không tìm thấy đơn hàng'); break }
        ketQuaCuoi = { donHang: donHang.id, trangThai: 'dang_xu_ly', cacBuoc: ['tim_tho', 'dinh_gia', 'thong_bao'] }
        break
      }

      case 'phan_tich': {
        // Phân tích dữ liệu → gọi Monetizer
        const monetizer = await ai.orchestrateInternal('pricing', async () => ({
          systemPrompt: `Bạn là chuyên gia phân tích dữ liệu. Đưa ra insights ngắn gọn.
Trả về JSON: { phanTich: string, deXuat: string[], doTinCay: number }`,
          userPrompt: `Dữ liệu: ${noiDung}
Ngữ cảnh: ${JSON.stringify(nguCanh || {})}
Phân tích:`,
        }))
        ketQuaCuoi = monetizer.success ? monetizer.data : null
        break
      }
      case 'quyet_dinh': {
        // Quyết định tự động
        ketQuaCuoi = { quyetDinh: 'tu_dong_xu_ly', lyDo: 'Không cần can thiệp thủ công' }
        break
      }
    }

    cacBuoc[cacBuoc.length - 1].trangThai = 'thanh_cong'
    cacBuoc[cacBuoc.length - 1].ketQua = ketQuaCuoi

    const dauRa: DauRaOrchestrator = {
      yDinh,
      cacBuoc,
      ketQuaCuoi,
      loi: loi.length > 0 ? loi : undefined,
    }

    return jsonResponse(dauRa)
  } catch (error: any) {
    cacBuoc.push({ ten: 'loi', moTa: error.message, trangThai: 'that_bai', loi: error.message })
    console.error('Orchestrator lỗi:', error)
    return jsonResponse({ yDinh: 'loi', cacBuoc, loi: [error.message] }, 500)
  }
})