'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/Toast'
import LocationSelect from '@/components/ui/LocationSelect'
import { formatVND } from '@/lib/format-currency'
import { displayVNPhone, isValidVNPhone, isValidIDNumber } from '@/lib/validators'

const SKILLS = [
  'Plumbing', 'Electrical', 'HVAC', 'Appliance Repair',
  'Carpentry', 'Painting', 'Cleaning', 'Lock Smith',
]

interface WorkerProfile {
  user_id: string
  skills: string[]
  service_areas: string[]
  is_verified: boolean
  verification_status: string
  trust_score: number
  avg_earnings: number
  total_orders: number
  avg_rating: number
  home_lat: number
  home_lng: number
  home_address: string
  max_service_radius_km: number
  profiles: {
    email: string
    phone: string
    full_name: string
    avatar_url: string
    address: string
    id_number: string
    bank_name: string
    bank_account_number: string
    bank_account_holder: string
  }
}

export default function WebWorkerProfile() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: profile, isLoading } = useQuery({
    queryKey: ['web-worker-profile'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return null
      }
      const { data, error } = await supabase
        .from('workers')
        .select('*, profiles(*)')
        .eq('user_id', session.user.id)
        .single()
      if (error) throw error
      return data as unknown as WorkerProfile
    },
  })

  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [idNumber, setIdNumber] = useState('')
  const [address, setAddress] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [bankName, setBankName] = useState('')
  const [bankAccountNumber, setBankAccountNumber] = useState('')
  const [bankAccountHolder, setBankAccountHolder] = useState('')
  const [skills, setSkills] = useState<string[]>([])
  const [serviceProvince, setServiceProvince] = useState('')
  const [serviceAreas, setServiceAreas] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (profile) {
      queueMicrotask(() => {
        setFullName(profile.profiles?.full_name || '')
        setPhone(profile.profiles?.phone || '')
        setIdNumber(profile.profiles?.id_number || '')
        setAddress(profile.profiles?.address || '')
        setAvatarUrl(profile.profiles?.avatar_url || '')
        setBankName(profile.profiles?.bank_name || '')
        setBankAccountNumber(profile.profiles?.bank_account_number || '')
        setBankAccountHolder(profile.profiles?.bank_account_holder || '')
        setSkills(profile.skills || [])
        setServiceAreas(profile.service_areas || [])
      })
    }
  }, [profile])

  async function uploadAvatar(file: File) {
    setUploading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const ext = file.name.split('.').pop()
      const fileName = `avatar/${session.user.id}_${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('verification')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('verification')
        .getPublicUrl(fileName)

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', session.user.id)

      if (updateError) throw updateError

      setAvatarUrl(publicUrl)
      queryClient.invalidateQueries({ queryKey: ['web-worker-profile'] })
      toast('Cập nhật ảnh đại diện thành công', 'success')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Upload thất bại', 'error')
    } finally {
      setUploading(false)
    }
  }

  function handleAvatarClick() {
    fileInputRef.current?.click()
  }

  async function saveProfile() {
    if (phone && !isValidVNPhone(phone)) {
      toast('Số điện thoại không đúng định dạng Việt Nam', 'error')
      return
    }
    if (idNumber && !isValidIDNumber(idNumber)) {
      toast('Số CMND/CCCD không hợp lệ (9 hoặc 12 số)', 'error')
      return
    }

    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { error: workerError } = await supabase
        .from('workers')
        .update({
          skills,
          service_areas: serviceAreas,
        })
        .eq('user_id', session.user.id)
      if (workerError) throw workerError

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          phone,
          id_number: idNumber,
          address,
          bank_name: bankName,
          bank_account_number: bankAccountNumber,
          bank_account_holder: bankAccountHolder,
          updated_at: new Date().toISOString(),
        })
        .eq('id', session.user.id)
      if (profileError) throw profileError

      queryClient.invalidateQueries({ queryKey: ['web-worker-profile'] })
      toast('Cập nhật hồ sơ thành công', 'success')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Lưu thất bại', 'error')
    } finally {
      setSaving(false)
    }
  }

  const toggleSkill = (skill: string) => {
    setSkills(prev =>
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
    )
  }

  const toggleArea = (area: string) => {
    setServiceAreas(prev =>
      prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area]
    )
  }

  const trustLevel = profile?.trust_score || 0
  const trustColor = trustLevel >= 80 ? 'text-green-600' : trustLevel >= 60 ? 'text-yellow-600' : 'text-red-600'
  const trustBg = trustLevel >= 80 ? 'bg-green-50 border-green-200' : trustLevel >= 60 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'
  const trustBarColor = trustLevel >= 80 ? 'bg-green-500' : trustLevel >= 60 ? 'bg-yellow-500' : 'bg-red-500'

  const statusInfo = profile?.verification_status === 'verified'
    ? { icon: '✅', label: 'Đã xác minh', color: 'text-green-700 bg-green-50 border-green-200' }
    : profile?.verification_status === 'rejected'
    ? { icon: '❌', label: 'Bị từ chối', color: 'text-red-700 bg-red-50 border-red-200' }
    : profile?.verification_status === 'pending'
    ? { icon: '⏳', label: 'Đang chờ duyệt', color: 'text-yellow-700 bg-yellow-50 border-yellow-200' }
    : { icon: '📝', label: 'Chưa xác minh', color: 'text-gray-700 bg-gray-50 border-gray-200' }

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" /></div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
        <button
          onClick={() => router.push('/worker')}
          className="text-blue-600 hover:underline text-sm"
        >
          ← Quay lại Dashboard
        </button>

        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Hồ sơ thợ</h1>

        {/* Avatar & Verification Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <div className="flex-shrink-0">
              <div
                onClick={handleAvatarClick}
                className="w-24 h-24 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-blue-400 overflow-hidden"
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-gray-400 text-sm text-center px-2">{uploading ? 'Đang tải...' : 'Thêm ảnh'}</span>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) uploadAvatar(file)
                }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-bold text-gray-900 truncate">{fullName || profile?.profiles?.email}</h2>
                <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
                  {statusInfo.icon} {statusInfo.label}
                </div>
              </div>
              <p className="text-sm text-gray-500">{profile?.profiles?.email}</p>
            </div>
          </div>
        </div>

        {/* Personal Info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">📋 Thông tin cá nhân</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên</label>
              <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
                placeholder="Nhập họ và tên"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                placeholder="098 123 4567"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Số CMND/CCCD</label>
              <input type="text" value={idNumber} onChange={(e) => setIdNumber(e.target.value)}
                placeholder="9 hoặc 12 số"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ</label>
              <input type="text" value={address} onChange={(e) => setAddress(e.target.value)}
                placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
            </div>
          </div>
        </div>

        {/* Bank Account */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">🏦 Tài khoản ngân hàng</h2>
          <p className="text-sm text-gray-500 mb-4">Thông tin để nhận thanh toán cho các công việc hoàn thành.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ngân hàng</label>
              <input type="text" value={bankName} onChange={(e) => setBankName(e.target.value)}
                placeholder="VD: Vietcombank, Techcombank"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Số tài khoản</label>
              <input type="text" value={bankAccountNumber} onChange={(e) => setBankAccountNumber(e.target.value)}
                placeholder="Nhập số tài khoản"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Chủ tài khoản</label>
              <input type="text" value={bankAccountHolder} onChange={(e) => setBankAccountHolder(e.target.value)}
                placeholder="Tên trên tài khoản ngân hàng"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
            </div>
          </div>
        </div>

        {/* Skills */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">🔧 Kỹ năng</h2>
          <div className="flex flex-wrap gap-2">
            {SKILLS.map((skill) => (
              <button key={skill} onClick={() => toggleSkill(skill)}
                className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  skills.includes(skill)
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                }`}>
                {skill}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">Đã chọn: {skills.length} kỹ năng</p>
        </div>

        {/* Service Areas */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">📍 Khu vực phục vụ</h2>
          <div className="mb-4">
            <LocationSelect
              showWard={false}
              onChange={(val) => setServiceProvince(val.province_name || '')}
            />
          </div>
          <p className="text-xs text-gray-400 mb-3">Chọn tỉnh/thành phố, sau đó chọn quận/huyện bạn muốn phục vụ:</p>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {serviceAreas.length === 0 && (
              <p className="text-sm text-gray-400 italic">Chưa chọn khu vực nào</p>
            )}
            {serviceAreas.map((area) => (
              <div key={area} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                <span className="text-sm text-gray-700">{area}</span>
                <button onClick={() => toggleArea(area)} className="text-red-500 hover:text-red-700 text-sm">✕</button>
              </div>
            ))}
          </div>
        </div>

        {/* Trust Score */}
        <div className={`rounded-xl border p-6 ${trustBg}`}>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">🛡️ Điểm tin cậy</h2>
          <div className="flex items-center gap-6">
            <div className="relative w-20 h-20">
              <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                <circle cx="18" cy="18" r="15.5" fill="none"
                  stroke={trustLevel >= 80 ? '#22c55e' : trustLevel >= 60 ? '#eab308' : '#ef4444'}
                  strokeWidth="3" strokeDasharray={`${trustLevel}, ${100 - trustLevel}`}
                  strokeLinecap="round" />
              </svg>
              <span className={`absolute inset-0 flex items-center justify-center text-xl font-bold ${trustColor}`}>
                {trustLevel}
              </span>
            </div>
            <div className="flex-1">
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div className={`${trustBarColor} h-2.5 rounded-full`} style={{ width: `${trustLevel}%` }} />
              </div>
              <p className="text-sm mt-2">
                {trustLevel >= 80 ? '✅ Uy tín cao. Xuất sắc!' :
                 trustLevel >= 60 ? '⚠️ Ổn định. Hoàn thành thêm đơn để tăng điểm.' :
                 '🔻 Cần cải thiện. Nhận thêm đơn và đánh giá tốt.'}
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{profile?.total_orders || 0}</p>
            <p className="text-xs text-gray-500 mt-1">Đơn hàng</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{profile?.avg_rating ? profile.avg_rating.toFixed(1) : '—'}</p>
            <p className="text-xs text-gray-500 mt-1">Đánh giá</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{formatVND(profile?.avg_earnings || 0)}</p>
            <p className="text-xs text-gray-500 mt-1">Thu nhập TB</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-orange-600">{profile?.avg_earnings || 0}</p>
            <p className="text-xs text-gray-500 mt-1">Tổng thu nhập</p>
          </div>
        </div>

        {/* Save */}
        <button
          onClick={saveProfile}
          disabled={saving}
          className="w-full bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-base"
        >
          {saving ? 'Đang lưu...' : '💾 Lưu hồ sơ'}
        </button>
      </div>
    </div>
  )
}
