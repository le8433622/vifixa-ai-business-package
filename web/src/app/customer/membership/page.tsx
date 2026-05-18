'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Skeleton from '@/components/ui/Skeleton'
import { useToast } from '@/components/Toast'
import { useLanguage } from '@/components/common/LanguageToggle'
import { useCurrency } from '@/components/common/CurrencyProvider'

interface MembershipPlan {
  id: string
  name: string
  slug: string
  description: string
  price: number
  interval: string
  features: Record<string, any>
  discount_percent: number
  is_active: boolean
  display_order: number
}

interface UserSubscription {
  id: string
  plan_id: string
  status: string
  started_at: string
  expires_at: string
  membership_plans: MembershipPlan
}

export default function MembershipPage() {
  const [plans, setPlans] = useState<MembershipPlan[]>([])
  const [subscription, setSubscription] = useState<UserSubscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [subscribing, setSubscribing] = useState<string | null>(null)
  const { toast } = useToast()
  const { format } = useCurrency()

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const [plansRes, subRes] = await Promise.all([
        supabase.functions.invoke('subscription-manage', { method: 'GET' }),
        supabase.functions.invoke('subscription-manage/my', { method: 'GET' }),
      ])

      if (plansRes.error) throw plansRes.error
      if (subRes.error && subRes.error !== '') console.error(subRes.error)

      setPlans(plansRes.data?.plans || [])
      setSubscription(subRes.data?.subscription || null)
    } catch (err) {
      console.error('Error loading membership data:', err)
      toast('Không thể tải gói membership', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubscribe(planId: string) {
    setSubscribing(planId)
    try {
      const { data, error } = await supabase.functions.invoke('subscription-manage/subscribe', {
        method: 'POST',
        body: { plan_id: planId },
      })
      if (error) throw error
      toast('Đăng ký gói thành công!', 'success')
      await loadData()
    } catch (err: any) {
      toast(err?.message || 'Lỗi khi đăng ký gói', 'error')
    } finally {
      setSubscribing(null)
    }
  }

  async function handleCancel() {
    try {
      const { error } = await supabase.functions.invoke('subscription-manage/cancel', {
        method: 'POST',
      })
      if (error) throw error
      toast('Đã hủy gói membership', 'success')
      await loadData()
    } catch (err: any) {
      toast(err?.message || 'Lỗi khi hủy gói', 'error')
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <Skeleton variant="rect" width="192px" height="32px" className="rounded" />
        <Skeleton variant="card" height="256px" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Gói Membership</h1>
      <p className="text-gray-600 mb-8">Nâng cấp để nhận ưu đãi giảm giá và nhiều quyền lợi độc quyền</p>

      {subscription && (
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-2xl p-6 mb-8 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm mb-1">Gói hiện tại</p>
              <p className="text-xl font-bold">{subscription.membership_plans.name}</p>
              <p className="text-blue-100 text-sm mt-1">
                Hiệu lực đến: {new Date(subscription.expires_at).toLocaleDateString('vi-VN')}
              </p>
            </div>
            <button
              onClick={handleCancel}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-medium transition-colors"
            >
              Hủy gói
            </button>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const isPopular = plan.slug === 'gold'
          const isCurrent = subscription?.plan_id === plan.id
          const features = plan.features || {}

          return (
            <div
              key={plan.id}
              className={`relative rounded-2xl border-2 p-6 transition-all hover:shadow-lg ${
                isPopular ? 'border-amber-400 bg-amber-50/50 shadow-md' : isCurrent ? 'border-blue-400 bg-blue-50/50' : 'border-gray-200 bg-white'
              }`}
            >
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-amber-400 to-yellow-400 text-white text-xs font-bold rounded-full">
                  Phổ biến nhất
                </div>
              )}
              {isCurrent && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-blue-500 text-white text-xs font-bold rounded-full">
                  Đang sử dụng
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-1">{plan.name}</h3>
                {plan.description && <p className="text-sm text-gray-500">{plan.description}</p>}
                <div className="mt-4">
                  <span className="text-3xl font-bold text-gray-900">{format(plan.price)}</span>
                  <span className="text-gray-500 text-sm">/{plan.interval === 'yearly' ? 'năm' : 'tháng'}</span>
                </div>
                {plan.discount_percent > 0 && (
                  <div className="mt-1 text-sm text-green-600 font-medium">
                    Giảm {plan.discount_percent}% mỗi đơn hàng
                  </div>
                )}
              </div>

              <ul className="space-y-3 mb-8">
                {Object.entries(features).map(([key, value]) => {
                  if (!value) return null
                  const label = ({
                    priority_booking: 'Ưu tiên ghép thợ',
                    discount_percent: `Giảm ${value}% mỗi đơn`,
                    free_diagnostics: `${value} lần chẩn đoán miễn phí/tháng`,
                    vip_support: 'Hỗ trợ VIP 24/7',
                    dedicated_support: 'Chăm sóc khách hàng riêng',
                    free_cancellations: `${value} lần hủy miễn phí/tháng`,
                  } as Record<string, string>)[key] || key

                  return (
                    <li key={key} className="flex items-center gap-2 text-sm text-gray-700">
                      <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {label}
                    </li>
                  )
                })}
              </ul>

              <button
                onClick={() => handleSubscribe(plan.id)}
                disabled={isCurrent || subscribing === plan.id}
                className={`w-full py-3 rounded-xl font-medium transition-all ${
                  isCurrent
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : subscribing === plan.id
                    ? 'bg-gray-200 text-gray-500 cursor-wait'
                    : isPopular
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white shadow-md'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {subscribing === plan.id ? 'Đang đăng ký...' : isCurrent ? 'Đang sử dụng' : 'Đăng ký ngay'}
              </button>
            </div>
          )
        })}
      </div>

      {plans.length === 0 && (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">💎</div>
          <p className="text-gray-500">Chưa có gói membership nào khả dụng</p>
        </div>
      )}
    </div>
  )
}
