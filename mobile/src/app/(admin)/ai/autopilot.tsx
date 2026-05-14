import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native'
import { supabase } from '@/lib/supabase'
import { useState, useEffect } from 'react'
import { useRouter } from 'expo-router'

export default function TuDongHoa() {
  const router = useRouter()
  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      supabase.from('app_settings').select('value').eq('key', 'ai_autopilot_enabled').maybeSingle().then(({ data }) => {
        setEnabled(data?.value === 'true'); setLoading(false)
      })
    })
  }, [])

  const buoc = ['Chẩn đoán', 'Định giá', 'Ghép thợ', 'Tạo đơn', 'Thông báo', 'Upsell', 'Kiểm tra', 'Giữ chân']

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>
  return (
    <ScrollView style={styles.container}>
      <View style={[styles.header, enabled ? styles.headerOn : styles.headerOff]}>
        <Text style={styles.headerTitle}>🚀 Tự động hóa AI</Text>
        <Text style={styles.status}>{enabled ? '🟢 Auto-Pilot ĐANG BẬT' : '🔴 Auto-Pilot ĐANG TẮT'}</Text>
      </View>
      <View style={{ padding: 16 }}>
        <Text style={styles.sectionTitle}>Luồng tự động (8 bước)</Text>
        <View style={styles.flowRow}>
          {buoc.map((b, i) => (
            <View key={b}>
              <View style={[styles.step, enabled ? styles.stepOn : styles.stepOff]}>
                <Text style={styles.stepNum}>{i + 1}</Text>
              </View>
              <Text style={styles.stepLabel}>{b}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.desc}>
          {enabled
            ? 'AI tự động xử lý đơn hàng từ đầu đến cuối. Admin chỉ cần giám sát qua dashboard.'
            : 'Bật Auto-Pilot trong web admin để AI tự động vận hành toàn bộ hệ thống.'}
        </Text>
      </View>
    </ScrollView>
  )
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' }, center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 24, paddingTop: 60 }, headerOn: { backgroundColor: '#16a34a' }, headerOff: { backgroundColor: '#6b7280' },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: 'white' }, status: { fontSize: 14, color: 'white', marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#374151', marginBottom: 12 },
  flowRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  step: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  stepOn: { backgroundColor: '#16a34a' }, stepOff: { backgroundColor: '#d1d5db' },
  stepNum: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  stepLabel: { fontSize: 10, color: '#6b7280', textAlign: 'center', marginTop: 4, width: 40 },
  desc: { fontSize: 13, color: '#6b7280', lineHeight: 20 },
})