'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Skeleton from '@/components/ui/Skeleton'

interface DistrictData {
  name: string
  lat: number
  lng: number
  pendingJobs: number
  availableWorkers: number
  gap: number
}

const HCMC_DISTRICTS = [
  { name: 'Quận 1', lat: 10.7769, lng: 106.6954 },
  { name: 'Quận 2', lat: 10.7874, lng: 106.7496 },
  { name: 'Quận 3', lat: 10.7793, lng: 106.6838 },
  { name: 'Quận 4', lat: 10.7598, lng: 106.7065 },
  { name: 'Quận 5', lat: 10.7546, lng: 106.6647 },
  { name: 'Quận 6', lat: 10.7469, lng: 106.6343 },
  { name: 'Quận 7', lat: 10.7387, lng: 106.7256 },
  { name: 'Quận 8', lat: 10.7228, lng: 106.6494 },
  { name: 'Quận 9', lat: 10.8275, lng: 106.7727 },
  { name: 'Quận 10', lat: 10.7704, lng: 106.6681 },
  { name: 'Quận 11', lat: 10.7627, lng: 106.6468 },
  { name: 'Quận 12', lat: 10.8616, lng: 106.6412 },
  { name: 'Bình Thạnh', lat: 10.8037, lng: 106.7096 },
  { name: 'Tân Bình', lat: 10.7987, lng: 106.6462 },
  { name: 'Tân Phú', lat: 10.7906, lng: 106.6177 },
  { name: 'Gò Vấp', lat: 10.8310, lng: 106.6660 },
  { name: 'Phú Nhuận', lat: 10.7955, lng: 106.6805 },
  { name: 'Thủ Đức', lat: 10.8504, lng: 106.7715 },
  { name: 'Bình Tân', lat: 10.7718, lng: 106.5972 },
  { name: 'Hóc Môn', lat: 10.8865, lng: 106.5953 },
  { name: 'Củ Chi', lat: 10.9733, lng: 106.4933 },
  { name: 'Nhà Bè', lat: 10.6912, lng: 106.7302 },
  { name: 'Bình Chánh', lat: 10.7497, lng: 106.5122 },
  { name: 'Cần Giờ', lat: 10.4115, lng: 106.9547 },
]

