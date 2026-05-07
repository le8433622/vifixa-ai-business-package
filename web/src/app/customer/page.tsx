// Customer Dashboard - AI-Centric Design
// Per user request: AI as centerpiece, form as foundation

'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/Toast'

interface Order {
  id: string
  category: string
  description: string
  status: string
  estimated_price: number
  final_price?: number
  ai_diagnosis?: any
  rating?: number
  worker_id?: string
  created_at: string
}

interface Device {
  id: string
  device_type: string
  brand?: string
  model?: string
  purchase_date?: string
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Chờ xử lý',
  matched: 'Đã ghép thợ',
  in_progress: 'Đang thực hiện',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
  disputed: 'Khiếu nại',
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  matched: 'bg-purple-100 text-purple-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-800',
  disputed: 'bg-red-100 text-red-800',
}

const CATEGORY_ICONS: Record<string, string> = {
  'electricity': '🔌',
  'plumbing': '🚿',
  'appliance': '🔧',
  'air_conditioning': '❄️',
  'camera': '📷',
}

export default function CustomerDashboard() {
  const [orders, setOrders] = useState<Order[]>([])
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    checkUser()
  }, [])

  async function checkUser() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }
      await Promise.all([fetchOrders(), fetchDevices()])
    } catch (error: any) {
      console.error('checkUser error:', error)
      toast(error.message || 'Lỗi tải dữ liệu', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function fetchOrders() {
    try {
      setError(null)
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !session) {
        router.push('/login')
        return
      }

      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('customer_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(5) // Only show 5 most recent

      if (error) throw new Error(error.message)
      setOrders(data || [])
    } catch (error: any) {
      console.error('fetchOrders error:', error)
      setError(error.message || 'Không thể tải đơn hàng')
    }
  }

  async function fetchDevices() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { data, error } = await supabase
        .from('device_profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .limit(3) // Only show 3 devices on dashboard

      if (error) {
        console.error('fetchDevices error:', error)
        return
      }
      setDevices(data || [])
    } catch (error) {
      console.error('fetchDevices error:', error)
    }
  }

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesSearch =
        !searchTerm ||
        order.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.description?.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus =
        statusFilter === 'all' || order.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [orders, searchTerm, statusFilter])

  function formatPrice(price: number | undefined) {
    if (!price && price !== 0) return 'Chưa có giá'
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Hero Section - AI Chat CTA */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl shadow-lg overflow-hidden">
        <div className="px-6 py-12 sm:px-12 sm:py-16 text-center sm:text-left">
          <div className="max-w-2xl mx-auto sm:mx-0">
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              💬 Chat với AI - Đặt dịch vụ thông minh
            </h1>
            <p className="text-blue-100 text-lg mb-8">
              Mô tả sự cố, AI sẽ chẩn đoán và báo giá minh bạch. 
              Không cần điền form phức tạp.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center sm:justify-start">
              <button
                onClick={() => router.push('/customer/chat')}
                className="inline-flex items-center justify-center gap-2 bg-white text-blue-600 px-8 py-3.5 rounded-xl font-semibold text-lg hover:bg-blue-50 transition-all shadow-md"
              >
                <span className="text-2xl">💬</span>
                Bắt đầu chat ngay
              </button>
              <button
                onClick={() => router.push('/customer/service-request')}
                className="inline-flex items-center justify-center gap-2 bg-blue-500 text-white px-6 py-3.5 rounded-xl font-medium hover:bg-blue-400 transition-all border border-blue-400"
              >
                📝 Dùng form cũ
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">⚡ Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { emoji: '❄️', label: 'Máy lạnh', desc: 'Sửa, lắp, vệ sinh' },
            { emoji: '💡', label: 'Điện nước', desc: 'Sửa điện, nước' },
            { emoji: '🚿', label: 'Nước rò rỉ', desc: 'Thông tắc, sửa ống' },
            { emoji: '📷', label: 'Camera', desc: 'Lắp đặt camera' },
          ].map((action) => (
            <button
              key={action.label}
              onClick={() => router.push('/customer/chat')}
              className="p-4 bg-gray-50 rounded-xl hover:bg-blue-50 hover:shadow-md transition-all text-center group"
            >
              <div className="text-4xl mb-2 group-hover:scale-110 transition-transform">
                {action.emoji}
              </div>
              <h3 className="font-semibold text-gray-900">{action.label}</h3>
              <p className="text-xs text-gray-500 mt-1">{action.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders - 2/3 width */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">📋 Đơn hàng gần đây</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {filteredOrders.length} / {orders.length} đơn hàng
                </p>
              </div>
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="🔍 Tìm kiếm..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="all">Tất cả</option>
                  {Object.entries(STATUS_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center mb-4">
                <div className="text-5xl mb-4">⚠️</div>
                <p className="text-red-700 mb-4">{error}</p>
                <button
                  onClick={() => { setError(null); fetchOrders(); }}
                  className="inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
                >
                  Thử lại
                </button>
              </div>
            )}

            {filteredOrders.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-5xl mb-4">📋</div>
                <p className="text-gray-600 mb-6">
                  {searchTerm || statusFilter !== 'all' 
                    ? 'Không tìm thấy đơn hàng phù hợp' 
                    : 'Bạn chưa có đơn hàng nào'}
                </p>
                {!searchTerm && statusFilter === 'all' && (
                  <button
                    onClick={() => router.push('/customer/chat')}
                    className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700"
                  >
                    <span className="text-xl">💬</span>
                    Chat với AI để đặt dịch vụ
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map((order) => (
                  <div
                    key={order.id}
                    className="border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => router.push(`/customer/orders/${order.id}`)}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className="text-xl">{CATEGORY_ICONS[order.category] || '📦'}</span>
                          <h3 className="text-lg font-semibold text-gray-900">{order.category}</h3>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-800'}`}>
                            {STATUS_LABELS[order.status] || order.status}
                          </span>
                        </div>
                        <p className="text-gray-600 line-clamp-2 text-sm">{order.description}</p>
                        {order.ai_diagnosis && (
                          <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm">🤖</span>
                              <span className="text-sm font-medium text-blue-700">AI Chẩn đoán</span>
                            </div>
                            <p className="text-sm text-gray-700">{order.ai_diagnosis.diagnosis}</p>
                          </div>
                        )}
                      </div>
                      <div className="text-right sm:min-w-[120px]">
                        <p className="text-lg font-bold text-gray-900">
                          {formatPrice(order.final_price ?? order.estimated_price)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(order.created_at).toLocaleDateString('vi-VN', {
                            year: 'numeric', month: 'short', day: 'numeric',
                            hour: '2-digit', minute: '2-digit'
                          })}
                        </p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/customer/orders/${order.id}`)
                          }}
                          className="mt-2 text-sm text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          Xem chi tiết →
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {orders.length > 5 && (
                  <div className="text-center pt-4">
                    <button
                      onClick={() => router.push('/customer/orders')}
                      className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                    >
                      Xem tất cả đơn hàng →
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar - 1/3 width */}
        <div className="space-y-6">
          {/* Devices Preview */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">🔧 Thiết bị của tôi</h2>
              <button
                onClick={() => router.push('/customer/devices')}
                className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
              >
                Xem tất cả →
              </button>
            </div>
            {devices.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-gray-600 mb-4">Chưa có thiết bị nào</p>
                <button
                  onClick={() => router.push('/customer/devices')}
                  className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 hover:underline"
                >
                  + Thêm thiết bị đầu tiên
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {devices.map((device) => (
                  <div key={device.id} className="p-3 bg-gray-50 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
                    onClick={() => router.push('/customer/devices')}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">
                        {device.device_type === 'air_conditioning' ? '❄️' : '🔧'}
                      </span>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 text-sm">
                          {device.brand} {device.model}
                        </p>
                        {device.purchase_date && (
                          <p className="text-xs text-gray-500">
                            Mua: {new Date(device.purchase_date).toLocaleDateString('vi-VN')}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Help Box */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
            <h3 className="font-semibold text-blue-900 mb-2">💡 Mẹo nhỏ</h3>
            <p className="text-sm text-blue-800 mb-4">
              Chat với AI để được tư vấn miễn phí. AI hỗ trợ tiếng Việt tự nhiên, 
              chẩn đoán chính xác và báo giá minh bạch.
            </p>
            <button
              onClick={() => router.push('/customer/chat')}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              💬 Chat ngay
            </button>
          </div>
        </div>
      </div>

      {/* Footer Links */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-wrap gap-6 justify-center text-sm">
          <button
            onClick={() => router.push('/customer/chat')}
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 hover:underline font-medium"
          >
            <span className="text-xl">💬</span>
            Chat với AI
          </button>
          <button
            onClick={() => router.push('/customer/service-request')}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800 hover:underline"
          >
            <span>📝</span>
            Dùng form cũ
          </button>
          <button
            onClick={() => router.push('/customer/profile')}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800 hover:underline"
          >
            <span>👤</span>
            Tài khoản
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
