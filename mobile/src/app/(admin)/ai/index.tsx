import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { useState, useEffect } from 'react'

const DANH_MUC_AI = [
  { nhom: 'Vận hành', muc: [
    { href: '/(admin)/ai/autopilot', label: '🚀 Tự động hóa', desc: 'Auto-Pilot' },
    { href: '/(admin)/ai/monitor', label: '📡 Giám sát', desc: 'AI calls real-time' },
    { href: '/(admin)/ai/cost', label: '💰 Chi phí', desc: 'Cost theo ngày' },
  ]},
  { nhom: 'Chất lượng', muc: [
    { href: '/(admin)/ai/accuracy', label: '🎯 Độ chính xác', desc: 'Accuracy agents' },
    { href: '/(admin)/ai/feedback', label: '💬 Phản hồi', desc: 'Feedback người dùng' },
    { href: '/(admin)/ai/abtests', label: '🧪 A/B Tests', desc: 'Thử nghiệm prompt' },
    { href: '/(admin)/ai-logs', label: '🤖 Nhật ký AI', desc: 'Raw AI logs' },
  ]},
  { nhom: 'Kinh doanh', muc: [
    { href: '/(admin)/ai/upsell', label: '🛒 Bán hàng', desc: 'Upsell campaigns' },
    { href: '/(admin)/ai/retention', label: '🎯 Giữ chân', desc: 'Retention' },
    { href: '/(admin)/ai/revenue', label: '📈 Doanh thu', desc: 'Tối ưu pricing' },
  ]},
  { nhom: 'Phân tích', muc: [
    { href: '/(admin)/ai/analytics', label: '📊 Phân tích', desc: 'Churn + revenue' },
    { href: '/(admin)/ai/search', label: '🔍 Tìm kiếm', desc: 'Vector search' },
  ]},
]

export default function TrungTamAI() {
  const router = useRouter()
  const [chiPhi, setChiPhi] = useState(0)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      const homNay = new Date().toISOString().split('T')[0]
      supabase.from('ai_cost_log').select('cost').gte('created_at', `${homNay}T00:00:00Z`).then(({ data }) => {
        setChiPhi((data || []).reduce((s: number, r: any) => s + Number(r.cost || 0), 0))
      })
    })
  }, [])

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🧠 Trung tâm AI</Text>
        <Text style={styles.headerSubtitle}>Chi phí hôm nay: ${chiPhi.toFixed(4)}</Text>
      </View>

      {DANH_MUC_AI.map(nhom => (
        <View key={nhom.nhom} style={styles.section}>
          <Text style={styles.sectionTitle}>{nhom.nhom}</Text>
          {nhom.muc.map(muc => (
            <TouchableOpacity key={muc.href} style={styles.card} onPress={() => router.push(muc.href as any)}>
              <Text style={styles.cardIcon}>{muc.label.split(' ')[0]}</Text>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{muc.label}</Text>
                <Text style={styles.cardDesc}>{muc.desc}</Text>
              </View>
              <Text style={styles.arrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { backgroundColor: '#2563eb', padding: 24, paddingTop: 60 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: 'white' },
  headerSubtitle: { fontSize: 13, color: '#bfdbfe', marginTop: 4 },
  section: { padding: 16, paddingBottom: 0 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#374151', marginBottom: 8 },
  card: { backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 8, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  cardIcon: { fontSize: 24, marginRight: 12 },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#111827' },
  cardDesc: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  arrow: { fontSize: 20, color: '#9ca3af' },
})