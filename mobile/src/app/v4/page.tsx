// 🗺️ V4 MAP Mobile — 1 screen cho Khách + Thợ + Admin
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { useState, useEffect } from 'react'
import BanDoMobile from '@/components/BanDo'

export default function V4MapMobile() {
  const router = useRouter()
  const [points, setPoints] = useState<any[]>([])
  const [stats, setStats] = useState({ tong: 0, label: '' })
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<any>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      taiDuLieu(session.access_token)
    })
  }, [])

  async function taiDuLieu(token: string) {
    try {
      const res = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/v4-navigator`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ hanhDong: 'tim_gan_day', viTri: { viDo: 10.77, kinhDo: 106.69 }, banKinh: 20 }),
      })
      const data = await res.json()
      if (data.danhSach) {
        setPoints([
          { id: 'me', lat: 10.77, lng: 106.69, loai: 'nha', nhan: '📍 Vị trí của bạn' },
          ...data.danhSach.map((w: any, i: number) => ({
            id: w.id, lat: 10.77 + (Math.random() - 0.5) * 0.05, lng: 106.69 + (Math.random() - 0.5) * 0.05,
            loai: 'tho' as const, nhan: w.ten, moTa: `📍 ${w.khoangCachKm}km · ⏱ ${w.thoiGianPhut}ph · ⭐ ${w.diemDanhGia}/5`,
          })),
        ])
        setStats({ tong: data.danhSach.length, label: 'thợ trong khu vực' })
      }
    } catch { /* ignore */ }
    setLoading(false)
  }

  return (
    <View style={styles.container}>
      {/* Stats bar */}
      <View style={styles.statsBar}>
        <Text style={styles.statsText}>👥 {stats.tong} {stats.label}</Text>
        <TouchableOpacity onPress={() => router.push('/v4/chat')}>
          <Text style={styles.chatLink}>💬 Chat AI</Text>
        </TouchableOpacity>
      </View>

      {/* Map */}
      <View style={{ flex: 1 }}>
        <BanDoMobile diem={points} chieuCao={400} />
      </View>

      {/* Detail panel */}
      {selected && (
        <View style={styles.detail}>
          <View style={styles.detailHeader}>
            <Text style={styles.detailName}>{selected.ten}</Text>
            <TouchableOpacity onPress={() => setSelected(null)}><Text style={{ color: '#9ca3af' }}>✕</Text></TouchableOpacity>
          </View>
          <View style={styles.detailGrid}>
            <Text style={styles.detailItem}>📍 {selected.khoangCachKm}km</Text>
            <Text style={styles.detailItem}>⏱ {selected.thoiGianPhut}ph</Text>
            <Text style={styles.detailItem}>⭐ {selected.diemDanhGia}/5</Text>
          </View>
          <TouchableOpacity style={styles.chatBtn} onPress={() => router.push('/v4/chat')}>
            <Text style={styles.chatBtnText}>💬 Chat</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Loading */}
      {loading && <ActivityIndicator size="large" color="#2563eb" style={styles.loading} />}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  statsBar: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  statsText: { fontSize: 13, fontWeight: '500', color: '#374151' },
  chatLink: { fontSize: 13, color: '#2563eb', fontWeight: '500' },
  loading: { position: 'absolute', top: '50%', left: '45%' },
  detail: { backgroundColor: 'white', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16, marginTop: -20, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  detailName: { fontSize: 16, fontWeight: 'bold' },
  detailGrid: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  detailItem: { flex: 1, backgroundColor: '#f3f4f6', padding: 8, borderRadius: 8, textAlign: 'center', fontSize: 12 },
  chatBtn: { backgroundColor: '#2563eb', borderRadius: 12, padding: 14, alignItems: 'center' },
  chatBtnText: { color: 'white', fontSize: 15, fontWeight: '600' },
})