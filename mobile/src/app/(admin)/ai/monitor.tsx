import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native'
import { supabase } from '@/lib/supabase'
import { useState, useEffect } from 'react'
import { useRouter } from 'expo-router'

export default function GiamSatAI() {
  const router = useRouter()
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      supabase.from('ai_logs').select('agent_type, model, latency_ms, cost, cache_hit, created_at').order('created_at', { ascending: false }).limit(50).then(({ data }) => {
        setLogs(data || []); setLoading(false)
      })
    })

    const kenh = supabase.channel('mobile-monitor')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ai_logs' }, (p: any) => {
        setLogs(prev => [{ ...p.new }, ...prev].slice(0, 50))
      })
      .subscribe()
    return () => { supabase.removeChannel(kenh) }
  }, [])

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📡 Giám sát AI</Text>
        <View style={styles.dotRow}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>Trực tiếp</Text>
        </View>
      </View>

      <FlatList
        data={logs}
        keyExtractor={(item, idx) => `${item.id}-${idx}`}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyText}>Chưa có cuộc gọi AI</Text></View>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={[styles.dot, item.cache_hit ? styles.cacheDot : styles.normalDot]} />
            <Text style={styles.agent}>{item.agent_type}</Text>
            <Text style={styles.latency}>{item.latency_ms}ms</Text>
            <Text style={styles.cost}>${Number(item.cost).toFixed(6)}</Text>
            {item.cache_hit && <Text style={styles.cacheBadge}>cache</Text>}
          </View>
        )}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: '#2563eb', padding: 24, paddingTop: 60, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: 'white' },
  dotRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4ade80' },
  liveText: { color: '#bfdbfe', fontSize: 12 },
  list: { padding: 16 },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#6b7280', fontSize: 14 },
  row: { backgroundColor: 'white', borderRadius: 8, padding: 12, marginBottom: 6, flexDirection: 'row', alignItems: 'center', gap: 8, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 2, elevation: 1 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  normalDot: { backgroundColor: '#3b82f6' },
  cacheDot: { backgroundColor: '#4ade80' },
  agent: { flex: 1, fontSize: 13, fontWeight: '500', textTransform: 'capitalize' },
  latency: { fontSize: 11, color: '#6b7280', width: 40, textAlign: 'right' },
  cost: { fontSize: 11, fontFamily: 'monospace', color: '#6b7280', width: 70, textAlign: 'right' },
  cacheBadge: { fontSize: 10, backgroundColor: '#d1fae5', color: '#065f46', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
})