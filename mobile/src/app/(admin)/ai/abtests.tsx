import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native'
import { supabase } from '@/lib/supabase'
import { useState, useEffect } from 'react'
import { useRouter } from 'expo-router'

export default function ThuNghiemAB() {
  const router = useRouter()
  const [tests, setTests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      supabase.from('prompt_ab_tests').select('*').order('created_at', { ascending: false }).then(async ({ data }) => {
        const items = data || []
        for (const t of items) {
          const { data: r } = await supabase.rpc('calculate_prompt_ab_significance', { p_test_id: t.id })
          if (r) t.results = r
        }
        setTests(items); setLoading(false)
      })
    })
  }, [])

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>
  return (
    <View style={styles.container}>
      <View style={styles.header}><Text style={styles.headerTitle}>🧪 Thử nghiệm A/B</Text></View>
      <FlatList data={tests} keyExtractor={(item, idx) => `${item.id}-${idx}`} contentContainerStyle={styles.list}
        ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyText}>Chưa có thử nghiệm</Text></View>}
        renderItem={({ item }) => {
          const winner = item.results?.find((r: any) => r.is_winner)
          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.name}>{item.test_name}</Text>
                {item.is_active ? <Text style={styles.activeBadge}>Active</Text> : <Text style={styles.endedBadge}>Ended</Text>}
              </View>
              <Text style={styles.meta}>{item.agent_type} · Split {100 - item.traffic_split}/{item.traffic_split}</Text>
              {winner && <Text style={styles.winner}>🏆 {winner.variant}</Text>}
              {item.results?.map((r: any) => (
                <View key={r.variant} style={styles.resultRow}>
                  <Text style={styles.variant}>{r.variant === 'variant_a' ? 'A' : 'B'}</Text>
                  <Text style={styles.stat}>{r.total_calls} calls</Text>
                  <Text style={[styles.stat, { color: r.accuracy_pct >= 70 ? '#16a34a' : '#dc2626' }]}>{r.accuracy_pct}%</Text>
                  <Text style={styles.stat}>{r.avg_latency_ms}ms</Text>
                </View>
              ))}
            </View>
          )
        }}
      />
    </View>
  )
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' }, center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: '#2563eb', padding: 24, paddingTop: 60 }, headerTitle: { fontSize: 24, fontWeight: 'bold', color: 'white' },
  list: { padding: 16 }, empty: { padding: 40, alignItems: 'center' }, emptyText: { color: '#6b7280' },
  card: { backgroundColor: 'white', borderRadius: 12, padding: 14, marginBottom: 8 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  name: { fontSize: 15, fontWeight: '600', flex: 1 },
  activeBadge: { fontSize: 11, backgroundColor: '#d1fae5', color: '#065f46', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, fontWeight: '600' },
  endedBadge: { fontSize: 11, backgroundColor: '#f3f4f6', color: '#6b7280', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, fontWeight: '600' },
  meta: { fontSize: 12, color: '#6b7280', marginBottom: 8 },
  winner: { fontSize: 13, color: '#d97706', fontWeight: '600', marginBottom: 8 },
  resultRow: { flexDirection: 'row', gap: 12, paddingVertical: 4, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  variant: { fontWeight: '700', width: 20, color: '#374151' },
  stat: { fontSize: 12, color: '#6b7280', flex: 1, textAlign: 'right' },
})