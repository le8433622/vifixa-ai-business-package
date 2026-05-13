"use client"

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import LocationSelect from '@/components/ui/LocationSelect'
import { isValidVNPhone, isValidIDNumber, formatVNPhone } from '@/lib/validators'

type Profile = {
  id: string
  full_name?: string
  phone?: string
  id_number?: string
  address?: string
  bank_name?: string
  bank_account_number?: string
  bank_account_holder?: string
  verification_status?: string
}

const REQUIRED_SKILLS = [
  'Plumbing', 'Electrical', 'HVAC', 'Appliance Repair',
  'Carpentry', 'Painting', 'Cleaning', 'Lock Smith',
]

export default function WorkerVerifyPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [step, setStep] = useState(1)
  const router = useRouter()

  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [idNumber, setIdNumber] = useState('')
  const [address, setAddress] = useState('')
  const [street, setStreet] = useState('')
  const [locationAddr, setLocationAddr] = useState<{ province: string; district: string; ward: string; province_name?: string; district_name?: string; ward_name?: string } | null>(null)
  const [bankName, setBankName] = useState('')
  const [bankAccountNumber, setBankAccountNumber] = useState('')
  const [bankAccountHolder, setBankAccountHolder] = useState('')
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])
  const [agreeTerms, setAgreeTerms] = useState(false)

  useEffect(() => {
    async function fetchProfile(userId: string) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single()

        if (error) throw error
        const profileData = data as Profile | null
        if (!profileData) throw new Error('Không tìm thấy hồ sơ')
        setProfile(profileData)
        setFullName(profileData.full_name || '')
        setPhone(profileData.phone || '')
        setIdNumber(profileData.id_number || '')
        setAddress(profileData.address || '')
        setBankName(profileData.bank_name || '')
        setBankAccountNumber(profileData.bank_account_number || '')
        setBankAccountHolder(profileData.bank_account_holder || '')
      } catch (err) {
        console.error('fetchProfile error:', err)
      } finally {
        setLoading(false)
      }
    }

    async function checkUser() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          router.push('/login')
          return
        }
        fetchProfile(session.user.id)
      } catch (err) {
        console.error('checkUser error:', err)
      }
    }
    checkUser()
  }, [])

  function validateStep1(): boolean {
    if (!fullName.trim()) { setError('Vui lòng nhập họ và tên'); return false }
    if (!phone.trim()) { setError('Vui lòng nhập số điện thoại'); return false }
    if (!isValidVNPhone(phone)) { setError('Số điện thoại không đúng định dạng Việt Nam (VD: 0981234567)'); return false }
    if (!idNumber.trim()) { setError('Vui lòng nhập số CMND/CCCD'); return false }
    if (!isValidIDNumber(idNumber)) { setError('Số CMND/CCCD không hợp lệ (9 số cũ, 12 số mới)'); return false }
    if (!street.trim()) { setError('Vui lòng nhập số nhà, tên đường'); return false }
    if (!locationAddr?.province) { setError('Vui lòng chọn Tỉnh/Thành phố'); return false }
    if (!locationAddr?.district) { setError('Vui lòng chọn Quận/Huyện'); return false }
    setError(null)
    return true
  }

  function validateStep2(): boolean {
    if (selectedSkills.length === 0) { setError('Vui lòng chọn ít nhất 1 kỹ năng'); return false }
    setError(null)
    return true
  }

  function validateStep3(): boolean {
    if (!bankName.trim() || !bankAccountNumber.trim() || !bankAccountHolder.trim()) {
      setError('Vui lòng điền đầy đủ thông tin ngân hàng để nhận thanh toán')
      return false
    }
    setError(null)
    return true
  }

  function goToStep2() {
    if (validateStep1()) setStep(2)
  }

  function goToStep3() {
    if (validateStep2()) setStep(3)
  }

  function goToStep4() {
    if (validateStep3()) setStep(4)
  }

  async function handleSubmit() {
    if (!agreeTerms) {
      setError('Bạn cần đồng ý với điều khoản dịch vụ')
      return
    }

    const fullAddr = [street, locationAddr?.ward_name, locationAddr?.district_name, locationAddr?.province_name].filter(Boolean).join(', ')

    setSubmitting(true)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          phone: formatVNPhone(phone),
          id_number: idNumber,
          address: fullAddr,
          home_lat: null,
          home_lng: null,
          bank_name: bankName,
          bank_account_number: bankAccountNumber,
          bank_account_holder: bankAccountHolder,
          updated_at: new Date().toISOString(),
        })
        .eq('id', session.user.id)

      if (profileError) throw profileError

      const { error: workerError } = await supabase
        .from('workers')
        .upsert(
          {
            user_id: session.user.id,
            skills: selectedSkills,
            verification_status: 'pending',
          },
          { onConflict: 'user_id' }
        )

      if (workerError) throw workerError

      setSuccess(true)
      setTimeout(() => {
        router.push('/worker')
      }, 2000)
    } catch (err) {
      console.error('submit error:', err)
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra')
    } finally {
      setSubmitting(false)
    }
  }

  function getStatusInfo(status?: string) {
    switch (status) {
      case 'verified':
        return { icon: '✅', title: 'Đã xác minh', desc: 'Tài khoản của bạn đã được xác minh đầy đủ.', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' }
      case 'pending':
        return { icon: '⏳', title: 'Đang chờ xác minh', desc: 'Hồ sơ của bạn đang được xem xét. Vui lòng chờ 1-2 ngày làm việc.', color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200' }
      case 'rejected':
        return { icon: '❌', title: 'Bị từ chối', desc: 'Hồ sơ không đạt yêu cầu. Vui lòng cập nhật lại thông tin.', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' }
      default:
        return { icon: '📝', title: 'Chưa xác minh', desc: 'Vui lòng hoàn thành hồ sơ để bắt đầu nhận việc.', color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200' }
    }
  }

  const toggleSkill = (skill: string) => {
    setSelectedSkills(prev =>
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
    )
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" /></div>
  }

  const statusInfo = getStatusInfo(profile?.verification_status)
  const steps = [
    { num: 1, label: 'Thông tin', icon: '📋' },
    { num: 2, label: 'Kỹ năng', icon: '🔧' },
    { num: 3, label: 'Ngân hàng', icon: '🏦' },
    { num: 4, label: 'Xác nhận', icon: '✅' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Xác minh thợ</h1>
          <p className="text-gray-600 mt-1">Hoàn thiện hồ sơ để nhận việc</p>
        </div>
        <Link href="/worker" className="text-sm text-blue-600 hover:text-blue-800 hover:underline">← Quay lại Dashboard</Link>
      </div>

      <div className={`${statusInfo.bg} border ${statusInfo.border} rounded-xl p-4`}>
        <div className="flex items-center gap-3">
          <div className="text-3xl">{statusInfo.icon}</div>
          <div>
            <h3 className={`font-semibold ${statusInfo.color}`}>{statusInfo.title}</h3>
            <p className="text-sm text-gray-600">{statusInfo.desc}</p>
          </div>
        </div>
      </div>

      {success ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h3 className="text-xl font-semibold text-green-800 mb-2">Gửi hồ sơ thành công!</h3>
          <p className="text-green-700">Đang chuyển về Dashboard...</p>
        </div>
      ) : profile?.verification_status === 'verified' ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
          <div className="text-5xl mb-4">✅</div>
          <h3 className="text-xl font-semibold text-green-800 mb-2">Bạn đã được xác minh</h3>
          <p className="text-green-700 mb-4">Tài khoản của bạn đã được xác minh đầy đủ. Bạn có thể bắt đầu nhận việc ngay.</p>
          <Link href="/worker" className="inline-block bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700">← Về Dashboard</Link>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Step Indicator */}
          <div className="flex items-center justify-between bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            {steps.map((s, i) => (
              <div key={s.num} className="flex items-center flex-1">
                <div className={`flex items-center gap-2 ${
                  step > s.num ? 'text-green-600' : step === s.num ? 'text-blue-600' : 'text-gray-400'
                }`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    step > s.num ? 'bg-green-100 text-green-600' :
                    step === s.num ? 'bg-blue-100 text-blue-600' :
                    'bg-gray-100 text-gray-400'
                  }`}>
                    {step > s.num ? '✓' : s.num}
                  </div>
                  <span className="hidden sm:inline text-sm font-medium">{s.label}</span>
                </div>
                {i < steps.length - 1 && <div className={`flex-1 h-0.5 mx-2 ${step > s.num ? 'bg-green-300' : 'bg-gray-200'}`} />}
              </div>
            ))}
          </div>

          <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
            {/* Step 1: Personal Info */}
            {step === 1 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
                <h2 className="text-lg font-semibold text-gray-900">📋 Thông tin cá nhân</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên <span className="text-red-500">*</span></label>
                    <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nhập họ và tên"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại <span className="text-red-500">*</span></label>
                    <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="098 123 4567"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Số CMND/CCCD <span className="text-red-500">*</span></label>
                    <input type="text" value={idNumber} onChange={(e) => setIdNumber(e.target.value)} placeholder="9 hoặc 12 số"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">Địa chỉ <span className="text-red-500">*</span></label>
                  <input type="text" value={street} onChange={(e) => setStreet(e.target.value)} placeholder="Số nhà, tên đường"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                  <LocationSelect
                    showWard={false}
                    onChange={setLocationAddr}
                  />
                </div>

                <div className="flex justify-end pt-4 border-t">
                  <button type="button" onClick={goToStep2}
                    className="bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 font-medium">
                    Tiếp theo →
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Skills */}
            {step === 2 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
                <h2 className="text-lg font-semibold text-gray-900">🔧 Kỹ năng</h2>
                <p className="text-sm text-gray-500">Chọn ít nhất 1 kỹ năng bạn có thể phục vụ.</p>
                <div className="flex flex-wrap gap-2">
                  {REQUIRED_SKILLS.map((skill) => (
                    <button key={skill} type="button" onClick={() => toggleSkill(skill)}
                      className={`px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                        selectedSkills.includes(skill)
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                      }`}>
                      {skill}
                    </button>
                  ))}
                </div>
                <p className="text-sm text-gray-400">Đã chọn: {selectedSkills.length} kỹ năng</p>

                <div className="flex justify-between pt-4 border-t">
                  <button type="button" onClick={() => setStep(1)} className="text-gray-600 hover:text-gray-800">← Quay lại</button>
                  <button type="button" onClick={goToStep3}
                    className="bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 font-medium">
                    Tiếp theo →
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Bank Account */}
            {step === 3 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
                <h2 className="text-lg font-semibold text-gray-900">🏦 Tài khoản ngân hàng</h2>
                <p className="text-sm text-gray-500">Thông tin để nhận thanh toán cho các công việc hoàn thành.</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ngân hàng <span className="text-red-500">*</span></label>
                    <input type="text" value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="VD: Vietcombank"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Số tài khoản <span className="text-red-500">*</span></label>
                    <input type="text" value={bankAccountNumber} onChange={(e) => setBankAccountNumber(e.target.value)} placeholder="Nhập số tài khoản"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Chủ tài khoản <span className="text-red-500">*</span></label>
                    <input type="text" value={bankAccountHolder} onChange={(e) => setBankAccountHolder(e.target.value)} placeholder="Tên trên tài khoản"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                </div>

                <div className="flex justify-between pt-4 border-t">
                  <button type="button" onClick={() => setStep(2)} className="text-gray-600 hover:text-gray-800">← Quay lại</button>
                  <button type="button" onClick={goToStep4}
                    className="bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 font-medium">
                    Tiếp theo →
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Review & Submit */}
            {step === 4 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
                <h2 className="text-lg font-semibold text-gray-900">✅ Xác nhận thông tin</h2>
                <p className="text-sm text-gray-500">Vui lòng kiểm tra lại thông tin trước khi gửi.</p>

                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <h3 className="font-medium text-gray-700">📋 Thông tin cá nhân</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-gray-500">Họ tên:</span><span className="font-medium">{fullName}</span>
                    <span className="text-gray-500">SĐT:</span><span className="font-medium">{phone}</span>
                    <span className="text-gray-500">CMND/CCCD:</span><span className="font-medium">{idNumber}</span>
                    <span className="text-gray-500">Địa chỉ:</span><span className="font-medium">{[street, locationAddr?.ward_name, locationAddr?.district_name, locationAddr?.province_name].filter(Boolean).join(', ')}</span>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <h3 className="font-medium text-gray-700">🔧 Kỹ năng</h3>
                  <div className="flex flex-wrap gap-1">
                    {selectedSkills.map(s => (
                      <span key={s} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">{s}</span>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <h3 className="font-medium text-gray-700">🏦 Tài khoản ngân hàng</h3>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <span className="text-gray-500">Ngân hàng:</span><span className="font-medium col-span-2">{bankName}</span>
                    <span className="text-gray-500">Số TK:</span><span className="font-medium col-span-2">{bankAccountNumber}</span>
                    <span className="text-gray-500">Chủ TK:</span><span className="font-medium col-span-2">{bankAccountHolder}</span>
                  </div>
                </div>

                {/* Terms */}
                <div className="flex items-start gap-2">
                  <input type="checkbox" id="terms" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                  <label htmlFor="terms" className="text-sm text-gray-600">
                    Tôi xác nhận thông tin trên là chính xác và đồng ý với{' '}
                    <a href="/terms" className="text-blue-600 hover:underline" target="_blank">Điều khoản dịch vụ</a> của Vifixa.
                  </label>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">{error}</div>
                )}

                <div className="flex justify-between pt-4 border-t">
                  <button type="button" onClick={() => setStep(3)} className="text-gray-600 hover:text-gray-800">← Quay lại</button>
                  <button type="button" onClick={handleSubmit} disabled={submitting || !agreeTerms}
                    className="bg-green-600 text-white px-6 py-2.5 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium">
                    {submitting ? 'Đang gửi...' : '📨 Gửi hồ sơ xác minh'}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      )}
    </div>
  )
}
