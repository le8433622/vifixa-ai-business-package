// Warranty Screen for Mobile
// Per 12_OPERATIONS_AND_TRUST.md - Warranty claim flow

import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function WarrantyScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ orderId?: string; id?: string }>()
  const orderId = params.orderId || params.id || ''
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)

  function isWithin30Days(createdAt: string) {
    const created = new Date(createdAt)
    const now = new Date()
    const diffDays = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
    return diffDays <= 30
  }

  const [eligible, setEligible] = useState(true)
  const [orderInfo, setOrderInfo] = useState<any>(null)

  async function checkEligibility() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.replace('/login')
        return
      }

      const { data: order, error } = await supabase
        .from('orders')
        .select('id, category, description, status, created_at')
        .eq('id', orderId)
        .single()

      if (error) throw error
      setOrderInfo(order)
      setEligible(order.status === 'completed' && isWithin30Days(order.created_at))
    } catch (err) {
      // Continue - still allow claim attempt
    }
  }

  useState(() => { checkEligibility() })

  async function handleSubmit() {
    if (!reason.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập lý do bảo hành')
      return
    }
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.replace('/login')
        return
      }

      const { error } = await supabase.from('warranty_claims').insert({
        order_id: orderId,
        customer_id: session.user.id,
        claim_reason: reason,
        status: 'pending',
      })

      if (error) throw error

      await supabase
        .from('orders')
        .update({ status: 'disputed' })
        .eq('id', orderId)

      Alert.alert('Thành công', 'Yêu cầu bảo hành đã được gửi. Chúng tôi sẽ phản hồi trong 48 giờ.', [
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
        <Text style={styles.title}>Yêu cầu bảo hành</Text>
      </View>

      <View style={styles.card}>
        {!eligible && (
          <View style={styles.warningBox}>
            <Text style={styles.warningIcon}>⏰</Text>
            <Text style={styles.warningTitle}>Hết hạn bảo hành</Text>
            <Text style={styles.warningText}>
              Đơn hàng này đã vượt quá thời hạn bảo hành 30 ngày.
            </Text>
          </View>
        )}

        {eligible && orderInfo && (
          <View style={styles.infoBox}>
            <Text style={styles.infoIcon}>ℹ️</Text>
            <Text style={styles.infoTitle}>Thông tin đơn hàng</Text>
            <Text style={styles.infoText}>Danh mục: {orderInfo.category}</Text>
            <Text style={styles.infoText}>Mô tả: {orderInfo.description}</Text>
            <Text style={styles.infoText}>
              Ngày hoàn thành: {new Date(orderInfo.created_at).toLocaleDateString('vi-VN')}
            </Text>
          </View>
        )}

        {eligible && (
          <>
            <View style={styles.slaBox}>
              <Text style={styles.slaIcon}>⏱️</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.slaTitle}>Thời gian xử lý</Text>
                <Text style={styles.slaText}>Chúng tôi sẽ phản hồi trong vòng 48 giờ</Text>
              </View>
            </View>

            <Text style={[styles.label, { marginTop: 20 }]}>Lý do bảo hành</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Mô tả vấn đề bạn gặp phải sau khi sửa chữa..."
              value={reason}
              onChangeText={setReason}
              multiline
              numberOfLines={4}
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
                <Text style={styles.buttonText}>Gửi yêu cầu bảo hành</Text>
              )}
            </TouchableOpacity>
          </>
        )}
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
  warningBox: {
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  warningIcon: { fontSize: 48, marginBottom: 8 },
  warningTitle: { fontSize: 18, fontWeight: 'bold', color: '#92400e', marginBottom: 4 },
  warningText: { fontSize: 14, color: '#92400e', textAlign: 'center' },
  infoBox: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  infoIcon: { fontSize: 24, marginBottom: 8 },
  infoTitle: { fontSize: 16, fontWeight: 'bold', color: '#1e40af' },
  infoText: { fontSize: 14, color: '#1e40af', marginTop: 4 },
  slaBox: {
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  slaIcon: { fontSize: 28 },
  slaTitle: { fontSize: 14, fontWeight: '600', color: '#166534' },
  slaText: { fontSize: 13, color: '#166534' },
  label: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 10 },
  textArea: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: '#1f2937',
    minHeight: 120,
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