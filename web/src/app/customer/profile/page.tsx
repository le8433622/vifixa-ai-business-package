'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import WalletDashboard from '@/components/wallet/WalletDashboard'
import OTPVerification from '@/components/trust/OTPVerification'
import VerificationBadge from '@/components/trust/VerificationBadge'
import ConnectedAccounts from '@/components/account/ConnectedAccounts'
import VFCBadge from '@/components/account/VFCBadge'
import StakingManager from '@/components/account/StakingManager'
import Link from 'next/link'

export default function CustomerProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [editing, setEditing] = useState(false)
  const [phoneVerified, setPhoneVerified] = useState(false)
  const [stakingPositions, setStakingPositions] = useState<any[]>([])
  const [vfcData, setVfcData] = useState<any>(null)

  // Preferences
  const [aiLevel, setAiLevel] = useState<'auto' | 'confirm' | 'manual'>('confirm')
  const [minRating, setMinRating] = useState(4.0)
  const [budgetMax, setBudgetMax] = useState(1000000)
  const [scheduling, setScheduling] = useState<'asap' | 'flexible' | 'scheduled'>('flexible')
  const [channel, setChannel] = useState<'app' | 'sms' | 'email'>('app')
  const [saving, setSaving] = useState(false)
  const [prefsModified, setPrefsModified] = useState(false)

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    setEmail(session.user.email || '')

    const { data: profiles } = await (supabase as any)
      .from('profiles').select('*').eq('id', session.user.id)
    const profileData = profiles?.[0] as { full_name?: string; phone?: string } | undefined
    if (profileData) {
      setProfile(profileData)
      setName(profileData.full_name || '')
      setPhone(profileData.phone || '')
      setPhoneVerified((profileData as any).phone_verified || false)
    }

    // Load staking positions
    const { data: stakingData } = await supabase
      .from('staking_positions')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
    setStakingPositions(stakingData || [])

    // Load VFC data from wallet
    try {
      const wRes = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/wallet-manager`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'balance' }),
      })
      if (wRes.ok) {
        const wData = await wRes.json()
        if (wData?.vfc) setVfcData(wData.vfc)
      }
    } catch {}

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/user-references`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (res.ok) {
        const data = await res.json()
        const prefs = data.preferences || {}
        if (prefs.ai_level) setAiLevel(prefs.ai_level)
        if (prefs.min_rating) setMinRating(prefs.min_rating)
        if (prefs.budget_max) setBudgetMax(prefs.budget_max)
        if (prefs.scheduling) setScheduling(prefs.scheduling)
        if (prefs.channel) setChannel(prefs.channel)
      }
    } catch {}
    setLoading(false)
  }

  async function saveProfile() {
    setSaving(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await (supabase as any).from('profiles').update({ full_name: name, phone }).eq('id', session.user.id)

    await Promise.all([
      fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/user-references`, {
        method: 'PUT', headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'ai_level', value: aiLevel }),
      }),
      fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/user-references`, {
        method: 'PUT', headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'min_rating', value: minRating }),
      }),
      fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/user-references`, {
        method: 'PUT', headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'budget_max', value: budgetMax }),
      }),
      fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/user-references`, {
        method: 'PUT', headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'scheduling', value: scheduling }),
      }),
      fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/user-references`, {
        method: 'PUT', headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'channel', value: channel }),
      }),
    ])
    setSaving(false)
    setEditing(false)
    setPrefsModified(false)
  }

  if (loading) return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">👤 Tài khoản của tôi</h1>

      {/* Profile */}
      <div className="bg-white rounded-xl border p-6 space-y-4">
        <h2 className="font-semibold">Thông tin cá nhân</h2>
        <div>
          <label className="text-xs text-gray-500">Email</label>
          <input type="email" value={email} disabled className="w-full px-3 py-2 border rounded-lg bg-gray-50 text-gray-500 text-sm" />
        </div>
        <div>
          <label className="text-xs text-gray-500">Họ và tên</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} disabled={!editing}
            className="w-full px-3 py-2 border rounded-lg text-sm disabled:bg-gray-50" />
        </div>
        <div>
          <label className="text-xs text-gray-500">Số điện thoại</label>
          <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} disabled={!editing}
            className="w-full px-3 py-2 border rounded-lg text-sm disabled:bg-gray-50" />
        </div>
        <button onClick={() => editing ? saveProfile() : setEditing(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
          {editing ? 'Lưu thông tin' : 'Chỉnh sửa'}
        </button>
      </div>

      {/* Phone Verification */}
      <div className="bg-white rounded-xl border p-5">
        <div className="flex items-center gap-2 mb-3">
          <OTPVerification userId={profile?.id || ''} currentPhone={phone} phoneVerified={phoneVerified}
            onVerified={() => setPhoneVerified(true)} />
        </div>
        {phoneVerified && <VerificationBadge type="phone" level="silver" size="sm" />}
      </div>

      {/* AI Preferences */}
      <div className="bg-white rounded-xl border p-6 space-y-4">
        <h2 className="font-semibold">🤖 Cài đặt AI</h2>

        <div>
          <label className="text-xs text-gray-500">Mức độ tự động</label>
          <div className="grid grid-cols-3 gap-2 mt-1">
            {[
              { value: 'auto', label: 'Tự động', desc: 'AI tự lo mọi thứ' },
              { value: 'confirm', label: 'Xác nhận', desc: 'AI đề xuất, bạn duyệt' },
              { value: 'manual', label: 'Thủ công', desc: 'Bạn tự làm mọi thứ' },
            ].map(opt => (
              <button key={opt.value} onClick={() => { setAiLevel(opt.value as any); setPrefsModified(true) }}
                className={`p-3 border-2 rounded-xl text-center text-sm transition ${aiLevel === opt.value ? 'border-blue-500 bg-blue-50' : 'hover:border-gray-300'}`}>
                <div className="font-medium">{opt.label}</div>
                <div className="text-xs text-gray-500 mt-0.5">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-500">Rating thợ tối thiểu</label>
          <input type="range" min="3" max="5" step="0.5" value={minRating}
            onChange={e => { setMinRating(parseFloat(e.target.value)); setPrefsModified(true) }}
            className="w-full" />
          <p className="text-xs text-gray-500 text-right">{minRating} ⭐</p>
        </div>

        <div>
          <label className="text-xs text-gray-500">Ngân sách tối đa</label>
          <input type="range" min="200000" max="5000000" step="100000" value={budgetMax}
            onChange={e => { setBudgetMax(parseInt(e.target.value)); setPrefsModified(true) }}
            className="w-full" />
          <p className="text-xs text-gray-500 text-right">{budgetMax.toLocaleString()}₫</p>
        </div>

        <div>
          <label className="text-xs text-gray-500">Lịch hẹn</label>
          <div className="grid grid-cols-3 gap-2 mt-1">
            {[
              { value: 'asap', label: '⚡ ASAP' },
              { value: 'flexible', label: '📅 Linh hoạt' },
              { value: 'scheduled', label: '🗓 Đặt trước' },
            ].map(opt => (
              <button key={opt.value} onClick={() => { setScheduling(opt.value as any); setPrefsModified(true) }}
                className={`p-3 border-2 rounded-xl text-center text-sm transition ${scheduling === opt.value ? 'border-blue-500 bg-blue-50' : 'hover:border-gray-300'}`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-500">Kênh thông báo</label>
          <div className="grid grid-cols-3 gap-2 mt-1">
            {[
              { value: 'app', label: '📱 App' },
              { value: 'sms', label: '💬 SMS' },
              { value: 'email', label: '📧 Email' },
            ].map(opt => (
              <button key={opt.value} onClick={() => { setChannel(opt.value as any); setPrefsModified(true) }}
                className={`p-3 border-2 rounded-xl text-center text-sm transition ${channel === opt.value ? 'border-blue-500 bg-blue-50' : 'hover:border-gray-300'}`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {prefsModified && (
          <button onClick={saveProfile} disabled={saving}
            className="w-full py-2 bg-blue-600 text-white rounded-xl text-sm hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Đang lưu...' : 'Lưu cài đặt'}
          </button>
        )}
      </div>

      {/* VFC Points */}
      <VFCBadge data={vfcData} loading={loading} />

      {/* Staking */}
      <div className="bg-white rounded-xl border p-5">
        <StakingManager positions={stakingPositions} onRefresh={() => window.location.reload()} />
      </div>

      {/* Connected Accounts */}
      <ConnectedAccounts />

      {/* Quick Links */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/customer/security"
          className="bg-white rounded-xl border p-4 flex items-center gap-3 hover:border-blue-300 transition">
          <span className="text-2xl">🔐</span>
          <div>
            <p className="font-medium text-sm">Bảo mật</p>
            <p className="text-xs text-gray-500">Đổi mật khẩu, xóa tài khoản</p>
          </div>
        </Link>
        <Link href="/customer/settings/notifications"
          className="bg-white rounded-xl border p-4 flex items-center gap-3 hover:border-blue-300 transition">
          <span className="text-2xl">🔔</span>
          <div>
            <p className="font-medium text-sm">Thông báo</p>
            <p className="text-xs text-gray-500">Cài đặt thông báo</p>
          </div>
        </Link>
      </div>

      {/* Wallet */}
      <WalletDashboard userId={profile?.id || ''} role="customer" />

      {/* Stats */}
      <div className="bg-white rounded-xl border p-6">
        <h2 className="font-semibold mb-3">📊 Thống kê</h2>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-2xl font-bold text-blue-600">{profile?.total_orders || 0}</p>
            <p className="text-xs text-gray-600">Tổng đơn</p>
          </div>
          <div className="p-3 bg-green-50 rounded-lg">
            <p className="text-2xl font-bold text-green-600">{profile?.completed_orders || 0}</p>
            <p className="text-xs text-gray-600">Hoàn thành</p>
          </div>
          <div className="p-3 bg-yellow-50 rounded-lg">
            <p className="text-2xl font-bold text-yellow-600">{profile?.avg_rating ? `${profile.avg_rating}/5` : '-'}</p>
            <p className="text-xs text-gray-600">Đánh giá TB</p>
          </div>
        </div>
      </div>
    </div>
  )
}
