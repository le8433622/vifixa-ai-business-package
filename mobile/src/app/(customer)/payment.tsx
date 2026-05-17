import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Linking } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { supabase } from '@/lib/supabase'
import * as WebBrowser from 'expo-web-browser'

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL
const GATEWAYS = [
  { key: 'vnpay', name: 'VNPay', icon: '💳', desc: 'Thanh toán qua VNPay' },
  { key: 'stripe', name: 'Stripe', icon: '🌐', desc: 'Thanh toán quốc tế' },
  { key: 'wallet', name: 'Vifixa Wallet', icon: '🏦', desc: 'Sử dụng số dư ví' },
]

export default function PaymentScreen() {
  const router = useRouter()
  const { order_id, amount } = useLocalSearchParams<{ order_id: string; amount: string }>()
  const [selectedGateway, setSelectedGateway] = useState('vnpay')
  const [processing, setProcessing] = useState(false)

  async function handlePay() {
    if (!order_id || !amount) {
      Alert.alert('Lỗi', 'Thiếu thông tin đơn hàng')
      return
    }
    setProcessing(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const res = await fetch(`${SUPABASE_URL}/functions/v1/payment-process/create`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          order_id,
          amount: Number(amount),
          gateway: selectedGateway,
          return_url: `${SUPABASE_URL}/functions/v1/vnpay-ipn`,
          description: `Thanh toán đơn hàng ${order_id.slice(0, 8)}`,
        }),
      })

      const data = await res.json()
      if (data.redirect_url) {
        await WebBrowser.openBrowserAsync(data.redirect_url)
        router.back()
      } else if (data.qr_code) {
        Alert.alert('Quét QR', 'Quét mã QR để thanh toán')
      } else {
        Alert.alert('Lỗi', data.error || 'Không thể tạo thanh toán')
      }
    } catch (e: any) {
      Alert.alert('Lỗi', e.message || 'Lỗi kết nối')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>💳 Thanh toán</Text>
        <Text style={styles.amount}>{Number(amount || 0).toLocaleString('vi-VN')}₫</Text>
      </View>

      <Text style={styles.sectionTitle}>Chọn phương thức</Text>
      {GATEWAYS.map(g => (
        <TouchableOpacity key={g.key} onPress={() => setSelectedGateway(g.key)}
          style={[styles.gatewayCard, selectedGateway === g.key && styles.gatewayActive]}>
          <Text style={styles.gatewayIcon}>{g.icon}</Text>
          <View style={styles.gatewayInfo}>
            <Text style={styles.gatewayName}>{g.name}</Text>
            <Text style={styles.gatewayDesc}>{g.desc}</Text>
          </View>
          {selectedGateway === g.key && <Text style={styles.checkmark}>✓</Text>}
        </TouchableOpacity>
      ))}

      <TouchableOpacity onPress={handlePay} disabled={processing}
        style={[styles.payBtn, processing && styles.payBtnDisabled]}>
        <Text style={styles.payBtnText}>
          {processing ? 'Đang xử lý...' : `Thanh toán ${Number(amount || 0).toLocaleString('vi-VN')}₫`}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Text style={styles.backBtnText}>← Quay lại</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 20 },
  header: { alignItems: 'center', paddingVertical: 24 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1f2937', marginBottom: 8 },
  amount: { fontSize: 36, fontWeight: 'bold', color: '#3b82f6' },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 12, marginTop: 12 },
  gatewayCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 16, borderRadius: 16, marginBottom: 10, borderWidth: 2, borderColor: 'transparent', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  gatewayActive: { borderColor: '#3b82f6', backgroundColor: '#f0f7ff' },
  gatewayIcon: { fontSize: 28, marginRight: 12 },
  gatewayInfo: { flex: 1 },
  gatewayName: { fontSize: 16, fontWeight: '600', color: '#1f2937' },
  gatewayDesc: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  checkmark: { fontSize: 20, color: '#3b82f6', fontWeight: 'bold' },
  payBtn: { backgroundColor: '#3b82f6', paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginTop: 20 },
  payBtnDisabled: { opacity: 0.5 },
  payBtnText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  backBtn: { alignItems: 'center', paddingVertical: 16, marginTop: 8 },
  backBtnText: { fontSize: 14, color: '#6b7280' },
})