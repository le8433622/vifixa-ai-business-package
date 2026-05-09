// Customer Care Tab - Retention Hub
// Per 15_CODEX_BUSINESS_CONTEXT.md - Customer retention & LTV
// Blocks: Care Summary, Next Best Action, Devices, Warranty, Quick Reorder

'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/Toast'

interface Order {
  id: string
  category: string
  description: string
  status: string
  estimated_price: number
  final_price?: number
  rating?: number
  created_at: string
  completed_at?: string
}

interface Device {
  id: string
  device_type: string
  brand?: string
  model?: string
  purchase_date?: string
}

const CATEGORY_ICONS: Record<string, string> = {
  'electricity': '🔌',
  'plumbing': '🚿',
  'appliance': '🔧',
  'air_conditioning': '❄️',
  'camera': '📷',
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Chờ xử lý',
  matched: 'Đã ghép thợ',
  in_progress: 'Đang thực hiện',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
  disputed: 'Khiếu nại',
}

const DEVICE_ICONS: Record<string, string> = {
  'air_conditioning': '❄️',
  'refrigerator': '🧊',
  'washing_machine': '🧺',
  'water_heater': '🔥',
  'electric': '🔌',
  'camera': '📷',
}

interface CarePlan {
  summary: string
  next_best_action: { title: string; description: string; action_type: string }
  device_insights: Array<{ device_type: string; brand?: string; model?: string; age_months: number; needs_attention: boolean; recommendation: string }>
  maintenance_reminders: Array<{ title: string; due_date: string; priority: string }>
  reorder_suggestions: Array<{ category: string; reason: string }>
  loyalty_status: { tier: string; total_spent: number; next_tier_at: number }
}

interface SubscriptionPlan {
  id: string
  name: string
  description: string
  price: number
  interval: string
  features: string[]
  popular: boolean
}

interface CustomerSubscription {
  id: string
  plan_id: string
  status: string
  start_date: string
  end_date: string
  subscription_plans: SubscriptionPlan
}

