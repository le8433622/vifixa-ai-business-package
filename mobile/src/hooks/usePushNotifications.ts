import { useEffect, useRef } from 'react'
import { Platform } from 'react-native'
import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { supabase } from '@/lib/supabase'

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

export function usePushNotifications() {
  const registered = useRef(false)

  useEffect(() => {
    if (registered.current) return
    registerPushToken()
    return () => { registered.current = true }
  }, [])

  async function registerPushToken() {
    if (!Device.isDevice) return

    const { status: existing } = await Notifications.getPermissionsAsync()
    let finalStatus = existing
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync()
      finalStatus = status
    }
    if (finalStatus !== 'granted') return

    try {
      const tokenData = await Notifications.getExpoPushTokenAsync()
      const token = tokenData.data

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      await fetch(`${SUPABASE_URL}/functions/v1/register-device`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, platform: 'expo' }),
      })
    } catch (e) {
      console.error('[push] registration error:', e)
    }
  }
}