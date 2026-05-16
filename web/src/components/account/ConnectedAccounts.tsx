'use client'

import { supabase } from '@/lib/supabase'
import { useState } from 'react'

export default function ConnectedAccounts() {
  const [linking, setLinking] = useState<string | null>(null)

  async function linkGoogle() {
    setLinking('google')
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' })
    if (error) console.error(error)
    setLinking(null)
  }

  async function linkApple() {
    setLinking('apple')
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'apple' })
    if (error) console.error(error)
    setLinking(null)
  }

  return (
    <div className="bg-white rounded-xl border p-5 space-y-4">
      <h2 className="font-semibold">🔗 Tài khoản liên kết</h2>
      <div className="space-y-3">
        <button onClick={linkGoogle} disabled={linking !== null}
          className="w-full flex items-center gap-3 px-4 py-3 border rounded-xl hover:bg-gray-50 transition disabled:opacity-50">
          <span className="text-xl">G</span>
          <div className="flex-1 text-left">
            <p className="text-sm font-medium text-gray-900">Google</p>
            <p className="text-xs text-gray-500">Liên kết tài khoản Google để đăng nhập nhanh</p>
          </div>
          <span className="text-xs text-blue-600 font-medium">{linking === 'google' ? 'Đang kết nối...' : 'Kết nối →'}</span>
        </button>

        <button onClick={linkApple} disabled={linking !== null}
          className="w-full flex items-center gap-3 px-4 py-3 border rounded-xl hover:bg-gray-50 transition disabled:opacity-50">
          <span className="text-xl">🍎</span>
          <div className="flex-1 text-left">
            <p className="text-sm font-medium text-gray-900">Apple</p>
            <p className="text-xs text-gray-500">Liên kết tài khoản Apple để đăng nhập nhanh</p>
          </div>
          <span className="text-xs text-blue-600 font-medium">{linking === 'apple' ? 'Đang kết nối...' : 'Kết nối →'}</span>
        </button>

        <div className="px-4 py-3 bg-gray-50 rounded-xl border">
          <div className="flex items-center gap-3">
            <span className="text-xl">📧</span>
            <div>
              <p className="text-sm font-medium text-gray-900">Email / Mật khẩu</p>
              <p className="text-xs text-gray-500">Đang sử dụng</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
