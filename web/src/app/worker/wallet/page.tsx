'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/Toast'
import WalletCard from '@/components/wallet/WalletCard'
import TransactionList from '@/components/wallet/TransactionList'
import { Badge } from '@/components/ui/badge'
import type { LedgerEntry } from '@/types/paymentGateway'

interface PayoutRecord {
  id: string
  user_id: string
  amount: number
  fee: number | null
  status: string
  created_at: string
  completed_at: string | null
}

export default function WorkerWallet() {
  const router = useRouter()
  const { toast } = useToast()
  const [balance, setBalance] = useState(0)
  const [locked, setLocked] = useState(0)
  const [entries, setEntries] = useState<LedgerEntry[]>([])
  const [payouts, setPayouts] = useState<PayoutRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [entriesLoading, setEntriesLoading] = useState(true)
  const [showWithdraw, setShowWithdraw] = useState(false)
  const [withdrawAmount, setWithdrawAmount] = useState(50000)
  const [bankName, setBankName] = useState('')
  const [bankAccount, setBankAccount] = useState('')
  const [bankHolder, setBankHolder] = useState('')
  const [withdrawLoading, setWithdrawLoading] = useState(false)
  const [timeframe, setTimeframe] = useState<'week' | 'month' | 'all'>('month')
  const mountedRef = useRef(false)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const fetchWallet = useCallback(async () => {
    try {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const [balanceRes, payoutRes] = await Promise.all([
        fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/wallet-manager?action=balance`,
          { headers: { Authorization: `Bearer ${session.access_token}` } }
        ),
        supabase.from('payouts').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(20),
      ])

      if (balanceRes.ok) {
        const data = await balanceRes.json()
        if (mountedRef.current) {
          setBalance(data.balance || 0)
          setLocked(data.locked_amount || 0)
        }
      }
      if (!payoutRes.error && mountedRef.current) {
        setPayouts(payoutRes.data || [])
      }
    } catch (err) {
      console.error('Error fetching wallet:', err)
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [router])

  const fetchLedger = useCallback(async () => {
    try {
      setEntriesLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/wallet-manager?action=ledger&limit=50`,
        { headers: { Authorization: `Bearer ${session.access_token}` } }
      )
      if (response.ok) {
        const data = await response.json()
        if (mountedRef.current) setEntries(data.entries || [])
      }
    } catch (err) {
      console.error('Error fetching ledger:', err)
    } finally {
      if (mountedRef.current) setEntriesLoading(false)
    }
  }, [])

  useEffect(() => {
    queueMicrotask(() => { fetchWallet(); fetchLedger() })
  }, [fetchWallet, fetchLedger])

  async function handleWithdraw() {
    if (withdrawAmount < 50000) { toast('Số tiền tối thiểu là 50.000 VND', 'error'); return }
    if (withdrawAmount > (balance - locked)) { toast('Số dư không đủ', 'error'); return }
    if (!bankName || !bankAccount || !bankHolder) { toast('Vui lòng nhập đầy đủ thông tin ngân hàng', 'error'); return }

    setWithdrawLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/wallet-manager`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: withdrawAmount,
            bank_account: { bank_name: bankName, account_number: bankAccount, holder: bankHolder },
          }),
        }
      )

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Yêu cầu rút tiền thất bại')

      toast('Yêu cầu rút tiền đã được gửi', 'success')
      setShowWithdraw(false)
      fetchWallet()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Rút tiền thất bại', 'error')
    } finally {
      setWithdrawLoading(false)
    }
  }

  const fmt = (v: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v)
  const available = balance - locked

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h1 className="text-2xl font-bold text-gray-900">💰 Ví của tôi</h1>
      </div>

      <WalletCard balance={balance} locked={locked} loading={loading} />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <p className="text-sm text-gray-600 mb-1">Thu nhập tháng này</p>
          <p className="text-2xl font-bold text-blue-600">{fmt(0)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <p className="text-sm text-gray-600 mb-1">Tổng đã rút</p>
          <p className="text-2xl font-bold text-gray-900">
            {fmt(payouts.filter(p => p.status === 'completed').reduce((s, p) => s + p.amount, 0))}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <p className="text-sm text-gray-600 mb-1">Yêu cầu chờ duyệt</p>
          <p className="text-2xl font-bold text-yellow-600">
            {fmt(payouts.filter(p => p.status === 'pending').reduce((s, p) => s + p.amount, 0))}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <p className="text-sm text-gray-600 mb-1">Tổng giao dịch</p>
          <p className="text-2xl font-bold text-green-600">{entries.length}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={() => setShowWithdraw(!showWithdraw)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          {showWithdraw ? 'Đóng' : '💰 Rút tiền'}
        </button>
      </div>

      {/* Withdrawal Form */}
      {showWithdraw && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Yêu cầu rút tiền</h2>
          <div className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Số tiền (VNĐ)</label>
              <input
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(Number(e.target.value) || 0)}
                min={50000} max={available}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Khả dụng: {fmt(available)}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tên ngân hàng</label>
              <input
                type="text" value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="VD: Vietcombank, Techcombank"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Số tài khoản</label>
              <input
                type="text" value={bankAccount}
                onChange={(e) => setBankAccount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Số tài khoản"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Chủ tài khoản</label>
              <input
                type="text" value={bankHolder}
                onChange={(e) => setBankHolder(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Tên chủ tài khoản"
              />
            </div>
            <button
              onClick={handleWithdraw}
              disabled={withdrawLoading || withdrawAmount < 50000 || withdrawAmount > available}
              className="w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50 text-sm"
            >
              {withdrawLoading ? 'Đang xử lý...' : `Rút ${fmt(withdrawAmount)}`}
            </button>
          </div>
        </div>
      )}

      {/* Transaction History */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Lịch sử giao dịch</h2>
        </div>
        <TransactionList entries={entries} loading={entriesLoading} />
      </div>

      {/* Payout History */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Lịch sử rút tiền</h2>
        {payouts.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <p className="text-gray-500">Chưa có yêu cầu rút tiền nào</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 divide-y divide-gray-200">
            {payouts.map(p => (
              <div key={p.id} className="p-4 sm:p-5 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{fmt(p.amount)}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(p.created_at).toLocaleDateString('vi-VN')}
                      {p.completed_at && <> → {new Date(p.completed_at).toLocaleDateString('vi-VN')}</>}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge className={`px-2 py-0.5 rounded text-xs font-medium ${
                      p.status === 'completed' ? 'bg-green-100 text-green-800' :
                      p.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      p.status === 'failed' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {p.status === 'completed' ? 'Hoàn thành' :
                       p.status === 'pending' ? 'Chờ duyệt' :
                       p.status === 'failed' ? 'Thất bại' : p.status}
                    </Badge>
                    {p.fee ? <p className="text-xs text-gray-500 mt-1">Phí: {fmt(p.fee)}</p> : null}
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
