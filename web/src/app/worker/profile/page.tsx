'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import KYCUpload from '@/components/trust/KYCUpload'
import PortfolioManager from '@/components/trust/PortfolioManager'
import TrustScoreGauge from '@/components/trust/TrustScoreGauge'
import VerificationBadge from '@/components/trust/VerificationBadge'
import ServiceAreaDrawer from '@/components/map/ServiceAreaDrawer'

const ALL_SKILLS = [
  'Máy lạnh', 'Điện', 'Nước', 'Camera', 'Tủ lạnh',
  'Máy giặt', 'Bếp gas', 'Bình nóng lạnh',
]

const ALL_AREAS = [
  'Quận 1', 'Quận 2', 'Quận 3', 'Quận 4', 'Quận 5', 'Quận 7',
  'Quận 10', 'Quận Bình Thạnh', 'Quận Phú Nhuận', 'Quận Tân Bình',
  'Quận Tân Phú', 'Quận Gò Vấp', 'TP. Thủ Đức', 'Huyện Bình Chánh',
  'Huyện Nhà Bè',
]

export default function WorkerProfile() {
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [skills, setSkills] = useState<string[]>([])
  const [areas, setAreas] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [servicePolygon, setServicePolygon] = useState<[number, number][] | null>(null)
  const [showMap, setShowMap] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    const [pRes, wRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', session.user.id),
      supabase.from('workers').select('*').eq('id', session.user.id).single().catch(() => ({ data: null })),
    ])
    const p = pRes.data?.[0]
    const w = wRes.data
    if (p) { setName(p.full_name || ''); setPhone(p.phone || '') }
    if (w) {
      setProfile(w)
      setSkills(w.skills || [])
      setAreas(w.service_areas || [])
    }
    setLoading(false)
  }

  async function save() {
    setSaving(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await (supabase as any).from('profiles').update({ full_name: name, phone }).eq('id', session.user.id)
    await (supabase as any).from('workers').upsert({ id: session.user.id, skills, service_areas: areas, updated_at: new Date().toISOString() })
    setSaving(false)
  }

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" /></div>

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-5">
      <h1 className="text-2xl font-bold">👤 Hồ sơ của tôi</h1>

      {/* Basic info */}
      <div className="bg-white rounded-xl border p-5 space-y-4">
        <h2 className="font-semibold">Thông tin cơ bản</h2>
        <div>
          <label className="text-xs text-gray-500">Họ tên</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm mt-1" />
        </div>
        <div>
          <label className="text-xs text-gray-500">Số điện thoại</label>
          <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm mt-1" />
        </div>
      </div>

      {/* Skills */}
      <div className="bg-white rounded-xl border p-5">
        <h2 className="font-semibold mb-3">🔧 Kỹ năng</h2>
        <div className="flex flex-wrap gap-2">
          {ALL_SKILLS.map(skill => (
            <button key={skill} onClick={() => setSkills(prev => prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill])}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                skills.includes(skill) ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300'
              }`}>
              {skill} {skills.includes(skill) ? '✓' : '+'}
            </button>
          ))}
        </div>
      </div>

      {/* Service areas */}
      <div className="bg-white rounded-xl border p-5">
        <h2 className="font-semibold mb-3">📍 Khu vực phục vụ</h2>
        <div className="flex flex-wrap gap-2 mb-3">
          {ALL_AREAS.map(area => (
            <button key={area} onClick={() => setAreas(prev => prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area])}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                areas.includes(area) ? 'bg-blue-100 text-blue-700 border-blue-300' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300'
              }`}>
              {area} {areas.includes(area) ? '✓' : '+'}
            </button>
          ))}
        </div>
        <button onClick={() => setShowMap(!showMap)}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium">
          {showMap ? '🔼 Ẩn bản đồ' : '🗺️ Vẽ khu vực trên bản đồ'}
        </button>
        {showMap && (
          <div className="mt-3">
            <ServiceAreaDrawer
              value={servicePolygon}
              onChange={setServicePolygon}
              height={400}
            />
            {servicePolygon && servicePolygon.length > 0 && (
              <p className="text-xs text-emerald-600 mt-2">✅ Đã vẽ khu vực ({servicePolygon.length} điểm)</p>
            )}
          </div>
        )}
      </div>

      {/* Trust score */}
      {profile && (
        <div className="bg-white rounded-xl border p-5">
          <h2 className="font-semibold mb-3">🛡️ Độ tin cậy</h2>
          <div className="flex items-center gap-4">
            <TrustScoreGauge score={profile.trust_score || 0} size="lg" />
            <div>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {profile.is_verified && <VerificationBadge type="identity" level="gold" />}
              </div>
              <p className="text-xs text-gray-500 mt-1">Tăng điểm bằng cách hoàn thành job đúng hạn</p>
            </div>
          </div>
        </div>
      )}

      {/* Work settings */}
      <div className="bg-white rounded-xl border p-5">
        <h2 className="font-semibold mb-3">⚙️ Cài đặt làm việc</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm">Trạng thái</span>
            <select className="px-3 py-1.5 border rounded-lg text-sm">
              <option>Đang hoạt động</option>
              <option>Bận</option>
              <option>Nghỉ</option>
            </select>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Bán kính phục vụ</span>
            <select className="px-3 py-1.5 border rounded-lg text-sm">
              <option>10 km</option>
              <option>20 km</option>
              <option>30 km</option>
            </select>
          </div>
        </div>
      </div>

      {/* KYC Verification */}
      {profile && (
        <div className="bg-white rounded-xl border p-5">
          {profile.verification_status === 'verified' ? (
            <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg">
              <span>✅</span>
              <div>
                <p className="font-medium text-sm">Đã xác thực danh tính</p>
                {profile.kyc_reviewed_at && <p className="text-xs text-emerald-500">{new Date(profile.kyc_reviewed_at).toLocaleDateString('vi-VN')}</p>}
              </div>
            </div>
          ) : profile.verification_status === 'rejected' ? (
            <div>
              <div className="flex items-center gap-2 text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-3">
                <span>❌</span>
                <div>
                  <p className="font-medium text-sm">Xác thực bị từ chối</p>
                  {profile.kyc_notes && <p className="text-xs text-red-500">{profile.kyc_notes}</p>}
                </div>
              </div>
              <KYCUpload workerId={profile.id} onComplete={() => window.location.reload()} />
            </div>
          ) : (
            <KYCUpload workerId={profile.id} onComplete={() => window.location.reload()} />
          )}
        </div>
      )}

      {/* Portfolio */}
      {profile && (
        <div className="bg-white rounded-xl border p-5">
          <PortfolioManager workerId={profile.id} />
        </div>
      )}

      {/* Save */}
      <button onClick={save} disabled={saving}
        className="w-full py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-50 transition">
        {saving ? 'Đang lưu...' : '💾 Lưu thay đổi'}
      </button>
    </div>
  )
}
