// 💰 V4 Monetizer — Super-Agent tiền bạc
// Pricing, upsell, negotiation, revenue analysis

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createAICore } from '../_shared/ai-core.ts'
import { jsonResponse, handleOptions } from '../_shared/auth-helper.ts'
import type { DauVaoMonetizer, DauRaMonetizer } from '../v4-core/index.ts'

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

    const input: DauVaoMonetizer = await req.json()
    const { hanhDong, danhMuc, giaTri, nguCanh } = input

    const requestId = crypto.randomUUID()
    const ai = createAICore(supabase, { requestId, userId: user.id })

    // Get historical pricing data
    const { data: donHoanThanh } = await supabase
      .from('orders')
      .select('final_price, estimated_price, category')
      .eq('category', danhMuc)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(30)

    const giaLichSu = (donHoanThanh || []).map((o: any) => o.final_price || o.estimated_price).filter(Boolean) as number[]
    const giaTB = giaLichSu.length > 0 ? Math.round(giaLichSu.reduce((a: number, b: number) => a + b, 0) / giaLichSu.length) : null

    switch (hanhDong) {
      case 'dinh_gia': {
        const result = await ai.orchestrateInternal('pricing', async () => ({
          systemPrompt: `Bạn là chuyên gia định giá dịch vụ sửa chữa tại Việt Nam.
Đưa ra giá hợp lý dựa trên danh mục và dữ liệu lịch sử.
Trả về JSON: { giaDeXuat: number, khungGia: { thap: number, cao: number }, doTinCay: number, giaiThich: string }`,
          userPrompt: `Danh mục: ${danhMuc}
${nguCanh?.moTa ? `Mô tả: ${nguCanh.moTa}` : ''}
${giaTB ? `Giá TB lịch sử: ${giaTB}đ` : 'Chưa có dữ liệu lịch sử'}
${giaTri ? `Giá khách muốn: ${giaTri}đ` : ''}
Định giá:`,
        }))

        const data = result.success ? result.data : { giaDeXuat: giaTB || 300000, khungGia: { thap: Math.round((giaTB || 300000) * 0.7), cao: Math.round((giaTB || 300000) * 1.3) }, doTinCay: 0.3, giaiThich: 'Giá tham khảo thị trường' }

        const dauRa: DauRaMonetizer = {
          deXuat: `Giá đề xuất: ${data.giaDeXuat.toLocaleString()}đ`,
          gia: data.giaDeXuat, doTinCay: data.doHieuChinh || data.doTinCay,
          lyDo: data.giaiThich,
          coHoi: [{ ten: 'Gói bảo hành', giaTri: Math.round(data.giaDeXuat * 0.15) }, { ten: 'Vệ sinh định kỳ', giaTri: Math.round(data.giaDeXuat * 0.3) }],
        }
        return jsonResponse(dauRa)
      }

      case 'upsell': {
        const result = await ai.orchestrateInternal('upsell', async () => ({
          systemPrompt: `Bạn là chuyên gia upsell. Dựa vào context, đề xuất sản phẩm phù hợp.
Trả về JSON: { deXuat: string, loaiSanPham: string, mucGiam: number, doTinCay: number, lyDo: string }`,
          userPrompt: `Danh mục: ${danhMuc}
${nguCanh?.khachHang ? `Khách: ${JSON.stringify(nguCanh.khachHang)}` : ''}
${giaTri ? `Giá trị đơn: ${giaTri}đ` : ''}
Đề xuất upsell:`,
        }))

        const data = result.success ? result.data : { deXuat: 'Đăng ký gói hội viên để tiết kiệm', loaiSanPham: 'membership', mucGiam: 10, doTinCay: 0.5, lyDo: 'Tăng trải nghiệm' }
        const dauRa: DauRaMonetizer = { deXuat: data.deXuat, mucGiam: data.mucGiam || data.mucGiam || 0, doTinCay: data.doHieuChinh || data.doTinCay, lyDo: data.lyDo }
        return jsonResponse(dauRa)
      }

      case 'thuong_luong': {
        const { khachDeXuat, thoDeXuat } = await req.json()
        const result = await ai.orchestrateInternal('pricing', async () => ({
          systemPrompt: `Bạn là chuyên gia thương lượng giá. Đề xuất giá hợp lý cho cả hai bên.
Trả về JSON: { giaHopLy: number, toiThieu: number, toiDa: number, goiYThoaHiep: string, doTinCay: number }`,
          userPrompt: `Danh mục: ${danhMuc}
${khachDeXuat ? `Khách đề xuất: ${khachDeXuat}đ` : ''}
${thoDeXuat ? `Thợ đề xuất: ${thoDeXuat}đ` : ''}
${giaTB ? `Giá TB thị trường: ${giaTB}đ` : ''}
Thương lượng:`,
        }))

        const data = result.success ? result.data : { giaHopLy: giaTB || 300000, toiThieu: Math.round((giaTB || 300000) * 0.8), toiDa: Math.round((giaTB || 300000) * 1.2), goiYThoaHiep: 'Giữ nguyên giá thị trường', doTinCay: 0.5 }
        const dauRa: DauRaMonetizer = { deXuat: data.goiYThoaHiep || data.goiYThoaHiep, gia: data.giaHopLy, doTinCay: data.doHieuChinh || data.doTinCay, lyDo: `Giá hợp lý: ${data.giaHopLy?.toLocaleString()}đ (${data.toiThieu?.toLocaleString()} - ${data.toiDa?.toLocaleString()})` }
        return jsonResponse(dauRa)
      }

      case 'phan_tich_doanh_thu': {
        const { data: donGanDay } = await supabase
          .from('orders')
          .select('final_price, estimated_price, status, created_at')
          .gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString())
          .limit(100)

        const ds = donGanDay || []
        const tong = ds.reduce((s: number, o: any) => s + (o.final_price || o.estimated_price || 0), 0)
        const hoanThanh = ds.filter((o: any) => o.status === 'completed').length

        return jsonResponse({
          deXuat: `30 ngày: ${ds.length} đơn, ${tong.toLocaleString()}đ, ${hoanThanh} hoàn thành`,
          gia: tong, doTinCay: 0.8, lyDo: 'Dựa trên dữ liệu 30 ngày gần nhất',
          coHoi: [{ ten: 'Tập trung giờ cao điểm', giaTri: Math.round(tong * 0.2) }, { ten: 'Mở rộng khu vực', giaTri: Math.round(tong * 0.3) }],
        })
      }

      default:
        return jsonResponse({ loi: `Không rõ: ${hanhDong}` }, 400)
    }
  } catch (error: any) {
    console.error('Monetizer lỗi:', error)
    return jsonResponse({ loi: error.message || 'Lỗi máy chủ' }, 500)
  }
})