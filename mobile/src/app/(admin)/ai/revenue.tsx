import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native'
import { supabase } from '@/lib/supabase'
import { useState, useEffect } from 'react'
import { useRouter } from 'expo-router'

export default function ToiUuDoanhThu() {
  const router = useRouter()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      try {
        const res = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/ai-pricing-optimizer?action=analyze`, {
          method: 'POST', headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }, body: '{}',
        })
        setData(await res.json())
      } catch { /* ignore */ }
      setLoading(false)
    })
  }, [])

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>
  return (
    <View style={styles.container}>
      <View style={styles.header}><Text style={styles.headerTitle}>📈 Tối ưu doanh thu</Text></View>
      <FlatList data={data?.analysis || []} keyExtractor={(item, idx) => `${item.category}-${idx}`} contentContainerStyle={styles.list}
        ListHeaderComponent={data?.ai_recommendations?.expected_revenue_growth_pct ? (
          <View style={styles.growthCard}><Text style={styles.growthText}>📈 Tăng trưởng dự kiến: +{data.ai_recommendations.expected_revenue_growth_pct}%</Text></View>
        ) : null}
        ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyText}>Chưa có dữ liệu</Text></View>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.category}>{item.category}</Text>
            <View style={styles.statsRow}>
              <Text style={styles.stat}>{item.completion_rate}% HT</Text>
              <Text style={styles.stat}>{item.avg_final?.toLocaleString()}đ</Text>
              <Text style={[styles.stat, { color: item.price_gap_pct > 0 ? '#16a34a' : '#dc2626' }]}>{item.price_gap_pct > 0 ? '+' : ''}{item.price_gap_pct}%</Text>
            </View>
          </View>
        )}
      />
    </View>
  )
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' }, center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: '#2563eb', padding: 24, paddingTop: 60 }, headerTitle: { fontSize: 22, fontWeight: 'bold', color: 'white' },
  list: { padding: 16 },
  growthCard: { backgroundColor: '#d1fae5', borderRadius: 12, padding: 14, marginBottom: 12 },
  growthText: { fontSize: 14, fontWeight: '600', color: '#065f46', textAlign: 'center' },
  empty: { padding: 40, alignItems: 'center' }, emptyText: { color: '#6b7280' },
  card: { backgroundColor: 'white', borderRadius: 12, padding: 14, marginBottom: 8 },
  category: { fontSize: 15, fontWeight: '600', textTransform: 'capitalize', marginBottom: 6 },
  statsRow: { flexDirection: 'row', gap: 12 },
  stat: { fontSize: 12, color: '#6b7280', flex: 1, textAlign: 'center' },
})