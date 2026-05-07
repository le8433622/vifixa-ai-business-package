"use client"
// Worker Trust Page - Web
// Per user request: Complete worker pages (Web Trust)

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Profile = {
  id: string
  full_name?: string
  trust_score?: number
  id_front_url?: string
  id_back_url?: string
  bank_account?: any
  verification_status?: string
}

export default function WorkerTrustPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

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
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error
      setProfile(data)
    } catch (error: any) {
      console.error('fetchProfile error:', error)
    } finally {
      setLoading(false)
    }
  }

  function getTrustColor(score?: number) {
    if (!score) return '#6b7280'
    if (score >= 80) return '#16a34a'
    if (score >= 60) return '#ca8a04'
    return '#dc2626'
  }

  function getTrustLabel(score?: number) {
    if (!score) return 'Chưa đánh giá'
    if (score >= 80) return 'Rất tốt'
    if (score >= 60) return 'Tốt'
    return 'Cần cải thiện'
  }

  function getVerificationStatus(status?: string) {
    switch (status) {
      case 'verified': return { text: 'Đã xác minh', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', icon: '✅' }
      case 'pending': return { text: 'Đang xử lý', color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200', icon: '⏳' }
      case 'rejected': return { text: 'Bị từ chối', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', icon: '❌' }
      default: return { text: 'Chưa xác minh', color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200', icon: '📝' }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const trustStatus = getVerificationStatus(profile?.verification_status)
  const trustScore = profile?.trust_score || 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🔐 Độ tin cậy</h1>
          <p className="text-gray-600 mt-1">Quản lý độ tin cậy và xác minh tài khoản</p>
        </div>
        <Link
          href="/worker"
          className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
        >
          ← Quay lại Dashboard
        </Link>
      </div>

      {/* Trust Score Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <div className="inline-flex items-center justify-center w-32 h-32 rounded-full border-8 border-gray-100 mb-4">
          <div className="text-center">
            <p className="text-4xl font-bold" style={{ color: getTrustColor(trustScore) }}>{trustScore}</p>
            <p className="text-sm text-gray-500">/100</p>
          </div>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Điểm tin cậy</h2>
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${trustStatus.bg} ${trustStatus.border} border`}>
          <span>{trustStatus.icon}</span>
          <span className={`font-medium ${trustStatus.color}`}>{trustStatus.text}</span>
        </div>
        <p className="text-sm text-gray-600 mt-4">
          {trustScore >= 80 ? 'Tuyệt vời! Bạn được ưu tiên nhận việc.' :
           trustScore >= 60 ? 'Tốt! Hãy tiếp tục hoàn thiện hồ sơ.' :
           'Hãy xác minh danh tính và hoàn thành việc để tăng điểm.'}
        </p>
      </div>

      {/* Verification Status */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">📝 Xác minh danh tính</h2>
        
        {profile?.id_front_url ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">✅</span>
              <div>
                <p className="font-medium text-green-800">Đã upload CMND/CCCD</p>
                <p className="text-sm text-green-600">Mặt trước và mặt sau đã được upload</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <p className="font-medium text-yellow-800">Chưa upload CMND/CCCD</p>
                <p className="text-sm text-yellow-600">Bạn cần upload giấy tờ để xác minh</p>
              </div>
            </div>
          </div>
        )}

        {profile?.verification_status === 'rejected' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-700 text-sm">
              Hồ sơ bị từ chối. Vui lòng upload lại giấy tờ rõ ràng hơn.
            </p>
          </div>
        )}

        <Link
          href="/worker/profile"
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Đi đến Hồ sơ để cập nhật →
        </Link>
      </div>

      {/* Bank Account */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">🏦 Tài khoản ngân hàng</h2>
        
        {profile?.bank_account ? (
          <div className="space-y-3 mb-4">
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">Ngân hàng</span>
              <span className="font-medium">{profile.bank_account.bank_name || '...'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">Số tài khoản</span>
              <span className="font-medium">{profile.bank_account.account_number || '...'}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-600">Chủ tài khoản</span>
              <span className="font-medium">{profile.bank_account.account_holder || '...'}</span>
            </div>
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <p className="text-yellow-700 text-sm">Chưa thêm tài khoản ngân hàng</p>
          </div>
        )}

        <Link
          href="/worker/profile"
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Đi đến Hồ sơ để cập nhật →
        </Link>
      </div>

      {/* Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">💡 Cách tăng điểm tin cậy</h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li className="flex items-start gap-2">
            <span>✅</span>
            <span>Điểm tin cậy ≥80 sẽ được ưu tiên nhận việc tự động</span>
          </li>
          <li className="flex items-start gap-2">
            <span>✅</span>
            <span>Upload CMND/CCCD rõ ràng, không bị lóa</span>
          </li>
          <li className="flex items-start gap-2">
            <span>✅</span>
            <span>Thông tin ngân hàng phải chính xác để nhận tiền</span>
          </li>
          <li className="flex items-start gap-2">
            <span>✅</span>
            <span>Đánh giá cao từ khách hàng sẽ tăng điểm tin cậy</span>
          </li>
          <li className="flex items-start gap-2">
            <span>✅</span>
            <span>Hoàn thành việc đúng hạn giúp tăng điểm nhanh chóng</span>
          </li>
        </ul>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href="/worker/profile"
          className="flex-1 bg-blue-600 text-white text-center px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-colors"
        >
          📝 Cập nhật hồ sơ
        </Link>
        <Link
          href="/worker/earnings"
          className="flex-1 bg-white border border-gray-300 text-gray-700 text-center px-5 py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
        >
          💰 Xem thu nhập
        </Link>
      </div>
    </div>
  )
}
