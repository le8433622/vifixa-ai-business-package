'use client'

import { useState, useEffect } from 'react'
import Skeleton from '@/components/ui/Skeleton'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/Toast'
import { useCurrency } from '@/components/common/CurrencyProvider'

interface BoostPricing {
  id: string
  duration_days: number
  price: number
  currency: string
}

interface WorkerBoost {
  id: string
  service_type: string
  district: string | null
  expires_at: string
  amount_paid: number
}

const SERVICE_TYPES = [
  { value: 'cleaning', label: 'Dọn dẹp' },
  { value: 'delivery', label: 'Giao hàng' },
  { value: 'moving', label: 'Chuyển nhà' },
  { value: 'elder_care', label: 'Chăm sóc người già' },
  { value: 'child_care', label: 'Trông trẻ' },
  { value: 'pet_care', label: 'Chăm thú cưng' },
  { value: 'tutoring', label: 'Gia sư' },
  { value: 'massage', label: 'Massage' },
]

export default function WorkerBoostPage() {
  const [pricing, setPricing] = useState<BoostPricing[]>([])
  const [boosts, setBoosts] = useState<WorkerBoost[]>([])
  const [selectedPricing, setSelectedPricing] = useState<string>('')
  const [selectedService, setSelectedService] = useState(SERVICE_TYPES[0].value)
  const [district, setDistrict] = useState('')
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState(false)
  const { toast } = useToast()
  const { format } = useCurrency()

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const [pricingRes, boostsRes] = await Promise.all([
        supabase.functions.invoke('subscription-manage/boost-pricing', { method: 'GET' }),
        supabase.functions.invoke('subscription-manage/my-boosts', { method: 'GET' }),
      ])

      setPricing(pricingRes.data?.plans || [])
      setBoosts(boostsRes.data?.boosts || [])

      if (pricing.length > 0 && !selectedPricing) {
        setSelectedPricing(pricing[0].id)
      }
    } catch (err) {
      console.error('Error loading boost data:', err)
      toast('Không thể tải thông tin boost', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handlePurchase() {
    if (!selectedPricing || !selectedService) {
      toast('Vui lòng chọn gói và dịch vụ', 'error')
      return
    }

    setPurchasing(true)
    try {
      const { data, error } = await supabase.functions.invoke('subscription-manage/boost', {
        method: 'POST',
        body: {
          pricing_id: selectedPricing,
          service_type: selectedService,
          district: district || null,
        },
      })
      if (error) throw error
      toast('Mua boost thành công!', 'success')
      await loadData()
    } catch (err: any) {
      toast(err?.message || 'Lỗi khi mua boost', 'error')
    } finally {
      setPurchasing(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <Skeleton variant="rect" width="192px" height="32px" className="rounded" />
        <Skeleton variant="card" height="192px" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Nổi bật (Boost)</h1>
      <p className="text-gray-600 mb-8">Tăng visibility để nhận nhiều đơn hơn trong khu vực của bạn</p>

      {boosts.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Boost đang hoạt động</h2>
          <div className="space-y-3">
            {boosts.map((boost) => (
              <div key={boost.id} className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl p-4 shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      {SERVICE_TYPES.find(s => s.value === boost.service_type)?.label || boost.service_type}
                    </p>
                    <p className="text-emerald-100 text-sm">
                      {boost.district ? `Khu vực: ${boost.district}` : 'Tất cả khu vực'}
                      {' · '}Hết hạn: {new Date(boost.expires_at).toLocaleDateString('vi-VN')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{format(boost.amount_paid)}</p>
                    <p className="text-emerald-100 text-xs">Đã thanh toán</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Mua boost mới</h2>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Chọn dịch vụ</label>
            <select
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              {SERVICE_TYPES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Khu vực (không bắt buộc)</label>
            <input
              type="text"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              placeholder="VD: Quận 1, TP. HCM"
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Thời gian boost</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {pricing.map((p) => {
                const isSelected = selectedPricing === p.id
                const dailyPrice = p.price / p.duration_days
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPricing(p.id)}
                    className={`relative rounded-xl border-2 p-4 text-center transition-all ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50 shadow-md'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="text-lg font-bold text-gray-900">{p.duration_days} ngày</div>
                    <div className="text-emerald-600 font-semibold mt-1">{format(p.price)}</div>
                    <div className="text-xs text-gray-500 mt-1">{format(Math.round(dailyPrice))}/ngày</div>
                    {isSelected && (
                      <div className="absolute -top-2 -right-2 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          <button
            onClick={handlePurchase}
            disabled={purchasing}
            className={`w-full py-3 rounded-xl font-medium text-white transition-all ${
              purchasing
                ? 'bg-gray-400 cursor-wait'
                : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-md'
            }`}
          >
            {purchasing ? 'Đang xử lý...' : 'Mua Boost'}
          </button>
        </div>
      </div>
    </div>
  )
}
