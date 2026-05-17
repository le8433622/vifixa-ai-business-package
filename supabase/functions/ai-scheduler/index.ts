// AI Scheduler — Predictive care reminders
// Chạy hàng ngày: kiểm tra device_profiles → predict → reminder
// Gọi từ: Vercel Cron (cron.yaml) hoặc Supabase pg_cron via service_role

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { jsonResponse, handleOptions } from '../_shared/auth-helper.ts'

interface DeviceForCheck {
  id: string
  user_id: string
  device_type: string
  brand?: string
  model?: string
  purchase_date?: string
  last_maintenance?: string
}

Deno.serve(async (req: Request) => {
  const opt = handleOptions(req)
  if (opt) return opt

  const authHeader = req.headers.get('Authorization') || ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!serviceRoleKey || authHeader !== `Bearer ${serviceRoleKey}`) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    serviceRoleKey,
  )

  try {
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    const { data: devices } = await supabase
      .from('device_profiles')
      .select('id, user_id, device_type, brand, model, purchase_date, last_maintenance')
      .or(`last_maintenance.is.null,last_maintenance.lte.${sixMonthsAgo.toISOString()}`)
      .limit(50)

    if (!devices || devices.length === 0) {
      return jsonResponse({ success: true, checked: 0, reminders: 0 })
    }

    let remindersCreated = 0

    for (const device of devices as DeviceForCheck[]) {
      const deviceAge = device.purchase_date
        ? Math.floor((Date.now() - new Date(device.purchase_date).getTime()) / 86400000 / 30)
        : 0

      const monthsSinceMaintenance = device.last_maintenance
        ? Math.floor((Date.now() - new Date(device.last_maintenance).getTime()) / 86400000 / 30)
        : 99

      let urgency: 'low' | 'medium' | 'high' = 'low'
      if (monthsSinceMaintenance >= 12 || deviceAge >= 60) urgency = 'high'
      else if (monthsSinceMaintenance >= 6 || deviceAge >= 36) urgency = 'medium'

      if (urgency === 'medium' || urgency === 'high') {
        const title = urgency === 'high'
          ? `Cần bảo trì gấp: ${device.brand || ''} ${device.model || device.device_type}`
          : `Nhắc bảo trì: ${device.brand || ''} ${device.model || device.device_type}`

        const body = urgency === 'high'
          ? `Thiết bị ${device.brand || ''} ${device.model || device.device_type} đã ${monthsSinceMaintenance} tháng chưa bảo trì. Nên đặt lịch ngay để tránh hư hỏng.`
          : `Đã ${monthsSinceMaintenance} tháng kể từ lần bảo trì cuối. Đặt lịch kiểm tra định kỳ để thiết bị hoạt động tốt.`

        const { error: insertError } = await supabase
          .from('in_app_notifications')
          .insert({
            user_id: device.user_id,
            title,
            body,
            category: 'maintenance_reminder',
            priority: urgency === 'high' ? 'high' : 'normal',
          })

        if (insertError) {
          console.error('[ai-scheduler] insert notification error:', insertError)
        } else {
          remindersCreated++
        }
      }
    }

    return jsonResponse({
      success: true,
      checked: devices.length,
      reminders: remindersCreated,
    })
  } catch (error: any) {
    console.error('[ai-scheduler] error:', error)
    return jsonResponse({ error: error.message }, 500)
  }
})