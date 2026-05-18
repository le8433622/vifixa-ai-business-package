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
        try {
          await supabase.from('worker_location_history').insert({
            worker_id: session.user.id,
            lat: location.coords.latitude,
            lng: location.coords.longitude,
            accuracy: location.coords.accuracy,
            recorded_at: new Date().toISOString(),
          });
        } catch {}
      }
    }
  }
})

export async function startTracking() {
  const { status } = await Location.requestForegroundPermissionsAsync()
  if (status !== 'granted') return

  const bgStatus = await Location.requestBackgroundPermissionsAsync()
  if (bgStatus.status !== 'granted') return

  await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: 30000,
    distanceInterval: 50,
    foregroundService: {
      notificationTitle: 'Vifixa AI',
      notificationBody: 'Đang cập nhật vị trí...',
    },
    pausesUpdatesAutomatically: false,
  })
}

export async function stopTracking() {
  await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME)
}

export function useBackgroundLocation() {
  useEffect(() => {
    startTracking()
  }, [])
}