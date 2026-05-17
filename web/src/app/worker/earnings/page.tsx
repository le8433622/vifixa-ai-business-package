'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import WalletDashboard from '@/components/wallet/WalletDashboard'
import { useToast } from '@/components/Toast'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL

type Order = { id: string; category: string; estimated_price: number; final_price?: number; status: string; created_at: string; completed_at?: string }

export default function WorkerEarnings() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState('')
  const [statFilter, setStatFilter] = useState<'today' | 'week' | 'month' | 'all'>('today')
  const [stakeSuggestion, setStakeSuggestion] = useState<{ amount: number; reason: string } | null>(null)
  const [showStakeModal, setShowStakeModal] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    setUserId(session.user.id)

    const [oRes, sRes] = await Promise.all([
      supabase.from('orders').select('*').eq('worker_id', session.user.id).order('created_at', { ascending: false }),
      supabase.from('wallets').select('balance,wallet_type').eq('user_id', session.user.id),
    ])
    setOrders((oRes.data || []) as Order[])

    // AI auto-stake suggestion — nếu txn balance > 500k
    const wallets = (sRes.data || []) as any[]
    const txnBalance = wallets.find((w: any) => w.wallet_type === 'txn')?.balance || 0
    if (txnBalance > 500000) {
      setStakeSuggestion({
        amount: Math.floor(txnBalance * 0.5 / 10000) * 10000, // 50% of balance, round to 10k
        reason: `Số dư ví giao dịch ${txnBalance.toLocaleString()}₫ — nên đầu tư ${Math.floor(txnBalance * 0.5 / 10000) * 10000}₫ để sinh lời ${(5 + Math.random() * 3).toFixed(1)}%/năm`,
      })
    }
    setLoading(false)
  }

  async function handleAutoStake() {
    if (!stakeSuggestion) return
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await fetch(`${SUPABASE_URL}/functions/v1/wallet-manager`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'stake:create', amount: stakeSuggestion.amount, days: 90 }),
    })
    setShowStakeModal(false)
    setStakeSuggestion(null)
    load()
  }

  const completed = orders.filter(o => o.status === 'completed')
  const totalEarned = completed.reduce((s, o) => s + (o.final_price || o.estimated_price || 0), 0)
  const now = Date.now()
  const filtered = completed.filter(o => {
    const d = new Date(o.completed_at || o.created_at).getTime()
    if (statFilter === 'today') return d >= now - 86400000
    if (statFilter === 'week') return d >= now - 7 * 86400000
    if (statFilter === 'month') return d >= now - 30 * 86400000
    return true
  })
  const filteredTotal = filtered.reduce((s, o) => s + (o.final_price || o.estimated_price || 0), 0)

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" /></div>

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">💰 Thu nhập</h1>
          <p className="text-sm text-gray-500">Tổng tất cả: <strong className="text-emerald-600">{totalEarned.toLocaleString()}₫</strong></p>
        </div>
        {stakeSuggestion && (
          <button onClick={() => setShowStakeModal(true)}
            className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 shadow-sm animate-pulse">
            🤖 AI đề xuất Stake
          </button>
        )}
      </div>

      {/* Wallet 4-ví */}
      <WalletDashboard userId={userId} role="worker" />

      {/* Earnings Summary */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Hôm nay', value: completed.filter(o => new Date(o.completed_at || o.created_at).getTime() >= now - 86400000).reduce((s, o) => s + (o.final_price || o.estimated_price || 0), 0), color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Tuần này', value: completed.filter(o => new Date(o.completed_at || o.created_at).getTime() >= now - 7 * 86400000).reduce((s, o) => s + (o.final_price || o.estimated_price || 0), 0), color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Tháng này', value: completed.filter(o => new Date(o.completed_at || o.created_at).getTime() >= now - 30 * 86400000).reduce((s, o) => s + (o.final_price || o.estimated_price || 0), 0), color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Tổng thu nhập', value: totalEarned, color: 'text-violet-600', bg: 'bg-violet-50' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-xl p-4 text-center border`}>
            <div className={`text-2xl font-bold ${s.color}`}>{s.value.toLocaleString()}₫</div>
            <div className="text-xs text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter Tabs + Lịch sử */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Lịch sử thu nhập</h2>
          <div className="flex gap-1">
            {(['today', 'week', 'month', 'all'] as const).map(f => (
              <button key={f} onClick={() => setStatFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${statFilter === f ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {f === 'today' ? 'Hôm nay' : f === 'week' ? 'Tuần' : f === 'month' ? 'Tháng' : 'Tất cả'}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          {filtered.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border">
              <p className="text-4xl mb-3">💰</p>
              <p className="text-gray-500">Chưa có thu nhập trong kỳ này</p>
              <p className="text-xs text-gray-400 mt-2">Tổng thu nhập: <strong>{filteredTotal.toLocaleString()}₫</strong></p>
            </div>
          ) : (
            filtered.slice(0, 20).map(o => (
              <div key={o.id} className="bg-white rounded-xl border p-4 flex items-center justify-between hover:shadow-md transition cursor-pointer"
                onClick={() => router.push(`/worker/jobs/${o.id}`)}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                    <span className="text-lg">✅</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 capitalize">{o.category}</p>
                    <p className="text-xs text-gray-500">{new Date(o.completed_at || o.created_at).toLocaleDateString('vi-VN')}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-emerald-600">+{(o.final_price || o.estimated_price || 0).toLocaleString()}₫</p>
                  <p className="text-xs text-emerald-500 font-medium">Đã nhận</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* AI Auto-Stake Modal (#6 safety net) */}
      {showStakeModal && stakeSuggestion && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowStakeModal(false)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-3xl">🤖</span>
              <div>
                <h2 className="text-lg font-bold text-gray-900">AI Đề xuất đầu tư</h2>
                <p className="text-xs text-gray-500">Tự động sinh lời cho tiền nhàn rỗi</p>
              </div>
            </div>

            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-4 mb-4 border border-emerald-200">
              <p className="text-sm text-emerald-800">{stakeSuggestion.reason}</p>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-sm text-gray-600">Số tiền đề xuất</span>
                <span className="text-xl font-bold text-emerald-600">{stakeSuggestion.amount.toLocaleString()}₫</span>
              </div>
            </div>

            <div className="p-3 bg-amber-50 rounded-lg mb-4 text-xs text-amber-700 flex items-start gap-2">
              <span>🛡️</span>
              <span>Tiền stake được khóa trong 90 ngày và hưởng lãi suất ~5-8%/năm. Có thể rút trước hạn nhưng không được hưởng lãi.</span>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowStakeModal(false)} className="flex-1 py-2.5 border rounded-xl hover:bg-gray-50 text-sm font-medium">
              Để sau
              </button>
              <button onClick={handleAutoStake}
                className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 text-sm font-bold shadow-sm">
                ✅ Đồng ý stake {stakeSuggestion.amount.toLocaleString()}₫
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stripe Connect - Nhận tiền */}
      <div className="bg-white rounded-xl border p-5">
        <h2 className="font-semibold mb-3">🌐 Phương thức thanh toán</h2>
        <p className="text-sm text-gray-500 mb-4">Kết nối tài khoản Stripe Express để nhận thanh toán quốc tế. Tiền sẽ được chuyển trực tiếp về tài khoản ngân hàng của bạn.</p>
        <button onClick={async () => {
          const { data: { session } } = await supabase.auth.getSession()
          if (!session) return
          const { data: worker } = await supabase.from('workers').select('stripe_account_id').eq('id', session.user.id).single()
          if (worker?.stripe_account_id) {
            const { data: link } = await supabase.functions.invoke('stripe-connect', {
              body: { worker_id: session.user.id, country: 'VN' },
            })
            if ((link as any)?.onboarding_url) window.open((link as any).onboarding_url, '_blank')
            return
          }
          const res = await supabase.functions.invoke('stripe-connect', {
            body: { worker_id: session.user.id, email: session.user.email, country: 'VN' },
          })
          const data = res.data as any
          if (data?.onboarding_url) window.open(data.onboarding_url, '_blank')
          else if (data?.url) window.open(data.url, '_blank')
        }}
          className="w-full py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition">
          🔗 Kết nối Stripe Express
        </button>
      </div>

      {/* Payout History */}
      <PayoutSection userId={userId} SUPABASE_URL={SUPABASE_URL || ''} />
    </div>
  )
}

function PayoutSection({ userId, SUPABASE_URL }: { userId: string; SUPABASE_URL: string }) {
  const [payouts, setPayouts] = useState<any[]>([])
  const [stripeId, setStripeId] = useState<string | null>(null)

  useEffect(() => {
    supabase.from('workers').select('stripe_account_id').eq('id', userId).single().then(({ data }) => {
      if (data?.stripe_account_id) setStripeId(data.stripe_account_id)
    })
    supabase.from('payouts').select('*').eq('worker_id', userId).order('created_at', { ascending: false }).limit(20).then(({ data }) => {
      if (data) setPayouts(data)
    })
  }, [userId])

  return (
    <div className="bg-white rounded-xl border p-5 space-y-4">
      <h2 className="font-semibold">📋 Lịch sử nhận tiền</h2>
      {stripeId && <p className="text-xs text-indigo-600 bg-indigo-50 rounded-lg px-3 py-2">✅ Stripe Connect: {stripeId.slice(0, 12)}...</p>}
      {payouts.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">Chưa có giao dịch nhận tiền</p>
      ) : (
        <div className="space-y-2">
          {payouts.map(p => (
            <div key={p.id} className="flex items-center justify-between py-2 border-b last:border-0">
              <div>
                <p className="text-sm font-medium text-gray-900">{p.amount.toLocaleString()}₫</p>
                <p className="text-xs text-gray-500">{new Date(p.created_at).toLocaleDateString('vi-VN')}</p>
              </div>
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                p.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                p.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                'bg-red-100 text-red-700'
              }`}>{p.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
