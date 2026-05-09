// Admin Settings Layout - Sidebar navigation for settings sections
// Per user request: Build comprehensive admin settings with toggle-on/off approach

'use client'

import { ReactNode, useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface SettingsLayoutProps {
  children: ReactNode
}

export default function SettingsLayout({ children }: SettingsLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [userEmail, setUserEmail] = useState('')

  useEffect(() => {
    let cancelled = false

    async function checkAdmin() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (cancelled) return

        if (!session) {
          router.replace('/login')
          return
        }

        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .maybeSingle()

        if (cancelled) return

        if (error || (profile as any)?.role !== 'admin') {
          router.replace('/')
          return
        }

        setUserEmail(session.user.email || '')
        setCheckingAuth(false)
      } catch (err) {
        console.error('Settings layout auth check error:', err)
        if (!cancelled) {
          router.replace('/login')
        }
      }
    }

    checkAdmin()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        router.replace('/login')
      }
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [router])

  const navItems = [
    { href: '/admin/settings/general', label: 'General', icon: '⚙️' },
    { href: '/admin/settings/features', label: 'Features', icon: '🎯' },
    { href: '/admin/settings/payments', label: 'Payments', icon: '💳' },
    { href: '/admin/settings/wallet', label: 'Wallet', icon: '💰' },
    { href: '/admin/settings/notifications', label: 'Notifications', icon: '📧' },
    { href: '/admin/settings/ai', label: 'AI Config', icon: '🤖' },
    { href: '/admin/settings/security', label: 'Security', icon: '🔒' },
  ]

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-white border-r border-gray-200 min-h-screen sticky top-0">
          <div className="p-4 border-b border-gray-200">
            <Link href="/admin" className="text-lg font-bold text-blue-600 hover:text-blue-700">
              ← Back to Admin
            </Link>
          </div>

          <nav className="p-4 space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <span>{item.icon}</span>
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-white">
            <p className="text-xs text-gray-500 truncate">{userEmail}</p>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8 max-w-5xl">
          {children}
        </div>
      </div>
    </div>
  )
}
