import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { verifyAuth, jsonResponse, handleOptions } from '../_shared/auth-helper.ts'

type NotifyType =
  | 'new_job'
  | 'job_accepted'
  | 'worker_arriving'
  | 'worker_eta'
  | 'job_completed'
  | 'payment_received'
  | 'request_review'
  | 'receipt'
  | 'account_locked'
  | 'kyc_approved'
  | 'kyc_rejected'
  | 'promotion'
  | 'system_alert'

interface NotifyRequest {
  type: NotifyType
  user_id: string
  order_id?: string
  worker_name?: string
  customer_name?: string
  category?: string
  description?: string
  amount?: number
  message?: string
}

const NOTIFICATION_TEMPLATES: Record<NotifyType, { title: string; buildBody: (d: NotifyRequest) => string; priority: string; sms?: (d: NotifyRequest) => string }> = {
  new_job: {
    title: '📋 Đơn hàng mới',
    buildBody: (d) => `Bạn có đơn hàng mới: ${d.category || 'dịch vụ'} tại ${d.description?.substring(0, 50) || 'đã được đặt'}.`,
    priority: 'high',
    sms: (d) => `VIFIXA: Ban co don hang moi - ${d.category || 'dich vu'}. Xem ngay: https://web-eta-ochre-99.vercel.app/worker/jobs`,
  },
  job_accepted: {
    title: '🔧 Thợ đã nhận việc',
    buildBody: (d) => `Thợ ${d.worker_name || 'đã được phân công'} đã nhận đơn hàng của bạn.`,
    priority: 'high',
    sms: (d) => `VIFIXA: Tho ${d.worker_name || ''} da nhan don hang. Theo doi: https://web-eta-ochre-99.vercel.app/customer/orders/${d.order_id}`,
  },
  worker_arriving: {
    title: '🚶 Thợ đang đến',
    buildBody: (d) => `Thợ ${d.worker_name || 'của bạn'} đang trên đường đến. Chuẩn bị đón tiếp!`,
    priority: 'urgent',
    sms: (d) => `VIFIXA: Tho ${d.worker_name || ''} dang den. Chuan bi don tiep!`,
  },
  worker_eta: {
    title: '📍 Cập nhật vị trí',
    buildBody: () => 'Thợ đang trên đường đến địa chỉ của bạn.',
    priority: 'normal',
  },
  job_completed: {
    title: '✅ Hoàn thành',
    buildBody: () => 'Dịch vụ đã hoàn thành. Vui lòng kiểm tra và đánh giá!',
    priority: 'high',
    sms: (d) => `VIFIXA: Dich vu da hoan thanh. Danh gia ngay: https://web-eta-ochre-99.vercel.app/customer/orders/${d.order_id}`,
  },
  payment_received: {
    title: '💳 Thanh toán thành công',
    buildBody: (d) => `Đã nhận thanh toán ${d.amount ? `${d.amount.toLocaleString()}đ` : ''}. Cảm ơn bạn!`,
    priority: 'high',
  },
  request_review: {
    title: '⭐ Đánh giá dịch vụ',
    buildBody: () => 'Hãy dành 1 phút để đánh giá chất lượng dịch vụ nhé!',
    priority: 'normal',
  },
  receipt: {
    title: '🧾 Hóa đơn điện tử',
    buildBody: (d) => `Hóa đơn dịch vụ: ${d.amount ? `${d.amount.toLocaleString()}đ` : ''} - ${d.worker_name || ''}`,
    priority: 'normal',
  },
  account_locked: {
    title: '🔒 Tài khoản bị khóa',
    buildBody: () => 'Tài khoản của bạn đã bị khóa. Liên hệ admin để biết thêm chi tiết.',
    priority: 'urgent',
  },
  kyc_approved: {
    title: '✅ KYC được duyệt',
    buildBody: () => 'Hồ sơ KYC của bạn đã được duyệt! Giờ bạn có thể nhận đơn hàng.',
    priority: 'high',
    sms: (d) => `VIFIXA: Ho so KYC cua ban da duoc duyet! Nhan don hang ngay.`,
  },
  kyc_rejected: {
    title: '❌ KYC bị từ chối',
    buildBody: () => 'Hồ sơ KYC của bạn bị từ chối. Vui lòng tải lại CMND/CCCD rõ nét hơn.',
    priority: 'high',
  },
  promotion: {
    title: '🎉 Khuyến mãi',
    buildBody: (d) => d.message || 'Có chương trình khuyến mãi đặc biệt cho bạn!',
    priority: 'low',
  },
  system_alert: {
    title: '🔔 Thông báo hệ thống',
    buildBody: (d) => d.message || 'Có thông báo mới từ hệ thống.',
    priority: 'normal',
  },
}

async function sendSms(phone: string, message: string): Promise<void> {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN')
  const messagingServiceSid = Deno.env.get('TWILIO_MESSAGING_SERVICE_SID')
  if (!accountSid || !authToken || !messagingServiceSid) return

  const normalizedPhone = phone.startsWith('0')
    ? '+84' + phone.slice(1)
    : phone.startsWith('+84') ? phone : '+84' + phone

  try {
    const twilioResp = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          MessagingServiceSid: messagingServiceSid,
          To: normalizedPhone,
          Body: message,
        }),
      }
    )
    if (!twilioResp.ok) {
      const errText = await twilioResp.text()
      console.error('[notify] Twilio error:', errText)
    }
  } catch (e) {
    console.error('[notify] Twilio send failed:', e)
  }
}

Deno.serve(async (req: Request) => {
  const opt = handleOptions(req)
  if (opt) return opt
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  try {
    const user = await verifyAuth(req)
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401)

    const body: NotifyRequest = await req.json()
    const { type, user_id, order_id } = body

    if (!type || !user_id) {
      return jsonResponse({ error: 'Missing type or user_id' }, 400)
    }

    const template = NOTIFICATION_TEMPLATES[type]
    if (!template) {
      return jsonResponse({ error: `Unknown notification type: ${type}` }, 400)
    }

    const title = template.title
    const body_ = template.buildBody(body)
    const priority = template.priority

    const supabaseUrl = Deno.env.get('NEXT_PUBLIC_SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const actionUrl = order_id
      ? `/customer/orders/${order_id}`
      : undefined

    const { error: insertError } = await supabase
      .from('in_app_notifications')
      .insert({
        user_id,
        title,
        body: body_,
        category: type,
        priority,
        action_url: actionUrl,
        action_label: 'Xem chi tiết',
      })

    if (insertError) {
      console.error('[notify] insert error:', insertError)
    }

    if (template.sms) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('phone')
        .eq('id', user_id)
        .single()

      if (profile?.phone) {
        const smsBody = template.sms(body)
        sendSms(profile.phone as string, smsBody)
      }
    }

    return jsonResponse({
      success: true,
      notification: { type, user_id, title, body: body_, priority },
      sms_sent: !!template.sms,
    })
  } catch (error: any) {
    console.error('[notify] error:', error)
    return jsonResponse({ error: error.message }, 500)
  }
})
