'use client'

import { ReactNode, useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ToastProvider } from '@/components/Toast'
import Link from 'next/link'
import { LanguageProvider } from '@/components/common/LanguageToggle'
import LanguageToggle from '@/components/common/LanguageToggle'
import { NotificationProvider } from '@/components/NotificationProvider'
import { NotificationsProvider } from '@/components/notifications/NotificationsContext'
import NotificationBell from '@/components/notifications/NotificationBell'

function getRoleHomePath(role: string | null | undefined) {
  if (role === 'admin') return '/admin'
  if (role === 'worker') return '/worker'
  if (role === 'customer') return '/customer'
  return '/login'
}

const NAV_ITEMS = [
  { href: '/customer', label: '🏠 Home', short: 'Home' },
  { href: '/customer/map', label: '🗺️ Bản đồ', short: 'Map' },
  { href: '/customer/orders', label: '📋 Đơn hàng', short: 'Orders' },
  { href: '/customer/devices', label: '🔧 Thiết bị', short: 'Devices' },
  { href: '/customer/profile', label: '👤 Tài khoản', short: 'Account' },
]

export default function CustomerLayout({ children }: { children: ReactNode }) {
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    let cancelled = false
    const timeoutId = setTimeout(() => {
      setAuthError((prev) => prev ?? 'Kiểm tra quyền quá hạn. Vui lòng tải lại trang.')
    }, 10000)

    async function checkCustomer() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (cancelled) return
        if (!session) { router.replace('/login'); return }

        const { data: profileData } = await supabase
          .from('profiles').select('role').eq('id', session.user.id).maybeSingle()
        const profile = profileData as { role: string } | null

        if (cancelled) return
        if (!profile || profile.role !== 'customer') {
          router.replace(getRoleHomePath(profile?.role))
          return
        }
        setUserEmail(session.user.email || '')
        setCheckingAuth(false)
      } catch {
        if (cancelled) return
        setAuthError('Lỗi kết nối. Vui lòng tải lại trang.')
      }
    }

    checkCustomer()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') router.replace('/login')
    })
    return () => { cancelled = true; clearTimeout(timeoutId); subscription.unsubscribe() }
  }, [router])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (checkingAuth) {
    return (
      <LanguageProvider><ToastProvider>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          {authError ? (
            <div className="text-center">
              <div className="text-5xl mb-4">⚠️</div>
              <p className="text-red-600 mb-4">{authError}</p>
              <button onClick={() => window.location.reload()} className="px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700">Tải lại trang</button>
              <button onClick={async () => { await supabase.auth.signOut(); router.replace('/login') }} className="ml-3 px-6 py-2 border rounded-xl hover:bg-gray-50">Đăng xuất</button>
            </div>
          ) : (
            <div className="text-center">
              <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Đang kiểm tra quyền...</p>
            </div>
          )}
        </div>
      </ToastProvider></LanguageProvider>
    )
  }

  return (
    <LanguageProvider><ToastProvider><NotificationProvider>
      <NotificationsProvider>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Top Nav */}
        <nav className="bg-white shadow-sm border-b sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex justify-between h-14 items-center">
              <Link href="/customer" className="text-lg font-bold text-blue-600">Vifixa AI</Link>
              <div className="hidden md:flex items-center gap-1">
                {NAV_ITEMS.map(item => (
                  <Link key={item.href} href={item.href}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      pathname === item.href ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
                    }`}>
                    {item.label}
                  </Link>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <NotificationBell />
                <span className="text-xs text-gray-500 hidden md:block">{userEmail}</span>
                <LanguageToggle /><button onClick={handleLogout} className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100">Đăng xuất</button>
                <button className="md:hidden p-1.5 rounded text-gray-600 hover:bg-gray-100" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                </button>
              </div>
            </div>
            {mobileMenuOpen && (
              <div className="md:hidden border-t pb-3 pt-2 space-y-1">
                {NAV_ITEMS.map(item => (
                  <Link key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)}
                    className={`block px-3 py-2 rounded-md text-sm font-medium ${
                      pathname === item.href ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
                    }`}>
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </nav>

        {/* Content — no max-w constraint for Home so map can go full width */}
        <main className="flex-1">
          {children}
        </main>
      </div>
      </NotificationsProvider>
    </NotificationProvider></ToastProvider></LanguageProvider>
  )
}
