// 🤝 V4 Humanizer — Super-Agent tương tác người dùng
// Chat, diagnosis, coaching, dispute resolution, feedback

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createAICore } from '../_shared/ai-core.ts'
import { createAIAudit } from '../_shared/ai-audit.ts'
import { jsonResponse, handleOptions } from '../_shared/auth-helper.ts'
import type { DauVaoHumanizer, DauRaHumanizer, TinNhan } from '../v4-core/index.ts'

Deno.serve(async (req) => {
  const opt = handleOptions(req)
  if (opt) return opt

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return jsonResponse({ loi: 'Thiếu xác thực' }, 401)
    const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    if (!user) return jsonResponse({ loi: 'Không xác thực được' }, 401)

    const input: DauVaoHumanizer = await req.json()
    const { hanhDong, tinNhan, lichSu, nguCanh } = input

    const requestId = crypto.randomUUID()
    const ai = createAICore(supabase, { requestId, userId: user.id })
    const audit = createAIAudit(supabase)

    const lichSuText = lichSu.slice(-10).map(m => `${m.vaiTro === 'nguoi_dung' ? '👤' : '🤖'}: ${m.noiDung}`).join('\n')

    switch (hanhDong) {
      case 'tra_loi': {
        // Chat thông thường
        const result = await ai.orchestrateInternal('chat', async () => ({
          systemPrompt: `Bạn là trợ lý Vifixa thân thiện, thông minh.
Trả lời bằng tiếng Việt tự nhiên. Ngắn gọn, đúng trọng tâm.
Nếu cần thêm thông tin, hãy hỏi từng bước một.
Trả về JSON: { traLoi: string, canThongTinThem: bool, thongTinCan: string[], hanhDong: { loai?: string, data?: any }[] }`,
          userPrompt: `Lịch sử:\n${lichSuText}\n\nTin nhắn: ${tinNhan}\nTrả lời:`,
        }))

        const data = result.success ? result.data : { traLoi: 'Xin lỗi, tôi chưa hiểu. Bạn nói rõ hơn nhé!', canThongTinThem: true, thongTinCan: [], hanhDong: [] }
        const dauRa: DauRaHumanizer = { traLoi: data.traLoi, hanhDong: data.hanhDong || [], doTinCay: 0.8 }

        await audit.log({ agentType: 'humanizer_chat', input: { tinNhan, lichSu: lichSu.slice(-3) }, output: dauRa, userId: user.id, requestId })
        return jsonResponse(dauRa)
      }

      case 'chan_doan': {
        // Chẩn đoán sự cố
        const result = await ai.orchestrateInternal('diagnosis', async () => ({
          systemPrompt: `Bạn là chuyên gia chẩn đoán sự cố sửa chữa nhà cửa.
Phân tích: triệu chứng → nguyên nhân → giải pháp.
Trả lời bằng tiếng Việt, dễ hiểu.
Trả về JSON: { chanDoan: string, mucDo: "thap"|"trung_binh"|"cao"|"khan_cap", kyNangCan: string[], giaUocTinh: { thap: number, cao: number }, doTinCay: number, cauHoiThem: string[] }`,
          userPrompt: `Mô tả: ${tinNhan}\nNgữ cảnh: ${JSON.stringify(nguCanh || {})}\nChẩn đoán:`,
        }))

        const data = result.success ? result.data : { chanDoan: 'Không thể chẩn đoán', mucDo: 'trung_binh', kyNangCan: ['tho_da_nang'], giaUocTinh: { thap: 200000, cao: 500000 }, doTinCay: 0.3, cauHoiThem: [] }
        const dauRa: DauRaHumanizer = {
          traLoi: `🔍 Chẩn đoán: ${data.chanDoan}\n📊 Mức độ: ${data.mucDo}\n💰 Chi phí: ${data.giaUocTinh?.thap?.toLocaleString()} - ${data.giaUocTinh?.cao?.toLocaleString()}đ`,
          hanhDong: [{ loai: 'hien_thi_chan_doan', data }],
          doTinCay: data.doHieuChinh || data.doTinCay,
        }

        await audit.log({ agentType: 'humanizer_chan_doan', input: { tinNhan, nguCanh }, output: dauRa, userId: user.id, requestId })
        return jsonResponse(dauRa)
      }

      case 'huan_luyen': {
        // Coaching cho thợ
        const { data: tho } = await supabase.from('workers').select('*, profiles!inner(full_name)').eq('user_id', user.id).single()
        const { data: don } = await supabase.from('orders').select('category, status, final_price, rating').eq('worker_id', user.id).limit(30)

        const result = await ai.orchestrateInternal('coach', async () => ({
          systemPrompt: `Bạn là AI Coach cho thợ sửa chữa. Phân tích dữ liệu và đưa ra lời khuyên.
Trả về JSON: { loiKhuyen: string[], kyNangCanHoc: string[], coHoi: string[], thuNhapDuKien: number }`,
          userPrompt: `Thợ: ${tho?.profiles?.full_name || 'N/A'}
Đơn: ${(don || []).length} đơn
Rating: ${(don || []).filter((o: any) => o.rating).reduce((s: number, o: any) => s + o.rating, 0) / Math.max((don || []).filter((o: any) => o.rating).length, 1)}/5
${tinNhan ? `Câu hỏi: ${tinNhan}` : ''}
Phân tích:`,
        }))

        const data = result.success ? result.data : { loiKhuyen: ['Tập trung vào kỹ năng chính'], kyNangCanHoc: [], coHoi: [], thuNhapDuKien: 0 }
        const dauRa: DauRaHumanizer = {
          traLoi: `🎓 Lời khuyên:\n${(data.errorKhuyen || []).map((l: string) => `• ${l}`).join('\n')}\n📈 Cơ hội: ${(data.coHoi || []).join(', ')}`,
          doTinCay: 0.8,
        }
        return jsonResponse(dauRa)
      }

      case 'hoa_giai': {
        // Giải quyết tranh chấp
        const { donId, benKhieuNai, moTaKhieuNai } = await req.json()
        const { data: donTranhChap } = donId ? await supabase.from('orders').select('*').eq('id', donId).single() : { data: null }

        const result = await ai.orchestrateInternal('dispute', async () => ({
          systemPrompt: `Bạn là chuyên gia hòa giải tranh chấp. Phân tích công bằng cả hai bên.
Trả về JSON: { tomTat: string, deXuat: string, mucDo: "thap"|"trung_binh"|"cao", tuDongGiaiQuyet: bool }`,
          userPrompt: `Đơn: ${JSON.stringify(donTranhChap || {})}
Khiếu nại từ: ${benKhieuNai || 'Không rõ'}
Mô tả: ${moTaKhieuNai || tinNhan}
Phân tích:`,
        }))

        const data = result.success ? result.data : { tomTat: 'Không thể phân tích', deXuat: 'Chuyển admin xử lý', mucDo: 'trung_binh', tuDongGiaiQuyet: false }
        const dauRa: DauRaHumanizer = { traLoi: data.tomTat, hanhDong: data.tuDongGiaiQuyet ? [{ loai: 'tu_dong_giai_quyet', data }] : [{ loai: 'chuyen_admin', data }], doTinCay: 0.6 }
        return jsonResponse(dauRa)
      }

      default:
        return jsonResponse({ loi: `Không rõ: ${hanhDong}` }, 400)
    }
  } catch (error: any) {
    console.error('Humanizer lỗi:', error)
    return jsonResponse({ loi: error.message || 'Lỗi máy chủ' }, 500)
  }
})