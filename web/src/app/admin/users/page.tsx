'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type UserProfile = { id: string; full_name: string; email: string; phone: string; role: string; created_at: string }

export default function AdminUsers() {
  const router = useRouter()
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'all' | 'customer' | 'worker' | 'admin'>('all')

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
    setUsers(data as any || [])
    setLoading(false)
  }

  const filtered = tab === 'all' ? users : users.filter(u => u.role === tab)
  const counts = { all: users.length, customer: users.filter(u => u.role === 'customer').length, worker: users.filter(u => u.role === 'worker').length, admin: users.filter(u => u.role === 'admin').length }

  if (loading) return <div className="flex justify-center py-20 bg-gray-900"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" /></div>

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-5">
      <h1 className="text-2xl font-bold text-gray-100">👥 Users</h1>

      <div className="flex gap-2">
        {(['all', 'customer', 'worker', 'admin'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${tab === t ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
            {t === 'all' ? 'Tất cả' : t} ({counts[t]})
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-gray-300">
          <thead>
            <tr className="border-b border-gray-700 text-gray-500 text-left">
              <th className="py-3 px-4">Tên</th><th className="py-3 px-4">Email</th><th className="py-3 px-4">Phone</th><th className="py-3 px-4">Role</th><th className="py-3 px-4">Ngày tạo</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                <td className="py-3 px-4 font-medium">{u.full_name || '—'}</td>
                <td className="py-3 px-4 text-gray-400">{u.email}</td>
                <td className="py-3 px-4 text-gray-400">{u.phone || '—'}</td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    u.role === 'admin' ? 'bg-purple-900/50 text-purple-300'
                    : u.role === 'worker' ? 'bg-emerald-900/50 text-emerald-300'
                    : 'bg-blue-900/50 text-blue-300'
                  }`}>{u.role}</span>
                </td>
                <td className="py-3 px-4 text-gray-500">{new Date(u.created_at).toLocaleDateString('vi-VN')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
