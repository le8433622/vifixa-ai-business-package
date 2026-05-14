import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native'
import { supabase } from '@/lib/supabase'
import { useState, useEffect } from 'react'
import { useRouter } from 'expo-router'

export default function PhanHoiAI() {
  const router = useRouter()
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      supabase.from('ai_feedback').select('*').order('created_at', { ascending: false }).limit(50).then(({ data }) => {
        setData(data || []); setLoading(false)
      })
    })
  }, [])

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>
  return (
    <View style={styles.container}>
      <View style={styles.header}><Text style={styles.headerTitle}>💬 Phản hồi AI</Text></View>
      <FlatList data={data} keyExtractor={(item, idx) => `${item.id}-${idx}`} contentContainerStyle={styles.list}
        ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyText}>Chưa có phản hồi</Text></View>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.agent}>{item.agent_type}</Text>
              <Text style={[styles.badge, item.is_correct === true ? styles.greenBadge : item.is_correct === false ? styles.redBadge : styles.grayBadge]}>
                {item.is_correct === true ? 'Đúng' : item.is_correct === false ? 'Sai' : 'Chờ'}
              </Text>
            </View>
            {item.rating && <Text style={styles.stars}>{'★'.repeat(item.rating)}{'☆'.repeat(5 - item.rating)}</Text>}
            {item.comment && <Text style={styles.comment}>{item.comment}</Text>}
            <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString('vi-VN')}</Text>
          </View>
        )}
      />
    </View>
  )
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' }, center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: '#2563eb', padding: 24, paddingTop: 60 }, headerTitle: { fontSize: 24, fontWeight: 'bold', color: 'white' },
  list: { padding: 16 }, empty: { padding: 40, alignItems: 'center' }, emptyText: { color: '#6b7280' },
  card: { backgroundColor: 'white', borderRadius: 12, padding: 14, marginBottom: 8 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  agent: { fontSize: 15, fontWeight: '600', textTransform: 'capitalize' },
  badge: { fontSize: 11, fontWeight: '600', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  greenBadge: { backgroundColor: '#d1fae5', color: '#065f46' }, redBadge: { backgroundColor: '#fee2e2', color: '#991b1b' }, grayBadge: { backgroundColor: '#f3f4f6', color: '#6b7280' },
  stars: { fontSize: 14, color: '#ca8a04', marginBottom: 4 }, comment: { fontSize: 13, color: '#374151', marginBottom: 4 }, date: { fontSize: 11, color: '#9ca3af' },
})