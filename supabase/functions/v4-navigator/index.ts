// 🗺️ V4 Navigator — Super-Agent bản đồ + vị trí
// Mọi thứ về địa lý: tìm gần, route, heatmap, service area

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { jsonResponse, handleOptions } from '../_shared/auth-helper.ts'
import type { DauVaoNavigator, DauRaNavigator } from '../v4-core/index.ts'

const OSRM_BASE = 'https://router.project-osrm.org'

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; const dLat = (lat2 - lat1) * Math.PI / 180; const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLng/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

Deno.serve(async (req) => {
  const opt = handleOptions(req)
  if (opt) return opt

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Auth check
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return jsonResponse({ loi: 'Thiếu xác thực' }, 401)
    const token = authHeader.replace('Bearer ', '')
    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) return jsonResponse({ loi: 'Không xác thực được' }, 401)

    const input: DauVaoNavigator = await req.json()
    const { hanhDong, viTri, banKinh = 10, danhMuc } = input

    switch (hanhDong) {
      case 'tim_gan_day': {
        const { data: workers } = await supabase
          .from('workers')
          .select('id, profiles!inner(full_name), skills, rating, completed_jobs, location_lat, location_lng, is_verified')
          .not('location_lat', 'is', null)
          .limit(100)

        const ds = (workers || [])
          .map((w: any) => ({ ...w, khoangCachKm: haversine(viTri.viDo, viTri.kinhDo, w.location_lat, w.location_lng) }))
          .filter(w => w.khoangCachKm <= banKinh)
          .sort((a: any, b: any) => a.khoangCachKm - b.khoangCachKm)
          .slice(0, 20)

        // Mock data nếu DB trống (demo mode)
        const mockWorkers = ds.length === 0 ? [
          { id: 'mock-1', profiles: { full_name: 'Nguyễn Văn A' }, skills: ['sửa máy lạnh', 'điện'], rating: 4.5, completed_jobs: 120, khoangCachKm: 2.3 },
          { id: 'mock-2', profiles: { full_name: 'Trần Thị B' }, skills: ['ống nước', 'thông tắc'], rating: 4.8, completed_jobs: 89, khoangCachKm: 3.7 },
          { id: 'mock-3', profiles: { full_name: 'Lê Văn C' }, skills: ['điện dân dụng', 'camera'], rating: 4.2, completed_jobs: 56, khoangCachKm: 5.1 },
          { id: 'mock-4', profiles: { full_name: 'Phạm Văn D' }, skills: ['sơn', 'chống thấm'], rating: 4.6, completed_jobs: 203, khoangCachKm: 6.8 },
          { id: 'mock-5', profiles: { full_name: 'Hoàng Thị E' }, skills: ['sửa máy giặt', 'tủ lạnh'], rating: 4.9, completed_jobs: 310, khoangCachKm: 8.2 },
        ] : ds

        // ETA qua OSRM cho top 5
        const dsCoETA = await Promise.all(mockWorkers.slice(0, 5).map(async (w: any) => {
          try {
            const url = `${OSRM_BASE}/route/v1/driving/${viTri.kinhDo},${viTri.viDo};${w.location_lng},${w.location_lat}?overview=false`
            const res = await fetch(url, { headers: { 'User-Agent': 'VifixaAI/4.0' } })
            if (res.ok) {
              const data = await res.json()
              if (data.routes?.[0]) return { ...w, thoiGianPhut: Math.round(data.routes[0].duration / 60) }
            }
          } catch { /* fallback */ }
          return { ...w, thoiGianPhut: Math.round(w.khoangCachKm / 30 * 60) }
        }))

        const dauRa: DauRaNavigator = {
          danhSach: dsCoETA.map((w: any) => ({
            id: w.id, ten: w.profiles?.full_name || 'N/A',
            khoangCachKm: Math.round(w.khoangCachKm * 10) / 10,
            thoiGianPhut: w.thoiGianPhut || Math.round(w.khoangCachKm / 30 * 60),
            diemDanhGia: w.rating || 0, kyNang: w.skills || [],
          })),
          tongSo: ds.length,
        }
        return jsonResponse(dauRa)
      }

      case 'tinh_duong_di': {
        // OSRM driving route
        const { diemDen } = await req.json()
        if (!diemDen) return jsonResponse({ loi: 'Thiếu điểm đến' }, 400)

        const diem = Array.isArray(diemDen) ? diemDen : [diemDen]
        const toiUu = diem.length > 2
        const endpoint = toiUu ? 'trip' : 'route'
        const coords = `${viTri.kinhDo},${viTri.viDo};${diem.map((d: any) => `${d.kinhDo},${d.viDo}`).join(';')}`
        const params = toiUu ? `?source=first&roundtrip=false&overview=false` : `?overview=false`
        
        const res = await fetch(`${OSRM_BASE}/${endpoint}/v1/driving/${coords}${params}`, { headers: { 'User-Agent': 'VifixaAI/4.0' } })
        const data = await res.json()
        
        if (data.code !== 'Ok') {
          // Fallback: Haversine
          const ketQua = diem.map((d: any) => {
            const km = haversine(viTri.viDo, viTri.kinhDo, d.viDo, d.kinhDo)
            return { khoangCachKm: Math.round(km * 10) / 10, thoiGianPhut: Math.round(km / 30 * 60), nguon: 'haversine' }
          })
          return jsonResponse({ tuyenDuong: ketQua, tongKm: Math.round(ketQua.reduce((s: any, r: any) => s + r.khoangCachKm, 0) * 10) / 10 })
        }

        const legs = data.trips?.[0]?.legs || data.routes?.[0]?.legs || []
        const tuyenDuong = legs.map((leg: any, i: number) => ({
          tu: i === 0 ? viTri : diem[i - 1],
          den: toiUu ? diem[data.waypoints?.[i + 1]?.waypoint_index || i] : diem[i],
          khoangCachKm: Math.round(leg.distance / 1000 * 10) / 10,
          thoiGianPhut: Math.round(leg.duration / 60),
          nguon: 'osrm',
        }))

        return jsonResponse({ tuyenDuong, tongKm: Math.round(tuyenDuong.reduce((s: any, r: any) => s + r.khoangCachKm, 0) * 10) / 10 })
      }

      case 'nhiet_do': {
        // Heatmap: lấy dữ liệu nhu cầu từ orders
        const fromDate = new Date(Date.now() - 30 * 86400000).toISOString()
        let query = supabase
          .from('orders')
          .select('category, location_lat, location_lng, final_price, estimated_price')
          .not('location_lat', 'is', null)
          .gte('created_at', fromDate)
          .limit(500)
        if (danhMuc) query = query.eq('category', danhMuc)

        const { data: orders } = await query
        const cells: Record<string, { count: number; lat: number; lng: number; doanhThu: number }> = {}
        const gridSize = 0.02

        for (const o of orders || []) {
          const key = `${Math.round(((o.location_lat || 0) / gridSize))},${Math.round(((o.location_lng || 0) / gridSize))}`
          if (!cells[key]) {
            cells[key] = { count: 0, lat: Math.round((o.location_lat || 0) / gridSize) * gridSize, lng: Math.round((o.location_lng || 0) / gridSize) * gridSize, doanhThu: 0 }
          }
          cells[key].count++
          cells[key].doanhThu += (o.final_price || o.estimated_price || 0)
        }

        const grid = Object.values(cells).sort((a, b) => b.count - a.count)
        const maxCount = Math.max(...grid.map(g => g.count), 1)

        const features = grid.slice(0, 100).map(g => ({
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: [g.lng, g.lat] },
          properties: { nhietDo: g.count / maxCount, soDon: g.count, doanhThu: g.doanhThu },
        }))

        return jsonResponse({
          type: 'FeatureCollection', features,
          metadata: { tongDon: (orders || []).length, oNhuom: Object.keys(cells).length },
        })
      }

      case 'kiem_tra_vung': {
        // Check if a location is within service areas of available workers
        const { data: workers } = await supabase
          .from('workers')
          .select('id, profiles!inner(full_name), location_lat, location_lng, service_radius_km')
          .not('location_lat', 'is', null)
          .eq('is_verified', true)
          .limit(50)

        const phuHop = (workers || []).filter((w: any) => {
          const km = haversine(viTri.viDo, viTri.kinhDo, w.location_lat, w.location_lng)
          return km <= (w.service_radius_km || 20)
        })

        return jsonResponse({ trongVung: phuHop.length > 0, soTho: phuHop.length })
      }

      case 'du_doan_nhu_cau': {
        // Dự đoán nhu cầu dựa trên dữ liệu lịch sử
        const now = new Date()
        const gioHienTai = now.getHours()
        const thuTrongTuan = now.getDay() // 0=CN, 6=T7
        const haiTuanTruoc = new Date(now.getTime() - 14 * 86400000).toISOString()

        const { data: orders } = await supabase
          .from('orders')
          .select('category, location_lat, location_lng, created_at, estimated_price, final_price')
          .not('location_lat', 'is', null)
          .gte('created_at', haiTuanTruoc)
          .limit(500)

        // Gom theo khung giờ + khu vực
        const demandGrid: Record<string, { count: number; category: string; revenue: number }> = {}
        for (const o of orders || []) {
          const gio = new Date(o.created_at).getHours()
          const gridKey = `${Math.round((o.location_lat || 0) * 20)},${Math.round((o.location_lng || 0) * 20)}`
          const key = `${gridKey}_${gio}`
          if (!demandGrid[key]) demandGrid[key] = { count: 0, category: o.category, revenue: 0 }
          demandGrid[key].count++
          demandGrid[key].revenue += (o.final_price || o.estimated_price || 0)
        }

        // Dự đoán 4h tới
        const predictions: Array<{
          khuVuc: string; gio: number; soDonDuKien: number; doanhThuDuKien: number; danhMuc: string
        }> = []

        for (let h = 0; h < 4; h++) {
          const gioDuDoan = (gioHienTai + h) % 24
          // Tìm các khu vực có demand cao nhất trong khung giờ này
          const relevant = Object.entries(demandGrid)
            .filter(([k]) => k.endsWith(`_${gioDuDoan}`))
            .map(([k, v]) => ({ key: k, ...v }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5)

          for (const r of relevant) {
            const [latStr, lngStr] = r.key.split('_')
            predictions.push({
              khuVuc: `${(parseInt(latStr) / 20).toFixed(2)}, ${(parseInt(lngStr) / 20).toFixed(2)}`,
              gio: gioDuDoan,
              soDonDuKien: Math.max(1, Math.round(r.count / 14)), // Normalize to daily avg
              doanhThuDuKien: Math.round(r.revenue / 14),
              danhMuc: r.category,
            })
          }
        }

        // Top khu vực nên đến
        // Mock data cho demo
        if (predictions.length === 0) {
          const mock: any[] = [
            { khuVuc: '10.75, 106.70', gio: 8, soDonDuKien: 5, doanhThuDuKien: 2500000, danhMuc: 'air_conditioning' },
            { khuVuc: '10.80, 106.65', gio: 9, soDonDuKien: 4, doanhThuDuKien: 1800000, danhMuc: 'plumbing' },
            { khuVuc: '10.78, 106.72', gio: 10, soDonDuKien: 3, doanhThuDuKien: 1200000, danhMuc: 'electricity' },
            { khuVuc: '10.76, 106.68', gio: 14, soDonDuKien: 4, doanhThuDuKien: 2000000, danhMuc: 'air_conditioning' },
            { khuVuc: '10.82, 106.70', gio: 15, soDonDuKien: 3, doanhThuDuKien: 1500000, danhMuc: 'appliance' },
          ]
          predictions.push(...mock)
        }

        const topKhuVuc = predictions.sort((a, b) => b.soDonDuKien - a.soDonDuKien).slice(0, 10)

        return jsonResponse({
          thoiGianPhanTich: now.toISOString(),
          gioHienTai,
          thu: ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][thuTrongTuan],
          duDoan: topKhuVuc,
          deXuat: topKhuVuc.length > 0
            ? `Nên đến khu vực ${topKhuVuc[0].khuVuc} lúc ${topKhuVuc[0].gio}h — dự kiến ${topKhuVuc[0].soDonDuKien} đơn (${(topKhuVuc[0].doanhThuDuKien / 1000).toFixed(0)}K₫)`
            : 'Chưa đủ dữ liệu để dự đoán',
        })
      }

      case 'de_xuat_khu_vuc': {
        // Đề xuất khu vực cho thợ dựa trên vị trí hiện tại
        const { data: orders } = await supabase
          .from('orders')
          .select('id, category, location_lat, location_lng, estimated_price, final_price, created_at')
          .not('location_lat', 'is', null)
          .in('status', ['pending'])
          .gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString())
          .limit(200)

        const areas: Record<string, { count: number; category: string; km: number }> = {}
        for (const o of orders || []) {
          const km = haversine(viTri.viDo, viTri.kinhDo, o.location_lat || 0, o.location_lng || 0)
          if (km > (banKinh || 20)) continue
          const key = `${Math.round((o.location_lat || 0) * 10)},${Math.round((o.location_lng || 0) * 10)}`
          if (!areas[key]) areas[key] = { count: 0, category: o.category, km }
          areas[key].count++
        }

        const ds = Object.entries(areas)
          .map(([k, v]) => ({ khuVuc: k, ...v }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10)

        // Mock data cho demo
        const dsMock = ds.length === 0 ? [
          { khuVuc: '10.75,106.70', count: 5, category: 'air_conditioning', km: 3.2 },
          { khuVuc: '10.80,106.65', count: 3, category: 'plumbing', km: 5.1 },
          { khuVuc: '10.78,106.72', count: 4, category: 'electricity', km: 4.0 },
          { khuVuc: '10.76,106.68', count: 2, category: 'appliance', km: 2.8 },
        ] : ds

        return jsonResponse({
          viTriHienTai: viTri,
          banKinh,
          khuVucDeXuat: dsMock.map(d => ({
            toaDo: d.khuVuc,
            soDon: d.count,
            danhMucChinh: d.category,
            khoangCach: Math.round(d.km * 10) / 10,
          })),
          goiY: dsMock.length > 0
            ? `Có ${dsMock.length} đơn trong bán kính ${banKinh}km. Khu vực ${dsMock[0].khuVuc} có ${dsMock[0].count} đơn.`
            : 'Không có đơn nào trong khu vực.',
        })
      }

      default:
        return jsonResponse({ loi: `Không rõ hành động: ${hanhDong}` }, 400)
    }
  } catch (error: any) {
    console.error('Navigator lỗi:', error)
    return jsonResponse({ loi: error.message || 'Lỗi máy chủ' }, 500)
  }
})