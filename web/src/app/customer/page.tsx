// Vifixa AI v2.0 — Premium Customer Dashboard
// Glass cards, animated stats, premium service grid

'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
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
  ai_diagnosis?: { diagnosis?: string }
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

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'Chờ xử lý', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
  matched: { label: 'Đã ghép thợ', color: 'text-violet-700', bg: 'bg-violet-50 border-violet-200' },
  in_progress: { label: 'Đang thực hiện', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
  completed: { label: 'Hoàn thành', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  cancelled: { label: 'Đã hủy', color: 'text-gray-500', bg: 'bg-gray-50 border-gray-200' },
  disputed: { label: 'Khiếu nại', color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
}

const CATEGORY_ICONS: Record<string, string> = {
  electricity: '⚡', plumbing: '🚿', appliance: '🔧',
  air_conditioning: '❄️', camera: '📷', ac_repair: '❄️',
  water: '🚿', lock_smith: '🔑',
}

const NAV_ITEMS = [
  { emoji: '💬', label: 'Chat AI', href: '/customer/chat', primary: true },
  { emoji: '📋', label: 'Đơn hàng', href: '/customer/orders' },
  { emoji: '🌿', label: 'Chăm sóc', href: '/customer/care' },
  { emoji: '🔧', label: 'Thiết bị', href: '/customer/devices' },
  { emoji: '👤', label: 'Tài khoản', href: '/customer/profile' },
  { emoji: '⚙️', label: 'Cài đặt', href: '/customer/settings' },
]

export default function CustomerDashboard() {
  const [orders, setOrders] = useState<Order[]>([])
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [referralCode, setReferralCode] = useState<string | null>(null)
  const router = useRouter()
  const { toast } = useToast()

  const fetchOrders = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { data, error } = await supabase
      .from('orders').select('*')
      .eq('customer_id', session.user.id)
      .order('created_at', { ascending: false }).limit(5)
    if (error) throw new Error(error.message)
    setOrders(data || [])
  }, [])

  const fetchDevices = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { data } = await supabase
      .from('device_profiles').select('*')
      .eq('user_id', session.user.id).limit(3)
    setDevices(data || [])
  }, [])

  const fetchReferralCode = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { data } = await supabase
      .from('user_referral_codes')
      .select('code')
      .eq('user_id', session.user.id)
      .single()
    if (data) setReferralCode(data.code)
  }, [setReferralCode])

  const checkUser = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      await Promise.all([fetchOrders(), fetchDevices(), fetchReferralCode()])
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Lỗi tải dữ liệu', 'error')
    } finally {
      setLoading(false)
    }
  }, [fetchOrders, fetchDevices, fetchReferralCode, router, toast])

  useEffect(() => {
    queueMicrotask(() => { checkUser() })
  }, [checkUser])

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesSearch = !searchTerm ||
        order.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.description?.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [orders, searchTerm, statusFilter])

  const stats = useMemo(() => ({
    total: orders.length,
    active: orders.filter(o => ['pending', 'matched', 'in_progress'].includes(o.status)).length,
    completed: orders.filter(o => o.status === 'completed').length,
    spent: orders.filter(o => o.status === 'completed').reduce((s, o) => s + (o.final_price ?? o.estimated_price ?? 0), 0),
  }), [orders])

  function formatPrice(price: number | undefined) {
    if (!price && price !== 0) return 'Chưa có giá'
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--vf-bg))]">
        <div className="w-12 h-12 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--vf-bg))]">
      {/* ====== TOP NAV ====== */}
      <nav className="sticky top-0 z-40 glass-strong border-b border-[hsl(var(--vf-border))]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white font-bold text-xs">V</div>
            <span className="font-bold text-[hsl(var(--vf-text))]">Khách hàng</span>
          </div>
          <div className="flex gap-1 overflow-x-auto">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  item.primary
                    ? 'btn-primary !py-1.5 !px-4 !text-sm'
                    : 'text-[hsl(var(--vf-text-secondary))] hover:bg-[hsl(var(--vf-bg-subtle))] hover:text-[hsl(var(--vf-text))]'
                }`}
              >
                <span>{item.emoji}</span>
                <span className="hidden sm:inline">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* ====== HERO CTA ====== */}
        <div className="relative overflow-hidden rounded-2xl bg-mesh p-8 sm:p-10 animate-fade-in-up">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/15 rounded-full blur-[80px]" />
            <div className="absolute bottom-0 left-1/4 w-48 h-48 bg-violet-500/15 rounded-full blur-[60px]" />
          </div>
          <div className="relative z-10">
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2" style={{ fontFamily: 'var(--font-display)' }}>
              Xin chào! 👋
            </h1>
            <p className="text-blue-100/70 mb-6 max-w-lg">
              Mô tả sự cố, AI sẽ chẩn đoán và báo giá minh bạch. Không cần điền form phức tạp.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => router.push('/customer/chat')}
                className="inline-flex items-center justify-center gap-2 bg-white text-gray-900 px-6 py-3 rounded-xl font-bold hover:bg-blue-50 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
              >
                💬 Chat với AI ngay
              </button>
              <button
                onClick={() => router.push('/customer/service-request')}
                className="inline-flex items-center justify-center gap-2 text-blue-200 border border-white/15 px-5 py-3 rounded-xl font-medium hover:bg-white/5 transition-all"
              >
                📝 Dùng form
              </button>
            </div>
          </div>
        </div>

        {/* ====== STATS ====== */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-fade-in-up delay-100">
          {[
            { icon: '📋', value: stats.total, label: 'Tổng đơn', color: 'from-blue-500/10 to-blue-500/5' },
            { icon: '⏳', value: stats.active, label: 'Đang xử lý', color: 'from-amber-500/10 to-amber-500/5' },
            { icon: '✅', value: stats.completed, label: 'Hoàn thành', color: 'from-emerald-500/10 to-emerald-500/5' },
            { icon: '💰', value: formatPrice(stats.spent), label: 'Đã chi', color: 'from-violet-500/10 to-violet-500/5', isPrice: true },
          ].map((stat) => (
            <div key={stat.label} className={`card p-4 bg-gradient-to-br ${stat.color}`}>
              <div className="text-2xl mb-2">{stat.icon}</div>
              <div className="text-xl sm:text-2xl font-bold text-[hsl(var(--vf-text))]">
                {typeof stat.value === 'number' ? stat.value : stat.value}
              </div>
              <div className="text-xs text-[hsl(var(--vf-text-muted))] mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* ====== QUICK SERVICES ====== */}
        <div className="card p-5 animate-fade-in-up delay-200">
          <h2 className="text-base font-bold text-[hsl(var(--vf-text))] mb-4">⚡ Dịch vụ phổ biến</h2>
          <div className="grid grid-cols-4 gap-3">
            {[
              { emoji: '❄️', label: 'Máy lạnh', gradient: 'from-cyan-500 to-blue-500' },
              { emoji: '⚡', label: 'Điện nước', gradient: 'from-amber-500 to-orange-500' },
              { emoji: '🚿', label: 'Nước rò', gradient: 'from-blue-500 to-indigo-500' },
              { emoji: '📷', label: 'Camera', gradient: 'from-violet-500 to-purple-500' },
            ].map((svc) => (
              <button
                key={svc.label}
                onClick={() => router.push('/customer/chat')}
                className="group p-3 rounded-xl bg-[hsl(var(--vf-bg-subtle))] hover:bg-[hsl(var(--vf-bg-muted))] transition-all text-center"
              >
                <div className={`w-10 h-10 mx-auto rounded-xl bg-gradient-to-br ${svc.gradient} flex items-center justify-center text-xl mb-2 group-hover:scale-110 transition-transform shadow-md`}>
                  {svc.emoji}
                </div>
                <p className="text-xs font-medium text-[hsl(var(--vf-text))]">{svc.label}</p>
              </button>
            ))}
          </div>
        </div>

        {/* ====== TWO COLUMNS ====== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Orders — 2/3 */}
          <div className="lg:col-span-2 animate-fade-in-up delay-300">
            <div className="card p-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
                <h2 className="text-base font-bold text-[hsl(var(--vf-text))]">📋 Đơn hàng gần đây</h2>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Tìm kiếm..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-[hsl(var(--vf-border))] bg-[hsl(var(--vf-bg-subtle))] text-sm text-[hsl(var(--vf-text))] placeholder:text-[hsl(var(--vf-text-muted))] focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-2 py-1.5 rounded-lg border border-[hsl(var(--vf-border))] bg-[hsl(var(--vf-bg-subtle))] text-sm text-[hsl(var(--vf-text))] focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  >
                    <option value="all">Tất cả</option>
                    {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                      <option key={key} value={key}>{cfg.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {filteredOrders.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-5xl mb-4">📋</div>
                  <p className="text-[hsl(var(--vf-text-secondary))] mb-4">
                    {searchTerm || statusFilter !== 'all' ? 'Không tìm thấy' : 'Chưa có đơn hàng nào'}
                  </p>
                  {!searchTerm && statusFilter === 'all' && (
                    <button onClick={() => router.push('/customer/chat')} className="btn-primary text-sm">
                      💬 Đặt dịch vụ ngay
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredOrders.map((order, i) => {
                    const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending
                    return (
                      <div
                        key={order.id}
                        className="p-4 rounded-xl border border-[hsl(var(--vf-border))] hover:border-blue-500/30 hover:shadow-md transition-all cursor-pointer group"
                        style={{ animationDelay: `${i * 50}ms` }}
                        onClick={() => router.push(`/customer/orders/${order.id}`)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                              <span className="text-lg">{CATEGORY_ICONS[order.category] || '📦'}</span>
                              <span className="font-semibold text-[hsl(var(--vf-text))] text-sm">{order.category}</span>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.bg} ${cfg.color}`}>
                                {cfg.label}
                              </span>
                            </div>
                            <p className="text-sm text-[hsl(var(--vf-text-secondary))] line-clamp-1">{order.description}</p>
                            {order.ai_diagnosis && (
                              <p className="mt-1.5 text-xs text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-lg inline-block">
                                🤖 {order.ai_diagnosis.diagnosis?.substring(0, 60)}...
                              </p>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-bold text-[hsl(var(--vf-text))]">
                              {formatPrice(order.final_price ?? order.estimated_price)}
                            </p>
                            <p className="text-xs text-[hsl(var(--vf-text-muted))] mt-1">
                              {new Date(order.created_at).toLocaleDateString('vi-VN')}
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  <button
                    onClick={() => router.push('/customer/orders')}
                    className="w-full text-center py-2 text-sm font-medium text-blue-500 hover:text-blue-400 transition-colors"
                  >
                    Xem tất cả đơn hàng →
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar — 1/3 */}
          <div className="space-y-4 animate-fade-in-up delay-400">
            {/* Referral Program — NEW */}
            <div className="card p-5 overflow-hidden relative group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl -mr-12 -mt-12 group-hover:bg-blue-500/20 transition-all duration-500" />
              <h2 className="text-base font-bold text-[hsl(var(--vf-text))] mb-2 flex items-center gap-2">
                🎁 Mời bạn bè
              </h2>
              <p className="text-xs text-[hsl(var(--vf-text-secondary))] mb-4 leading-relaxed">
                Chia sẻ mã giới thiệu và nhận ngay 50.000₫ vào ví cho mỗi người bạn hoàn thành đơn hàng đầu tiên.
              </p>
              
              <div className="flex items-center gap-2 p-3 rounded-xl bg-[hsl(var(--vf-bg-subtle))] border border-dashed border-[hsl(var(--vf-border))] group-hover:border-blue-500/50 transition-colors">
                <code className="flex-1 font-mono font-bold text-blue-600 text-center tracking-widest uppercase">
                  {referralCode || 'ĐANG TẠO...'}
                </code>
                <button 
                  onClick={() => {
                    if (referralCode) {
                      navigator.clipboard.writeText(referralCode);
                      toast('Đã copy mã giới thiệu!', 'success');
                    }
                  }}
                  className="p-1.5 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors shadow-sm"
                  title="Copy mã"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                </button>
              </div>
              <button 
                onClick={() => {
                  if (referralCode) {
                    const text = `Sửa đồ tại nhà chuyên nghiệp với Vifixa AI. Dùng mã ${referralCode} để được giảm 10% đơn đầu tiên: https://vifixa.com/register?ref=${referralCode}`;
                    navigator.share?.({ title: 'Vifixa AI', text, url: 'https://vifixa.com' })
                      .catch(() => {
                        navigator.clipboard.writeText(text);
                        toast('Đã copy link mời!', 'success');
                      });
                  }
                }}
                className="w-full mt-3 py-2 text-xs font-bold text-blue-500 hover:bg-blue-50 rounded-xl transition-colors"
              >
                Chia sẻ ngay →
              </button>
            </div>

            {/* Devices */}
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-[hsl(var(--vf-text))]">🔧 Thiết bị</h2>
                <button onClick={() => router.push('/customer/devices')} className="text-xs text-blue-500 hover:text-blue-400 font-medium">
                  Quản lý →
                </button>
              </div>
              {devices.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-sm text-[hsl(var(--vf-text-muted))] mb-3">Chưa có thiết bị</p>
                  <button onClick={() => router.push('/customer/devices')} className="text-sm text-blue-500 hover:text-blue-400 font-medium">
                    + Thêm thiết bị
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {devices.map((d) => (
                    <div key={d.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-[hsl(var(--vf-bg-subtle))] hover:bg-[hsl(var(--vf-bg-muted))] transition-colors cursor-pointer"
                      onClick={() => router.push('/customer/devices')}
                    >
                      <span className="text-xl">{d.device_type === 'air_conditioning' ? '❄️' : '🔧'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[hsl(var(--vf-text))] truncate">{d.brand} {d.model}</p>
                        {d.purchase_date && (
                          <p className="text-xs text-[hsl(var(--vf-text-muted))]">
                            {new Date(d.purchase_date).toLocaleDateString('vi-VN')}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* AI Tip */}
            <div className="rounded-2xl p-5 bg-gradient-to-br from-blue-500/10 via-violet-500/10 to-cyan-500/10 border border-blue-500/10">
              <h3 className="font-bold text-[hsl(var(--vf-text))] mb-2 text-sm">💡 Mẹo</h3>
              <p className="text-xs text-[hsl(var(--vf-text-secondary))] mb-4 leading-relaxed">
                Chat với AI để được tư vấn miễn phí. AI hỗ trợ tiếng Việt, chẩn đoán chính xác và báo giá minh bạch.
              </p>
              <button
                onClick={() => router.push('/customer/chat')}
                className="w-full btn-primary !py-2 text-sm"
              >
                💬 Chat ngay
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
