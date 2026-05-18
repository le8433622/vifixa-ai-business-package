'use client'

import { useState, useEffect } from 'react'
import Skeleton from '@/components/ui/Skeleton'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/Toast'
import { useCurrency } from '@/components/common/CurrencyProvider'
import Link from 'next/link'

interface B2BPlan {
  id: string
  name: string
  slug: string
  price: number
  interval: string
  features: Record<string, any>
  description: string
}

export default function ForBusinessPage() {
  const [plans, setPlans] = useState<B2BPlan[]>([])
  const [loading, setLoading] = useState(true)
  const { format } = useCurrency()
  const [companyName, setCompanyName] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [companyAddress, setCompanyAddress] = useState('')
  const [taxId, setTaxId] = useState('')
  const [selectedPlan, setSelectedPlan] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    loadB2BPlans()
  }, [])

  async function loadB2BPlans() {
    try {
      const { data, error } = await supabase
        .from('membership_plans')
        .select('*')
        .in('slug', ['b2b-basic', 'b2b-pro'])
        .eq('is_active', true)
      if (error) throw error
      setPlans(data || [])
      if (data?.length) setSelectedPlan(data[0].id)
    } catch (err) {
      console.error('Error loading B2B plans:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!companyName || !contactName || !contactPhone || !contactEmail || !selectedPlan) {
      toast('Vui lòng điền đầy đủ thông tin', 'error')
      return
    }

    setSubmitting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const { error } = await supabase.from('b2b_accounts').insert({
        company_name: companyName,
        company_address: companyAddress || null,
        tax_id: taxId || null,
        contact_name: contactName,
        contact_phone: contactPhone,
        contact_email: contactEmail,
        plan_id: selectedPlan,
        status: 'active',
        ...(session?.user?.id ? { id: session.user.id } : {}),
      })

      if (error) throw error
      setSubmitted(true)
      toast('Đăng ký thành công! Chúng tôi sẽ liên hệ bạn sớm.', 'success')
    } catch (err: any) {
      toast(err?.message || 'Lỗi khi đăng ký', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-lg w-full text-center bg-white rounded-2xl shadow-lg p-10">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Đăng ký thành công!</h1>
          <p className="text-gray-600 mb-6">Cảm ơn bạn đã đăng ký gói B2B. Đội ngũ Vifixa sẽ liên hệ trong vòng 24h để xác nhận và kích hoạt tài khoản.</p>
          <Link href="/" className="inline-block px-8 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700">
            Về trang chủ
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero */}
      <div className="max-w-5xl mx-auto px-6 pt-16 pb-12 text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Vifixa cho Doanh nghiệp</h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Giải pháp bảo trì và dịch vụ văn phòng trọn gói. Một đối tác, mọi dịch vụ.
        </p>
      </div>

      {/* Plans */}
      {loading ? (
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-8">
            <Skeleton variant="card" height="320px" />
            <Skeleton variant="card" height="320px" />
          </div>
        </div>
      ) : (
        <div className="max-w-5xl mx-auto px-6 pb-12">
          <div className="grid md:grid-cols-2 gap-8">
            {plans.map((plan) => {
              const isPro = plan.slug === 'b2b-pro'
              return (
                <div
                  key={plan.id}
                  className={`relative rounded-2xl border-2 p-8 transition-all hover:shadow-lg ${
                    isPro ? 'border-blue-400 bg-white shadow-md' : 'border-gray-200 bg-white'
                  }`}
                >
                  {isPro && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-blue-500 text-white text-xs font-bold rounded-full">
                      Phổ biến
                    </div>
                  )}
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  <p className="text-sm text-gray-500 mb-4">{plan.description}</p>
                  <div className="mb-6">
                    <span className="text-3xl font-bold">{format(plan.price)}</span>
                    <span className="text-gray-500">/{plan.interval === 'yearly' ? 'năm' : 'tháng'}</span>
                  </div>
                  <ul className="space-y-3 mb-8">
                    {(Object.entries(plan.features || {}) as [string, any][]).map(([key, value]) => {
                      if (!value) return null
                      const label: Record<string, string> = {
                        priority_booking: 'Ưu tiên xử lý',
                        free_diagnostics: `${value} lần kiểm tra/tháng`,
                        vip_support: 'Hỗ trợ VIP',
                        dedicated_support: 'Hỗ trợ riêng',
                        free_cancellations: `${value} hủy miễn phí/tháng`,
                      }
                      return (
                        <li key={key} className="flex items-center gap-2 text-sm text-gray-700">
                          <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          {label[key] || key}
                        </li>
                      )
                    })}
                  </ul>
                  <button
                    onClick={() => setSelectedPlan(plan.id)}
                    className={`w-full py-3 rounded-xl font-medium transition-all ${
                      selectedPlan === plan.id
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'border-2 border-gray-200 text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {selectedPlan === plan.id ? 'Đã chọn' : 'Chọn gói'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Registration Form */}
      <div className="max-w-2xl mx-auto px-6 pb-20">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Đăng ký tư vấn</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên công ty *</label>
                <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 focus:ring-2 focus:ring-blue-500" placeholder="Công ty TNHH ABC" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mã số thuế</label>
                <input type="text" value={taxId} onChange={e => setTaxId(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 focus:ring-2 focus:ring-blue-500" placeholder="MST (nếu có)" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ văn phòng</label>
              <input type="text" value={companyAddress} onChange={e => setCompanyAddress(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-2.5 focus:ring-2 focus:ring-blue-500" placeholder="123 Nguyễn Huệ, Q.1, TP. HCM" />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Người liên hệ *</label>
                <input type="text" value={contactName} onChange={e => setContactName(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 focus:ring-2 focus:ring-blue-500" placeholder="Nguyễn Văn A" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại *</label>
                <input type="tel" value={contactPhone} onChange={e => setContactPhone(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 focus:ring-2 focus:ring-blue-500" placeholder="0901234567" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-2.5 focus:ring-2 focus:ring-blue-500" placeholder="abc@company.com" />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className={`w-full py-3.5 rounded-xl font-medium text-white transition-all ${
                submitting ? 'bg-gray-400 cursor-wait' : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-md'
              }`}
            >
              {submitting ? 'Đang gửi...' : 'Đăng ký ngay'}
            </button>
            <p className="text-xs text-gray-400 text-center">Chúng tôi sẽ liên hệ trong vòng 24h để xác nhận và hướng dẫn các bước tiếp theo.</p>
          </form>
        </div>
      </div>
    </div>
  )
}
