'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import Skeleton from '@/components/ui/Skeleton'
import DynamicMapView from '@/components/map/DynamicMapView'
import { useToast } from '@/components/Toast'

interface Job {
  id: string
  title: string
  address: string
  service_type: string
  estimated_price: number
  status: string
  latitude: number
  longitude: number
  distance_km?: number
  duration_min?: number
}

interface Waypoint {
  lat: number
  lng: number
}

interface RouteResult {
  success: boolean
  route: { latitude: number; longitude: number }[]
  waypoints: { latitude: number; longitude: number; name: string }[]
  distance_km: string
  duration_min: number
  legs: number
  fallback?: boolean
}

export default function WorkerRouteOptimizer({ workerId, onRouteReady }: { workerId: string; onRouteReady?: (route: RouteResult) => void }) {
  const [currentLat, setCurrentLat] = useState(10.8231)
  const [currentLng, setCurrentLng] = useState(106.6297)
  const [jobs, setJobs] = useState<Job[]>([])
  const [selectedJobIds, setSelectedJobIds] = useState<Set<string>>(new Set())
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [optimizing, setOptimizing] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCurrentLat(pos.coords.latitude)
          setCurrentLng(pos.coords.longitude)
        },
        () => {},
        { timeout: 5000, enableHighAccuracy: false }
      )
    }
  }, [])

  useEffect(() => {
    loadJobs()
  }, [currentLat, currentLng])

  async function loadJobs() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { data: jobsData } = await supabase
        .from('orders')
        .select('id, service_type, estimated_price, status, latitude, longitude, address, title')
        .eq('status', 'pending')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .limit(50)

      if (!jobsData) return

      const scored = jobsData.map((j: any) => {
        const d = haversine(currentLat, currentLng, Number(j.latitude) || 0, Number(j.longitude) || 0)
        return { ...j, distance_km: +(d.distance / 1000).toFixed(1), duration_min: Math.round(d.duration / 60) }
      })

      scored.sort((a: Job, b: Job) => (a.distance_km || 999) - (b.distance_km || 999))
      setJobs(scored.slice(0, 20))
    } catch (err) {
      console.error('Error loading jobs for route:', err)
    } finally {
      setLoading(false)
    }
  }

  function haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
    const R = 6371000
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
    const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return { distance: dist, duration: (dist / 25000) * 3600 }
  }

  function toggleJob(jobId: string) {
    setSelectedJobIds(prev => {
      const next = new Set(prev)
      if (next.has(jobId)) next.delete(jobId)
      else next.add(jobId)
      return next
    })
  }

  async function optimizeRoute() {
    const selected = jobs.filter(j => selectedJobIds.has(j.id))
    if (selected.length === 0) {
      toast('Chọn ít nhất 1 việc để tối ưu route', 'error')
      return
    }

    const waypoints: Waypoint[] = [
      { lat: currentLat, lng: currentLng },
      ...selected.map(j => ({ lat: Number(j.latitude), lng: Number(j.longitude) })),
    ]

    setOptimizing(true)
    try {
      const { data, error } = await supabase.functions.invoke('osrm-route', {
        method: 'POST',
        body: { waypoints },
      })

      if (error) throw error
      setRouteResult(data as RouteResult)
      onRouteReady?.(data as RouteResult)
      toast('Route đã được tối ưu!', 'success')
    } catch (err: any) {
      toast(err?.message || 'Lỗi khi tối ưu route', 'error')
    } finally {
      setOptimizing(false)
    }
  }

  const routeCoords: [number, number][] | undefined = routeResult?.route?.map(r => [r.latitude, r.longitude] as [number, number])

  const markers: { position: [number, number]; title?: string }[] = []

  markers.push({ position: [currentLat, currentLng], title: '📍 Vị trí của bạn' })

  for (const j of (routeResult?.waypoints?.length ? [] : selectedJobIds.size > 0 ? jobs.filter(j => selectedJobIds.has(j.id)) : [])) {
    markers.push({ position: [Number(j.latitude), Number(j.longitude)], title: j.title || j.address })
  }

  if (routeResult?.waypoints) {
    for (const wp of routeResult.waypoints) {
      markers.push({ position: [wp.latitude, wp.longitude], title: wp.name || 'Điểm đến' })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Tối ưu lộ trình</h3>
        {routeResult && (
          <div className="text-sm text-emerald-600 font-medium">
            {routeResult.distance_km} km · {routeResult.duration_min} phút
            {routeResult.fallback && <span className="text-amber-500 ml-2">(ước tính)</span>}
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} variant="rect" height="64px" className="rounded-xl" />)}
        </div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-8 text-gray-400">Không có việc nào khả dụng trong khu vực</div>
      ) : (
        <>
          <div className="h-64 rounded-xl overflow-hidden border">
            <DynamicMapView
              center={[currentLat, currentLng]}
              zoom={13}
              markers={markers.map(m => ({ position: m.position, title: m.title }))}
              route={routeCoords}
            />
          </div>

          <div className="max-h-64 overflow-y-auto space-y-2">
            {jobs.map((job) => {
              const isSelected = selectedJobIds.has(job.id)
              const isInRoute = routeResult?.waypoints?.some(
                wp => Math.abs(wp.latitude - Number(job.latitude)) < 0.001 && Math.abs(wp.longitude - Number(job.longitude)) < 0.001
              )
              return (
                <button
                  key={job.id}
                  onClick={() => toggleJob(job.id)}
                  className={`w-full text-left rounded-xl border-2 p-3 transition-all ${
                    isSelected || isInRoute
                      ? 'border-emerald-500 bg-emerald-50 shadow-sm'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{job.title || job.address || job.service_type}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{job.address}</p>
                    </div>
                    <div className="text-right ml-3 flex-shrink-0">
                      <p className="text-sm font-semibold text-gray-900">{job.estimated_price?.toLocaleString()}₫</p>
                      <p className="text-xs text-gray-400">{job.distance_km} km</p>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          <button
            onClick={optimizeRoute}
            disabled={selectedJobIds.size === 0 || optimizing}
            className={`w-full py-3 rounded-xl font-medium text-white transition-all ${
              optimizing
                ? 'bg-gray-400 cursor-wait'
                : selectedJobIds.size === 0
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-md'
            }`}
          >
            {optimizing
              ? 'Đang tối ưu...'
              : `Tối ưu route (${selectedJobIds.size} việc)`}
          </button>
        </>
      )}
    </div>
  )
}
