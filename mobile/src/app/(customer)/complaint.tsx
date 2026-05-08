// Complaint Screen for Mobile
// Per 12_OPERATIONS_AND_TRUST.md - Complaint handling

import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!

const COMPLAINT_TYPES = [
  { value: 'poor_quality', label: 'Chất lượng dịch vụ kém' },
  { value: 'late_arrival', label: 'Thợ không đến đúng giờ' },
  { value: 'wrong_price', label: 'Báo giá sai lệch' },
  { value: 'damaged_property', label: 'Gây hư hỏng tài sản' },
  { value: 'rude_behavior', label: 'Thái độ không tốt' },
  { value: 'wrong_parts', label: 'Sai linh kiện/vật tư' },
  { value: 'incomplete_work', label: 'Công việc chưa hoàn thành' },
  { value: 'other', label: 'Khác' },
]

export default function ComplaintScreen() {
  const router = useRouter()
  const [orders, setOrders] = useState<any[]>([])
  const [selectedOrder, setSelectedOrder] = useState('')
  const [complaintType, setComplaintType] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchOrders()
  }, [])

  async function fetchOrders() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.replace('/login')
        return
      }

      const { data, error } = await supabase
        .from('orders')
        .select('id, category, description, status, created_at')
        .eq('customer_id', session.user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setOrders(data || [])
    } catch (err) {
      Alert.alert('Lỗi', 'Không thể tải danh sách đơn hàng')
    }
  }

  async function handleSubmit() {
    if (!selectedOrder) {
      Alert.alert('Lỗi', 'Vui lòng chọn đơn hàng')
      return
    }
    if (!complaintType) {
      Alert.alert('Lỗi', 'Vui lòng chọn loại khiếu nại')
      return
    }
    if (!description.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập mô tả chi tiết')
      return
    }
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.replace('/login')
        return
      }

      const { error } = await supabase.from('complaints').insert({
        order_id: selectedOrder,
        customer_id: session.user.id,
        complaint_type: complaintType,
        description,
        status: 'pending',
      })

      if (error) throw error

      // Call AI dispute function
      try {
        const aiRes = await fetch(`${SUPABASE_URL}/functions/v1/ai-dispute`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            order_id: selectedOrder,
            complainant_id: session.user.id,
            complaint_type: complaintType,
            description,
            evidence_urls: [],
          }),
        })
        if (aiRes.ok) {
          const aiData = await aiRes.json()
          if (aiData.needs_human_review) {
            Alert.alert('Khiếu nại đã gửi', 'AI đã xem xét và chuyển cho admin xử lý. Chúng tôi sẽ phản hồi sớm nhất.', [
              { text: 'OK', onPress: () => router.back() },
            ])
            return
          }
        }
      } catch (aiError) {
        console.warn('AI dispute call failed:', aiError)
      }

      Alert.alert('Thành công', 'Khiếu nại của bạn đã được gửi. Chúng tôi sẽ xem xét và phản hồi.', [
        { text: 'OK', onPress: () => router.back() },
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
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>← Quay lại</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Gửi khiếu nại</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.processBox}>
          <Text style={styles.processIcon}>📋</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.processTitle}>Quy trình xử lý</Text>
            <Text style={styles.processText}>
              Nhận khiếu nại → AI tổng hợp → Admin xem xét → Phản hồi qua email
            </Text>
          </View>
        </View>

        <Text style={[styles.label, { marginTop: 20 }]}>Chọn đơn hàng</Text>
        <View style={styles.pickerWrapper}>
          {orders.length === 0 ? (
            <Text style={styles.emptyText}>Không có đơn hàng hoàn thành</Text>
          ) : (
            orders.map((order) => (
              <TouchableOpacity
                key={order.id}
                style={[styles.pickerItem, selectedOrder === order.id && styles.pickerItemActive]}
                onPress={() => setSelectedOrder(order.id)}
              >
                <Text style={[styles.pickerItemText, selectedOrder === order.id && styles.pickerItemTextActive]}>
                  {order.category} - {order.description?.slice(0, 40)}...
                </Text>
                <Text style={styles.pickerItemDate}>
                  {new Date(order.created_at).toLocaleDateString('vi-VN')}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </View>

        <Text style={[styles.label, { marginTop: 20 }]}>Loại khiếu nại</Text>
        <View style={styles.typeGrid}>
          {COMPLAINT_TYPES.map((type) => (
            <TouchableOpacity
              key={type.value}
              style={[styles.typeButton, complaintType === type.value && styles.typeButtonActive]}
              onPress={() => setComplaintType(type.value)}
            >
              <Text style={[styles.typeButtonText, complaintType === type.value && styles.typeButtonTextActive]}>
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.label, { marginTop: 20 }]}>Mô tả chi tiết</Text>
        <TextInput
          style={styles.textArea}
          placeholder="Mô tả chi tiết vấn đề bạn gặp phải..."
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Gửi khiếu nại</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: { fontSize: 16, color: '#3b82f6', marginBottom: 8 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1f2937' },
  card: {
    margin: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  processBox: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  processIcon: { fontSize: 28 },
  processTitle: { fontSize: 14, fontWeight: '600', color: '#1e40af' },
  processText: { fontSize: 13, color: '#1e40af', marginTop: 2 },
  label: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 10 },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    overflow: 'hidden',
  },
  pickerItem: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  pickerItemActive: {
    backgroundColor: '#eff6ff',
  },
  pickerItemText: { fontSize: 14, color: '#374151' },
  pickerItemTextActive: { color: '#3b82f6', fontWeight: '600' },
  pickerItemDate: { fontSize: 12, color: '#9ca3af', marginTop: 4 },
  emptyText: { padding: 14, fontSize: 14, color: '#9ca3af', textAlign: 'center' },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeButton: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  typeButtonActive: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  typeButtonText: { fontSize: 14, color: '#374151' },
  typeButtonTextActive: { color: '#3b82f6', fontWeight: '600' },
  textArea: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: '#1f2937',
    minHeight: 140,
  },
  button: {
    backgroundColor: '#3b82f6',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
})