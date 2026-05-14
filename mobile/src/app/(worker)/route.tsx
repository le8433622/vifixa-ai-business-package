// 🗺️ Tối ưu tuyến đường — Mobile Worker Route Optimization

import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { useState, useEffect } from 'react'
import BanDoMobile from '@/components/BanDo'

export default function ToiUuTuyen() {
  const router = useRouter()
  const [diem, setDiem] = useState<any[]>([])
  const [tuyen, setTuyen] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [optimizing, setOptimizing] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      taiDonHang(session.access_token)
    })
  }, [])

  async function taiDonHang(token: string) {
    try {
      const { data: orders } = await supabase.from('orders').select('id, category, description, estimated_price').in('status', ['pending', 'matched']).limit(20)
      const dsDiem = [
        { id: 'me', lat: 10.78, lng: 106.68, loai: 'nha' as const, nhan: 'Vị trí của tôi' },
        ...(orders || []).map((o, i) => ({
          id: o.id, lat: 10.77 + (Math.random() - 0.5) * 0.06, lng: 106.69 + (Math.random() - 0.5) * 0.06,
          loai: 'don' as const, nhan: o.category, moTa: `${o.estimated_price?.toLocaleString() || 0}₫`,
        })),
      ]
      setDiem(dsDiem)
    } catch { /* ignore */ }
    setLoading(false)
  }

  async function handleOptimize() {
    setOptimizing(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const diemDen = diem.filter(d => d.loai === 'don').map(d => ({ viDo: d.lat, kinhDo: d.lng }))
      const res = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/osm-route`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ diemDi: { viDo: 10.78, kinhDo: 106.68 }, diemDen, phuongTien: 'driving', toiUu: true }),
      })
      const data = await res.json()
      if (data.thanhCong) {
        setTuyen(data.tuyenDuong || [])
        Alert.alert('✅ Tối ưu thành công', `Tổng: ${data.tongKhoangCach}km · ${data.tongThoiGian} phút`)
      }
    } catch { Alert.alert('Lỗi', 'Không thể tối ưu') }
    setOptimizing(false)
  }

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🗺️ Tối ưu tuyến đường</Text>
        <Text style={styles.headerSub}>{diem.filter(d => d.loai === 'don').length} đơn đang chờ</Text>
      </View>

      <BanDoMobile diem={diem} chieuCao={300} />

      <View style={{ padding: 16 }}>
        <TouchableOpacity style={styles.optimizeBtn} onPress={handleOptimize} disabled={optimizing}>
          <Text style={styles.optimizeBtnText}>{optimizing ? '⏳ Đang tối ưu...' : '🚀 Tối ưu tuyến đường'}</Text>
        </TouchableOpacity>

        {tuyen.length > 0 && (
          <View style={styles.summary}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryVal}>{tuyen.reduce((s, t) => s + t.khoangCachKm, 0).toFixed(1)}km</Text>
              <Text style={styles.summaryLabel}>Tổng KM</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryVal}>{tuyen.reduce((s, t) => s + t.thoiGianPhut, 0)}ph</Text>
              <Text style={styles.summaryLabel}>Tổng thời gian</Text>
            </View>
          </View>
        )}

        {tuyen.map((t, i) => (
          <View key={i} style={styles.step}>
            <View style={styles.stepNum}><Text style={styles.stepNumText}>{i + 1}</Text></View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Đơn #{i + 1}</Text>
              <Text style={styles.stepSub}>{t.khoangCachKm}km · {t.thoiGianPhut} phút</Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: '#2563eb', padding: 24, paddingTop: 60 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: 'white' },
  headerSub: { fontSize: 13, color: '#bfdbfe', marginTop: 4 },
  optimizeBtn: { backgroundColor: '#2563eb', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 16 },
  optimizeBtnText: { color: 'white', fontSize: 15, fontWeight: '600' },
  summary: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  summaryCard: { flex: 1, backgroundColor: 'white', borderRadius: 12, padding: 14, alignItems: 'center' },
  summaryVal: { fontSize: 22, fontWeight: 'bold', color: '#2563eb' },
  summaryLabel: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  stepNum: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center' },
  stepNumText: { color: '#2563eb', fontWeight: 'bold', fontSize: 14 },
  stepContent: { flex: 1, backgroundColor: 'white', borderRadius: 8, padding: 12 },
  stepTitle: { fontSize: 14, fontWeight: '500' },
  stepSub: { fontSize: 12, color: '#6b7280', marginTop: 2 },
})