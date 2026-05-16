'use client'

import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

interface Props {
  workerId: string
  interval?: number
}

export default function WorkerLocationTracker({ workerId, interval = 30000 }: Props) {
  const watchRef = useRef<number | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!navigator.geolocation) return

    // Mark online on mount
    supabase.from('workers').update({
      is_online: true,
      last_seen_at: new Date().toISOString(),
      status: 'online',
    }).eq('id', workerId).then()

    // Watch position continuously
    watchRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude, longitude, accuracy, heading, speed } = pos.coords

        await supabase.from('workers').update({
          location_lat: latitude,
          location_lng: longitude,
          last_seen_at: new Date().toISOString(),
        }).eq('id', workerId)

        // Record in history
        await supabase.from('worker_location_history').insert({
          worker_id: workerId,
          lat: latitude,
          lng: longitude,
          accuracy: accuracy || null,
          heading: heading || null,
          speed: speed || null,
        })
      },
      (err) => console.warn('[LocationTracker] Error:', err.message),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 },
    )

    // Periodic online heartbeat
    intervalRef.current = setInterval(async () => {
      await supabase.from('workers').update({
        is_online: true,
        last_seen_at: new Date().toISOString(),
      }).eq('id', workerId)
    }, interval)

    return () => {
      if (watchRef.current) navigator.geolocation.clearWatch(watchRef.current)
      if (intervalRef.current) clearInterval(intervalRef.current)
      // Mark offline on unmount
      supabase.from('workers').update({
        is_online: false,
        status: 'offline',
      }).eq('id', workerId).then()
    }
  }, [workerId, interval])

  return null
}
