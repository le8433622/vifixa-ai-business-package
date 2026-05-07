// Customer Dashboard Page
// Per 05_PRODUCT_SOLUTION.md - Customer flow
// Per Step 3: Build customer flows

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
  'camera': '📷',
  'Điện lạnh': '❄️',
  'Điện nước': '🚿',
  'Điện gia dụng': '🔌',
  'Camera/Khóa': '📷',
}

export default function CustomerDashboard() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    // Wait for auth to be ready
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session?.user?.id)
      if (event === 'SIGNED_OUT' || !session) {
        router.push('/login')
        return
      }
      // Only fetch orders when we have a session
      if (session && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION')) {
        fetchOrders()
      }
    })

    // Also check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        console.log('Initial session found, fetching orders...')
        fetchOrders()
      } else {
        console.log('No session, redirecting to login')
        router.push('/login')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function checkUser() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }
      await fetchOrders()
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
      console.log('fetchOrders: getting session...')
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        console.error('Session error:', sessionError)
        throw new Error('Lỗi phiên đăng nhập: ' + sessionError.message)
      }
      
      if (!session) {
        console.log('No session, redirecting to login')
        router.push('/login')
        return
      }

      console.log('fetchOrders: fetching from Supabase orders table...')
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('customer_id', session.user.id)
        .order('created_at', { ascending: false })

      console.log('fetchOrders: result:', { data, error })
      
      if (error) throw new Error(error.message)
      setOrders(data || [])
    } catch (error: any) {
      console.error('fetchOrders error:', error)
      setError(error.message || 'Không thể tải đơn hàng')
      toast(error.message || 'Không thể tải đơn hàng', 'error')
    } finally {
      setLoading(false)
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1">Quản lý đơn hàng và dịch vụ của bạn</p>
          </div>
          <button
            onClick={() => router.push('/customer/service-request')}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
          >
            <span className="text-lg">+</span>
            Đặt dịch vụ mới
          </button>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <p className="text-red-700 mb-4">{error}</p>
          <button
            onClick={() => { setError(null); fetchOrders(); }}
            className="inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
          >
            Thử lại
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Quản lý đơn hàng và dịch vụ của bạn</p>
        </div>
        <button
          onClick={() => router.push('/customer/service-request')}
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
        >
          <span className="text-lg">+</span>
          Đặt dịch vụ mới
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="sm:col-span-2">
            <input
              type="text"
              placeholder="🔍 Tìm kiếm đơn hàng..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Tất cả trạng thái</option>
            {Object.entries(STATUS_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <div className="flex items-center text-sm text-gray-600">
            <span>{filteredOrders.length} / {orders.length} đơn hàng</span>
          </div>
        </div>
      </div>

      <h2 className="text-xl font-semibold text-gray-900">Đơn hàng của tôi</h2>

      {filteredOrders.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="text-5xl mb-4">📋</div>
          <p className="text-gray-600 mb-4">
            {searchTerm || statusFilter !== 'all'
              ? 'Không tìm thấy đơn hàng phù hợp'
              : 'Bạn chưa có đơn hàng nào'}
          </p>
          {!searchTerm && statusFilter === 'all' && (
            <button
              onClick={() => router.push('/customer/service-request')}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <span className="text-lg">+</span>
              Tạo yêu cầu dịch vụ
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <div
              key={order.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => router.push(`/customer/orders/${order.id}`)}
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{CATEGORY_ICONS[order.category] || '📦'}</span>
                    <h3 className="text-lg font-semibold text-gray-900">{order.category}</h3>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-800'}`}>
                      {STATUS_LABELS[order.status] || order.status}
                    </span>
                  </div>
                  <p className="text-gray-600 line-clamp-2">{order.description}</p>
                  {order.ai_diagnosis && (
                    <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm">🤖</span>
                        <span className="text-sm font-medium text-blue-700">AI Chẩn đoán</span>
                      </div>
                      <p className="text-sm text-gray-700">{order.ai_diagnosis.diagnosis}</p>
                      {order.ai_diagnosis.severity && (
                        <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${
                          order.ai_diagnosis.severity === 'emergency' ? 'bg-red-100 text-red-700' :
                          order.ai_diagnosis.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                          order.ai_diagnosis.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          Mức độ: {order.ai_diagnosis.severity === 'emergency' ? 'Khẩn cấp' :
                                   order.ai_diagnosis.severity === 'high' ? 'Cao' :
                                   order.ai_diagnosis.severity === 'medium' ? 'Trung bình' : 'Thấp'}
                        </span>
                      )}
                    </div>
                  )}
                  {order.rating && (
                    <div className="mt-2 flex items-center gap-1 text-yellow-500">
                      {Array.from({ length: 5 }, (_, i) => (
                        <span key={i}>{i < order.rating! ? '★' : '☆'}</span>
                      ))}
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
        </div>
      )}
    </div>
  )
}
