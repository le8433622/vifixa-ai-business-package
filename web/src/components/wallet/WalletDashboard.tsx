'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import dynamic from 'next/dynamic'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL

interface WalletData {
  wallets: { txn: number; stake: number; reward: number; treasury: number }
  total: number
  vfc: { balance: number; tier: string; multiplier: number }
}

export default function WalletDashboard({ userId, role }: { userId: string; role: 'customer' | 'worker' | 'admin' }) {
  const [data, setData] = useState<WalletData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showStakeModal, setShowStakeModal] = useState(false)
  const [stakeAmount, setStakeAmount] = useState(100000)
  const [stakeDays, setStakeDays] = useState(90)
  const [projectedRate, setProjectedRate] = useState(5)

  useEffect(() => { loadWallet() }, [])

  async function loadWallet() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const res = await fetch(`${SUPABASE_URL}/functions/v1/wallet-manager`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'balance' }),
    })
    const result = await res.json()
    if (result.wallets) setData(result)
    setLoading(false)
  }

  async function handleStake() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await fetch(`${SUPABASE_URL}/functions/v1/wallet-manager`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'stake:create', amount: stakeAmount, days: stakeDays }),
    })
    setShowStakeModal(false)
    loadWallet()
  }

  async function handleStakePreview() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const res = await fetch(`${SUPABASE_URL}/functions/v1/wallet-manager`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'stake:calculate', amount: stakeAmount, days: stakeDays }),
    })
    const result = await res.json()
    if (result.projectedRate) setProjectedRate(result.projectedRate)
  }

  if (loading) return <div className="animate-pulse h-32 bg-gray-800 rounded-xl" />

  const wallets = data?.wallets || { txn: 0, stake: 0, reward: 0, treasury: 0 }
  const vfc = data?.vfc || { balance: 0, tier: 'bronze', multiplier: 1.0 }
  const total = data?.total || 0

  return (
    <div className="space-y-4">
      {/* Balance Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <WalletCard name="Ví giao dịch" balance={wallets.txn} icon="💳" color="from-blue-500 to-blue-600" />
        <WalletCard name="Ví đầu tư" balance={wallets.stake} icon="🏦" color="from-emerald-500 to-emerald-600" />
        <WalletCard name="Ví thưởng" balance={wallets.reward} icon="🎁" color="from-amber-500 to-amber-600" suffix=" VFC" />
        <WalletCard name="Treasury" balance={wallets.treasury} icon="🏛️" color="from-purple-500 to-purple-600" />
      </div>

      {/* Staking Section */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-semibold text-gray-200">🏦 Đầu tư sinh lời</h3>
            <p className="text-xs text-gray-500">Khóa tiền nhận lãi suất {projectedRate.toFixed(1)}%/năm</p>
          </div>
          <button onClick={() => setShowStakeModal(true)}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700">
            + Stake
          </button>
        </div>
        {wallets.stake > 0 && (
          <div className="flex items-center gap-2 p-3 bg-emerald-900/30 rounded-lg">
            <span className="text-2xl">🏦</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-emerald-300">Đang đầu tư</p>
              <p className="text-xs text-gray-500">{wallets.stake.toLocaleString()}₫ · {projectedRate.toFixed(1)}%/năm</p>
            </div>
          </div>
        )}
      </div>

      {/* VFC Points */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-gray-200">⭐ VFC Points</h3>
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
            vfc.tier === 'diamond' ? 'bg-cyan-900/50 text-cyan-300'
            : vfc.tier === 'gold' ? 'bg-amber-900/50 text-amber-300'
            : vfc.tier === 'silver' ? 'bg-gray-700 text-gray-300'
            : 'bg-orange-900/50 text-orange-300'
          }`}>{vfc.tier}</span>
        </div>
        <p className="text-2xl font-bold text-amber-400">{vfc.balance.toLocaleString()} VFC</p>
        <p className="text-xs text-gray-500 mt-1">Hệ số thưởng: x{vfc.multiplier} · Dùng để giảm giá dịch vụ</p>
      </div>

      {/* Stake Modal */}
      {showStakeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowStakeModal(false)}>
          <div className="bg-gray-800 rounded-2xl max-w-md w-full p-6 border border-gray-700" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-200 mb-4">🏦 Đầu tư</h3>
            
            <label className="text-xs text-gray-500 mb-2 block">Số tiền</label>
            <input type="number" value={stakeAmount} onChange={e => { setStakeAmount(Number(e.target.value)); handleStakePreview() }}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 mb-4" min={10000} step={10000} />

            <label className="text-xs text-gray-500 mb-2 block">Kỳ hạn</label>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[{ days: 30, label: '1 tháng' }, { days: 90, label: '3 tháng' }, { days: 180, label: '6 tháng' }].map(opt => (
                <button key={opt.days} onClick={() => { setStakeDays(opt.days); handleStakePreview() }}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition ${stakeDays === opt.days ? 'bg-emerald-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}>
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="p-3 bg-gray-700/50 rounded-lg mb-4">
              <p className="text-sm text-gray-400">Lãi suất: <span className="text-emerald-400 font-bold">{projectedRate.toFixed(1)}%/năm</span></p>
              <p className="text-xs text-gray-500 mt-1">Tiền lãi dự kiến: {((stakeAmount * projectedRate / 100) * stakeDays / 365).toLocaleString()}₫</p>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowStakeModal(false)} className="flex-1 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600">Hủy</button>
              <button onClick={handleStake} className="flex-1 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium">Xác nhận Stake</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function WalletCard({ name, balance, icon, color, suffix = '₫' }: { name: string; balance: number; icon: string; color: string; suffix?: string }) {
  return (
    <div className={`bg-gradient-to-br ${color} rounded-xl p-4 text-white`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm opacity-80">{icon} {name}</span>
      </div>
      <p className="text-xl font-bold">{balance.toLocaleString()}{suffix}</p>
    </div>
  )
}
