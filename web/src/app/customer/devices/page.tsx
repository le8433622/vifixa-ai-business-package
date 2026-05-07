// Device Profiles Page - AI Personalization
// Per user request: AI personalization for better experience

'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/Toast'

interface Device {
  id: string
  device_type: string
  brand?: string
  model?: string
  serial_number?: string
  purchase_date?: string
  warranty_expiry?: string
  location_in_home?: string
  specifications?: any
  notes?: string
  created_at: string
}

const DEVICE_TYPES = [
  { id: 'air_conditioning', label: 'Điều hòa', icon: '❄️' },
  { id: 'refrigerator', label: 'Tủ lạnh', icon: '❄️' },
  { id: 'washing_machine', label: 'Máy giặt', icon: '🔄' },
  { id: 'water_heater', label: 'Máy nước nóng', icon: '🚿' },
  { id: 'other', label: 'Thiết bị khác', icon: '🔧' },
]

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

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
      await fetchDevices()
    } catch (error: any) {
      toast(error.message || 'Lỗi tải dữ liệu', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function fetchDevices() {
    try {
      const { data, error } = await supabase
        .from('device_profiles' as any)
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setDevices(data || [])
    } catch (error: any) {
      toast(error.message || 'Không thể tải thiết bị', 'error')
    }
  }

  function getDeviceIcon(type: string) {
    const device = DEVICE_TYPES.find(d => d.id === type)
    return device?.icon || '🔧'
  }

  function getDeviceLabel(type: string) {
    const device = DEVICE_TYPES.find(d => d.id === type)
    return device?.label || type
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🔧 Thiết bị của tôi</h1>
          <p className="text-gray-600 mt-1">Quản lý thiết bị trong nhà - AI sẽ nhắc lịch bảo trì</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
        >
          <span className="text-lg">+</span>
          Thêm thiết bị
        </button>
      </div>

      {/* Devices Grid */}
      {devices.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <div className="text-5xl mb-4">🔧</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Chưa có thiết bị nào</h3>
          <p className="text-gray-600 mb-6">Thêm thiết bị để AI cá nhân hóa trải nghiệm và nhắc lịch bảo trì</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <span className="text-xl">+</span>
            Thêm thiết bị đầu tiên
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {devices.map((device) => (
            <div
              key={device.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => router.push(`/customer/devices/${device.id}`)}
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="text-3xl">{getDeviceIcon(device.device_type)}</div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">
                    {device.brand} {device.model}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {getDeviceLabel(device.device_type)}
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                {device.purchase_date && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Ngày mua:</span>
                    <span className="font-medium">
                      {new Date(device.purchase_date).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                )}
                {device.location_in_home && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Vị trí:</span>
                    <span className="font-medium">{device.location_in_home}</span>
                  </div>
                )}
                {device.warranty_expiry && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Bảo hành đến:</span>
                    <span className={`font-medium ${
                      new Date(device.warranty_expiry) < new Date() 
                        ? 'text-red-600' 
                        : 'text-green-600'
                    }`}>
                      {new Date(device.warranty_expiry).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100">
                <button className="text-sm text-blue-600 hover:text-blue-800 hover:underline">
                  Xem chi tiết →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Device Modal */}
      {showAddModal && (
        <AddDeviceModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false)
            fetchDevices()
            toast('Thêm thiết bị thành công!', 'success')
          }}
        />
      )}
    </div>
  )
}

// Add Device Modal Component
function AddDeviceModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    device_type: 'air_conditioning',
    brand: '',
    model: '',
    serial_number: '',
    purchase_date: '',
    warranty_expiry: '',
    location_in_home: '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { error } = await supabase
        .from('device_profiles' as any)
        .insert({
          user_id: session.user.id,
          ...formData,
          purchase_date: formData.purchase_date || null,
          warranty_expiry: formData.warranty_expiry || null,
        } as any)

      if (error) throw error
      onSuccess()
    } catch (error: any) {
      alert('Lỗi: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">➕ Thêm thiết bị mới</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Device Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Loại thiết bị *
            </label>
            <select
              required
              value={formData.device_type}
              onChange={(e) => setFormData({ ...formData, device_type: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {DEVICE_TYPES.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.icon} {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Brand */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hãng sản xuất
            </label>
            <input
              type="text"
              value={formData.brand}
              onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
              placeholder="VD: Daikin, LG, Samsung..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Model */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Model
            </label>
            <input
              type="text"
              value={formData.model}
              onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              placeholder="VD: FT25HV..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Purchase Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ngày mua
            </label>
            <input
              type="date"
              value={formData.purchase_date}
              onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Warranty Expiry */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bảo hành đến
            </label>
            <input
              type="date"
              value={formData.warranty_expiry}
              onChange={(e) => setFormData({ ...formData, warranty_expiry: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Location in Home */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vị trí trong nhà
            </label>
            <input
              type="text"
              value={formData.location_in_home}
              onChange={(e) => setFormData({ ...formData, location_in_home: e.target.value })}
              placeholder="VD: Phòng khách, Phòng ngủ 1..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ghi chú
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Ghi chú thêm về thiết bị..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {saving ? 'Đang lưu...' : 'Lưu thiết bị'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
