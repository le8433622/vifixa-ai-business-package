// Admin Layout - Shared shell and role guard for admin pages
// Per 15_CODEX_BUSINESS_CONTEXT.md - Admins monitor users, workers, orders, complaints, AI logs

'use client'

import { ReactNode, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

function getRoleHomePath(role: string | null | undefined) {
  if (role === 'admin') return '/admin'
  if (role === 'worker') return '/worker'
  if (role === 'customer') return '/customer'
  return '/login'
}

export default function AdminLayout({ children }: { children: ReactNode }) {
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

        if (error) {
          console.error('Admin layout profile query error:', error)
          setAuthError('Không thể xác thực quyền. Vui lòng thử lại.')
          return
        }

        const role = (profile as { role?: string } | null)?.role ?? null

        if (role !== 'admin') {
          router.replace(getRoleHomePath(role))
          return
        }

        setUserEmail(session.user.email || '')
        setCheckingAuth(false)
      } catch (err) {
        if (cancelled) return
        console.error('Admin layout check error:', err)
        setAuthError('Lỗi kết nối. Vui lòng tải lại trang.')
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
      clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, [router])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  const navItems = [
    { href: '/admin', label: 'Dashboard', icon: '🏠' },
    { href: '/admin/users', label: 'Users', icon: '👥' },
    { href: '/admin/workers', label: 'Workers', icon: '🛠️' },
    { href: '/admin/orders', label: 'Orders', icon: '📋' },
    { href: '/admin/complaints', label: 'Complaints', icon: '⚠️' },
    { href: '/admin/disputes', label: 'Disputes', icon: '⚖️' },
    { href: '/admin/ai-logs', label: 'AI Logs', icon: '🤖' },
    { href: '/admin/settings', label: 'Settings', icon: '⚙️' },
  ]

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          {authError ? (
            <>
              <div className="text-5xl mb-4">⚠️</div>
              <p className="text-red-600 mb-4">{authError}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
              >
                Tải lại trang
              </button>
              <button
                onClick={async () => { await supabase.auth.signOut(); router.replace('/login') }}
                className="ml-3 px-6 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50"
              >
                Đăng xuất
              </button>
            </>
          ) : (
            <>
              <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Đang kiểm tra quyền admin...</p>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/admin" className="text-xl font-bold text-blue-600">
                Vifixa AI Admin
              </Link>
              <div className="hidden lg:flex ml-10 space-x-3">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`inline-flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      pathname === item.href
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <span className="mr-2">{item.icon}</span>
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600 hidden md:block">{userEmail}</span>
              <button
                onClick={handleLogout}
                className="text-sm text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md hover:bg-gray-100"
              >
                Đăng xuất
              </button>
              <button
                className="lg:hidden p-2 rounded-md text-gray-600 hover:bg-gray-100"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          {mobileMenuOpen && (
            <div className="lg:hidden border-t border-gray-200">
              <div className="px-2 pt-2 pb-3 space-y-1">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block px-3 py-2 rounded-md text-base font-medium ${
                      pathname === item.href
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {item.icon} {item.label}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}
