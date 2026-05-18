'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) redirectByRole(session.user.id)
    })
  }, [])

  async function redirectByRole(userId: string) {
    const { data, error } = await supabase.from('profiles').select('role').eq('id', userId).single()
    if (error || !data) { console.error('redirectByRole error:', error); router.replace('/'); return }
    const role = (data as any)?.role
    if (role === 'customer') router.replace('/customer')
    else if (role === 'worker') router.replace('/worker')
    else if (role === 'admin') router.replace('/admin')
    else router.replace('/')
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false); return }
    await supabase.auth.refreshSession()
    redirectByRole(data.user.id)
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <div className="max-w-md w-full mx-4">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🤖</div>
          <h1 className="text-3xl font-bold text-gray-900">Vifixa AI</h1>
          <p className="text-gray-500 mt-2">AI Companion của bạn đang chờ</p>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-lg border">
          {error && (
            <div data-testid="login-error" className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-xl mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                data-testid="login-email" type="email" value={email} onChange={e => setEmail(e.target.value)}
                required placeholder="your@email.com"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu</label>
              <input
                data-testid="login-password" type="password" value={password} onChange={e => setPassword(e.target.value)}
                required placeholder="••••••••"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition"
              />
            </div>
            <button data-testid="login-submit" type="submit" disabled={loading}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 transition-all">
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500">
            Chưa có tài khoản?{' '}
            <button onClick={() => router.push('/register')} className="text-blue-600 hover:underline font-medium">
              Đăng ký ngay
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}