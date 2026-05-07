// @ts-nocheck
// Customer Profile Page
// Per 15_CODEX_BUSINESS_CONTEXT.md - User profile management

'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/Toast'

export default function CustomerProfilePage() {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    fetchProfile()
  }, [])

  async function fetchProfile() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }
      setEmail(session.user.email || '')

      const { data: profiles, error } = await supabase
        .from('profiles' as any)
        .select('*')
        .eq('id', session.user.id)

      if (error) throw error
      
      // Handle profile not found
      let profileData: any = profiles?.[0]
      if (!profileData) {
        console.log('Profile not found, creating...')
        const { data: newProfile, error: createError } = await supabase
          .from('profiles' as any)
          .insert([{ 
            id: session.user.id, 
            email: session.user.email,
            full_name: session.user.user_metadata?.full_name || '',
            role: session.user.user_metadata?.role || 'customer'
          }] as any)
          .select()
          .single()
        
        if (createError) throw createError
        profileData = newProfile
      }

      setProfile(profileData as any)
      setName(profileData.full_name || '')
      setPhone(profileData.phone || '')
    } catch (error: any) {
      toast(error.message || 'Không thể tải thông tin', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function saveProfile() {
    try {
      setSaving(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { error } = await supabase
        .from('profiles' as any)
        .update({
          full_name: name,
          phone,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', session.user.id)

      if (error) throw error
      toast('Cập nhật thông tin thành công', 'success')
      setEditing(false)
    } catch (error: any) {
      toast(error.message || 'Lỗi cập nhật', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function changePassword() {
    if (!currentPassword || !newPassword) {
      toast('Vui lòng nhập đầy đủ mật khẩu', 'warning')
      return
    }
    if (newPassword.length < 6) {
      toast('Mật khẩu mới phải có ít nhất 6 ký tự', 'warning')
      return
    }
    try {
      setSaving(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { error } = await supabase.auth.signInWithPassword({
        email: session.user.email!,
        password: currentPassword,
      })
      if (error) {
        toast('Mật khẩu hiện tại không đúng', 'error')
        setSaving(false)
        return
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      })
      if (updateError) throw updateError

      toast('Đổi mật khẩu thành công', 'success')
      setCurrentPassword('')
      setNewPassword('')
      setShowPasswordForm(false)
    } catch (error: any) {
      toast(error.message || 'Lỗi đổi mật khẩu', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Thông tin cá nhân</h1>
        <p className="text-gray-600 mt-1">Quản lý thông tin tài khoản của bạn</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
        <div className="grid grid-cols-1 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              disabled
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!editing}
              placeholder="Nhập họ tên của bạn"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={!editing}
              placeholder="Nhập số điện thoại"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
            />
          </div>
        </div>

        <div className="flex gap-3">
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Chỉnh sửa
            </button>
          ) : (
            <>
              <button
                onClick={saveProfile}
                disabled={saving}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
              <button
                onClick={() => {
                  setEditing(false)
                  setName(profile?.full_name || '')
                  setPhone(profile?.phone || '')
                }}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Hủy
              </button>
            </>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <button
          onClick={() => setShowPasswordForm(!showPasswordForm)}
          className="text-blue-600 hover:text-blue-800 font-medium"
        >
          {showPasswordForm ? 'Ẩn đổi mật khẩu ▲' : 'Đổi mật khẩu ▼'}
        </button>

        {showPasswordForm && (
          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu hiện tại</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu mới</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={changePassword}
              disabled={saving}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {saving ? 'Đang xử lý...' : 'Cập nhật mật khẩu'}
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Thống kê tài khoản</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-2xl font-bold text-blue-600">
              {profile?.total_orders || 0}
            </p>
            <p className="text-xs text-gray-600">Tổng đơn hàng</p>
          </div>
          <div className="p-3 bg-green-50 rounded-lg">
            <p className="text-2xl font-bold text-green-600">
              {profile?.completed_orders || 0}
            </p>
            <p className="text-xs text-gray-600">Hoàn thành</p>
          </div>
          <div className="p-3 bg-yellow-50 rounded-lg">
            <p className="text-2xl font-bold text-yellow-600">
              {profile?.pending_orders || 0}
            </p>
            <p className="text-xs text-gray-600">Đang xử lý</p>
          </div>
          <div className="p-3 bg-purple-50 rounded-lg">
            <p className="text-2xl font-bold text-purple-600">
              {profile?.avg_rating ? `${profile.avg_rating}/5` : '-'}
            </p>
            <p className="text-xs text-gray-600">Đánh giá TB</p>
          </div>
        </div>
      </div>
    </div>
  )
}