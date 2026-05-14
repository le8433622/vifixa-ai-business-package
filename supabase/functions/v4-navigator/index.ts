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

      default:
        return jsonResponse({ loi: `Không rõ hành động: ${hanhDong}` }, 400)
    }
  } catch (error: any) {
    console.error('Navigator lỗi:', error)
    return jsonResponse({ loi: error.message || 'Lỗi máy chủ' }, 500)
  }
})