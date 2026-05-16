'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { haversineDistance } from '@/lib/haversine'
import DynamicMapView from './DynamicMapView'
import WorkerMapPopup from './WorkerMapPopup'
import BookWorkerModal from './BookWorkerModal'

interface Worker {
  id: string
  full_name: string
  phone: string
  avatar_url?: string
  skills: string[]
  trust_score: number
  is_verified: boolean
  is_online: boolean
  rating_avg: number
  order_count: number
  location_lat: number
  location_lng: number
}

interface Props {
  onWorkerSelect?: (workerId: string) => void
  requiredSkills?: string[]
  maxDistance?: number
  className?: string
}

export default function AvailableWorkersMap({
  onWorkerSelect,
  requiredSkills = [],
  maxDistance = 20,
  className = '',
}: Props) {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [workers, setWorkers] = useState<Worker[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null)
  const [showBookModal, setShowBookModal] = useState(false)

  useEffect(() => {
    loadWorkers()
  }, [requiredSkills])

  async function loadWorkers() {
    try {
      if (!navigator.geolocation) { setError('Trình duyệt không hỗ trợ định vị'); return }
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 })
      })

      const userLat = pos.coords.latitude
      const userLng = pos.coords.longitude
      setLocation({ lat: userLat, lng: userLng })

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setError('Vui lòng đăng nhập'); return }

      const { data: workersData, error: workersError } = await supabase
        .from('workers')
        .select('id, full_name, phone, avatar_url, skills, trust_score, is_verified, is_online, rating_avg, order_count, location_lat, location_lng')
        .eq('is_verified', true)
        .not('location_lat', 'is', null)
        .not('location_lng', 'is', null)

      if (workersError) throw workersError

      let filtered = (workersData || []).map((w: any) => ({
        id: w.id,
        full_name: w.full_name || 'Thợ',
        phone: w.phone || '',
        avatar_url: w.avatar_url,
        skills: w.skills || [],
        trust_score: w.trust_score || 50,
        is_verified: w.is_verified || false,
        is_online: w.is_online || false,
        rating_avg: w.rating_avg || 0,
        order_count: w.order_count || 0,
        location_lat: w.location_lat,
        location_lng: w.location_lng,
      }))

      // Filter by skills
      if (requiredSkills.length > 0) {
        filtered = filtered.filter(w =>
          requiredSkills.some(s => w.skills.some((ws: string) => ws.toLowerCase().includes(s.toLowerCase())))
        )
      }

      // Filter by distance
      filtered = filtered.filter(w => {
        if (!w.location_lat || !w.location_lng) return false
        const dist = haversineDistance(userLat, userLng, w.location_lat, w.location_lng)
        return dist <= maxDistance
      })

      // Sort: online first, then by trust score
      filtered.sort((a, b) => {
        if (a.is_online !== b.is_online) return a.is_online ? -1 : 1
        return (b.trust_score || 0) - (a.trust_score || 0)
      })

      setWorkers(filtered)
    } catch (err: any) {
      setError(err.message || 'Lỗi tải danh sách thợ')
    } finally {
      setLoading(false)
    }
  }

  const handleBook = useCallback((workerId: string) => {
    setSelectedWorkerId(workerId)
    setShowBookModal(true)
  }, [])

  if (loading) {
    return (
      <div className={`flex items-center justify-center min-h-[300px] ${className}`}>
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          <p className="text-sm text-gray-500">Đang tìm thợ gần bạn...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center min-h-[300px] ${className}`}>
        <div className="text-center">
          <p className="text-red-500 text-sm mb-3">{error}</p>
          <button onClick={() => { setLoading(true); setError(null); loadWorkers() }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Thử lại</button>
        </div>
      </div>
    )
  }

  if (!location) {
    return (
      <div className={`flex items-center justify-center min-h-[300px] ${className}`}>
        <p className="text-gray-500 text-sm">Đang lấy vị trí của bạn...</p>
      </div>
    )
  }

  const selectedWorker = selectedWorkerId ? workers.find(w => w.id === selectedWorkerId) : null

  return (
    <div className={`relative ${className}`}>
      <DynamicMapView
        center={[location.lat, location.lng]}
        zoom={13}
        markers={workers.map(w => ({
          position: [w.location_lat, w.location_lng] as [number, number],
          title: w.full_name,
          onClick: () => setSelectedWorkerId(w.id),
        }))}
        style={{ height: '100%', width: '100%' }}
      />

      {/* Selected worker popup */}
      {selectedWorker && !showBookModal && (
        <div className="absolute bottom-4 left-4 right-4 z-10" style={{ maxWidth: 320, margin: '0 auto' }}>
          <WorkerMapPopup
            worker={selectedWorker}
            userLocation={location}
            onBook={handleBook}
            onClose={() => setSelectedWorkerId(null)}
          />
        </div>
      )}

      {/* Count badge */}
      {workers.length > 0 && (
        <div className="absolute top-4 right-4 z-10 bg-white rounded-full shadow-lg px-3 py-1.5 text-sm font-medium text-gray-700">
          {workers.filter(w => w.is_online).length}/{workers.length} thợ online
        </div>
      )}

      {/* Book modal */}
      {showBookModal && selectedWorker && (
        <BookWorkerModal
          workerId={selectedWorker.id}
          workerName={selectedWorker.full_name}
          customerLocation={location}
          onClose={() => { setShowBookModal(false); setSelectedWorkerId(null) }}
          onSuccess={() => { setShowBookModal(false); setSelectedWorkerId(null) }}
        />
      )}
    </div>
  )
}
