'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState<'customer' | 'worker'>('customer')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, phone, role } },
    })

    if (signUpError) { setError(signUpError.message); setLoading(false); return }
    if (!data.user) { setError('Đăng ký thất bại'); setLoading(false); return }

    // Cập nhật profile với thông tin từ form
    const { error: profileError } = await supabase.from('profiles').update({
      full_name: fullName,
      phone,
      role,
    }).eq('id', data.user.id)
    if (profileError) console.error('Profile update failed:', profileError)

    // Nếu là worker, tạo worker profile
    if (role === 'worker') {
      const { error: workerError } = await supabase.from('workers').insert({
        id: data.user.id,
        full_name: fullName,
        phone,
      })
      if (workerError) console.error('Worker insert failed:', workerError)
    }

    // Tạo companion greeting trong memory
    const { error: memoryError } = await supabase.from('companion_memories').insert({
      user_id: data.user.id,
      key: 'welcome_date',
      value: new Date().toISOString(),
      category: 'onboarding',
      importance: 3,
    })
    if (memoryError) console.error('Memory insert failed:', memoryError)

    alert('🎉 Đăng ký thành công! Chào mừng bạn đến với Vifixa AI.')
    router.push('/login')
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <div className="max-w-md w-full mx-4">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🚀</div>
          <h1 className="text-3xl font-bold text-gray-900">Tham gia Vifixa AI</h1>
          <p className="text-gray-500 mt-2">AI Companion đồng hành cùng bạn</p>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-lg border">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-xl mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Họ tên</label>
              <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                required placeholder="Nguyễn Văn A"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/30 outline-none transition" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                required placeholder="your@email.com"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/30 outline-none transition" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                placeholder="+84 123 456 789"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/30 outline-none transition" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                required minLength={6} placeholder="•••••••• (ít nhất 6 ký tự)"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/30 outline-none transition" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tôi muốn</label>
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => setRole('customer')}
                  className={`py-3 px-4 rounded-xl border-2 font-medium transition-all ${
                    role === 'customer'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}>
                  <span className="text-2xl block mb-1">🏠</span>
                  Thuê dịch vụ
                </button>
                <button type="button" onClick={() => setRole('worker')}
                  className={`py-3 px-4 rounded-xl border-2 font-medium transition-all ${
                    role === 'worker'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}>
                  <span className="text-2xl block mb-1">🔧</span>
                  Làm dịch vụ
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 transition-all">
              {loading ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500">
            Đã có tài khoản?{' '}
            <button onClick={() => router.push('/login')} className="text-blue-600 hover:underline font-medium">
              Đăng nhập
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Bằng cách đăng ký, bạn đồng ý với{' '}
          <button onClick={() => router.push('/terms')} className="underline">Điều khoản dịch vụ</button>
        </p>
      </div>
    </div>
  )
}