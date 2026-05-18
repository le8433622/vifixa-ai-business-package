'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Skeleton from '@/components/ui/Skeleton'

type NotifPrefs = {
  push_enabled: boolean
  sms_enabled: boolean
  email_enabled: boolean
  order_updates: boolean
  promotion: boolean
  payment_alerts: boolean
  dispute_updates: boolean
}

const DEFAULT_PREFS: NotifPrefs = {
  push_enabled: true,
  sms_enabled: false,
  email_enabled: true,
  order_updates: true,
  promotion: false,
  payment_alerts: true,
  dispute_updates: true,
}

export default function NotificationSettings() {
  const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULT_PREFS)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/user-preferences`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (res.ok) {
        const data = await res.json()
        if (data?.notifications) setPrefs({ ...DEFAULT_PREFS, ...data.notifications })
      }
    } catch {}
    setLoading(false)
  }

  async function save() {
    setSaving(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/user-preferences`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'notifications', value: prefs }),
    })
    setSaving(false)
  }

  function toggle(key: keyof NotifPrefs) {
    setPrefs(prev => ({ ...prev, [key]: !prev[key] }))
  }

  if (loading) return <div className="max-w-2xl mx-auto p-4"><Skeleton variant="rect" height="160px" className="rounded-xl" /></div>

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-5">
      <h1 className="text-2xl font-bold">🔔 Cài đặt thông báo</h1>

      <div className="bg-white rounded-xl border divide-y">
        {/* Channels */}
        <div className="p-5 space-y-3">
          <h2 className="font-semibold text-sm">Kênh nhận thông báo</h2>
          {[
            { key: 'push_enabled' as const, label: '📱 Push notification', desc: 'Thông báo qua trình duyệt/app' },
            { key: 'email_enabled' as const, label: '📧 Email', desc: 'Nhận thông báo qua email' },
            { key: 'sms_enabled' as const, label: '💬 SMS', desc: 'Nhận tin nhắn SMS (phí thường)' },
          ].map(item => (
            <label key={item.key} className="flex items-center justify-between py-1">
              <div>
                <p className="text-sm font-medium text-gray-900">{item.label}</p>
                <p className="text-xs text-gray-500">{item.desc}</p>
              </div>
              <button onClick={() => toggle(item.key)}
                className={`w-11 h-6 rounded-full transition relative ${prefs[item.key] ? 'bg-blue-600' : 'bg-gray-300'}`}>
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition ${prefs[item.key] ? 'left-[22px]' : 'left-0.5'}`} />
              </button>
            </label>
          ))}
        </div>

        {/* Types */}
        <div className="p-5 space-y-3">
          <h2 className="font-semibold text-sm">Loại thông báo</h2>
          {[
            { key: 'order_updates' as const, label: '📋 Cập nhật đơn hàng', desc: 'Trạng thái đơn, thợ đến, hoàn thành' },
            { key: 'payment_alerts' as const, label: '💳 Thanh toán', desc: 'Xác nhận thanh toán, hóa đơn' },
            { key: 'dispute_updates' as const, label: '⚖️ Khiếu nại', desc: 'Cập nhật khiếu nại, bảo hành' },
            { key: 'promotion' as const, label: '🎉 Khuyến mãi', desc: 'Giảm giá, ưu đãi đặc biệt' },
          ].map(item => (
            <label key={item.key} className="flex items-center justify-between py-1">
              <div>
                <p className="text-sm font-medium text-gray-900">{item.label}</p>
                <p className="text-xs text-gray-500">{item.desc}</p>
              </div>
              <button onClick={() => toggle(item.key)}
                className={`w-11 h-6 rounded-full transition relative ${prefs[item.key] ? 'bg-blue-600' : 'bg-gray-300'}`}>
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition ${prefs[item.key] ? 'left-[22px]' : 'left-0.5'}`} />
              </button>
            </label>
          ))}
        </div>
      </div>

      <button onClick={save} disabled={saving}
        className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50">
        {saving ? 'Đang lưu...' : '💾 Lưu cài đặt'}
      </button>
    </div>
  )
}
