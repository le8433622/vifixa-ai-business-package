'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import CompanionChat from '@/components/companion/CompanionChat'
import ModeToggle, { type AppMode } from '@/components/common/ModeToggle'
import DynamicMapView from '@/components/map/DynamicMapView'

type Order = {
  id: string; category: string; description: string
  status: string; estimated_price: number; final_price?: number
  payment_status?: string; worker_lat?: number; worker_lng?: number
  created_at: string; completed_at?: string
}

type Device = {
  id: string; device_type: string; brand?: string; model?: string
  purchase_date?: string; warranty_expiry?: string
}

// ─── 3 CORE STATES ──────────────────────────────────────────
type AppState = 'chat' | 'quoting' | 'tracking' | 'payment' | 'completed'

export default function CustomerDashboard() {
  const router = useRouter()
  const [mode, setMode] = useState<AppMode>('auto')
  const [appState, setAppState] = useState<AppState>('chat')
  const [profile, setProfile] = useState<any>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [userLocation, setUserLocation] = useState<{lat: number; lng: number} | null>(null)

  // ─── INIT ───────────────────────────────────────────────
  useEffect(() => {
    loadData()
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {}
      )
    }
  }, [])

  async function loadData() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }

    const [profileRes, ordersRes, devicesRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', session.user.id).single(),
      supabase.from('orders').select('*').eq('customer_id', session.user.id).order('created_at', { ascending: false }),
      supabase.from('device_profiles').select('*').eq('user_id', session.user.id),
    ])
    setProfile(profileRes.data)
    const ordersData = (ordersRes.data || []) as Order[]
    setOrders(ordersData)
    setDevices((devicesRes.data || []) as Device[])

    // Derive app state from active orders
    const activeOrder = ordersData.find(order => ['pending', 'matched', 'in_progress'].includes(order.status))
    if (activeOrder) {
      if (activeOrder.status === 'in_progress') setAppState('tracking')
      else if (activeOrder.status === 'matched') setAppState('quoting')
    }
    // Check for unpaid completed orders
    const unpaidOrder = ordersData.find(order => order.status === 'completed' && order.payment_status === 'unpaid')
    if (unpaidOrder) setAppState('payment')

    setLoading(false)
  }

  // ─── DERIVED ────────────────────────────────────────────
  const activeOrders = orders.filter(o => ['pending', 'matched', 'in_progress'].includes(o.status))
  const completedOrders = orders.filter(o => o.status === 'completed')
  const unpaidOrder = completedOrders.find(o => o.payment_status === 'unpaid')
  const trackingOrder = activeOrders.find(o => o.status === 'in_progress')
  const totalSpent = completedOrders.reduce((s, o) => s + (o.final_price || o.estimated_price || 0), 0)

  const needsCareDevices = devices.filter(d => {
    if (!d.purchase_date) return false
    const months = (Date.now() - new Date(d.purchase_date).getTime()) / (30 * 24 * 60 * 60 * 1000)
    return months > 18
  })

  // ─── ACTIONS ─────────────────────────────────────────────
  const handleAction = useCallback((action: any) => {
    if (action.type === 'view_orders') router.push('/customer/orders')
    else if (action.type === 'view_devices') router.push('/customer/devices')
    else if (action.type === 'track_order' && action.data?.order_id)
      router.push(`/customer/orders/${action.data.order_id}`)
    else if (action.type === 'process_payment' && action.data?.order_id) {
      payWithVNPay(action.data.order_id, action.data?.amount || 0)
    }
  }, [router])

  async function payWithVNPay(orderId: string, amount: number) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/payment-create`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: orderId, amount,
          gateway: 'vnpay',
          return_url: `${window.location.origin}/api/payments/vnpay/return`,
          description: `Thanh toán đơn hàng ${orderId.slice(0, 8)}`,
        }),
      })
      const data = await res.json()
      if (data.redirect_url) window.location.href = data.redirect_url
      else if (data.qr_code) alert('Quét mã QR để thanh toán')
    } catch { alert('Lỗi kết nối thanh toán') }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent" />
    </div>
  )

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col">
      {/* ─── HEADER ─────────────────────────────────────── */}
      <div className="bg-white border-b px-4 py-2.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
            {profile?.full_name?.[0] || '?'}
          </div>
          <div>
            <p className="font-medium text-sm">{profile?.full_name || 'Khách hàng'}</p>
            <p className="text-[10px] text-blue-500 font-medium">
              {appState === 'tracking' ? '📍 Đang theo dõi thợ' :
               appState === 'payment' ? '💳 Cần thanh toán' :
               appState === 'quoting' ? '💰 Đang báo giá' : '🤖 AI Companion'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {appState !== 'chat' && (
            <span className={`text-[10px] font-medium px-2 py-1 rounded-full ${
              appState === 'tracking' ? 'bg-rose-100 text-rose-700 animate-pulse' :
              appState === 'payment' ? 'bg-amber-100 text-amber-700' :
              'bg-blue-100 text-blue-700'
            }`}>
              {appState === 'tracking' ? '📍' : appState === 'payment' ? '💳' : '💰'} {appState}
            </span>
          )}
          <ModeToggle mode={mode} onChange={setMode} />
        </div>
      </div>

      {/* ─── MAIN: AI + MAP + PAYMENT ────────────────────── */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* AI Companion — full height base layer */}
        <div className="absolute inset-0">
          <CompanionChat persona="customer" onAction={handleAction} />
        </div>

        {/* ─── MAP CORE: Contextual Map ─────────────────── */}
        {/* Shows when quoting: worker locations near user */}
        {appState === 'quoting' && userLocation && (
          <div className="absolute bottom-24 left-3 right-3 h-48 bg-white/95 backdrop-blur rounded-2xl shadow-2xl border overflow-hidden z-10 transition-all animate-slide-up">
            <div className="flex items-center justify-between px-3 py-2 border-b">
              <span className="text-xs font-bold text-gray-600">🗺️ Thợ gần bạn</span>
              <button onClick={() => setAppState('chat')} className="text-gray-400 hover:text-gray-600 text-sm">✕</button>
            </div>
            <div className="h-[calc(100%-36px)]">
              <DynamicMapView
                center={[userLocation.lat, userLocation.lng]}
                zoom={14}
                markers={(orders.filter(o => o.status === 'matched')).map(o => ({
                  position: [o.worker_lat || 10.8231, o.worker_lng || 106.6297],
                  title: o.category,
                }))}
                style={{ height: '100%' }}
              />
            </div>
          </div>
        )}

        {/* ─── MAP CORE: Tracking Map ───────────────────── */}
        {/* Shows when tracking: worker real-time location */}
        {appState === 'tracking' && trackingOrder && (
          <div className="absolute inset-0 z-20 flex flex-col bg-white">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-white">
              <div>
                <p className="font-bold text-sm">📍 Thợ đang đến</p>
                <p className="text-xs text-gray-500">{trackingOrder.category} · Cách 2.5 km</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-rose-600 font-medium animate-pulse">⏱ 5 phút</span>
                <button onClick={() => setAppState('chat')} className="text-gray-400 hover:text-gray-600 px-2 py-1 text-sm">Thu gọn</button>
              </div>
            </div>
            <div className="flex-1">
              <DynamicMapView
                center={[trackingOrder.worker_lat || 10.8231, trackingOrder.worker_lng || 106.6297]}
                zoom={15}
                markers={[
                  { position: [10.8231, 106.6297], title: 'Vị trí của bạn' },
                  { position: [trackingOrder.worker_lat || 10.8250, trackingOrder.worker_lng || 106.6300], title: 'Thợ' },
                ]}
                style={{ height: '100%' }}
              />
            </div>
            <div className="p-3 bg-white border-t flex gap-2">
              <button onClick={() => router.push(`/customer/orders/${trackingOrder.id}`)}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">
                📋 Chi tiết đơn
              </button>
              <button onClick={() => handleAction({ type: 'track_order', data: { order_id: trackingOrder.id } })}
                className="flex-1 py-2.5 border rounded-xl text-sm font-medium hover:bg-gray-50">
                💬 Chat với thợ
              </button>
            </div>
          </div>
        )}

        {/* ─── PAYMENT CORE: Inline Payment ─────────────── */}
        {/* Shows when order completed + unpaid */}
        {appState === 'payment' && unpaidOrder && (
          <div className="absolute bottom-24 left-3 right-3 bg-white/95 backdrop-blur rounded-2xl shadow-2xl border z-10 animate-slide-up">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-sm">💳 Thanh toán</h3>
                <button onClick={() => setAppState('chat')} className="text-gray-400 hover:text-gray-600 text-sm">✕</button>
              </div>
              <div className="flex items-center justify-between mb-3 p-3 bg-amber-50 rounded-xl">
                <span className="text-sm text-gray-700">{unpaidOrder.category}</span>
                <span className="text-lg font-bold text-amber-700">
                  {(unpaidOrder.final_price || unpaidOrder.estimated_price || 0).toLocaleString()}₫
                </span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => payWithVNPay(unpaidOrder.id, unpaidOrder.final_price || unpaidOrder.estimated_price || 0)}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 shadow-sm">
                  💳 VNPay
                </button>
                <button onClick={() => alert('Stripe chưa cấu hình')}
                  className="flex-1 py-3 border border-blue-300 text-blue-600 rounded-xl text-sm font-medium hover:bg-blue-50">
                  💳 Stripe
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── AUTO MODE: Contextual Widgets ────────────── */}
        {mode === 'auto' && appState === 'chat' && (
          <div className="absolute bottom-20 left-3 right-3 pointer-events-none">
            <div className="space-y-2 pointer-events-auto max-w-lg mx-auto">
              {/* Active orders */}
              {activeOrders.length > 0 && (
                <button onClick={() => router.push(`/customer/orders/${activeOrders[0].id}`)}
                  className="w-full bg-white/95 backdrop-blur rounded-xl shadow-lg border p-3 flex items-center gap-3 hover:shadow-xl transition">
                  <span className="text-2xl">📋</span>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-bold">{activeOrders.length} đơn đang xử lý</p>
                    <p className="text-xs text-gray-500 truncate">{activeOrders[0].category}</p>
                  </div>
                  <span className="text-blue-600 text-lg">→</span>
                </button>
              )}

              {/* Devices needing care */}
              {needsCareDevices.length > 0 && (
                <button onClick={() => router.push('/customer/devices')}
                  className="w-full bg-white/95 backdrop-blur rounded-xl shadow-lg border p-3 flex items-center gap-3 hover:shadow-xl transition">
                  <span className="text-2xl">🔧</span>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-bold">{needsCareDevices.length} thiết bị cần bảo trì</p>
                    <p className="text-xs text-gray-500">{needsCareDevices[0].brand} {needsCareDevices[0].model}</p>
                  </div>
                  <span className="text-blue-600 text-lg">→</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* ─── MANUAL MODE: Full Service Menu ───────────── */}
        {mode === 'manual' && (
          <div className="absolute inset-x-0 bottom-0 px-3 pb-3 pointer-events-none">
            <div className="bg-white/95 backdrop-blur rounded-2xl shadow-2xl border pointer-events-auto p-4 max-w-lg mx-auto">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">📋 Menu dịch vụ</p>
              
              {/* Service categories */}
              <div className="grid grid-cols-4 gap-2 mb-3">
                {[
                  { icon: '❄️', name: 'Máy lạnh', id: 'ac' },
                  { icon: '💡', name: 'Điện', id: 'elec' },
                  { icon: '🚿', name: 'Nước', id: 'water' },
                  { icon: '📷', name: 'Camera', id: 'cam' },
                  { icon: '🔧', name: 'Đồ gia dụng', id: 'app' },
                  { icon: '🔌', name: 'Điện tử', id: 'elec2' },
                  { icon: '🚪', name: 'Cửa/Khóa', id: 'door' },
                  { icon: '🏠', name: 'Khác', id: 'other' },
                ].map(cat => (
                  <button key={cat.id} onClick={() => {
                    setMode('auto')
                    // Will send to AI chat via CompanionChat
                  }}
                    className="flex flex-col items-center p-2.5 bg-gray-50 rounded-xl hover:bg-blue-50 transition">
                    <span className="text-2xl mb-1">{cat.icon}</span>
                    <span className="text-[10px] font-medium text-gray-600">{cat.name}</span>
                  </button>
                ))}
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                <button onClick={() => router.push('/customer/orders')}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition shadow-sm">
                  📋 Đơn hàng
                </button>
                <button onClick={() => router.push('/customer/devices')}
                  className="flex-1 py-3 border border-blue-200 text-blue-700 rounded-xl text-sm font-medium hover:bg-blue-50 transition">
                  🔧 Thiết bị
                </button>
                <button onClick={() => router.push('/customer/profile')}
                  className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition">
                  👤 Tài khoản
                </button>
              </div>

              {/* Stats */}
              <div className="flex justify-between mt-3 pt-3 border-t border-gray-100 text-[10px] text-gray-400">
                <span>{orders.length} đơn</span>
                <span>{completedOrders.length} hoàn thành</span>
                <span>{totalSpent.toLocaleString()}₫ đã chi</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