export default function AdminWorkforcePlanning() {
  const [districts, setDistricts] = useState<DistrictData[]>([])
  const [loading, setLoading] = useState(true)
  const [showMap, setShowMap] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  }

  async function loadData() {
    try {
      const [jobsRes, workersRes] = await Promise.all([
        supabase.from('orders').select('latitude, longitude, status').in('status', ['pending', 'diagnosed', 'quoted']),
        supabase.from('service_areas').select('worker_id, center_lat, center_lng, radius_km, is_active').eq('is_active', true),
      ])

      const jobs = (jobsRes.data || []) as any[]
      const areas = (workersRes.data || []) as any[]

      const result = HCMC_DISTRICTS.map((d) => {
        const pendingJobs = jobs.filter((j: any) => {
          const jLat = Number(j.latitude)
          const jLng = Number(j.longitude)
          if (isNaN(jLat) || isNaN(jLng)) return false
          return haversineKm(d.lat, d.lng, jLat, jLng) < 3
        }).length

        const availableWorkers = areas.filter((a: any) => {
          const aLat = Number(a.center_lat)
          const aLng = Number(a.center_lng)
          if (isNaN(aLat) || isNaN(aLng)) return false
          return haversineKm(d.lat, d.lng, aLat, aLng) < Number(a.radius_km || 10)
        }).length

        const workerIds = new Set(areas.map((a: any) => a.worker_id))

        return {
          name: d.name,
          lat: d.lat,
          lng: d.lng,
          pendingJobs,
          availableWorkers,
          gap: availableWorkers - pendingJobs,
        }
      })

      result.sort((a, b) => a.gap - b.gap)
      setDistricts(result)
    } catch (err) {
      console.error('Error loading workforce data:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-xl p-4 space-y-3">
        <Skeleton variant="text" width="160px" className="!bg-gray-700" />
        <Skeleton variant="rect" height="192px" className="rounded-lg !bg-gray-700" />
      </div>
    )
  }

  const totalPending = districts.reduce((s, d) => s + d.pendingJobs, 0)
  const totalWorkers = districts.reduce((s, d) => s + d.availableWorkers, 0)
  const deficitDistricts = districts.filter(d => d.gap < -2)
  const surplusDistricts = districts.filter(d => d.gap > 5)

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-200 text-sm">🧑‍💼 Workforce Planning</h3>
          <button
            onClick={loadData}
            className="text-[10px] text-indigo-400 hover:text-indigo-300 bg-gray-700 px-2 py-1 rounded"
          >
            Làm mới
          </button>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-3">
          <div className="bg-gray-700/50 rounded-lg p-2 text-center">
            <p className="text-lg font-bold text-amber-400">{totalPending}</p>
            <p className="text-[10px] text-gray-400">Đơn chờ</p>
          </div>
          <div className="bg-gray-700/50 rounded-lg p-2 text-center">
            <p className="text-lg font-bold text-emerald-400">{totalWorkers}</p>
            <p className="text-[10px] text-gray-400">Thợ khả dụng</p>
          </div>
          <div className="bg-gray-700/50 rounded-lg p-2 text-center">
            <p className={`text-lg font-bold ${deficitDistricts.length > 0 ? 'text-rose-400' : 'text-gray-400'}`}>
              {deficitDistricts.length}
            </p>
            <p className="text-[10px] text-gray-400">Khu vực thiếu</p>
          </div>
        </div>

        {deficitDistricts.length > 0 && (
          <div className="mt-3 bg-rose-900/30 border border-rose-800/50 rounded-lg p-3">
            <p className="text-[10px] font-bold text-rose-300 uppercase mb-1">⚠️ Cảnh báo thiếu thợ</p>
            {deficitDistricts.slice(0, 5).map(d => (
              <p key={d.name} className="text-xs text-rose-200">
                {d.name}: {d.pendingJobs} đơn — {d.availableWorkers} thợ (thiếu {Math.abs(d.gap)})
              </p>
            ))}
          </div>
        )}

        {surplusDistricts.length > 0 && (
          <div className="mt-2 bg-emerald-900/30 border border-emerald-800/50 rounded-lg p-3">
            <p className="text-[10px] font-bold text-emerald-300 uppercase mb-1">✅ Dư thừa thợ</p>
            {surplusDistricts.slice(0, 3).map(d => (
              <p key={d.name} className="text-xs text-emerald-200">
                {d.name}: {d.availableWorkers} thợ — {d.pendingJobs} đơn (dư {d.gap})
              </p>
            ))}
          </div>
        )}
      </div>

      <div className="max-h-64 overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-gray-700">
            <tr>
              <th className="text-left py-2 px-3 text-gray-400 font-medium">Khu vực</th>
              <th className="text-right py-2 px-3 text-gray-400 font-medium">Đơn</th>
              <th className="text-right py-2 px-3 text-gray-400 font-medium">Thợ</th>
              <th className="text-right py-2 px-3 text-gray-400 font-medium">Gap</th>
            </tr>
          </thead>
          <tbody>
            {districts.map((d) => (
              <tr key={d.name} className="border-t border-gray-700/50 hover:bg-gray-700/30">
                <td className="py-2 px-3 text-gray-300">{d.name}</td>
                <td className={`py-2 px-3 text-right font-medium ${d.pendingJobs > 5 ? 'text-amber-400' : 'text-gray-400'}`}>{d.pendingJobs}</td>
                <td className={`py-2 px-3 text-right font-medium ${d.availableWorkers > 0 ? 'text-emerald-400' : 'text-gray-500'}`}>{d.availableWorkers}</td>
                <td className={`py-2 px-3 text-right font-bold ${
                  d.gap < -2 ? 'text-rose-400' : d.gap > 5 ? 'text-emerald-400' : 'text-gray-400'
                }`}>
                  {d.gap > 0 ? '+' : ''}{d.gap}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="p-3 border-t border-gray-700">
        <p className="text-[10px] text-gray-500">
          Dữ liệu dựa trên đơn pending và service_areas của thợ. Bán kính 3km/quận.
        </p>
      </div>
    </div>
  )
}
