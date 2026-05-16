'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/Toast'

export default function CustomerSecurityPage() {
  const { toast } = useToast()
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [changing, setChanging] = useState(false)

  async function handleChangePassword() {
    if (!currentPw || !newPw || !confirmPw) { toast('Vui lòng nhập đầy đủ thông tin', 'error'); return }
    if (newPw !== confirmPw) { toast('Mật khẩu mới không khớp', 'error'); return }
    if (newPw.length < 6) { toast('Mật khẩu phải có ít nhất 6 ký tự', 'error'); return }

    setChanging(true)
    const { error } = await supabase.auth.updateUser({ password: newPw })
    if (error) {
      toast(error.message, 'error')
    } else {
      toast('✅ Đổi mật khẩu thành công', 'success')
      setCurrentPw('')
      setNewPw('')
      setConfirmPw('')
    }
    setChanging(false)
  }

  async function handleDeleteAccount() {
    if (!confirm('Bạn có chắc muốn xóa tài khoản? Hành động này không thể hoàn tác.')) return
    const reason = prompt('Lý do xóa tài khoản (không bắt buộc):')
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const res = await fetch('/api/account/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: session.user.id, reason }),
    })
    const result = await res.json()
    if (result.success) {
      toast(result.message, 'success')
    } else {
      toast(result.error || 'Lỗi gửi yêu cầu', 'error')
    }
  }

  async function handleExportData() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    toast('Đang xuất dữ liệu...', 'info')

    const res = await fetch('/api/account/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: session.user.id }),
    })
    const result = await res.json()
    if (result.success) {
      const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `vifixa-data-export-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
    } else {
      toast(result.error || 'Lỗi xuất dữ liệu', 'error')
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">🔐 Bảo mật</h1>

      {/* Change password */}
      <div className="bg-white rounded-xl border p-5 space-y-4">
        <h2 className="font-semibold">Đổi mật khẩu</h2>
        <div>
          <label className="text-xs text-gray-500">Mật khẩu hiện tại</label>
          <input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)}
            className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
        </div>
        <div>
          <label className="text-xs text-gray-500">Mật khẩu mới</label>
          <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)}
            className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
        </div>
        <div>
          <label className="text-xs text-gray-500">Xác nhận mật khẩu mới</label>
          <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
            className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
        </div>
        <button onClick={handleChangePassword} disabled={changing}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
          {changing ? 'Đang đổi...' : 'Đổi mật khẩu'}
        </button>
      </div>

      {/* Data export */}
      <div className="bg-white rounded-xl border p-5 space-y-3">
        <h2 className="font-semibold">📦 Dữ liệu của tôi</h2>
        <p className="text-xs text-gray-500">Tải xuống toàn bộ dữ liệu tài khoản của bạn (JSON)</p>
        <button onClick={handleExportData}
          className="px-6 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700">
          📥 Xuất dữ liệu
        </button>
      </div>

      {/* Delete account */}
      <div className="bg-white rounded-xl border border-red-200 p-5 space-y-3">
        <h2 className="font-semibold text-red-600">⚠️ Xóa tài khoản</h2>
        <p className="text-xs text-gray-500">Yêu cầu xóa tài khoản và dữ liệu cá nhân. Xử lý trong vòng 7 ngày.</p>
        <button onClick={handleDeleteAccount}
          className="px-6 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700">
          🗑 Yêu cầu xóa tài khoản
        </button>
      </div>
    </div>
  )
}
