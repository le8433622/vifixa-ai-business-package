import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native'
import { supabase } from '@/lib/supabase'
import { useState, useEffect } from 'react'
import { useRouter } from 'expo-router'

export default function GiutChan() {
  const router = useRouter()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [dangGui, setDangGui] = useState(false)

  useEffect(() => { taiDuLieu() }, [])

  async function taiDuLieu() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    try {
      const [khRes, dhRes] = await Promise.all([
        fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/rest/v1/profiles?role=eq.customer&select=id`, { headers: { Authorization: `Bearer ${session.access_token}` } }),
        fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/rest/v1/orders?select=customer_id,status,created_at&order=created_at.desc&limit=200`, { headers: { Authorization: `Bearer ${session.access_token}` } }),
      ])
      const kh = await khRes.json()
      const dh = await dhRes.json()
      const khIds = new Set((kh || []).map((c: any) => c.id))
      const demDh: Record<string, number> = {}
      const ngayCuoi: Record<string, number> = {}
      for (const o of dh || []) {
        demDh[o.customer_id] = (demDh[o.customer_id] || 0) + 1
        if (!ngayCuoi[o.customer_id]) ngayCuoi[o.customer_id] = Math.round((Date.now() - new Date(o.created_at).getTime()) / 86400000)
      }
      const nguyCo = [...khIds].filter(id => (ngayCuoi[id] || 999) > 30 || !demDh[id]).length
      setData({ tong: khIds.size, nguyCo })
    } catch { /* ignore */ }
    setLoading(false)
  }

  async function guiCampaign() {
    setDangGui(true)
    const { data: { session } } = await supabase.auth.getSession()
    try {
      const res = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/ai-retention`, {
        method: 'POST', headers: { Authorization: `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' },
      })
      const result = await res.json()
      Alert.alert('✅ Thành công', result.message || `Đã gửi ${result.campaigns_launched} campaign`)
      await taiDuLieu()
    } catch (e: any) { Alert.alert('Lỗi', e.message) }
    setDangGui(false)
  }

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}><Text style={styles.headerTitle}>🎯 Giữ chân khách hàng</Text></View>
      <View style={styles.grid}>
        <View style={styles.card}><Text style={styles.value}>{data?.tong || 0}</Text><Text style={styles.label}>Tổng KH</Text></View>
        <View style={styles.card}><Text style={[styles.value, { color: '#dc2626' }]}>{data?.nguyCo || 0}</Text><Text style={styles.label}>Nguy cơ rời bỏ</Text></View>
      </View>
      <View style={{ padding: 16 }}>
        <Text style={styles.meta}>Tỷ lệ nguy cơ: {data?.tong ? ((data.nguyCo / data.tong) * 100).toFixed(1) : 0}%</Text>
        <Text onPress={guiCampaign} style={[styles.button, dangGui && { opacity: 0.5 }]}>{dangGui ? '⏳ Đang gửi...' : '🎯 Gửi campaign giữ chân'}</Text>
      </View>
    </ScrollView>
  )
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' }, center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: '#2563eb', padding: 24, paddingTop: 60 }, headerTitle: { fontSize: 22, fontWeight: 'bold', color: 'white' },
  grid: { flexDirection: 'row', padding: 16, gap: 12 },
  card: { flex: 1, backgroundColor: 'white', borderRadius: 12, padding: 16 },
  value: { fontSize: 28, fontWeight: 'bold', color: '#2563eb' }, label: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  meta: { fontSize: 13, color: '#6b7280', marginBottom: 16 },
  button: { backgroundColor: '#dc2626', color: 'white', fontSize: 15, fontWeight: '600', textAlign: 'center', padding: 14, borderRadius: 12, overflow: 'hidden' },
})