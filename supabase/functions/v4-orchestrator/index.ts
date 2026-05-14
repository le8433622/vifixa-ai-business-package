// 🧠 V4 Orchestrator — Super-Agent điều phối toàn bộ hệ thống
// Nhận đầu vào → phân tích ý định → điều phối → trả kết quả

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createAICore } from '../_shared/ai-core.ts'
import { jsonResponse, handleOptions } from '../_shared/auth-helper.ts'
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
      case 'nhan_don': {
        // Nhận đơn hàng mới → gọi Navigator + Monetizer + Humanizer
        const { data: donHang } = await supabase.from('orders').select('*').eq('id', noiDung).single()
        if (!donHang) {
          loi.push('Không tìm thấy đơn hàng')
          break
        }
        ketQuaCuoi = {
          donHang: donHang.id,
          trangThai: 'dang_xu_ly',
          cacBuoc: ['tim_tho', 'dinh_gia', 'thong_bao'],
        }
        break
      }
      case 'xu_ly_chat': {
        // Chat → trả lời trực tiếp
        const humanizer = await ai.orchestrateInternal('chat', async () => ({
          systemPrompt: `Bạn là trợ lý Vifixa thân thiện. Trả lời ngắn gọn, tự nhiên, bằng tiếng Việt.
Trả về JSON: { traLoi: string, yDinhPhatHien: string, canLayThemThongTin: bool }`,
          userPrompt: `Người dùng: ${noiDung}
Trả lời:`,
        }))
        ketQuaCuoi = {
          traLoi: humanizer.success ? humanizer.data.traLoi : 'Xin lỗi, tôi chưa hiểu. Bạn có thể nói rõ hơn không?',
          canLayThemThongTin: humanizer.success ? humanizer.data.canLayThemThongTin : true,
        }
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