// Add Device Screen - Mobile
// Per user request: Device profiles for AI personalization

import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'

const DEVICE_TYPES = [
  { id: 'air_conditioning', label: 'Điều hòa', icon: '❄️' },
  { id: 'refrigerator', label: 'Tủ lạnh', icon: '🧊' },
  { id: 'washing_machine', label: 'Máy giặt', icon: '🧺' },
  { id: 'water_heater', label: 'Máy nước nóng', icon: '🚿' },
  { id: 'other', label: 'Thiết bị khác', icon: '🔧' },
]

export default function AddDeviceScreen() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
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

  async function handleSubmit() {
    if (!formData.device_type) {
      Alert.alert('Lỗi', 'Vui lòng chọn loại thiết bị')
      return
    }

    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      const { error } = await supabase
        .from('device_profiles')
        .insert({
          user_id: session.user.id,
          device_type: formData.device_type,
          brand: formData.brand || null,
          model: formData.model || null,
          serial_number: formData.serial_number || null,
          purchase_date: formData.purchase_date || null,
          warranty_expiry: formData.warranty_expiry || null,
          location_in_home: formData.location_in_home || null,
          notes: formData.notes || null,
        })

      if (error) throw error

      Alert.alert('Thành công', 'Đã thêm thiết bị!', [
        { text: 'OK', onPress: () => router.back() }
      ])
    } catch (error: any) {
      Alert.alert('Lỗi', error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>+ Thêm thiết bị mới</Text>
        <Text style={styles.headerSubtitle}>AI sẽ cá nhân hóa trải nghiệm của bạn</Text>
      </View>

      <View style={styles.form}>
        {/* Device Type */}
        <View style={styles.field}>
          <Text style={styles.label}>Loại thiết bị *</Text>
          <View style={styles.deviceTypeGrid}>
            {DEVICE_TYPES.map((type) => (
              <TouchableOpacity
                key={type.id}
                style={[
                  styles.deviceTypeButton,
                  formData.device_type === type.id && styles.deviceTypeButtonActive
                ]}
                onPress={() => setFormData({ ...formData, device_type: type.id })}
              >
                <Text style={styles.deviceTypeIcon}>{type.icon}</Text>
                <Text style={[
                  styles.deviceTypeLabel,
                  formData.device_type === type.id && styles.deviceTypeLabelActive
                ]}>
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Brand */}
        <View style={styles.field}>
          <Text style={styles.label}>Hãng sản xuất</Text>
          <TextInput
            style={styles.input}
            value={formData.brand}
            onChangeText={(value) => setFormData({ ...formData, brand: value })}
            placeholder="VD: Daikin, LG, Samsung..."
          />
        </View>

        {/* Model */}
        <View style={styles.field}>
          <Text style={styles.label}>Model</Text>
          <TextInput
            style={styles.input}
            value={formData.model}
            onChangeText={(value) => setFormData({ ...formData, model: value })}
            placeholder="VD: FT25HV..."
          />
        </View>

        {/* Serial Number */}
        <View style={styles.field}>
          <Text style={styles.label}>Số seri</Text>
          <TextInput
            style={styles.input}
            value={formData.serial_number}
            onChangeText={(value) => setFormData({ ...formData, serial_number: value })}
            placeholder="Không bắt buộc..."
          />
        </View>

        {/* Purchase Date */}
        <View style={styles.field}>
          <Text style={styles.label}>Ngày mua</Text>
          <TextInput
            style={styles.input}
            value={formData.purchase_date}
            onChangeText={(value) => setFormData({ ...formData, purchase_date: value })}
            placeholder="YYYY-MM-DD (VD: 2024-01-15)"
          />
        </View>

        {/* Warranty Expiry */}
        <View style={styles.field}>
          <Text style={styles.label}>Bảo hành đến</Text>
          <TextInput
            style={styles.input}
            value={formData.warranty_expiry}
            onChangeText={(value) => setFormData({ ...formData, warranty_expiry: value })}
            placeholder="YYYY-MM-DD (VD: 2026-01-15)"
          />
        </View>

        {/* Location in Home */}
        <View style={styles.field}>
          <Text style={styles.label}>Vị trí trong nhà</Text>
          <TextInput
            style={styles.input}
            value={formData.location_in_home}
            onChangeText={(value) => setFormData({ ...formData, location_in_home: value })}
            placeholder="VD: Phòng khách, Phòng ngủ 1..."
          />
        </View>

        {/* Notes */}
        <View style={styles.field}>
          <Text style={styles.label}>Ghi chú</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.notes}
            onChangeText={(value) => setFormData({ ...formData, notes: value })}
            placeholder="Ghi chú thêm về thiết bị..."
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Buttons */}
        <View style={styles.buttons}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={() => router.back()}
          >
            <Text style={styles.cancelButtonText}>Hủy</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.saveButton, loading && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.saveButtonText}>
              {loading ? 'Đang lưu...' : 'Lưu thiết bị'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: 'white',
    padding: 24,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6b7280',
  },
  form: {
    padding: 16,
    gap: 16,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#111827',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  deviceTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  deviceTypeButton: {
    width: '48%',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  deviceTypeButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  deviceTypeIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  deviceTypeLabel: {
    fontSize: 12,
    color: '#374151',
  },
  deviceTypeLabelActive: {
    color: 'white',
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    paddingBottom: 32,
  },
  button: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  cancelButtonText: {
    color: '#374151',
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: '#3b82f6',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  disabledButton: {
    opacity: 0.5,
  },
})
