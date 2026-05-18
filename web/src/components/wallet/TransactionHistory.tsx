'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Skeleton from '@/components/ui/Skeleton'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  succeeded: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  refunded: 'bg-purple-100 text-purple-700',
}

export default function TransactionHistory() {
  const [txns, setTxns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)

  useEffect(() => { load(0) }, [])

  async function load(offset: number) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const res = await fetch(`${SUPABASE_URL}/functions/v1/wallet-manager`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'history', offset, limit: 20 }),
    })
    const data = await res.json()
    setTxns(data.transactions || [])
    setLoading(false)
  }

  if (loading) return <Skeleton variant="rect" height="80px" className="rounded-xl" />

  return (
    <div>
      <h3 className="font-semibold mb-3">📋 Lịch sử giao dịch</h3>
      {txns.length === 0 ? (
        <p className="text-center text-gray-500 py-8">Chưa có giao dịch nào</p>
      ) : (
        <div className="space-y-2">
          {txns.map((tx: any) => (
            <div key={tx.id} className="flex items-center justify-between bg-white rounded-xl border p-3">
              <div className="flex items-center gap-3">
                <span className="text-xl">{tx.gateway === 'vnpay' ? '💳' : tx.gateway === 'wallet' ? '🏦' : '💳'}</span>
                <div>
                  <p className="text-sm font-medium capitalize">{tx.gateway} · {tx.status}</p>
                  <p className="text-xs text-gray-500">{new Date(tx.created_at).toLocaleString('vi-VN')}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold">{Number(tx.amount).toLocaleString()}₫</p>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${STATUS_COLORS[tx.status] || 'bg-gray-100'}`}>
                  {tx.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
      {txns.length >= 20 && (
        <button onClick={() => { setPage(p => p + 1); load((page + 1) * 20) }}
          className="w-full mt-3 py-2 text-blue-600 text-sm font-medium hover:underline">
          Xem thêm →
        </button>
      )}
    </div>
  )
}
