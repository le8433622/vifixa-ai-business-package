// 🗺️ OSM Route — Tính khoảng cách lái xe thực tế qua OSRM
// Sử dụng: router.project-osrm.org (miễn phí, rate limit 1 req/s)
// Hỗ trợ: driving, walking, cycling

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { jsonResponse, handleOptions } from '../_shared/auth-helper.ts'
import { createAIAudit } from '../_shared/ai-audit.ts'

const OSRM_BASE = 'https://router.project-osrm.org'

interface ToaDo { viDo: number; kinhDo: number }

interface YeuCauRoute {
  diemDi: ToaDo
  diemDen: ToaDo[] | ToaDo
  phuongTien?: 'driving' | 'walking' | 'cycling'
  toiUu?: boolean // Sắp xếp nhiều điểm đến theo route tối ưu
}

Deno.serve(async (req) => {
  const opt = handleOptions(req)
  if (opt) return opt

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { diemDi, diemDen, phuongTien = 'driving', toiUu = false }: YeuCauRoute = await req.json()
    if (!diemDi || !diemDen) return jsonResponse({ error: 'Thiếu điểm đi/đến' }, 400)

    const diem = Array.isArray(diemDen) ? diemDen : [diemDen]
    const profile = phuongTien
    const maYeuCau = crypto.randomUUID()

    // Nếu có nhiều điểm và cần tối ưu, dùng Trip API
    if (toiUu && diem.length > 2) {
      const coords = `${diemDi.kinhDo},${diemDi.viDo};${diem.map(d => `${d.kinhDo},${d.viDo}`).join(';')}`
      const url = `${OSRM_BASE}/trip/v1/${profile}/${coords}?source=first&roundtrip=false&overview=false`
      const res = await fetch(url, { headers: { 'User-Agent': 'VifixaAI/2.0' } })
      if (!res.ok) {
        // Fallback: tính từng cặp
        return xuLyTungCap(diemDi, diem, profile)
      }
      const data = await res.json()
      if (data.code !== 'Ok') return xuLyTungCap(diemDi, diem, profile)

      const waypoints = data.waypoints || []
      const legs = data.trips?.[0]?.legs || []

      // Sắp xếp lại theo thứ tự tối ưu
      const thuTu = waypoints.map((w: any) => w.waypoint_index)
      const diemSapXep = thuTu.slice(1).map((i: number) => diem[i]) // bỏ điểm đầu

      const ketQua = legs.map((leg: any, i: number) => ({
        tu: i === 0 ? diemDi : diemSapXep[i - 1],
        den: diemSapXep[i],
        khoangCachKm: round(leg.distance / 1000),
        thoiGianPhut: round(leg.duration / 60),
      }))

      const audit = createAIAudit(supabase)
      await audit.log({
        agentType: 'osm_route', requestId: maYeuCau,
        input: { diemDi, soDiem: diem.length, phuongTien, toiUu },
        output: { tuyenDuong: ketQua, tinhTrang: 'toi_uu' },
      })

      return jsonResponse({
        thanhCong: true, loai: 'trip', phuongTien: profile,
        tuyenDuong: ketQua,
        tongKhoangCach: round(ketQua.reduce((s: number, r: any) => s + r.khoangCachKm, 0)),
        tongThoiGian: round(ketQua.reduce((s: number, r: any) => s + r.thoiGianPhut, 0)),
        thuTuToiUu: thuTu,
      })
    }

    // Route đơn giản: từng cặp
    return xuLyTungCap(diemDi, diem, profile, maYeuCau)
  } catch (error: any) {
    console.error('Route error:', error)
    return jsonResponse({ error: error.message || 'Lỗi máy chủ' }, 500)
  }
})

async function xuLyTungCap(diemDi: ToaDo, diem: ToaDo[], profile: string, maYeuCau?: string) {
  const ketQua = []
  for (const d of diem) {
    try {
      const url = `${OSRM_BASE}/route/v1/${profile}/${diemDi.kinhDo},${diemDi.viDo};${d.kinhDo},${d.viDo}?overview=false`
      const res = await fetch(url, { headers: { 'User-Agent': 'VifixaAI/2.0' } })
      if (!res.ok) {
        // Fallback Haversine
        const km = haversine(diemDi, d)
        ketQua.push({ tu: diemDi, den: d, khoangCachKm: round(km), thoiGianPhut: round(km / 30 * 60), nguon: 'haversine' })
        continue
      }
      const data = await res.json()
      if (data.code !== 'Ok' || !data.routes?.[0]) {
        const km = haversine(diemDi, d)
        ketQua.push({ tu: diemDi, den: d, khoangCachKm: round(km), thoiGianPhut: round(km / 30 * 60), nguon: 'haversine' })
        continue
      }
      const route = data.routes[0]
      ketQua.push({
        tu: diemDi, den: d,
        khoangCachKm: round(route.distance / 1000),
        thoiGianPhut: round(route.duration / 60),
        nguon: 'osrm',
      })
    } catch {
      const km = haversine(diemDi, d)
      ketQua.push({ tu: diemDi, den: d, khoangCachKm: round(km), thoiGianPhut: round(km / 30 * 60), nguon: 'haversine' })
    }
  }

  return jsonResponse({
    thanhCong: true, loai: 'route', phuongTien: profile,
    tuyenDuong: ketQua,
    tongKhoangCach: round(ketQua.reduce((s: number, r: any) => s + r.khoangCachKm, 0)),
    tongThoiGian: round(ketQua.reduce((s: number, r: any) => s + r.thoiGianPhut, 0)),
  })
}

function haversine(a: ToaDo, b: ToaDo): number {
  const R = 6371
  const dLat = (b.viDo - a.viDo) * Math.PI / 180
  const dLng = (b.kinhDo - a.kinhDo) * Math.PI / 180
  const lat1 = a.viDo * Math.PI / 180
  const lat2 = b.viDo * Math.PI / 180
  const x = Math.sin(dLat/2)**2 + Math.sin(dLng/2)**2 * Math.cos(lat1) * Math.cos(lat2)
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1-x))
}

function round(n: number): number { return Math.round(n * 10) / 10 }