'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

const STAKING_PLANS = [
  { days: 30, rate: 3.0, label: '1 tháng', desc: 'Linh hoạt, rút sớm phí 5%' },
  { days: 90, rate: 5.0, label: '3 tháng', desc: 'Phổ biến nhất, lãi 5%/năm' },
  { days: 180, rate: 8.0, label: '6 tháng', desc: 'Lãi suất cao, ưu đãi đặc biệt' },
  { days: 365, rate: 12.0, label: '12 tháng', desc: 'Lãi suất tốt nhất, dành cho VIP' },
]

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL

interface StakingPosition {
  id: string
  amount: number
  days: number
  interest_rate: number
  status: string
  start_date: string
  maturity_date: string
}

interface Props {
  positions?: StakingPosition[]
  onRefresh?: () => void
}

export default function StakingManager({ positions = [], onRefresh }: Props) {
  const [amount, setAmount] = useState(500000)
  const [selectedPlan, setSelectedPlan] = useState(1)
  const [staking, setStaking] = useState(false)
  const [showForm, setShowForm] = useState(false)

  async function handleStake() {
    setStaking(true)
    const plan = STAKING_PLANS[selectedPlan]
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    await fetch(`${SUPABASE_URL}/functions/v1/wallet-manager`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'stake:create', amount, days: plan.days }),
    })

    setStaking(false)
    setShowForm(false)
    onRefresh?.()
  }

  const activePositions = positions.filter(p => p.status === 'active')
  const maturedPositions = positions.filter(p => p.status === 'matured')
  const totalStaked = activePositions.reduce((s, p) => s + p.amount, 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">🏦 Staking — Đầu tư sinh lời</h3>
          {totalStaked > 0 && <p className="text-xs text-gray-500">Đang stake: {totalStaked.toLocaleString()}₫</p>}
        </div>
        <button onClick={() => setShowForm(true)}
          className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 transition">
          + Stake mới
        </button>
      </div>

      {showForm && (
        <div className="bg-gray-50 rounded-xl border p-4 space-y-3">
          <p className="text-sm font-medium">Chọn gói stake</p>
          <div className="grid grid-cols-2 gap-2">
            {STAKING_PLANS.map((plan, i) => (
              <button key={i} onClick={() => setSelectedPlan(i)}
                className={`p-3 rounded-xl border text-left transition ${selectedPlan === i ? 'border-emerald-500 bg-emerald-50' : 'hover:border-gray-300'}`}>
                <p className="text-sm font-bold">{plan.label}</p>
                <p className="text-lg font-bold text-emerald-600">{plan.rate}%</p>
                <p className="text-[10px] text-gray-500">{plan.desc}</p>
              </button>
            ))}
          </div>

          <div>
            <label className="text-xs text-gray-500">Số tiền stake (VNĐ)</label>
            <input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} min={100000} step={100000}
              className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
            <p className="text-xs text-gray-400 mt-1">
              Lãi dự kiến: {Math.round(amount * STAKING_PLANS[selectedPlan].rate / 100 * STAKING_PLANS[selectedPlan].days / 365).toLocaleString()}₫
            </p>
          </div>

          <div className="flex gap-2">
            <button onClick={() => setShowForm(false)} className="flex-1 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">Hủy</button>
            <button onClick={handleStake} disabled={staking || amount < 100000}
              className="flex-1 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">
              {staking ? 'Đang xử lý...' : 'Xác nhận stake'}
            </button>
          </div>
        </div>
      )}

      {positions.length > 0 && (
        <div className="space-y-2">
          {positions.map(p => {
            const plan = STAKING_PLANS.find(sp => sp.days === p.days)
            const daysLeft = Math.max(0, Math.ceil((new Date(p.maturity_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
            return (
              <div key={p.id} className="bg-white rounded-xl border p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{p.amount.toLocaleString()}₫ · {plan?.label || `${p.days} ngày`}</p>
                  <p className="text-xs text-gray-500">
                    {p.status === 'active' ? `Còn ${daysLeft} ngày · Lãi ${p.interest_rate}%/năm` : '✅ Đã đáo hạn'}
                  </p>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${p.status === 'active' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                  {p.status === 'active' ? 'Đang chạy' : 'Đáo hạn'}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {positions.length === 0 && !showForm && (
        <p className="text-sm text-gray-400 text-center py-3">Chưa có stake nào. Đầu tư ngay để nhận lãi!</p>
      )}
    </div>
  )
}
