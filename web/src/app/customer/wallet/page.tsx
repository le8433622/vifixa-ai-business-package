'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/Toast'
import WalletCard from '@/components/wallet/WalletCard'
import TransactionList from '@/components/wallet/TransactionList'
import type { LedgerEntry } from '@/types/paymentGateway'

export default function CustomerWallet() {
  const router = useRouter()
  const { toast } = useToast()
  const [balance, setBalance] = useState(0)
  const [locked, setLocked] = useState(0)
  const [entries, setEntries] = useState<LedgerEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [entriesLoading, setEntriesLoading] = useState(true)
  const [showTopup, setShowTopup] = useState(false)
  const [topupAmount, setTopupAmount] = useState(100000)
  const [topupLoading, setTopupLoading] = useState(false)
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

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/wallet-manager?action=balance`,
        { headers: { Authorization: `Bearer ${session.access_token}` } }
      )
      if (!response.ok) throw new Error('Failed to fetch wallet')
      const data = await response.json()
      if (!mountedRef.current) return
      setBalance(data.balance || 0)
      setLocked(data.locked_amount || 0)
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

  async function handleTopup() {
    if (topupAmount < 10000) {
      toast('Số tiền tối thiểu là 10.000 VND', 'error')
      return
    }
    setTopupLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/payment-process/create`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: topupAmount,
            type: 'topup',
            description: `Nạp tiền vào ví`,
            returnUrl: `${window.location.origin}/customer/wallet?success=1`,
            cancelUrl: `${window.location.origin}/customer/wallet`,
          }),
        }
      )

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Tạo yêu cầu nạp tiền thất bại')

      if (data.redirectUrl) {
        window.location.href = data.redirectUrl
      } else if (data.qrCode) {
        toast('Quét mã QR để thanh toán', 'info')
      } else {
        toast('Yêu cầu nạp tiền đã được tạo', 'success')
        setShowTopup(false)
        fetchWallet()
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Nạp tiền thất bại', 'error')
    } finally {
      setTopupLoading(false)
    }
  }

  const quickAmounts = [50000, 100000, 200000, 500000, 1000000]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">💰 Ví của tôi</h1>
      </div>

      <WalletCard balance={balance} locked={locked} loading={loading} />

      {/* Top-up */}
      <div>
        <button
          onClick={() => setShowTopup(!showTopup)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          {showTopup ? 'Đóng' : '💰 Nạp tiền'}
        </button>
      </div>

      {showTopup && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Nạp tiền vào ví</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Chọn số tiền</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {quickAmounts.map(amt => (
                  <button
                    key={amt}
                    onClick={() => setTopupAmount(amt)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      topupAmount === amt
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {amt.toLocaleString('vi-VN')} VNĐ
                  </button>
                ))}
              </div>
              <input
                type="number"
                value={topupAmount}
                onChange={(e) => setTopupAmount(Number(e.target.value) || 0)}
                min={10000}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nhập số tiền tùy chỉnh"
              />
              <p className="text-xs text-gray-500 mt-1">Tối thiểu: 10.000 VNĐ</p>
            </div>

            <button
              onClick={handleTopup}
              disabled={topupLoading || topupAmount < 10000}
              className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50 text-sm"
            >
              {topupLoading ? 'Đang xử lý...' : `Nạp ${topupAmount.toLocaleString('vi-VN')} VNĐ`}
            </button>
          </div>
        </div>
      )}

      {/* Transaction History */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Lịch sử giao dịch</h2>
        <TransactionList entries={entries} loading={entriesLoading} />
      </div>
    </div>
  )
}
