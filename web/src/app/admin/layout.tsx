'use client'

import { ReactNode, useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

const NAV_ITEMS = [
  { href: '/admin', label: '🏠 Dashboard' },
  { href: '/admin/users', label: '👥 Users' },
  { href: '/admin/orders', label: '📋 Orders' },
  { href: '/admin/integrations', label: '🔌 Integrations' },
]

export default function AdminLayout({ children }: { children: ReactNode }) {
  const [checking, setChecking] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [email, setEmail] = useState('')
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    async function check() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/login'); return }
      const { data: profile } = await supabase
        .from('profiles').select('role').eq('id', session.user.id).maybeSingle()
      if (!profile || profile.role !== 'admin') {
        router.replace(profile?.role === 'customer' ? '/customer' : '/worker')
        return
      }
      setEmail(session.user.email || '')
      setChecking(false)
    }
    check()
  }, [router])

  if (checking) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      <nav className="bg-gray-800 border-b border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between h-14 items-center">
            <Link href="/admin" className="text-lg font-bold text-indigo-400">Vifixa Admin</Link>
            <div className="hidden md:flex items-center gap-1">
              {NAV_ITEMS.map(item => (
                <Link key={item.href} href={item.href}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    pathname === item.href ? 'bg-indigo-900/50 text-indigo-300' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
                  }`}>{item.label}</Link>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500 hidden md:block">{email}</span>
              <button onClick={async () => { await supabase.auth.signOut(); router.push('/') }}
                className="text-xs text-gray-500 hover:text-gray-300 px-2 py-1 rounded hover:bg-gray-700">Đăng xuất</button>
              <button className="md:hidden p-1.5 rounded text-gray-400 hover:bg-gray-700" onClick={() => setMobileOpen(!mobileOpen)}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
              </button>
            </div>
          </div>
          {mobileOpen && (
            <div className="md:hidden border-t border-gray-700 pb-3 pt-2 space-y-1">
              {NAV_ITEMS.map(item => (
                <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}
                  className={`block px-3 py-2 rounded-md text-sm font-medium ${
                    pathname === item.href ? 'bg-indigo-900/50 text-indigo-300' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
                  }`}>{item.label}</Link>
              ))}
            </div>
          )}
        </div>
      </nav>
      <main className="flex-1">{children}</main>
    </div>
  )
}
