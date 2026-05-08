"use client"
// Worker Verification - Web
// Per user request: Complete worker pages

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Profile = {
  id: string
  full_name?: string
  phone?: string
  id_front_url?: string
  id_back_url?: string
  bank_account?: any
  verification_status?: string
  id_number?: string
  address?: string
}

export default function WorkerVerifyPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  // Form states
  const [idNumber, setIdNumber] = useState('')
  const [address, setAddress] = useState('')
  const [agreeTerms, setAgreeTerms] = useState(false)

  useEffect(() => {
    checkUser()
  }, [])

  async function checkUser() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }
      fetchProfile(session.user.id)
    } catch (error: any) {
      console.error('checkUser error:', error)
    }
  }

  async function fetchProfile(userId: string) {
    try {
      const { data, error } = await (supabase as any)
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error
      const profileData = data as Profile | null
      if (!profileData) throw new Error('Không tìm thấy hồ sơ')
      setProfile(profileData)
      setIdNumber(profileData.id_number || '')
      setAddress(profileData.address || '')
    } catch (error: any) {
      console.error('fetchProfile error:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!agreeTerms) {
      setError('Bạn cần đồng ý với điều khoản dịch vụ')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { error } = await (supabase as any)
        .from('profiles')
        .update({
          id_number: idNumber,
          address: address,
          verification_status: 'pending',
          updated_at: new Date().toISOString(),
        })
        .eq('id', session.user.id)

      if (error) throw error

      setSuccess(true)
      setTimeout(() => {
        router.push('/worker')
      }, 2000)
    } catch (error: any) {
      console.error('submit error:', error)
      setError(error.message || 'Có lỗi xảy ra')
    } finally {
      setSubmitting(false)
    }
  }

  function getStatusInfo(status?: string) {
    switch (status) {
      case 'verified':
        return { 
          icon: '✅', 
          title: 'Đã xác minh', 
          desc: 'Tài khoản của bạn đã được xác minh đầy đủ.',
          color: 'text-green-600',
          bg: 'bg-green-50',
          border: 'border-green-200'
        }
      case 'pending':
        return { 
          icon: '⏳', 
          title: 'Đang chờ xác minh', 
          desc: 'Hồ sơ của bạn đang được xem xét. Vui lòng chờ 1-2 ngày làm việc.',
          color: 'text-yellow-600',
          bg: 'bg-yellow-50',
          border: 'border-yellow-200'
        }
      case 'rejected':
        return { 
          icon: '❌', 
          title: 'Bị từ chối', 
          desc: 'Hồ sơ không đạt yêu cầu. Vui lòng cập nhật lại thông tin.',
          color: 'text-red-600',
          bg: 'bg-red-50',
          border: 'border-red-200'
        }
      default:
        return { 
          icon: '📝', 
          title: 'Chưa xác minh', 
          desc: 'Vui lòng hoàn thành hồ sơ để bắt đầu nhận việc.',
          color: 'text-gray-600',
          bg: 'bg-gray-50',
          border: 'border-gray-200'
        }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const statusInfo = getStatusInfo(profile?.verification_status)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Xác minh thợ</h1>
          <p className="text-gray-600 mt-1">Hoàn thiện hồ sơ để nhận việc</p>
        </div>
        <Link
          href="/worker"
          className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
        >
          ← Quay lại Dashboard
        </Link>
      </div>

      {/* Status Card */}
      <div className={`${statusInfo.bg} border ${statusInfo.border} rounded-xl p-6`}>
        <div className="flex items-start gap-4">
          <div className="text-4xl">{statusInfo.icon}</div>
          <div>
            <h3 className={`text-lg font-semibold ${statusInfo.color}`}>{statusInfo.title}</h3>
            <p className="text-gray-600 mt-1">{statusInfo.desc}</p>
          </div>
        </div>
      </div>

      {success ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h3 className="text-xl font-semibold text-green-800 mb-2">Gửi hồ sơ thành công!</h3>
          <p className="text-green-700">Đang chuyển về Dashboard...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Info */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">📋 Thông tin cá nhân</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Họ và tên
                </label>
                <input
                  type="text"
                  value={profile?.full_name || ''}
                  disabled
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Số điện thoại
                </label>
                <input
                  type="text"
                  value={profile?.phone || ''}
                  disabled
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Số CMND/CCCD <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value)}
                  required
                  placeholder="Nhập số CMND/CCCD"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Địa chỉ <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                  placeholder="Nhập địa chỉ hiện tại"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* ID Documents */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">📷 Giấy tờ tùy thân</h2>
            <p className="text-sm text-gray-600 mb-4">
              Vui lòng upload CMND/CCCD rõ ràng (mặt trước và mặt sau) trong phần Hồ sơ.
            </p>
            <Link
              href="/worker/profile"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Đi đến Hồ sơ để upload →
            </Link>
          </div>

          {/* Bank Account */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">🏦 Tài khoản ngân hàng</h2>
            <p className="text-sm text-gray-600 mb-4">
              Thêm tài khoản ngân hàng để nhận thanh toán cho công việc hoàn thành.
            </p>
            <Link
              href="/worker/profile"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Đi đến Hồ sơ để thêm →
            </Link>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Terms */}
          <div className="flex items-start gap-2">
            <input
              type="checkbox"
              id="terms"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="terms" className="text-sm text-gray-600">
              Tôi xác nhận thông tin trên là chính xác và đồng ý với{' '}
              <a href="#" className="text-blue-600 hover:underline">Điều khoản dịch vụ</a>{' '}
              của Vifixa.
            </label>
          </div>

          {/* Submit */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <Link
              href="/worker"
              className="text-gray-600 hover:text-gray-800"
            >
              ← Hủy
            </Link>
            <button
              type="submit"
              disabled={submitting || profile?.verification_status === 'verified'}
              className="bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? 'Đang gửi...' : 
               profile?.verification_status === 'verified' ? 'Đã xác minh' : 
               profile?.verification_status === 'pending' ? 'Đang chờ duyệt' :
               'Gửi hồ sơ xác minh'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
