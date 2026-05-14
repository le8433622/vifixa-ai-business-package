import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native'
import { supabase } from '@/lib/supabase'
import { useState, useEffect } from 'react'
import { useRouter } from 'expo-router'

export default function ChiPhiAI() {
  const router = useRouter()
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      supabase.rpc('get_ai_cost_summary', { p_days: 7 }).then(({ data }) => {
        setData(data || []); setLoading(false)
      })
    })
  }, [])

  const tongChiPhi = data.reduce((s, r) => s + Number(r.total_cost), 0)
  const tongLuotGoi = data.reduce((s, r) => s + r.total_calls, 0)

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>💰 Chi phí AI</Text>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>${tongChiPhi.toFixed(4)}</Text>
          <Text style={styles.summaryLabel}>Tổng chi phí 7 ngày</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{tongLuotGoi}</Text>
          <Text style={styles.summaryLabel}>Tổng lượt gọi</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Chi phí theo ngày</Text>
        {data.map(row => (
          <View key={row.day} style={styles.row}>
            <Text style={styles.rowLabel}>{row.day}</Text>
            <View style={styles.barBg}>
              <View style={[styles.bar, { width: `${(Number(row.total_cost) / Math.max(...data.map(d => Number(d.total_cost)))) * 100}%` }]} />
            </View>
            <Text style={styles.rowValue}>${Number(row.total_cost).toFixed(4)}</Text>
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
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: 'white' },
  summaryRow: { flexDirection: 'row', padding: 16, gap: 12 },
  summaryCard: { flex: 1, backgroundColor: 'white', borderRadius: 12, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  summaryValue: { fontSize: 22, fontWeight: 'bold', color: '#2563eb' },
  summaryLabel: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  section: { paddingHorizontal: 16 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#374151', marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  rowLabel: { width: 80, fontSize: 12, color: '#6b7280' },
  barBg: { flex: 1, height: 20, backgroundColor: '#f3f4f6', borderRadius: 10, overflow: 'hidden' },
  bar: { height: '100%', backgroundColor: '#3b82f6', borderRadius: 10 },
  rowValue: { width: 80, textAlign: 'right', fontSize: 11, fontFamily: 'monospace', color: '#374151' },
})