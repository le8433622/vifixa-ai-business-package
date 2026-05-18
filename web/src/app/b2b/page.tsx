'use client'

import { useState, useEffect } from 'react'
import Skeleton from '@/components/ui/Skeleton'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface B2BAccount {
  id: string
  company_name: string
  company_address: string | null
  tax_id: string | null
  contact_name: string
  contact_phone: string
  contact_email: string
  status: string
  created_at: string
  membership_plans?: {
    name: string
    price: number
    sla_hours: number
    features: string[]
  }
}

interface OrderSummary {
  total: number
  completed: number
  pending: number
  monthlySpend: number
}

export default function B2BDashboard() {
  const router = useRouter()
  const [account, setAccount] = useState<B2BAccount | null>(null)
  const [orders, setOrders] = useState<OrderSummary>({ total: 0, completed: 0, pending: 0, monthlySpend: 0 })
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/login'); return }
      setUserId(session.user.id)

      const { data: b2bData } = await supabase
        .from('b2b_accounts')
        .select('*, membership_plans(*)')
        .eq('contact_email', session.user.email)
        .maybeSingle()

      if (b2bData) setAccount(b2bData as any)

      const { data: orderData } = await supabase
        .from('orders')
        .select('status, estimated_price')
        .eq('customer_id', session.user.id)

      const allOrders = (orderData || []) as any[]
      const thisMonth = allOrders.filter((o: any) => {
        const d = new Date(o.created_at)
        const now = new Date()
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      })

      setOrders({
        total: allOrders.length,
        completed: allOrders.filter((o: any) => o.status === 'completed').length,
        pending: allOrders.filter((o: any) => ['pending', 'diagnosed', 'quoted'].includes(o.status)).length,
        monthlySpend: thisMonth.reduce((s: number, o: any) => s + (o.estimated_price || 0), 0),
      })
    } catch (err) {
      console.error('Error loading B2B data:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          <Skeleton variant="rect" width="192px" height="32px" className="rounded" />
          <Skeleton variant="card" height="160px" />
        </div>
      </div>
    )
  }

  if (!account) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="max-w-md text-center bg-white rounded-2xl shadow-lg p-10">
          <div className="text-5xl mb-4">🏢</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Chưa có tài khoản B2B</h1>
          <p className="text-gray-500 mb-6">Đăng ký gói B2B để quản lý dịch vụ doanh nghiệp tập trung.</p>
          <Link href="/for-business" className="inline-block px-8 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700">
            Đăng ký ngay
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{account.company_name}</h1>
            <p className="text-sm text-gray-500">B2B Dashboard · {account.status === 'active' ? '✅ Đang hoạt động' : account.status}</p>
          </div>
          <Link href="/for-business" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            Quản lý gói →
          </Link>
        </div>

        {/* Plan Card */}
        {account.membership_plans && (
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Gói hiện tại</p>
                <p className="text-2xl font-bold mt-1">{account.membership_plans.name}</p>
                <p className="text-blue-100 text-sm mt-1">
                  {account.membership_plans.price.toLocaleString()}₫/tháng · SLA {account.membership_plans.sla_hours}h
                </p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold">{orders.completed}</div>
                <div className="text-blue-100 text-xs">Dịch vụ đã hoàn thành</div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-white/20">
              <div className="flex flex-wrap gap-2">
                {(account.membership_plans.features as string[])?.map((f: string, i: number) => (
                  <span key={i} className="px-3 py-1 bg-white/20 rounded-full text-xs font-medium">{f}</span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <p className="text-xs text-gray-500 mb-1">Tổng dịch vụ</p>
            <p className="text-2xl font-bold text-gray-900">{orders.total}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <p className="text-xs text-gray-500 mb-1">Đã hoàn thành</p>
            <p className="text-2xl font-bold text-emerald-600">{orders.completed}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <p className="text-xs text-gray-500 mb-1">Đang xử lý</p>
            <p className="text-2xl font-bold text-amber-600">{orders.pending}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <p className="text-xs text-gray-500 mb-1">Chi tiêu tháng này</p>
            <p className="text-2xl font-bold text-blue-600">{orders.monthlySpend.toLocaleString()}₫</p>
          </div>
        </div>

        {/* Contact Info */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Thông tin liên hệ</h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Người liên hệ</p>
              <p className="font-medium text-gray-900">{account.contact_name}</p>
            </div>
            <div>
              <p className="text-gray-500">Email</p>
              <p className="font-medium text-gray-900">{account.contact_email}</p>
            </div>
            <div>
              <p className="text-gray-500">Số điện thoại</p>
              <p className="font-medium text-gray-900">{account.contact_phone}</p>
            </div>
            <div>
              <p className="text-gray-500">Mã số thuế</p>
              <p className="font-medium text-gray-900">{account.tax_id || '—'}</p>
            </div>
            {account.company_address && (
              <div className="md:col-span-2">
                <p className="text-gray-500">Địa chỉ</p>
                <p className="font-medium text-gray-900">{account.company_address}</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <Link href="/customer/orders"
            className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition flex items-center gap-3">
            <span className="text-2xl">📋</span>
            <div>
              <p className="font-medium text-gray-900">Lịch sử dịch vụ</p>
              <p className="text-xs text-gray-500">Xem tất cả đơn hàng</p>
            </div>
          </Link>
          <Link href="/customer/membership"
            className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition flex items-center gap-3">
            <span className="text-2xl">💎</span>
            <div>
              <p className="font-medium text-gray-900">Nâng cấp gói</p>
              <p className="text-xs text-gray-500">Xem các gói B2B khác</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
