'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { haversineDistance, formatDistance, formatDuration } from '@/lib/haversine'
import DynamicMapView from './DynamicMapView'

interface Props {
  orderId: string
  workerId: string
  customerLocation?: { lat: number; lng: number }
}

export default function WorkerTracker({ orderId, workerId, customerLocation }: Props) {
  const [workerPos, setWorkerPos] = useState<{ lat: number; lng: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [eta, setEta] = useState<string>('')

  useEffect(() => {
    if (!workerId) return

    // Load current position
    supabase.from('workers').select('location_lat, location_lng').eq('id', workerId).single().then(({ data }) => {
      if (data?.location_lat && data?.location_lng) {
        setWorkerPos({ lat: data.location_lat, lng: data.location_lng })
      }
      setLoading(false)
    })

    // Subscribe to real-time location updates
    const channel = supabase
      .channel(`worker-location-${orderId}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'workers', filter: `id=eq.${workerId}` },
        (payload) => {
          const lat = payload.new?.location_lat as number
          const lng = payload.new?.location_lng as number
          if (lat && lng) {
            setWorkerPos({ lat, lng })
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [workerId, orderId])

  // Calculate ETA
  useEffect(() => {
    if (workerPos && customerLocation) {
      const dist = haversineDistance(workerPos.lat, workerPos.lng, customerLocation.lat, customerLocation.lng)
      const minutes = Math.round((dist / 25) * 60) // assuming 25km/h avg
      setEta(formatDuration(minutes))
    }
  }, [workerPos, customerLocation])

  if (loading) {
    return (
      <div className="h-40 bg-gray-100 rounded-xl flex items-center justify-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!workerPos) {
    return (
      <div className="h-40 bg-gray-100 rounded-xl flex items-center justify-center">
        <p className="text-sm text-gray-500">Thợ chưa chia sẻ vị trí</p>
      </div>
    )
  }

  const markers: { position: [number, number]; title: string }[] = []
  markers.push({
    position: [workerPos.lat, workerPos.lng] as [number, number],
    title: '📍 Thợ',
  })
  if (customerLocation) {
    markers.push({
      position: [customerLocation.lat, customerLocation.lng] as [number, number],
      title: '📍 Vị trí của bạn',
    })
  }

  return (
    <div className="space-y-2">
      <div className="h-40 rounded-xl overflow-hidden border">
        <DynamicMapView
          center={[workerPos.lat, workerPos.lng]}
          zoom={14}
          markers={markers}
          style={{ height: '100%', width: '100%' }}
        />
      </div>
      <div className="flex items-center justify-between text-sm px-2">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
          <span className="text-gray-600">Thợ đang di chuyển</span>
        </div>
        {eta && (
          <span className="font-bold text-blue-600">
            📍 {formatDistance(workerPos && customerLocation ? haversineDistance(workerPos.lat, workerPos.lng, customerLocation.lat, customerLocation.lng) : 0)} · ~{eta}
          </span>
        )}
      </div>
    </div>
  )
}