export default function CustomerCarePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<Order[]>([])
  const [devices, setDevices] = useState<Device[]>([])
  const [error, setError] = useState<string | null>(null)
  const [carePlan, setCarePlan] = useState<CarePlan | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [mySubscription, setMySubscription] = useState<CustomerSubscription | null>(null)
  const [subscribing, setSubscribing] = useState(false)
  const [stripeLoading, setStripeLoading] = useState<string | null>(null)
  const [subLoading, setSubLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setError(null)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }
      await Promise.all([fetchOrders(session.user.id), fetchDevices(session.user.id)])
    } catch (err: any) {
      console.error('loadData error:', err)
      setError(err.message || 'Lỗi tải dữ liệu')
      toast(err.message || 'Lỗi tải dữ liệu', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function fetchOrders(userId: string) {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('customer_id', userId)
      .order('created_at', { ascending: false })
    if (error) throw error
    setOrders(data || [])
  }

  async function fetchDevices(userId: string) {
    const { data, error } = await supabase
      .from('device_profiles')
      .select('*')
      .eq('user_id', userId)
      .order('purchase_date', { ascending: false })
    if (error) {
      console.error('fetchDevices error:', error)
      return
    }
    setDevices(data || [])
  }

  async function fetchCarePlan() {
    try {
      setAiLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/ai-care-agent`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      )
      if (response.ok) {
        const data = await response.json()
        setCarePlan(data)
      }
    } catch (err) {
      console.error('fetchCarePlan error:', err)
    } finally {
      setAiLoading(false)
    }
  }

  useEffect(() => {
    if (!loading && orders.length > 0) {
      fetchCarePlan()
    }
  }, [loading, orders.length])

  async function fetchSubscriptions() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const [plansRes, myRes] = await Promise.all([
        fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/subscription-manage/plans`,
          { headers: { 'Authorization': `Bearer ${session.access_token}` } }
        ),
        fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/subscription-manage/my`,
          { headers: { 'Authorization': `Bearer ${session.access_token}` } }
        ),
      ])

      if (plansRes.ok) {
        const { plans } = await plansRes.json()
        setPlans(plans || [])
      }
      if (myRes.ok) {
        const { subscription } = await myRes.json()
        setMySubscription(subscription)
      }
    } catch (err) {
      console.error('fetchSubscriptions error:', err)
    } finally {
      setSubLoading(false)
    }
  }

  useEffect(() => {
    fetchSubscriptions()
  }, [])

  // Derived stats
  const completedOrders = useMemo(() => orders.filter(o => o.status === 'completed'), [orders])
  const pendingOrders = useMemo(() => orders.filter(o => ['pending', 'matched', 'in_progress'].includes(o.status)), [orders])
  const recentOrders = useMemo(() => orders.slice(0, 5), [orders])
  const unratedCompleted = useMemo(() => completedOrders.filter(o => !o.rating), [completedOrders])
  const warrantableOrders = useMemo(() => completedOrders.filter(o => {
    if (!o.completed_at) return false
    const completedDate = new Date(o.completed_at)
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    return completedDate > sixMonthsAgo
  }), [completedOrders])

  const totalSpent = useMemo(() =>
    completedOrders.reduce((sum, o) => sum + (o.final_price ?? o.estimated_price ?? 0), 0),
    [completedOrders]
  )

  const repeatOrders = useMemo(() => {
    const categories = orders.map(o => o.category)
    const unique = new Set(categories)
    return orders.length - unique.size
  }, [orders])

  const loyaltyTier = useMemo(() => {
    if (totalSpent >= 40000000) return { tier: 'Kim cương', icon: '💎', color: 'bg-cyan-100 text-cyan-700 border-cyan-200', progress: 100, next: 0 }
    if (totalSpent >= 15000000) return { tier: 'Vàng', icon: '🥇', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', progress: (totalSpent - 15000000) / (40000000 - 15000000) * 100, next: 40000000 }
    if (totalSpent >= 5000000) return { tier: 'Bạc', icon: '🥈', color: 'bg-gray-100 text-gray-700 border-gray-200', progress: (totalSpent - 5000000) / (15000000 - 5000000) * 100, next: 15000000 }
    return { tier: 'Đồng', icon: '🥉', color: 'bg-orange-100 text-orange-700 border-orange-200', progress: totalSpent / 5000000 * 100, next: 5000000 }
  }, [totalSpent])

  // Next best action
  const nextAction = useMemo(() => {
    if (orders.length === 0) {
      return { emoji: '💬', title: 'Đặt dịch vụ đầu tiên', desc: 'Chat với AI để bắt đầu', href: '/customer/chat' }
    }
    if (pendingOrders.length > 0) {
      return { emoji: '📋', title: 'Theo dõi đơn hàng', desc: `${pendingOrders.length} đơn đang xử lý`, href: '/customer/orders' }
    }
    if (unratedCompleted.length > 0) {
      return { emoji: '⭐', title: 'Đánh giá dịch vụ', desc: `${unratedCompleted.length} đơn chưa đánh giá`, href: `/customer/orders/${unratedCompleted[0].id}` }
    }
    if (devices.length === 0) {
      return { emoji: '🔧', title: 'Thêm thiết bị', desc: 'Lưu thiết bị để được nhắc bảo trì', href: '/customer/devices' }
    }
    return { emoji: '💬', title: 'Hỏi AI', desc: 'Nhờ AI tư vấn bảo trì', href: '/customer/chat' }
  }, [orders, pendingOrders.length, unratedCompleted.length, devices.length])

  function formatPrice(price: number | undefined) {
    if (!price && price !== 0) return '0₫'
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price)
  }

  async function handleSubscribe(planId: string) {
    try {
      setSubscribing(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/subscription-manage/subscribe`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ plan_id: planId }),
        }
      )
      if (res.ok) {
        const data = await res.json()
        setMySubscription(data.subscription)
        toast('Đăng ký gói thành công!', 'success')
      } else {
        const err = await res.json()
        toast(err.error || 'Đăng ký thất bại', 'error')
      }
    } catch (err: any) {
      toast(err.message || 'Lỗi đăng ký', 'error')
    } finally {
      setSubscribing(false)
    }
  }

  async function handleCancel() {
    try {
      setSubscribing(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/subscription-manage/cancel`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      )
      if (res.ok) {
        setMySubscription(null)
        toast('Đã hủy gói', 'info')
      } else {
        const err = await res.json()
        toast(err.error || 'Hủy thất bại', 'error')
      }
    } catch (err: any) {
      toast(err.message || 'Lỗi hủy', 'error')
    } finally {
      setSubscribing(false)
    }
  }

  async function handleStripeCheckout(planId: string) {
    try {
      setStripeLoading(planId)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/stripe-checkout`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ plan_id: planId }),
        }
      )
      if (res.ok) {
        const data = await res.json()
        if (data.url) {
          window.location.href = data.url
        } else {
          toast('Không thể tạo thanh toán', 'error')
        }
      } else {
        const err = await res.json()
        if (err.error?.includes('not configured')) {
          toast('Stripe chưa được cấu hình, hãy dùng Đăng ký trực tiếp', 'warning')
        } else {
          toast(err.error || 'Tạo thanh toán thất bại', 'error')
        }
      }
    } catch (err: any) {
      toast(err.message || 'Lỗi thanh toán', 'error')
    } finally {
      setStripeLoading(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl shadow-lg overflow-hidden">
        <div className="px-6 py-10 sm:px-10 text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            🌿 Chăm sóc khách hàng
          </h1>
          <p className="text-emerald-100 text-sm sm:text-base">
            Theo dõi thiết bị, bảo hành, và nhắc bảo trì thông minh
          </p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-700 mb-4">{error}</p>
          <button
            onClick={loadData}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* 1. Care Summary */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">📊 Tổng quan</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 bg-blue-50 rounded-xl text-center">
            <div className="text-3xl mb-1">📋</div>
            <div className="text-2xl font-bold text-blue-700">{orders.length}</div>
            <div className="text-xs text-blue-600 mt-1">Tổng đơn</div>
          </div>
          <div className="p-4 bg-green-50 rounded-xl text-center">
            <div className="text-3xl mb-1">✅</div>
            <div className="text-2xl font-bold text-green-700">{completedOrders.length}</div>
            <div className="text-xs text-green-600 mt-1">Hoàn thành</div>
          </div>
          <div className="p-4 bg-purple-50 rounded-xl text-center">
            <div className="text-3xl mb-1">🔧</div>
            <div className="text-2xl font-bold text-purple-700">{devices.length}</div>
            <div className="text-xs text-purple-600 mt-1">Thiết bị</div>
          </div>
          <div className="p-4 bg-emerald-50 rounded-xl text-center">
            <div className="text-3xl mb-1">💰</div>
            <div className="text-2xl font-bold text-emerald-700">{formatPrice(totalSpent)}</div>
            <div className="text-xs text-emerald-600 mt-1">Đã chi</div>
          </div>
        </div>
      </div>

      {/* Loyalty Tier */}
      <div className={`rounded-xl border p-5 ${loyaltyTier.color}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{loyaltyTier.icon}</span>
            <div>
              <p className="font-bold text-lg">Hạng {loyaltyTier.tier}</p>
              <p className="text-sm opacity-80">
                Đã chi {formatPrice(totalSpent)}
                {orders.length > 0 && <> · {orders.length} đơn · {repeatOrders} đặt lại</>}
              </p>
            </div>
          </div>
        </div>
        {loyaltyTier.next > 0 && (
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span>{formatPrice(0)}</span>
              <span>{formatPrice(totalSpent)}</span>
              <span>{formatPrice(loyaltyTier.next)}</span>
            </div>
            <div className="w-full bg-white bg-opacity-50 rounded-full h-2.5">
              <div
                className="bg-emerald-500 h-2.5 rounded-full transition-all duration-1000"
                style={{ width: `${Math.min(loyaltyTier.progress, 100)}%` }}
              />
            </div>
            <p className="text-xs mt-1 opacity-70">
              Cần thêm {formatPrice(loyaltyTier.next - totalSpent)} để lên hạng tiếp theo
            </p>
          </div>
        )}
      </div>

      {/* 2. Next Best Action */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">🎯 Hành động tiếp theo</h2>
        <button
          onClick={() => router.push(nextAction.href)}
          className="w-full flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl hover:from-blue-100 hover:to-indigo-100 transition-all border border-blue-200"
        >
          <div className="text-4xl">{nextAction.emoji}</div>
          <div className="text-left flex-1">
            <h3 className="font-semibold text-gray-900">{nextAction.title}</h3>
            <p className="text-sm text-gray-600">{nextAction.desc}</p>
          </div>
          <div className="text-blue-600 text-2xl">→</div>
        </button>
      </div>

      {/* AI Care Agent Recommendations */}
      {aiLoading && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-center gap-3 py-4">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-emerald-600" />
            <span className="text-sm text-gray-600">AI đang phân tích dữ liệu...</span>
          </div>
        </div>
      )}
      {carePlan && !aiLoading && (
        <>
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">🤖</span>
              <h2 className="text-lg font-bold text-emerald-900">AI Đề xuất</h2>
            </div>
            <p className="text-emerald-800 mb-4">{carePlan.summary}</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {carePlan.maintenance_reminders.slice(0, 4).map((reminder, idx) => (
                <div key={idx} className={`p-3 rounded-xl text-center ${
                  reminder.priority === 'high' ? 'bg-red-100' :
                  reminder.priority === 'medium' ? 'bg-yellow-100' : 'bg-blue-100'
                }`}>
                  <div className="text-2xl mb-1">
                    {reminder.priority === 'high' ? '🔴' : reminder.priority === 'medium' ? '🟡' : '🔵'}
                  </div>
                  <p className="text-xs font-medium text-gray-900">{reminder.title}</p>
                  <p className="text-xs text-gray-600 mt-0.5">
                    {new Date(reminder.due_date).toLocaleDateString('vi-VN')}
                  </p>
                </div>
              ))}
            </div>
          </div>
          {carePlan.device_insights.filter(d => d.needs_attention).length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">⚠️ Thiết bị cần chú ý</h2>
              <div className="space-y-3">
                {carePlan.device_insights.filter(d => d.needs_attention).map((insight, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 bg-orange-50 rounded-xl">
                    <div className="text-2xl">🔧</div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {insight.brand} {insight.model} ({insight.age_months} tháng)
                      </p>
                      <p className="text-sm text-gray-700">{insight.recommendation}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {carePlan.reorder_suggestions.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">🔄 Gợi ý đặt lại</h2>
              <div className="space-y-3">
                {carePlan.reorder_suggestions.map((suggestion, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className="text-2xl">{CATEGORY_ICONS[suggestion.category] || '📦'}</div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{suggestion.category}</p>
                      <p className="text-sm text-gray-600">{suggestion.reason}</p>
                    </div>
                    <button
                      onClick={() => router.push('/customer/chat')}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm hover:bg-emerald-700"
                    >
                      Đặt lại
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🏆</span>
                <div>
                  <p className="font-semibold text-purple-900">Hạng {carePlan.loyalty_status.tier}</p>
                  <p className="text-xs text-purple-700">
                    Đã chi {formatPrice(carePlan.loyalty_status.total_spent)}
                    {carePlan.loyalty_status.next_tier_at > 0 && (
                      <> · Cần thêm {formatPrice(carePlan.loyalty_status.next_tier_at - carePlan.loyalty_status.total_spent)} để lên hạng</>
                    )}
                  </p>
                </div>
              </div>
              <span className="text-3xl">
                {carePlan.loyalty_status.tier === 'Kim cương' ? '💎' :
                 carePlan.loyalty_status.tier === 'Vàng' ? '🥇' :
                 carePlan.loyalty_status.tier === 'Bạc' ? '🥈' : '🥉'}
              </span>
            </div>
          </div>
        </>
      )}

      {/* 3. Devices needing care */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">🔧 Thiết bị của tôi</h2>
          <button
            onClick={() => router.push('/customer/devices')}
            className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
          >
            Quản lý →
          </button>
        </div>
        {devices.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-5xl mb-4">🔧</div>
            <p className="text-gray-600 mb-4">Chưa có thiết bị nào</p>
            <button
              onClick={() => router.push('/customer/devices')}
              className="bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 font-medium"
            >
              + Thêm thiết bị
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {devices.map((device) => {
              const monthsSincePurchase = device.purchase_date
                ? Math.floor((Date.now() - new Date(device.purchase_date).getTime()) / (30 * 24 * 60 * 60 * 1000))
                : 0
              const needsMaintenance = monthsSincePurchase > 12
              return (
                <div key={device.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-blue-50 transition-colors">
                  <div className="text-3xl">{DEVICE_ICONS[device.device_type] || '🔧'}</div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      {device.brand} {device.model}
                    </p>
                    <p className="text-xs text-gray-500">
                      {device.purchase_date
                        ? `Đã mua ${monthsSincePurchase} tháng trước`
                        : 'Chưa cập nhật ngày mua'}
                    </p>
                  </div>
                  {needsMaintenance && (
                    <span className="px-2.5 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                      Cần bảo trì
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 4. Warranty & Complaints */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">🛡️ Bảo hành & Khiếu nại</h2>
        {warrantableOrders.length === 0 ? (
          <div className="text-center py-6">
            <div className="text-4xl mb-3">🛡️</div>
            <p className="text-gray-600">Chưa có đơn hàng nào trong diện bảo hành</p>
          </div>
        ) : (
          <div className="space-y-3">
            {warrantableOrders.slice(0, 5).map((order) => (
              <div key={order.id} className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
                <div className="text-3xl">{CATEGORY_ICONS[order.category] || '📦'}</div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{order.category}</p>
                  <p className="text-xs text-gray-500">
                    Hoàn thành: {order.completed_at ? new Date(order.completed_at).toLocaleDateString('vi-VN') : ''}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => router.push(`/customer/warranty/${order.id}`)}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700"
                  >
                    Bảo hành
                  </button>
                  <button
                    onClick={() => router.push(`/customer/complaint?order_id=${order.id}`)}
                    className="px-3 py-1.5 bg-orange-100 text-orange-700 rounded-lg text-xs hover:bg-orange-200"
                  >
                    Khiếu nại
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. Quick Reorder */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">🔄 Đặt lại nhanh</h2>
        {completedOrders.length === 0 ? (
          <div className="text-center py-6">
            <div className="text-4xl mb-3">🔄</div>
            <p className="text-gray-600 mb-4">Chưa có đơn hàng nào để đặt lại</p>
            <button
              onClick={() => router.push('/customer/chat')}
              className="bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 font-medium"
            >
              💬 Đặt dịch vụ mới
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {completedOrders.slice(0, 5).map((order) => (
              <div key={order.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-blue-50 transition-colors">
                <div className="text-3xl">{CATEGORY_ICONS[order.category] || '📦'}</div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{order.category}</p>
                  <p className="text-xs text-gray-500 line-clamp-1">{order.description}</p>
                </div>
                <button
                  onClick={() => router.push(`/customer/chat?reorder=${order.id}`)}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm hover:bg-emerald-700 font-medium whitespace-nowrap"
                >
                  Đặt lại
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 6. Subscription/Care Plan */}
      {!subLoading && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">📦 Gói Chăm sóc</h2>
            {mySubscription && (
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                Đang hoạt động
              </span>
            )}
          </div>

          {mySubscription ? (
            <div>
              <div className="p-4 bg-green-50 rounded-xl mb-4">
                <p className="font-semibold text-green-900">
                  {mySubscription.subscription_plans?.name}
                </p>
                <p className="text-sm text-green-700 mt-1">
                  {mySubscription.end_date && (
                    <>Hiệu lực đến: {new Date(mySubscription.end_date).toLocaleDateString('vi-VN')}</>
                  )}
                </p>
              </div>
              <button
                onClick={handleCancel}
                disabled={subscribing}
                className="w-full px-4 py-2 border border-red-300 text-red-600 rounded-xl hover:bg-red-50 disabled:opacity-50"
              >
                {subscribing ? 'Đang xử lý...' : 'Hủy gói'}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className={`relative p-4 rounded-xl border-2 transition-all ${
                    plan.popular
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {plan.popular && (
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-emerald-500 text-white text-xs font-medium rounded-full">
                      Phổ biến
                    </span>
                  )}
                  <div className="text-center mb-4">
                    <h3 className="font-bold text-gray-900">{plan.name}</h3>
                    <div className="mt-2">
                      <span className="text-2xl font-bold text-gray-900">{formatPrice(plan.price)}</span>
                      <span className="text-sm text-gray-500">/{plan.interval === 'month' ? 'tháng' : plan.interval === 'quarter' ? 'quý' : 'năm'}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{plan.description}</p>
                  </div>
                  <ul className="space-y-2 mb-4">
                    {(plan.features as string[]).map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-gray-700">
                        <span className="text-emerald-500 mt-0.5">✓</span>
                        {feat}
                      </li>
                    ))}
                  </ul>
                  <div className="space-y-2">
                    <button
                      onClick={() => handleSubscribe(plan.id)}
                      disabled={subscribing}
                      className={`w-full py-2 rounded-xl text-sm font-medium transition-colors ${
                        plan.popular
                          ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      } disabled:opacity-50`}
                    >
                      {subscribing ? 'Đang xử lý...' : 'Đăng ký trực tiếp'}
                    </button>
                    <button
                      onClick={() => handleStripeCheckout(plan.id)}
                      disabled={stripeLoading === plan.id}
                      className="w-full py-2 rounded-xl text-sm font-medium border border-blue-300 text-blue-700 hover:bg-blue-50 transition-colors disabled:opacity-50"
                    >
                      {stripeLoading === plan.id ? 'Đang chuyển...' : '💳 Thanh toán qua Stripe'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-wrap gap-6 justify-center text-sm">
          <button
            onClick={() => router.push('/customer/chat')}
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 hover:underline font-medium"
          >
            <span>💬</span>
            Chat với AI
          </button>
          <button
            onClick={() => router.push('/customer/orders')}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800 hover:underline"
          >
            <span>📋</span>
            Đơn hàng
          </button>
          <button
            onClick={() => router.push('/customer/devices')}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800 hover:underline"
          >
            <span>🔧</span>
            Thiết bị
          </button>
          <button
            onClick={() => router.push('/customer/complaint')}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800 hover:underline"
          >
            <span>⚠️</span>
            Khiếu nại
          </button>
        </div>
      </div>
    </div>
  )
}
