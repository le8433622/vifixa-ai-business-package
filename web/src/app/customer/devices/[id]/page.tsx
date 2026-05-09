// Device Detail Page - Web
// Per user request: AI personalization + maintenance prediction

'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
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

interface MaintenancePrediction {
  next_maintenance_date: string
  maintenance_type: string
  urgency: 'low' | 'medium' | 'high'
  estimated_cost?: number
  recommendations: string[]
  device_lifespan_years?: number
}

interface ServiceRecord {
  id: string
  category: string
  description: string
  status: string
  estimated_price: number
  final_price?: number
  created_at: string
  completed_at?: string
  rating?: number
}

const CATEGORY_TO_DEVICE: Record<string, string[]> = {
  'air_conditioning': ['air_conditioning'],
  'refrigerator': ['refrigerator'],
  'washing_machine': ['washing_machine'],
  'water_heater': ['water_heater'],
  'electricity': ['electric'],
  'camera': ['camera'],
}

export default function DeviceDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const { toast } = useToast()
  
  const [device, setDevice] = useState<Device | null>(null)
  const [prediction, setPrediction] = useState<MaintenancePrediction | null>(null)
  const [serviceHistory, setServiceHistory] = useState<ServiceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (id) {
      fetchDevice()
    }
  }, [id])

  async function fetchDevice() {
    try {
      setError(null)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      const { data, error } = await supabase
        .from('device_profiles' as any)
        .select('*')
        .eq('id', id as string)
        .single()

      if (error) throw error
      setDevice(data)

      if (data) {
        const device = data as Device
        await Promise.all([
          fetchPrediction(device),
          fetchServiceHistory(session.user.id, device.device_type),
        ])
      }
    } catch (error: any) {
      console.error('fetchDevice error:', error)
      setError(error.message || 'Không thể tải thiết bị')
    } finally {
      setLoading(false)
    }
  }

  async function fetchServiceHistory(userId: string, deviceType: string) {
    try {
      const matchingCategories = CATEGORY_TO_DEVICE[deviceType]
      if (!matchingCategories || matchingCategories.length === 0) return

      const { data, error } = await supabase
        .from('orders')
        .select('id, category, description, status, estimated_price, final_price, created_at, completed_at, rating')
        .eq('customer_id', userId)
        .in('category', matchingCategories)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('fetchServiceHistory error:', error)
        return
      }
      setServiceHistory(data || [])
    } catch (err) {
      console.error('fetchServiceHistory error:', err)
    }
  }

  async function fetchPrediction(device: Device) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/ai-predict`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          device_type: device.device_type,
          brand: device.brand,
          model: device.model,
          purchase_date: device.purchase_date,
        }),
      })

      if (response.ok) {
        const predictionData = await response.json()
        setPrediction(predictionData)
      }
    } catch (error) {
      console.error('Prediction error:', error)
    }
  }

  function getDeviceIcon(type: string) {
    const icons: Record<string, string> = {
      'air_conditioning': '❄️',
      'refrigerator': '❄️',
      'washing_machine': '🔄',
      'water_heater': '🚿',
      'other': '🔧',
    }
    return icons[type] || '🔧'
  }

  function getDeviceLabel(type: string) {
    const labels: Record<string, string> = {
      'air_conditioning': 'Điều hòa',
      'refrigerator': 'Tủ lạnh',
      'washing_machine': 'Máy giặt',
      'water_heater': 'Máy nước nóng',
      'other': 'Thiết bị khác',
    }
    return labels[type] || type
  }

  function getUrgencyColor(urgency: string) {
    if (urgency === 'high') return 'bg-red-100 text-red-700 border-red-200'
    if (urgency === 'medium') return 'bg-yellow-100 text-yellow-700 border-yellow-200'
    return 'bg-green-100 text-green-700 border-green-200'
  }

  function formatPrice(price: number | undefined) {
    if (!price && price !== 0) return '0₫'
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error || !device) {
    return (
      <div className="text-center py-20">
        <div className="text-5xl mb-4">⚠️</div>
        <p className="text-red-600 mb-4">{error || 'Không tìm thấy thiết bị'}</p>
        <button
          onClick={() => router.push('/customer/devices')}
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700"
        >
          ← Quay lại danh sách
        </button>
      </div>
    )
  }

  const deviceAge = device.purchase_date
    ? Math.floor((Date.now() - new Date(device.purchase_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="text-5xl">{getDeviceIcon(device.device_type)}</div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {device.brand} {device.model}
            </h1>
            <p className="text-gray-600">{getDeviceLabel(device.device_type)}</p>
          </div>
        </div>
        <button
          onClick={() => router.push('/customer/devices')}
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          ← Quay lại
        </button>
      </div>

      {/* AI Prediction */}
      {prediction && (
        <div className={`rounded-xl border p-6 ${getUrgencyColor(prediction.urgency)}`}>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">🤖</span>
            <h2 className="text-lg font-bold">AI Dự đoán bảo trì</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-white bg-opacity-50 rounded-lg p-4">
              <p className="text-sm font-medium mb-1">Ngày bảo trì tiếp theo</p>
              <p className="text-lg font-bold">
                {new Date(prediction.next_maintenance_date).toLocaleDateString('vi-VN')}
              </p>
            </div>
            <div className="bg-white bg-opacity-50 rounded-lg p-4">
              <p className="text-sm font-medium mb-1">Loại bảo trì</p>
              <p className="text-lg font-bold">{prediction.maintenance_type}</p>
            </div>
            {prediction.estimated_cost && (
              <div className="bg-white bg-opacity-50 rounded-lg p-4">
                <p className="text-sm font-medium mb-1">Chi phí dự kiến</p>
                <p className="text-lg font-bold">
                  {formatPrice(prediction.estimated_cost)}
                </p>
              </div>
            )}
          </div>

          <div>
            <p className="text-sm font-medium mb-2">Khuyến nghị:</p>
            <ul className="list-disc list-inside space-y-1">
              {prediction.recommendations.map((rec, idx) => (
                <li key={idx} className="text-sm">{rec}</li>
              ))}
            </ul>
          </div>

          {prediction.device_lifespan_years && (
            <div className="mt-4 pt-4 border-t border-opacity-20">
              <p className="text-sm">
                Tuổi thọ thiết bị dự kiến: <strong>{prediction.device_lifespan_years} năm</strong>
                {deviceAge > 0 && (
                  <span> (đã dùng <strong>{deviceAge} năm</strong>)</span>
                )}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Device Information */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">📋 Thông tin thiết bị</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-gray-600 mb-1">Loại thiết bị</p>
            <p className="font-medium">{getDeviceLabel(device.device_type)}</p>
          </div>
          {device.brand && (
            <div>
              <p className="text-sm text-gray-600 mb-1">Hãng</p>
              <p className="font-medium">{device.brand}</p>
            </div>
          )}
          {device.model && (
            <div>
              <p className="text-sm text-gray-600 mb-1">Model</p>
              <p className="font-medium">{device.model}</p>
            </div>
          )}
          {device.serial_number && (
            <div>
              <p className="text-sm text-gray-600 mb-1">Số seri</p>
              <p className="font-medium">{device.serial_number}</p>
            </div>
          )}
          {device.purchase_date && (
            <div>
              <p className="text-sm text-gray-600 mb-1">Ngày mua</p>
              <p className="font-medium">
                {new Date(device.purchase_date).toLocaleDateString('vi-VN')}
                {deviceAge > 0 && <span className="text-gray-500 ml-2">({deviceAge} năm)</span>}
              </p>
            </div>
          )}
          {device.warranty_expiry && (
            <div>
              <p className="text-sm text-gray-600 mb-1">Bảo hành đến</p>
              <p className={`font-medium ${
                new Date(device.warranty_expiry) < new Date() 
                  ? 'text-red-600' 
                  : 'text-green-600'
              }`}>
                {new Date(device.warranty_expiry).toLocaleDateString('vi-VN')}
                {new Date(device.warranty_expiry) < new Date() ? ' (Đã hết)' : ' (Còn hiệu lực)'}
              </p>
            </div>
          )}
          {device.location_in_home && (
            <div>
              <p className="text-sm text-gray-600 mb-1">Vị trí trong nhà</p>
              <p className="font-medium">{device.location_in_home}</p>
            </div>
          )}
        </div>

        {device.specifications && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-600 mb-2">Thông số kỹ thuật</p>
            <pre className="bg-gray-50 p-4 rounded-lg text-sm overflow-x-auto">
              {JSON.stringify(device.specifications, null, 2)}
            </pre>
          </div>
        )}

        {device.notes && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-600 mb-2">Ghi chú</p>
            <p className="text-sm text-gray-900">{device.notes}</p>
          </div>
        )}
      </div>

      {/* Service History - Maintenance Memory */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">📜 Lịch sử bảo trì</h2>
          <button
            onClick={() => router.push('/customer/chat')}
            className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
          >
            + Đặt dịch vụ mới
          </button>
        </div>
        {serviceHistory.length === 0 ? (
          <div className="text-center py-6">
            <div className="text-4xl mb-3">📜</div>
            <p className="text-gray-600 mb-4">Chưa có lịch sử bảo trì</p>
            <button
              onClick={() => router.push('/customer/chat')}
              className="bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 font-medium"
            >
              💬 Đặt dịch vụ đầu tiên
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {serviceHistory.map((record) => (
              <div
                key={record.id}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-blue-50 transition-colors cursor-pointer"
                onClick={() => router.push(`/customer/orders/${record.id}`)}
              >
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-lg">
                  🔧
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{record.category}</p>
                  <p className="text-xs text-gray-500 line-clamp-1">{record.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-400">
                      {new Date(record.created_at).toLocaleDateString('vi-VN')}
                    </span>
                    {record.rating && (
                      <span className="text-xs text-yellow-500">{'⭐'.repeat(record.rating)}</span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">{formatPrice(record.final_price ?? record.estimated_price)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Maintenance Schedule */}
      {device.purchase_date && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">📅 Lịch bảo trì khuyến nghị</h2>
          <div className="space-y-3">
            {[
              { months: 6, label: 'Vệ sinh định kỳ', icon: '🧹' },
              { months: 12, label: 'Bảo trì tổng quát', icon: '🔧' },
              { months: 24, label: 'Kiểm tra & thay linh kiện', icon: '⚙️' },
            ].map((item) => {
              const dueDate = new Date(device.purchase_date!)
              dueDate.setMonth(dueDate.getMonth() + item.months)
              const isOverdue = dueDate < new Date()
              const isUpcoming = !isOverdue && dueDate < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
              return (
                <div key={item.months} className={`flex items-center gap-3 p-3 rounded-xl ${
                  isOverdue ? 'bg-red-50' : isUpcoming ? 'bg-yellow-50' : 'bg-gray-50'
                }`}>
                  <div className="text-2xl">{item.icon}</div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{item.label}</p>
                    <p className="text-xs text-gray-500">
                      {isOverdue ? `Quá hạn từ ${dueDate.toLocaleDateString('vi-VN')}` : `Đến hạn: ${dueDate.toLocaleDateString('vi-VN')}`}
                    </p>
                  </div>
                  {isOverdue && (
                    <button
                      onClick={() => router.push('/customer/chat')}
                      className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs hover:bg-red-700"
                    >
                      Đặt ngay
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">⚡ Hành động nhanh</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button
            onClick={() => router.push('/customer/chat')}
            className="p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors text-left"
          >
            <p className="text-2xl mb-2">💬</p>
            <p className="font-medium text-blue-900">Chat với AI</p>
            <p className="text-sm text-blue-700 mt-1">Tư vấn sửa chữa</p>
          </button>
          <button
            onClick={() => router.push(`/customer/service-request?device=${device.id}`)}
            className="p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors text-left"
          >
            <p className="text-2xl mb-2">🔧</p>
            <p className="font-medium text-green-900">Đặt dịch vụ</p>
            <p className="text-sm text-green-700 mt-1">Sửa chữa thiết bị này</p>
          </button>
          <button
            onClick={() => {
              if (confirm('Bạn có chắc muốn xóa thiết bị này?')) {
                deleteDevice()
              }
            }}
            className="p-4 bg-red-50 rounded-lg hover:bg-red-100 transition-colors text-left"
          >
            <p className="text-2xl mb-2">🗑️</p>
            <p className="font-medium text-red-900">Xóa thiết bị</p>
            <p className="text-sm text-red-700 mt-1">Xóa vĩnh viễn</p>
          </button>
        </div>
      </div>
    </div>
  )

  async function deleteDevice() {
    try {
      const { error } = await supabase
        .from('device_profiles' as any)
        .delete()
        .eq('id', id as string)

      if (error) throw error

      toast('Đã xóa thiết bị', 'success')
      router.push('/customer/devices')
    } catch (error: any) {
      toast(error.message || 'Lỗi khi xóa', 'error')
    }
  }
}
