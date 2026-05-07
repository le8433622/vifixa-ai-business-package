// Device Profiles Screen - Mobile
// Per user request: AI personalization with device profiles

import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'

type Device = {
  id: string;
  device_type: string;
  brand?: string;
  model?: string;
  purchase_date?: string;
  warranty_expiry?: string;
  location_in_home?: string;
}

const DEVICE_TYPES = [
  { id: 'air_conditioning', label: 'Điều hòa', icon: '❄️' },
  { id: 'refrigerator', label: 'Tủ lạnh', icon: '❄️' },
  { id: 'washing_machine', label: 'Máy giặt', icon: '🔄' },
  { id: 'water_heater', label: 'Máy nước nóng', icon: '🚿' },
  { id: 'other', label: 'Thiết bị khác', icon: '🔧' },
]

export default function DevicesScreen() {
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetchDevices()
  }, [])

  async function fetchDevices() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      const { data, error } = await supabase
        .from('device_profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setDevices(data || [])
    } catch (error: any) {
      console.error('fetchDevices error:', error)
      Alert.alert('Lỗi', error.message)
    } finally {
      setLoading(false)
    }
  }

  function getDeviceLabel(type: string) {
    const device = DEVICE_TYPES.find(d => d.id === type)
    return device?.label || type
  }

  function getDeviceIcon(type: string) {
    const device = DEVICE_TYPES.find(d => d.id === type)
    return device?.icon || '🔧'
  }

  function formatDate(dateString?: string) {
    if (!dateString) return ''
    return new Date(dateString).toLocaleDateString('vi-VN')
  }

  function isWarrantyExpired(warrantyDate?: string) {
    if (!warrantyDate) return false
    return new Date(warrantyDate) < new Date()
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🔧 Thiết bị của tôi</Text>
        <TouchableOpacity
          onPress={() => router.push('/(customer)/add-device' as any)}
          style={styles.addButton}
        >
          <Text style={styles.addButtonText}>+ Thêm</Text>
        </TouchableOpacity>
      </View>

      {devices.length === 0 ? (
        /* Empty State */
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🔧</Text>
          <Text style={styles.emptyTitle}>Chưa có thiết bị nào</Text>
          <Text style={styles.emptyDesc}>
            Thêm thiết bị để AI cá nhân hóa trải nghiệm và nhắc lịch bảo trì
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/(customer)/add-device' as any)}
            style={styles.emptyButton}
          >
            <Text style={styles.emptyButtonText}>+ Thêm thiết bị đầu tiên</Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* Devices List */
        <FlatList
          data={devices}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.deviceCard}
              onPress={() => router.push(`/(customer)/devices/${item.id}` as any)}
            >
              <View style={styles.deviceHeader}>
                <Text style={styles.deviceIcon}>{getDeviceIcon(item.device_type)}</Text>
                <View style={styles.deviceInfo}>
                  <Text style={styles.deviceName}>
                    {item.brand} {item.model}
                  </Text>
                  <Text style={styles.deviceType}>{getDeviceLabel(item.device_type)}</Text>
                </View>
                {item.warranty_expiry && isWarrantyExpired(item.warranty_expiry) && (
                  <View style={styles.expiredBadge}>
                    <Text style={styles.expiredText}>Hết BH</Text>
                  </View>
                )}
              </View>

              <View style={styles.deviceDetails}>
                {item.purchase_date && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Mua:</Text>
                    <Text style={styles.detailValue}>{formatDate(item.purchase_date)}</Text>
                  </View>
                )}
                {item.location_in_home && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Vị trí:</Text>
                    <Text style={styles.detailValue}>{item.location_in_home}</Text>
                  </View>
                )}
              </View>

              <View style={styles.cardFooter}>
                <Text style={styles.viewDetail}>Xem chi tiết →</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  addButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 32,
  },
  emptyButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  deviceCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  deviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  deviceIcon: {
    fontSize: 32,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  deviceType: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  expiredBadge: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  expiredText: {
    fontSize: 10,
    color: '#dc2626',
    fontWeight: '600',
  },
  deviceDetails: {
    gap: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  detailValue: {
    fontSize: 12,
    color: '#111827',
    fontWeight: '500',
  },
  cardFooter: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    marginTop: 4,
  },
  viewDetail: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '500',
  },
})
