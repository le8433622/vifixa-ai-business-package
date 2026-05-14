// 📊 V4 DASHBOARD Mobile — AI insights, không table
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { useState, useEffect } from 'react'

export default function V4DashboardMobile() {
  const router = useRouter()
  const [insights, setInsights] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      taiInsights(session.access_token, session.user.id)
    })
  }, [])

  async function taiInsights(token: string, userId: string) {
    try {
      const { data: orders } = await supabase.from('orders').select('id, status, final_price, estimated_price').eq('customer_id', userId).limit(50)
      const res = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/v4-orchestrator`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ hanhDong: 'phan_tich', noiDung: JSON.stringify({ don: orders || [], role: 'customer' }) }),
      })
      const data = await res.json()
      setInsights(data.ketQuaCuoi || data)
    } catch { /* ignore */ }
    setLoading(false)
  }

  const actions = [
    { icon: '💬', label: 'Chat AI', color: ['#2563eb', '#7c3aed'], route: '/v4/chat' },
    { icon: '🗺️', label: 'Bản đồ', color: ['#059669', '#047857'], route: '/v4' },
    { icon: '📋', label: 'Đơn hàng', color: ['#d97706', '#b45309'], route: '/v4' },
  ]

  return (
    <ScrollView style={styles.container}>
      {/* AI Insights hero */}
      {loading ? (
        <View style={styles.hero}><ActivityIndicator size="large" color="white" /></View>
      ) : (
        <View style={styles.hero}>
          <Text style={{ color: '#bfdbfe', fontSize: 12, marginBottom: 4 }}>🤖 AI Insights</Text>
          <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold', lineHeight: 24 }}>
            {insights?.phanTich || 'Chào mừng bạn đến với Vifixa AI!'}
          </Text>
        </View>
      )}

      {/* Quick actions */}
      <View style={{ padding: 16 }}>
        <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#374151', marginBottom: 12 }}>⚡ Hành động nhanh</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {actions.map((a, i) => (
            <TouchableOpacity key={i} onPress={() => router.push(a.route as any)}
              style={[styles.actionCard, { backgroundColor: a.color[0] }]}>
              <Text style={{ fontSize: 24 }}>{a.icon}</Text>
              <Text style={{ color: 'white', fontSize: 12, fontWeight: '600', marginTop: 8 }}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Stats */}
      <View style={{ paddingHorizontal: 16 }}>
        <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#374151', marginBottom: 12 }}>📈 Thống kê</Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={styles.statCard}><Text style={styles.statVal}>—</Text><Text style={styles.statLabel}>Tổng số</Text></View>
          <View style={styles.statCard}><Text style={[styles.statVal, { color: '#16a34a' }]}>—</Text><Text style={styles.statLabel}>Hôm nay</Text></View>
        </View>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  hero: { backgroundColor: '#2563eb', padding: 24, paddingTop: 60, paddingBottom: 40, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  actionCard: { flex: 1, borderRadius: 16, padding: 16, alignItems: 'center' },
  statCard: { flex: 1, backgroundColor: 'white', borderRadius: 12, padding: 16, alignItems: 'center' },
  statVal: { fontSize: 24, fontWeight: 'bold', color: '#2563eb' },
  statLabel: { fontSize: 12, color: '#6b7280', marginTop: 4 },
})