// 🏗️ V4 Layout — 3 screens duy nhất: Map + Chat + Dashboard
'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const NAV: Record<string, { icon: string; label: string }> = {
  '/v4': { icon: '🗺️', label: 'Bản đồ' },
  '/v4/chat': { icon: '💬', label: 'Chat AI' },
  '/v4/dashboard': { icon: '📊', label: 'Tổng quan' },
}

export default function V4Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<any>(null)
  const [role, setRole] = useState<string>('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      setUser(session.user)
      supabase.from('profiles').select('role').eq('id', session.user.id).single().then(({ data }) => {
        setRole((data as any)?.role || 'customer')
      })
    })
  }, [])

  const roleLabel: Record<string, string> = { customer: '👤 Khách hàng', worker: '🛠️ Thợ', admin: '👑 Quản trị' }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold text-blue-600">V4</span>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{roleLabel[role] || role}</span>
        </div>
        <div className="flex gap-1">
          {Object.entries(NAV).map(([path, item]) => (
            <button key={path} onClick={() => router.push(path)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                pathname === path ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}>
              {item.icon} {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col">
        {children}
      </div>
    </div>
  )
}