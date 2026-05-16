'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type LockRecord = {
  id: string
  user_id: string
  lock_level: 'warning' | 'temporary' | 'permanent'
  reason: string
  locked_by: string | null
  locked_at: string
  expires_at: string | null
  unlocked_at: string | null
  unlocked_by: string | null
  unlock_reason: string | null
  profiles: { email: string; full_name: string; role: string; cancel_count: number } | { email: string; full_name: string; role: string; cancel_count: number }[]
  locker: { email: string } | { email: string }[] | null
}

const LEVEL_CONFIG = {
  warning: { label: '⚠️ Cảnh báo', color: 'text-amber-400 bg-amber-900/30' },
  temporary: { label: '🔒 Tạm thời', color: 'text-orange-400 bg-orange-900/30' },
  permanent: { label: '🚫 Vĩnh viễn', color: 'text-red-400 bg-red-900/30' },
}

export default function AdminLocks() {
  const [locks, setLocks] = useState<LockRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'active' | 'resolved'>('active')
  const [stats, setStats] = useState({ active: 0, resolved: 0 })
  const [showLockModal, setShowLockModal] = useState(false)
  const [lockUserId, setLockUserId] = useState('')
  const [lockLevel, setLockLevel] = useState<'warning' | 'temporary' | 'permanent'>('temporary')
  const [lockReason, setLockReason] = useState('')
  const [lockExpiry, setLockExpiry] = useState(7)
  const [locking, setLocking] = useState(false)

  useEffect(() => { load() }, [tab])

  async function load() {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(`/api/admin/locks?status=${tab}`, {
      headers: { Authorization: `Bearer ${session?.access_token}` },
    })
    const result = await res.json()
    if (result.success) {
      setLocks(result.data)
      setStats(result.stats)
    }
    setLoading(false)
  }

  async function handleLock() {
    if (!lockUserId || !lockReason) return
    setLocking(true)
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/admin/locks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({
        user_id: lockUserId,
        lock_level: lockLevel,
        reason: lockReason,
        locked_by: session?.user.id,
        expires_at: lockLevel === 'temporary' ? new Date(Date.now() + lockExpiry * 24 * 60 * 60 * 1000).toISOString() : null,
      }),
    })
    const result = await res.json()
    if (result.success) {
      setShowLockModal(false)
      setLockUserId('')
      setLockReason('')
      load()
    }
    setLocking(false)
  }

  async function unlock(lockId: string, userId: string) {
    if (!confirm('Mở khóa tài khoản này?')) return
    const { data: { session } } = await supabase.auth.getSession()
    await fetch('/api/admin/locks', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ lock_id: lockId, user_id: userId, unlocked_by: session?.user.id }),
    })
    load()
  }

  if (loading) return <div className="flex justify-center py-20 bg-gray-900"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" /></div>

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-100">🔒 Khóa tài khoản</h1>
        <button onClick={() => setShowLockModal(true)}
          className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition">
          + Khóa tài khoản
        </button>
      </div>

      <div className="flex gap-2">
        {(['active', 'resolved'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${tab === t ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
            {t === 'active' ? '🔴 Đang khóa' : '✅ Đã mở'} ({stats[t]})
          </button>
        ))}
      </div>

      {locks.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <div className="text-4xl mb-3">🔒</div>
          <p>Không có bản ghi khóa nào</p>
        </div>
      ) : (
        <div className="space-y-3">
          {locks.map(lock => {
            const profile = Array.isArray(lock.profiles) ? lock.profiles[0] : lock.profiles
            const locker = lock.locker ? (Array.isArray(lock.locker) ? lock.locker[0] : lock.locker) : null
            const level = LEVEL_CONFIG[lock.lock_level]
            return (
              <div key={lock.id} className="bg-gray-800 rounded-xl border border-gray-700 p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-lg">
                      {lock.lock_level === 'permanent' ? '🚫' : lock.lock_level === 'temporary' ? '🔒' : '⚠️'}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-200">{profile?.full_name || lock.user_id.slice(0, 12)}</p>
                      <p className="text-xs text-gray-500">{profile?.email} · {profile?.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${level.color}`}>{level.label}</span>
                    {!lock.unlocked_at && (
                      <button onClick={() => unlock(lock.id, lock.user_id)}
                        className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700">
                        Mở khóa
                      </button>
                    )}
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-4 text-xs text-gray-400">
                  <div><strong>Lý do:</strong> {lock.reason}</div>
                  <div><strong>Khóa lúc:</strong> {new Date(lock.locked_at).toLocaleString('vi-VN')}</div>
                  {lock.expires_at && <div><strong>Hết hạn:</strong> {new Date(lock.expires_at).toLocaleString('vi-VN')}</div>}
                  {locker && <div><strong>Bởi:</strong> {locker.email}</div>}
                  {profile?.cancel_count != null && <div><strong>Hủy đơn:</strong> {profile.cancel_count} trong tháng</div>}
                  {lock.unlocked_at && <div><strong>Mở lúc:</strong> {new Date(lock.unlocked_at).toLocaleString('vi-VN')}</div>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showLockModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowLockModal(false)}>
          <div className="bg-gray-800 rounded-2xl max-w-md w-full p-6 space-y-4 border border-gray-700" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-200">🔒 Khóa tài khoản</h2>

            <div>
              <label className="text-xs text-gray-500">User ID *</label>
              <input value={lockUserId} onChange={e => setLockUserId(e.target.value)}
                placeholder="UUID của user" className="w-full mt-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-gray-200" />
            </div>

            <div>
              <label className="text-xs text-gray-500">Mức khóa *</label>
              <div className="grid grid-cols-3 gap-2 mt-1">
                {(['warning', 'temporary', 'permanent'] as const).map(l => (
                  <button key={l} onClick={() => setLockLevel(l)}
                    className={`py-2 rounded-lg text-xs font-medium border transition ${lockLevel === l ? 'border-red-500 bg-red-900/30 text-red-300' : 'border-gray-600 text-gray-400 hover:border-gray-500'}`}>
                    {l === 'warning' ? '⚠️ Cảnh báo' : l === 'temporary' ? '🔒 Tạm thời' : '🚫 Vĩnh viễn'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500">Lý do *</label>
              <textarea value={lockReason} onChange={e => setLockReason(e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-gray-200" rows={2} />
            </div>

            {lockLevel === 'temporary' && (
              <div>
                <label className="text-xs text-gray-500">Thời hạn (ngày)</label>
                <input type="number" value={lockExpiry} onChange={e => setLockExpiry(Number(e.target.value))} min={1} max={365}
                  className="w-full mt-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-gray-200" />
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={() => setShowLockModal(false)} className="flex-1 py-2 bg-gray-700 text-gray-300 rounded-lg text-sm hover:bg-gray-600">Hủy</button>
              <button onClick={handleLock} disabled={locking || !lockUserId || !lockReason}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50">
                {locking ? 'Đang khóa...' : 'Xác nhận khóa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
