import { useEffect } from 'react'
import * as TaskManager from 'expo-task-manager'
import * as Location from 'expo-location'
import { supabase } from '@/lib/supabase'

const LOCATION_TASK_NAME = 'vifixa-background-location'

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }: any) => {
  if (error) return
  if (data?.locations) {
    const location = data.locations[data.locations.length - 1]
    if (location?.coords) {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        await supabase.from('worker_location_logs').insert({
          worker_id: session.user.id,
          lat: location.coords.latitude,
          lng: location.coords.longitude,
          accuracy: location.coords.accuracy,
          recorded_at: new Date().toISOString(),
        }).catch(() => {})
      }
    }
  }
})

export function useBackgroundLocation() {
  useEffect(() => {
    startBackgroundTracking()
  }, [])

  async function startBackgroundTracking() {
    const { status } = await Location.requestForegroundPermissionsAsync()
    if (status !== 'granted') return

    const bgStatus = await Location.requestBackgroundPermissionsAsync()
    if (bgStatus.status !== 'granted') return

    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 30000,       // 30s
      distanceInterval: 50,      // 50m
      foregroundService: {
        notificationTitle: 'Vifixa AI',
        notificationBody: 'Đang cập nhật vị trí...',
      },
      pausesUpdatesAutomatically: false,
    })
  }
}