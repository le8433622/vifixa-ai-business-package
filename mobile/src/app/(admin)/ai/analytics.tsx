import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native'
import { supabase } from '@/lib/supabase'
import { useState, useEffect } from 'react'
import { useRouter } from 'expo-router'

export default function PhanTichAI() {
  const router = useRouter()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      try {
        const res = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/ai-analytics?action=overview`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        setData(await res.json())
      } catch { /* ignore */ }
      setLoading(false)
    })
  }, [])

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📊 Phân tích AI</Text>
      </View>

      {!data ? (
        <View style={styles.empty}><Text style={styles.emptyText}>Không có dữ liệu</Text></View>
      ) : (
        <>
          <View style={styles.grid}>
            {[
              { label: 'Chi phí hôm nay', value: `$${data.today_ai_cost_usd?.toFixed(4) || '0'}` },
              { label: 'Doanh thu', value: `${((data.total_revenue_vnd || 0) / 1000).toFixed(0)}K₫` },
              { label: 'Độ chính xác', value: `${data.avg_accuracy_pct || 0}%` },
              { label: 'AI ROI', value: data.ai_roi || 'N/A' },
            ].map(s => (
              <View key={s.label} style={styles.card}>
                <Text style={styles.value}>{s.value}</Text>
                <Text style={styles.label}>{s.label}</Text>
              </View>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Chi tiết</Text>
            {[
              { label: 'Tổng đơn', value: data.total_orders },
              { label: 'Khách hàng', value: data.total_customers },
              { label: 'Thợ', value: data.total_workers },
            ].map(r => (
              <View key={r.label} style={styles.detailRow}>
                <Text style={styles.detailLabel}>{r.label}</Text>
                <Text style={styles.detailValue}>{r.value}</Text>
              </View>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: '#2563eb', padding: 24, paddingTop: 60 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: 'white' },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#6b7280', fontSize: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: 16, gap: 12 },
  card: { width: '46%', backgroundColor: 'white', borderRadius: 12, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  value: { fontSize: 20, fontWeight: 'bold', color: '#2563eb' },
  label: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  section: { paddingHorizontal: 16 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#374151', marginBottom: 12 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: 'white', padding: 14, borderRadius: 8, marginBottom: 6 },
  detailLabel: { fontSize: 14, color: '#374151' },
  detailValue: { fontSize: 14, fontWeight: '600', color: '#111827' },
})