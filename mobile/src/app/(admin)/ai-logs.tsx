// Admin AI Logs — view AI agent execution logs + worker quality metrics
import { useState, useEffect, useCallback } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView, RefreshControl } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'

type AiLog = {
  id: string
  order_id: string | null
  agent_type: string
  input: any
  output: any
  created_at: string
}

type WorkerWithProfile = {
  id: string
  trust_score: number
  total_orders: number
  avg_rating: number
  verification_status: string
  profiles: { email: string; full_name: string | null }
}

export default function AdminAiLogs() {
  const router = useRouter()
  const [tab, setTab] = useState<'logs' | 'quality'>('logs')

  const [logs, setLogs] = useState<AiLog[]>([])
  const [logsLoading, setLogsLoading] = useState(true)
  const [logsRefreshing, setLogsRefreshing] = useState(false)

  const [workers, setWorkers] = useState<WorkerWithProfile[]>([])
  const [qualityLoading, setQualityLoading] = useState(true)
  const [qualityRefreshing, setQualityRefreshing] = useState(false)

  useEffect(() => {
    if (tab === 'logs') fetchLogs()
    else fetchWorkers()
  }, [tab])

  async function fetchLogs() {
    try {
      setLogsLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const { data, error } = await supabase
        .from('ai_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw error
      setLogs(data || [])
    } catch (err) {
      console.error('fetchLogs error:', err)
    } finally {
      setLogsLoading(false)
    }
  }

  async function fetchWorkers() {
    try {
      setQualityLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const { data, error } = await supabase
        .from('workers')
        .select('*, profiles!inner(email, full_name)')
        .order('trust_score', { ascending: false })
        .limit(50)

      if (error) throw error
      setWorkers(data || [])
    } catch (err) {
      console.error('fetchWorkers error:', err)
    } finally {
      setQualityLoading(false)
    }
  }

  async function onRefresh() {
    if (tab === 'logs') {
      setLogsRefreshing(true)
      await fetchLogs()
      setLogsRefreshing(false)
    } else {
      setQualityRefreshing(true)
      await fetchWorkers()
      setQualityRefreshing(false)
    }
  }

  function showJson(title: string, data: any) {
    const str = typeof data === 'object' ? JSON.stringify(data, null, 2) : String(data)
    Alert.alert(title, str.slice(0, 3000))
  }

  const preview = (data: any) => {
    const str = JSON.stringify(data)
    return str.length > 80 ? str.slice(0, 80) + '…' : str
  }

  const agentColors: Record<string, string> = {
    classify: '#3b82f6',
    match: '#8b5cf6',
    qc: '#f59e0b',
    pricing: '#10b981',
    summary: '#06b6d4',
  }

  const trustColor = (score: number) => {
    if (score >= 80) return '#059669'
    if (score >= 50) return '#f59e0b'
    return '#dc2626'
  }

  const summary = {
    avgTrust: workers.length
      ? (workers.reduce((s, w) => s + w.trust_score, 0) / workers.length).toFixed(1)
      : '0',
    totalVerified: workers.filter(w => w.verification_status === 'verified').length,
    totalPending: workers.filter(w => w.verification_status === 'pending').length,
  }

  const bottomWorkers = [...workers].sort((a, b) => a.trust_score - b.trust_score).slice(0, 10)

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={tab === 'logs' ? logsRefreshing : qualityRefreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.title}>AI Agent Logs</Text>

      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, tab === 'logs' && styles.tabActive]}
          onPress={() => setTab('logs')}
        >
          <Text style={[styles.tabText, tab === 'logs' && styles.tabTextActive]}>AI Logs</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'quality' && styles.tabActive]}
          onPress={() => setTab('quality')}
        >
          <Text style={[styles.tabText, tab === 'quality' && styles.tabTextActive]}>Chất lượng</Text>
        </TouchableOpacity>
      </View>

      {tab === 'logs' ? (
        logsLoading ? (
          <ActivityIndicator size="large" color="#ef4444" style={{ marginTop: 40 }} />
        ) : logs.length === 0 ? (
          <Text style={styles.empty}>Không có log nào</Text>
        ) : (
          <View style={styles.list}>
            {logs.map(log => (
              <TouchableOpacity
                key={log.id}
                style={styles.card}
                onPress={() => showJson(`AI Log: ${log.id}`, { input: log.input, output: log.output })}
              >
                <View style={styles.cardHeader}>
                  <View style={[styles.badge, { backgroundColor: agentColors[log.agent_type] || '#6b7280' }]}>
                    <Text style={styles.badgeText}>{log.agent_type}</Text>
                  </View>
                  <Text style={styles.logId}>{log.order_id ? `#${log.order_id.slice(0, 8)}` : '—'}</Text>
                </View>
                <Text style={styles.logDate}>{new Date(log.created_at).toLocaleString('vi-VN')}</Text>
                <View style={styles.jsonBlock}>
                  <Text style={styles.jsonLabel}>Input:</Text>
                  <Text style={styles.jsonText}>{preview(log.input)}</Text>
                </View>
                <View style={styles.jsonBlock}>
                  <Text style={styles.jsonLabel}>Output:</Text>
                  <Text style={styles.jsonText}>{preview(log.output)}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )
      ) : (
        qualityLoading ? (
          <ActivityIndicator size="large" color="#8b5cf6" style={{ marginTop: 40 }} />
        ) : workers.length === 0 ? (
          <Text style={styles.empty}>Không có dữ liệu chất lượng</Text>
        ) : (
          <>
            <View style={styles.summaryRow}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryValue}>{summary.avgTrust}</Text>
                <Text style={styles.summaryLabel}>Độ tin cậy TB</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryValue}>{summary.totalVerified}</Text>
                <Text style={styles.summaryLabel}>Đã xác thực</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryValue}>{summary.totalPending}</Text>
                <Text style={styles.summaryLabel}>Chờ xác thực</Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Top thợ</Text>
            <View style={styles.list}>
              {workers.map(w => (
                <View key={w.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.userEmail}>{w.profiles?.email || w.id.slice(0, 8)}</Text>
                    <Text style={[styles.trustBadge, { color: trustColor(w.trust_score) }]}>
                      {w.trust_score}
                    </Text>
                  </View>
                  <View style={styles.cardRow}>
                    <View><Text style={styles.label}>Đơn</Text><Text style={styles.value}>{w.total_orders}</Text></View>
                    <View><Text style={styles.label}>Đánh giá</Text><Text style={styles.value}>{w.avg_rating?.toFixed(1) || '—'}</Text></View>
                    <View><Text style={styles.label}>Trạng thái</Text><Text style={styles.value}>{w.verification_status}</Text></View>
                  </View>
                </View>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Thợ cần cải thiện</Text>
            <View style={styles.list}>
              {bottomWorkers.map(w => (
                <View key={w.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.userEmail}>{w.profiles?.email || w.id.slice(0, 8)}</Text>
                    <Text style={[styles.trustBadge, { color: trustColor(w.trust_score) }]}>
                      {w.trust_score}
                    </Text>
                  </View>
                  <View style={styles.cardRow}>
                    <View><Text style={styles.label}>Đơn</Text><Text style={styles.value}>{w.total_orders}</Text></View>
                    <View><Text style={styles.label}>Đánh giá</Text><Text style={styles.value}>{w.avg_rating?.toFixed(1) || '—'}</Text></View>
                    <View><Text style={styles.label}>Trạng thái</Text><Text style={styles.value}>{w.verification_status}</Text></View>
                  </View>
                </View>
              ))}
            </View>
          </>
        )
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 16 },
  title: { fontSize: 24, fontWeight: '700', color: '#1f2937', marginBottom: 16, marginTop: 50 },
  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  tab: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#d1d5db' },
  tabActive: { backgroundColor: '#ef4444', borderColor: '#ef4444' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#374151' },
  tabTextActive: { color: '#fff' },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 60, fontSize: 16 },
  list: { gap: 12 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  logId: { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  logDate: { fontSize: 12, color: '#9ca3af', marginBottom: 8 },
  jsonBlock: { marginBottom: 4 },
  jsonLabel: { fontSize: 11, color: '#9ca3af', fontWeight: '600', marginBottom: 1 },
  jsonText: { fontSize: 12, color: '#374151', fontFamily: 'monospace' },
  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  summaryCard: { backgroundColor: '#fff', borderRadius: 10, padding: 12, flex: 1, minWidth: '30%', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  summaryValue: { fontSize: 20, fontWeight: '700', color: '#1f2937' },
  summaryLabel: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1f2937', marginBottom: 12, marginTop: 8 },
  userEmail: { fontSize: 14, fontWeight: '600', color: '#1f2937', flex: 1 },
  trustBadge: { fontSize: 18, fontWeight: '700' },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  label: { fontSize: 12, color: '#9ca3af' },
  value: { fontSize: 14, fontWeight: '600', color: '#1f2937', marginTop: 2 },
})
