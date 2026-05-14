// 🗺️ Bản đồ thợ gần — Mobile Map-first cho khách hàng

import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { useState, useEffect } from 'react'
import BanDoMobile from '@/components/BanDo'

export default function BanDoKhach() {
  const router = useRouter()
  const [viTri, setViTri] = useState<[number, number]>([10.77, 106.69])
  const [diem, setDiem] = useState<any[]>([])
  const [thoGan, setThoGan] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      taiThoGan(session.access_token)
    })
  }, [])

  async function taiThoGan(token: string) {
    try {
      const res = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/osm-map?action=nearby&lat=${viTri[0]}&lng=${viTri[1]}&radius=20`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const geo = await res.json()
      const features = geo.features || []
      const dsDiem = features.map((f: any) => ({
        id: f.properties.id, lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0],
        loai: f.properties.verified ? 'tho_xac_thuc' as const : 'tho' as const,
        nhan: f.properties.name, moTa: `📍 ${f.properties.distance_km}km · ⭐ ${f.properties.rating}/5`,
      }))
      dsDiem.unshift({ id: 'home', lat: viTri[0], lng: viTri[1], loai: 'nha' as const, nhan: 'Vị trí của bạn' })
      setDiem(dsDiem)
      setThoGan(features.map((f: any) => f.properties))
    } catch { /* ignore */ }
    setLoading(false)
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🗺️ Thợ gần bạn</Text>
        <Text style={styles.headerSub}>Tìm thợ sửa chữa trong khu vực</Text>
      </View>

      <BanDoMobile diem={diem} trungTam={viTri} zoom={14} chieuCao={350} />

      <View style={styles.section}>
        <TouchableOpacity style={styles.chatButton} onPress={() => router.push('/(customer)/chat')}>
          <Text style={styles.chatButtonText}>💬 Chat với AI</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>👥 Thợ gần bạn ({thoGan.length})</Text>
        {loading ? (
          <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 20 }} />
        ) : thoGan.length === 0 ? (
          <View style={styles.empty}><Text style={styles.emptyText}>🔧 Chưa có thợ trong khu vực</Text></View>
        ) : (
          thoGan.slice(0, 5).map((tho: any, i: number) => (
            <TouchableOpacity key={tho.id || i} style={styles.card} onPress={() => router.push('/(customer)/chat')}>
              <View style={styles.avatar}><Text style={styles.avatarText}>{tho.verified ? '✅' : '🔧'}</Text></View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{tho.name}</Text>
                <Text style={styles.cardSub}>📍 {tho.distance_km}km · ⭐ {tho.rating}/5</Text>
              </View>
              <Text style={styles.cardAction}>Đặt ngay</Text>
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { backgroundColor: '#2563eb', padding: 24, paddingTop: 60 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: 'white' },
  headerSub: { fontSize: 13, color: '#bfdbfe', marginTop: 4 },
  section: { padding: 16, paddingBottom: 0 },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#374151', marginBottom: 12 },
  chatButton: { backgroundColor: '#2563eb', borderRadius: 12, padding: 14, alignItems: 'center' },
  chatButtonText: { color: 'white', fontSize: 15, fontWeight: '600' },
  empty: { padding: 30, alignItems: 'center' },
  emptyText: { color: '#6b7280', fontSize: 14 },
  card: { backgroundColor: 'white', borderRadius: 12, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 3, elevation: 1 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText: { fontSize: 18 },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#111827' },
  cardSub: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  cardAction: { color: '#2563eb', fontSize: 13, fontWeight: '600' },
})