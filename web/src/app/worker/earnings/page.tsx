"use client"
// Worker Earnings - Web
// Per user request: Complete worker pages

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useToast } from '@/components/Toast'

type WorkerEarningOrder = {
  id: string
  category: string
  completed_at?: string
  created_at?: string
  actual_price?: number
  estimated_price?: number
  status: string
}

type PendingPaymentOrder = {
  estimated_price?: number
}

type EarningsData = {
  today: number
  thisWeek: number
  thisMonth: number
  total: number
  pending: number
  balance?: number
  locked?: number
  available?: number
  jobs: {
    id: string
    category: string
    completed_at: string
    actual_price: number
    status: string
  }[]
}

export default function WorkerEarningsPage() {
  const [earnings, setEarnings] = useState<EarningsData>({
    today: 0,
    thisWeek: 0,
    thisMonth: 0,
    total: 0,
    pending: 0,
    jobs: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeframe, setTimeframe] = useState<'week' | 'month' | 'all'>('month')
  const router = useRouter()
  const { toast } = useToast()

  // Wallet / payout state
  const [showWithdrawForm, setShowWithdrawForm] = useState(false)
  const [showLedger, setShowLedger] = useState(false)
  const [ledgerEntries, setLedgerEntries] = useState<any[]>([])
  const [payoutHistory, setPayoutHistory] = useState<any[]>([])
  const [withdrawAmount, setWithdrawAmount] = useState(50000)
  const [bankAccount, setBankAccount] = useState({ bank_name: '', account_number: '', holder: '' })
  const [withdrawLoading, setWithdrawLoading] = useState(false)
  const [withdrawError, setWithdrawError] = useState<string | null>(null)

  useEffect(() => {
    checkUser()
  }, [timeframe])

  async function handleWithdraw() {
    try {
      setWithdrawLoading(true)
      setWithdrawError(null)
      if (withdrawAmount < 50000) throw new Error('Số tiền tối thiểu là 50.000 VND')
      if (withdrawAmount > (earnings.available || 0)) throw new Error('Số dư không đủ')
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/wallet-manager`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: withdrawAmount, bank_account: bankAccount }),
        }
      )
      if (!response.ok) throw new Error((await response.json()).error || 'Yêu cầu rút tiền thất bại')
      setWithdrawAmount(50000)
      setShowWithdrawForm(false)
      toast('Yêu cầu rút tiền đã được gửi', 'success')
      checkUser()
    } catch (err: any) {
      console.error('Withdraw error:', err)
      setWithdrawError(err.message || 'Yêu cầu rút tiền thất bại')
    } finally {
      setWithdrawLoading(false)
    }
  }

  async function fetchLedger(userId: string) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/wallet-manager?action=ledger&limit=50`,
        { headers: { 'Authorization': `Bearer ${session.access_token}` } }
      )
      if (response.ok) setLedgerEntries((await response.json()).entries || [])
    } catch (err) {
      console.error('Fetch ledger error:', err)
    }
  }

  async function fetchPayouts(userId: string) {
    try {
      const { data, error } = await supabase
        .from('payouts').select('*').eq('worker_id', userId)
        .order('created_at', { ascending: false }).limit(10)
      if (!error) setPayoutHistory(data || [])
    } catch (err) {
      console.error('Fetch payouts error:', err)
    }
  }

  async function checkUser() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }
      fetchEarnings(session.user.id)
      fetchLedger(session.user.id)
      fetchPayouts(session.user.id)
    } catch (error: any) {
      console.error('checkUser error:', error)
    }
  }

  async function fetchEarnings(userId: string) {
    try {
      setError(null)

      // Fetch wallet balance from wallet-manager
      const balanceResponse = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/wallet-manager?action=balance`,
        { headers: { 'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}` } }
      )
      const balanceData = balanceResponse.ok ? await balanceResponse.json() : { balance: 0, locked_amount: 0 }

      const { data: ordersData, error } = await (supabase as any)
        .from('orders')
        .select('id, category, completed_at, actual_price, estimated_price, status')
        .eq('worker_id', userId)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })

      if (error) throw error
      const orders = (ordersData || []) as WorkerEarningOrder[]

      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())

      let total = 0
      let thisMonth = 0
      let thisWeek = 0
      let todayEarnings = 0
      let pending = 0

      const jobs = orders.map(order => {
        const price = order.actual_price || order.estimated_price || 0
        total += price
        
        const completedDate = new Date(order.completed_at || order.created_at)
        
        if (completedDate >= monthAgo) {
          thisMonth += price
        }
        if (completedDate >= weekAgo) {
          thisWeek += price
        }
        if (completedDate >= today) {
          todayEarnings += price
        }

        return {
          id: order.id,
          category: order.category,
          completed_at: order.completed_at || order.created_at,
          actual_price: price,
          status: order.status,
        }
      })

      // Fetch pending payments (in_progress jobs with estimated price)
      const { data: pendingJobsData } = await (supabase as any)
        .from('orders')
        .select('estimated_price')
        .eq('worker_id', userId)
        .eq('status', 'in_progress')

      const pendingJobs = (pendingJobsData || []) as PendingPaymentOrder[]
      pending = pendingJobs.reduce((sum, job) => sum + (job.estimated_price || 0), 0)

      setEarnings({
        today: todayEarnings,
        thisWeek,
        thisMonth,
        total,
        pending,
        balance: balanceData.balance || 0,
        locked: balanceData.locked_amount || 0,
        available: (balanceData.balance || 0) - (balanceData.locked_amount || 0),
        jobs: jobs.filter(job => {
          const completedDate = new Date(job.completed_at)
          if (timeframe === 'week') return completedDate >= weekAgo
          if (timeframe === 'month') return completedDate >= monthAgo
          return true
        }),
      })
    } catch (error: any) {
      console.error('fetchEarnings error:', error)
      setError(error.message || 'Không thể tải thu nhập')
    } finally {
      setLoading(false)
    }
  }

  function formatPrice(price: number) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price)
  }

  function getCategoryIcon(category: string) {
    const icons: Record<string, string> = {
      'air_conditioning': '❄️',
      'plumbing': '🚿',
      'electricity': '🔌',
      'camera': '📷',
      'general': '🔧',
    }
    return icons[category] || '🔧'
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">💰 Thu nhập</h1>
          <p className="text-gray-600 mt-1">Quản lý thu nhập từ công việc</p>
        </div>
        <Link
          href="/worker"
          className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
        >
          ← Quay lại Dashboard
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-700 mb-4">{error}</p>
          <button
            onClick={() => { setError(null); checkUser(); }}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <p className="text-sm text-gray-600 mb-1">Số dư ví</p>
          <p className="text-2xl font-bold text-green-600">{formatPrice(earnings.balance || 0)}</p>
          <p className="text-xs text-gray-500 mt-1">Khả dụng: {formatPrice(earnings.available || 0)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <p className="text-sm text-gray-600 mb-1">Đang chờ</p>
          <p className="text-2xl font-bold text-yellow-600">{formatPrice(earnings.locked || 0)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <p className="text-sm text-gray-600 mb-1">Tháng này</p>
          <p className="text-2xl font-bold text-blue-600">{formatPrice(earnings.thisMonth)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <p className="text-sm text-gray-600 mb-1">Tổng thu nhập</p>
          <p className="text-2xl font-bold text-gray-900">{formatPrice(earnings.total)}</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3">
        <button onClick={() => setShowWithdrawForm(!showWithdrawForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
          {showWithdrawForm ? 'Đóng' : '💰 Rút tiền'}
        </button>
        <button onClick={() => setShowLedger(!showLedger)}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium">
          {showLedger ? 'Đóng' : '📊 Xem Ledger'}
        </button>
      </div>

      {/* Withdrawal Form */}
      {showWithdrawForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">💰 Yêu cầu rút tiền</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Số tiền muốn rút (VND)</label>
              <input type="number" value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(parseInt(e.target.value) || 0)}
                min={50000} max={earnings.available || 0}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <p className="text-xs text-gray-500 mt-1">
                Khả dụng: {formatPrice(earnings.available || 0)} | Tối thiểu: {formatPrice(50000)}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ngân hàng</label>
              <input type="text" value={bankAccount.bank_name}
                onChange={(e) => setBankAccount({...bankAccount, bank_name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Tên ngân hàng" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Số tài khoản</label>
              <input type="text" value={bankAccount.account_number}
                onChange={(e) => setBankAccount({...bankAccount, account_number: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Số tài khoản" />
            </div>
            <button onClick={handleWithdraw}
              disabled={withdrawLoading || withdrawAmount < 50000 || withdrawAmount > (earnings.available || 0)}
              className="w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50">
              {withdrawLoading ? 'Đang xử lý...' : `Rút ${formatPrice(withdrawAmount)}`}
            </button>
            {withdrawError && <p className="text-red-600 text-sm">{withdrawError}</p>}
          </div>
        </div>
      )}

      {/* Ledger Entries */}
      {showLedger && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">📊 Ledger Entries</h2>
          </div>
          {ledgerEntries.length === 0 ? (
            <div className="p-12 text-center"><p className="text-gray-600">Chưa có giao dịch nào</p></div>
          ) : (
            <div className="divide-y divide-gray-200">
              {ledgerEntries.map((entry, idx) => (
                <div key={idx} className="p-4 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{entry.description || entry.account}</p>
                      <p className="text-xs text-gray-500">{new Date(entry.created_at).toLocaleDateString('vi-VN')}</p>
                    </div>
                    <div className={`text-right font-bold ${entry.direction === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                      {entry.direction === 'credit' ? '+' : '-'}{formatPrice(entry.amount)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Payout History */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">📋 Lịch sử rút tiền</h2>
        </div>
        {payoutHistory.length === 0 ? (
          <div className="p-12 text-center"><p className="text-gray-600">Chưa có yêu cầu rút tiền nào</p></div>
        ) : (
          <div className="divide-y divide-gray-200">
            {payoutHistory.map((payout) => (
              <div key={payout.id} className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">
                      {formatPrice(payout.amount)}
                      <span className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${
                        payout.status === 'completed' ? 'bg-green-100 text-green-800' :
                        payout.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>{payout.status}</span>
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(payout.created_at).toLocaleDateString('vi-VN')}
                      {payout.completed_at && <> → {new Date(payout.completed_at).toLocaleDateString('vi-VN')}</>}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Fee: {formatPrice(payout.fee || 0)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pending */}
      {earnings.pending > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-yellow-800">💰 Tiền đang chờ</p>
              <p className="text-sm text-yellow-700 mt-1">
                {formatPrice(earnings.pending)} từ các việc đang làm
              </p>
            </div>
            <Link
              href="/worker/jobs"
              className="text-sm text-yellow-800 hover:underline"
            >
              Xem việc →
            </Link>
          </div>
        </div>
      )}

      {/* Time Filter */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">Xem theo:</span>
          {(['week', 'month', 'all'] as const).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                timeframe === tf
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {tf === 'week' ? '7 ngày' : tf === 'month' ? '30 ngày' : 'Tất cả'}
            </button>
          ))}
        </div>
      </div>

      {/* Jobs List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Chi tiết thu nhập ({earnings.jobs.length} việc)
          </h2>
        </div>

        {earnings.jobs.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-5xl mb-4">💰</div>
            <p className="text-gray-600">Chưa có thu nhập trong khoảng thời gian này</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {earnings.jobs.map((job) => (
              <div key={job.id} className="p-4 sm:p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getCategoryIcon(job.category)}</span>
                    <div>
                      <p className="font-medium text-gray-900">{job.category}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(job.completed_at).toLocaleDateString('vi-VN', {
                          year: 'numeric', month: 'short', day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-green-600">
                      +{formatPrice(job.actual_price)}
                    </p>
                    <Link
                      href={`/worker/jobs/${job.id}`}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Xem chi tiết
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
