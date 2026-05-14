import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native'
import { supabase } from '@/lib/supabase'
import { useState, useEffect } from 'react'
import { useRouter } from 'expo-router'

export default function DoChinhXacAI() {
  const router = useRouter()
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      supabase.from('ai_agent_accuracy').select('*').then(({ data }) => {
        setData(data || []); setLoading(false)
      })
    })
  }, [])

  const avg = data.length > 0 ? data.reduce((s, r) => s + r.accuracy_pct, 0) / data.length : 0

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🎯 Độ chính xác AI</Text>
        <Text style={styles.headerSubtitle}>TB: {avg.toFixed(1)}%</Text>
      </View>

      {data.length === 0 ? (
        <View style={styles.empty}><Text style={styles.emptyText}>Chưa có dữ liệu</Text></View>
      ) : data.map(row => (
        <View key={row.agent_type} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.agentName}>{row.agent_type}</Text>
            <Text style={[styles.accuracy, row.accuracy_pct >= 80 ? styles.green : row.accuracy_pct >= 60 ? styles.yellow : styles.red]}>
              {row.accuracy_pct}%
            </Text>
          </View>
          <View style={styles.barBg}><View style={[styles.bar, { width: `${row.accuracy_pct}%`, backgroundColor: row.accuracy_pct >= 80 ? '#16a34a' : row.accuracy_pct >= 60 ? '#ca8a04' : '#dc2626' }]} /></View>
          <Text style={styles.detail}>Đúng: {row.correct} · Sai: {row.incorrect} · Đánh giá: {row.avg_rating?.toFixed(2)}</Text>
        </View>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: '#2563eb', padding: 24, paddingTop: 60 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: 'white' },
  headerSubtitle: { fontSize: 14, color: '#bfdbfe', marginTop: 4 },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#6b7280', fontSize: 14 },
  card: { backgroundColor: 'white', margin: 16, marginBottom: 0, borderRadius: 12, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  agentName: { fontSize: 16, fontWeight: '600', textTransform: 'capitalize' },
  accuracy: { fontSize: 20, fontWeight: 'bold' },
  green: { color: '#16a34a' }, yellow: { color: '#ca8a04' }, red: { color: '#dc2626' },
  barBg: { height: 8, backgroundColor: '#f3f4f6', borderRadius: 4, marginBottom: 8 },
  bar: { height: '100%', borderRadius: 4 },
  detail: { fontSize: 12, color: '#6b7280' },
})