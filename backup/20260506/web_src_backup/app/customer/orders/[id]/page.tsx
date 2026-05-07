// Customer Order Details Page
// Per 05_PRODUCT_SOLUTION.md - Customer flow
// Per Step 7: Trust & Quality - Review, warranty, complaint

'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useToast } from '@/components/Toast'

interface OrderDetails {
  id: string
  category: string
  description: string
  status: string
  estimated_price: number
  final_price?: number
  rating?: number
  review_comment?: string
  created_at: string
  completed_at?: string
  payment_status?: string
  ai_diagnosis?: any
  before_media?: any[]
  after_media?: any[]
  media_urls?: any[]
  workers?: {
    user_id: string
    trust_score?: number
    profiles?: { email: string; phone?: string }
  }
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
  matched: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-purple-100 text-purple-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-800',
  disputed: 'bg-red-100 text-red-800',
}

const CATEGORY_ICONS: Record<string, string> = {
  'electricity': '🔌', 'plumbing': '🚿', 'appliance': '🔧', 'camera': '📷',
  'Điện lạnh': '❄️', 'Điện nước': '🚿', 'Điện gia dụng': '🔌', 'Camera/Khóa': '📷',
}

export default function CustomerOrderDetailsPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const orderId = params.id
  const { toast } = useToast()
  const [isWarrantyEligible, setIsWarrantyEligible] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [selectedMedia, setSelectedMedia] = useState<string | null>(null)

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', orderId],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return null }

      const { data, error } = await supabase
        .from('orders')
        .select(`*, workers:worker_id (user_id, trust_score, profiles (email, phone))`)
        .eq('id', orderId)
        .single()

      if (error) throw error
      return data as OrderDetails
    },
  })

  useEffect(() => {
    if (order?.status === 'completed' && order.completed_at) {
      const completedDate = new Date(order.completed_at)
      const thirtyDaysLater = new Date(completedDate)
      thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30)
      setIsWarrantyEligible(new Date() <= thirtyDaysLater)
    }
  }, [order])

  async function cancelOrder() {
    if (!confirm('Bạn có chắc muốn hủy đơn hàng này?')) return
    setCancelling(true)
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', orderId)
      if (error) throw error
      toast('Đã hủy đơn hàng', 'success')
      queryClient.invalidateQueries({ queryKey: ['order', orderId] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    } catch (error: any) {
      toast(error.message || 'Không thể hủy đơn hàng', 'error')
    } finally {
      setCancelling(false)
    }
  }

  function formatPrice(price: number | undefined) {
    if (!price && price !== 0) return 'Chưa có giá'
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price)
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('vi-VN', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="text-center py-20">
        <div className="text-5xl mb-4">🔍</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Không tìm thấy đơn hàng</h2>
        <button onClick={() => router.push('/customer')} className="mt-4 text-blue-600 hover:underline">
          ← Quay lại Dashboard
        </button>
      </div>
    )
  }

  const showCancelButton = ['pending', 'matched'].includes(order.status)
  const showReviewButton = order.status === 'completed' && !order.rating
  const showComplaintButton = order.status === 'completed'
  const showWarrantyButton = isWarrantyEligible
  const severityColors: Record<string, string> = {
    emergency: 'bg-red-100 text-red-700 border-red-200',
    high: 'bg-orange-100 text-orange-700 border-orange-200',
    medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    low: 'bg-green-100 text-green-700 border-green-200',
  }

  return (
    <div className="space-y-6">
      {selectedMedia && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setSelectedMedia(null)}
        >
          <img src={selectedMedia} alt="Media" className="max-w-full max-h-[90vh] rounded-lg object-contain" />
          <button
            onClick={() => setSelectedMedia(null)}
            className="absolute top-4 right-4 text-white text-3xl hover:text-gray-300"
          >
            ✕
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <button onClick={() => router.push('/customer')} className="text-sm text-blue-600 hover:underline mb-1">
            ← Quay lại Dashboard
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Chi tiết đơn hàng</h1>
        </div>
        <span className={`px-3 py-1.5 rounded-full text-sm font-medium self-start ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-800'}`}>
          {STATUS_LABELS[order.status] || order.status}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">{CATEGORY_ICONS[order.category] || '📦'}</span>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{order.category}</h2>
                <p className="text-sm text-gray-500">{formatDate(order.created_at)}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <span className="text-xs font-medium text-gray-500 uppercase">Mô tả vấn đề</span>
                <p className="text-gray-800 mt-1">{order.description}</p>
              </div>
              {order.workers?.profiles && (
                <div>
                  <span className="text-xs font-medium text-gray-500 uppercase">Thợ thực hiện</span>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
                      {order.workers.profiles.email?.[0]?.toUpperCase() || '?'}
                    </div>
                    <span className="text-gray-800">{order.workers.profiles.email}</span>
                    {order.workers.trust_score != null && (
                      <span className="text-xs px-2 py-0.5 bg-green-50 text-green-700 rounded-full">
                        Tin cậy: {order.workers.trust_score}%
                      </span>
                    )}
                  </div>
                </div>
              )}
              {order.payment_status && (
                <div>
                  <span className="text-xs font-medium text-gray-500 uppercase">Thanh toán</span>
                  <p className={`text-sm font-medium mt-1 ${
                    order.payment_status === 'paid' ? 'text-green-600' :
                    order.payment_status === 'refunded' ? 'text-orange-600' :
                    'text-yellow-600'
                  }`}>
                    {order.payment_status === 'paid' ? '✅ Đã thanh toán' :
                     order.payment_status === 'refunded' ? '↩️ Đã hoàn tiền' :
                     order.payment_status === 'failed' ? '❌ Thất bại' : '⏳ Đang chờ'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {order.ai_diagnosis && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg">🤖</span>
                <h3 className="text-lg font-semibold text-gray-900">Chẩn đoán AI</h3>
              </div>
              <div className="space-y-3">
                {order.ai_diagnosis.diagnosis && (
                  <div>
                    <span className="text-xs font-medium text-gray-500 uppercase">Chẩn đoán</span>
                    <p className="text-gray-800 mt-1">{order.ai_diagnosis.diagnosis}</p>
                  </div>
                )}
                {order.ai_diagnosis.severity && (
                  <div>
                    <span className="text-xs font-medium text-gray-500 uppercase">Mức độ nghiêm trọng</span>
                    <span className={`inline-block ml-2 px-2.5 py-0.5 rounded-full text-xs font-medium border ${severityColors[order.ai_diagnosis.severity] || 'bg-gray-100 text-gray-700'}`}>
                      {order.ai_diagnosis.severity === 'emergency' ? '🚨 Khẩn cấp' :
                       order.ai_diagnosis.severity === 'high' ? '🔴 Cao' :
                       order.ai_diagnosis.severity === 'medium' ? '🟡 Trung bình' : '🟢 Thấp'}
                    </span>
                  </div>
                )}
                {order.ai_diagnosis.recommended_skills?.length > 0 && (
                  <div>
                    <span className="text-xs font-medium text-gray-500 uppercase">Kỹ năng yêu cầu</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {order.ai_diagnosis.recommended_skills.map((skill: string) => (
                        <span key={skill} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-md">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {order.ai_diagnosis.estimated_price_range && (
                  <div>
                    <span className="text-xs font-medium text-gray-500 uppercase">Khoảng giá</span>
                    <p className="text-gray-800 mt-1">
                      {formatPrice(order.ai_diagnosis.estimated_price_range.min)} - {formatPrice(order.ai_diagnosis.estimated_price_range.max)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {(order.before_media?.length || order.after_media?.length || order.media_urls?.length) && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Hình ảnh / Video</h3>
              {order.media_urls?.length ? (
                <div>
                  <span className="text-xs font-medium text-gray-500 uppercase mb-2 block">Ảnh mô tả ban đầu</span>
                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {order.media_urls.map((url: string, i: number) => (
                      <img
                        key={i}
                        src={url}
                        alt={`Media ${i + 1}`}
                        className="w-32 h-32 object-cover rounded-lg cursor-pointer hover:opacity-80 transition flex-shrink-0"
                        onClick={() => setSelectedMedia(url)}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
              {order.before_media?.length ? (
                <div className={order.media_urls?.length ? 'mt-4' : ''}>
                  <span className="text-xs font-medium text-gray-500 uppercase mb-2 block">Ảnh trước khi sửa</span>
                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {order.before_media.map((url: string, i: number) => (
                      <img
                        key={i}
                        src={url}
                        alt={`Before ${i + 1}`}
                        className="w-32 h-32 object-cover rounded-lg cursor-pointer hover:opacity-80 transition flex-shrink-0"
                        onClick={() => setSelectedMedia(url)}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
              {order.after_media?.length ? (
                <div className={(order.media_urls?.length || order.before_media?.length) ? 'mt-4' : ''}>
                  <span className="text-xs font-medium text-gray-500 uppercase mb-2 block">Ảnh sau khi sửa</span>
                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {order.after_media.map((url: string, i: number) => (
                      <img
                        key={i}
                        src={url}
                        alt={`After ${i + 1}`}
                        className="w-32 h-32 object-cover rounded-lg cursor-pointer hover:opacity-80 transition flex-shrink-0"
                        onClick={() => setSelectedMedia(url)}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {order.rating && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Đánh giá của bạn</h3>
              <div className="flex items-center gap-1 text-2xl">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span key={star} className={star <= order.rating! ? 'text-yellow-400' : 'text-gray-200'}>
                    ★
                  </span>
                ))}
                <span className="ml-2 text-base text-gray-600">({order.rating}/5)</span>
              </div>
              {order.review_comment && (
                <p className="mt-2 text-gray-700 italic">"{order.review_comment}"</p>
              )}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Giá tiền</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-baseline">
                <span className="text-sm text-gray-600">Giá dự kiến</span>
                <span className="text-xl font-bold text-gray-900">{formatPrice(order.estimated_price)}</span>
              </div>
              {order.final_price && (
                <div className="flex justify-between items-baseline pt-3 border-t border-gray-100">
                  <span className="text-sm text-gray-600">Giá cuối cùng</span>
                  <span className="text-xl font-bold text-green-600">{formatPrice(order.final_price)}</span>
                </div>
              )}
            </div>
            {!order.final_price && ['pending', 'matched'].includes(order.status) && (
              <p className="text-xs text-gray-400 mt-3 text-center">
                Giá cuối cùng sẽ được cập nhật sau khi hoàn thành
              </p>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Hành động</h3>
            <div className="space-y-3">
              {showCancelButton && (
                <button
                  onClick={cancelOrder}
                  disabled={cancelling}
                  className="w-full px-4 py-2.5 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50 font-medium"
                >
                  {cancelling ? 'Đang hủy...' : 'Hủy đơn hàng'}
                </button>
              )}
              {showReviewButton && (
                <Link href={`/customer/review/${order.id}`} className="block">
                  <button className="w-full px-4 py-2.5 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors font-medium">
                    ⭐ Đánh giá dịch vụ
                  </button>
                </Link>
              )}
              {showWarrantyButton && (
                <Link href={`/customer/warranty/${order.id}`} className="block">
                  <button className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
                    🛡️ Yêu cầu bảo hành
                  </button>
                </Link>
              )}
              {!isWarrantyEligible && order.status === 'completed' && (
                <p className="text-xs text-gray-400 text-center">Bảo hành đã hết hạn (quá 30 ngày)</p>
              )}
              {showComplaintButton && (
                <Link href={`/customer/complaint?order_id=${order.id}`} className="block">
                  <button className="w-full px-4 py-2.5 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors font-medium">
                    ⚠️ Khiếu nại
                  </button>
                </Link>
              )}
              {['completed', 'cancelled', 'disputed'].includes(order.status) && !showReviewButton && !showWarrantyButton && !showComplaintButton && (
                <p className="text-sm text-gray-400 text-center">Không có hành động khả dụng</p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Dòng thời gian</h3>
            <div className="space-y-3 relative before:absolute before:left-[11px] before:top-3 before:bottom-3 before:w-0.5 before:bg-gray-200">
              <div className="flex items-start gap-3 relative">
                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 z-10">
                  <span className="w-2 h-2 rounded-full bg-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Đơn hàng được tạo</p>
                  <p className="text-xs text-gray-500">{formatDate(order.created_at)}</p>
                </div>
              </div>
              {order.status !== 'pending' && (
                <div className="flex items-start gap-3 relative">
                  <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 z-10">
                    <span className="w-2 h-2 rounded-full bg-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {order.status === 'matched' ? 'Đã ghép thợ' :
                       order.status === 'in_progress' ? 'Đang thực hiện' :
                       order.status === 'completed' ? 'Hoàn thành' :
                       order.status === 'cancelled' ? 'Đã hủy' : 'Đang khiếu nại'}
                    </p>
                  </div>
                </div>
              )}
              {order.status === 'completed' && order.rating && (
                <div className="flex items-start gap-3 relative">
                  <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 z-10">
                    <span className="w-2 h-2 rounded-full bg-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Đã đánh giá</p>
                    <p className="text-xs text-gray-500">{order.rating}/5 sao</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}