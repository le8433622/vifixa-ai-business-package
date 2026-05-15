'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import WalletDashboard from '@/components/wallet/WalletDashboard'

type Order = { id: string; category: string; estimated_price: number; final_price?: number; status: string; created_at: string; completed_at?: string }
type Wallet = { balance: number; locked: number }

export default function WorkerEarnings() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [wallet, setWallet] = useState<Wallet>({ balance: 0, locked: 0 })
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    setUserId(session.user.id)

    const oRes = await supabase.from('orders').select('*').eq('worker_id', session.user.id).order('created_at', { ascending: false })
    setOrders((oRes.data || []) as any)
    try {
      const r: any = await supabase.from('wallets').select('*').eq('user_id', session.user.id).single()
      if (r.data) setWallet(r.data)
    } catch {}  // Default wallet: balance=0, locked=0
    setLoading(false)
  }

  const completed = orders.filter(o => o.status === 'completed')
  const inProgress = orders.filter(o => o.status === 'in_progress')
  const totalEarned = completed.reduce((s, o) => s + (o.final_price || o.estimated_price || 0), 0)
  const pendingAmount = inProgress.reduce((s, o) => s + (o.estimated_price || 0), 0)
  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" /></div>

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-5">
      <h1 className="text-2xl font-bold">💰 Thu nhập</h1>

      {/* Multi-Wallet Dashboard */}
      <WalletDashboard userId={userId} role="worker" />

      {/* Recent payouts */}
      <div>
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Giao dịch gần đây</h2>
        <div className="space-y-2">
          {completed.slice(0, 10).map(o => (
            <div key={o.id} className="bg-white rounded-xl border p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xl">✅</span>
                <div>
                  <p className="text-sm font-medium capitalize">{o.category}</p>
                  <p className="text-[10px] text-gray-500">{new Date(o.completed_at || o.created_at).toLocaleDateString('vi-VN')}</p>
                </div>
              </div>
              <span className="font-bold text-emerald-600">+{(o.final_price || o.estimated_price || 0).toLocaleString()}₫</span>
            </div>
          ))}
          {completed.length === 0 && <p className="text-center text-gray-500 py-8">Chưa có giao dịch nào</p>}
        </div>
      </div>
    </div>
  )
}
