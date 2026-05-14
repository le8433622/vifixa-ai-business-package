// 🔥 Bản đồ nhu cầu — Mobile worker xem nhu cầu dịch vụ theo khu vực

import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { useState, useEffect } from 'react'
import BanDoMobile from '@/components/BanDo'

export default function BanDoNong() {
  const router = useRouter()
  const [geoJSON, setGeoJSON] = useState<any>(null)
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      taiDuLieu(session.access_token)
    })
  }, [filter])

  async function taiDuLieu(token: string) {
    setLoading(true)
    try {
      const url = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/osm-heatmap?action=grid&days=30${filter ? `&category=${filter}` : ''}`
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      setGeoJSON(data)
      setStats(data?.metadata)
    } catch { /* ignore */ }
    setLoading(false)
  }

  const categories = ['', 'air_conditioning', 'plumbing', 'electricity', 'appliance']
  const catLabels: Record<string, string> = { '': 'Tất cả', air_conditioning: 'Máy lạnh', plumbing: 'Ống nước', electricity: 'Điện', appliance: 'Gia dụng' }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🔥 Bản đồ nhu cầu</Text>
        <Text style={styles.headerSub}>Xem khu vực nào đang có nhiều đơn</Text>
      </View>

      <ScrollView horizontal style={styles.filterRow} showsHorizontalScrollIndicator={false}>
        {categories.map(c => (
          <TouchableOpacity key={c} onPress={() => setFilter(c)}
            style={[styles.filterBtn, filter === c && styles.filterBtnActive]}>
            <Text style={[styles.filterText, filter === c && styles.filterTextActive]}>{catLabels[c]}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <BanDoMobile geoJSON={geoJSON} chieuCao={280} />

      {loading ? (
        <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 20 }} />
      ) : stats ? (
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.total_orders || 0}</Text>
            <Text style={styles.statLabel}>Đơn (30 ngày)</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#16a34a' }]}>{stats.grid_cells || 0}</Text>
            <Text style={styles.statLabel}>Khu vực</Text>
          </View>
        </View>
      ) : null}

      <View style={styles.tip}>
        <Text style={styles.tipTitle}>💡 Mẹo</Text>
        <Text style={styles.tipText}>Khu vực có màu đậm = nhiều đơn hơn. Hãy tập trung vào các khu vực này để tăng thu nhập!</Text>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { backgroundColor: '#2563eb', padding: 24, paddingTop: 60 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: 'white' },
  headerSub: { fontSize: 13, color: '#bfdbfe', marginTop: 4 },
  filterRow: { padding: 12, gap: 8 },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 6, backgroundColor: '#f3f4f6', borderRadius: 16, marginRight: 6 },
  filterBtnActive: { backgroundColor: '#2563eb' },
  filterText: { fontSize: 12, color: '#6b7280', fontWeight: '500' },
  filterTextActive: { color: 'white' },
  statsRow: { flexDirection: 'row', padding: 16, gap: 12 },
  statCard: { flex: 1, backgroundColor: 'white', borderRadius: 12, padding: 14, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: 'bold', color: '#2563eb' },
  statLabel: { fontSize: 11, color: '#6b7280', marginTop: 4 },
  tip: { margin: 16, marginTop: 0, backgroundColor: '#eff6ff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#bfdbfe' },
  tipTitle: { fontSize: 14, fontWeight: 'bold', color: '#1e40af', marginBottom: 4 },
  tipText: { fontSize: 13, color: '#1e40af', lineHeight: 20 },
})