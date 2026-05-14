// 📊 Thu nhập mobile — Biểu đồ + thống kê + AI insights

import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { useState, useEffect } from 'react'

export default function ThuNhap() {
  const router = useRouter()
  const [tab, setTab] = useState('tuan')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      taiDuLieu(session.user.id, session.access_token)
    })
  }, [tab])

  async function taiDuLieu(userId: string, token: string) {
    setLoading(true)
    try {
      const days = tab === 'hom_nay' ? 1 : tab === 'tuan' ? 7 : 30
      const fromDate = new Date(Date.now() - days * 86400000).toISOString()

      const { data: orders } = await supabase
        .from('orders')
        .select('final_price, estimated_price, category, status, created_at')
        .eq('worker_id', userId)
        .gte('created_at', fromDate)
        .order('created_at', { ascending: false })

      const ds = orders || []
      const hoanThanh = ds.filter((o: any) => o.status === 'completed')
      const tongThuNhap = hoanThanh.reduce((s: number, o: any) => s + (o.final_price || o.estimated_price || 0), 0)
      const soDon = hoanThanh.length
      const tbDon = soDon > 0 ? Math.round(tongThuNhap / soDon) : 0

      // Gom nhóm theo ngày
      const daily: Record<string, number> = {}
      hoanThanh.forEach((o: any) => {
        const ngay = o.created_at.split('T')[0]
        daily[ngay] = (daily[ngay] || 0) + (o.final_price || o.estimated_price || 0)
      })

      // Gom nhóm theo danh mục
      const categories: Record<string, number> = {}
      hoanThanh.forEach((o: any) => {
        categories[o.category] = (categories[o.category] || 0) + (o.final_price || o.estimated_price || 0)
      })

      setData({ tongThuNhap, soDon, tbDon, daily, categories, maxDaily: Math.max(...Object.values(daily), 1) })
    } catch { /* ignore */ }
    setLoading(false)
  }

  const tabs = [
    { key: 'hom_nay', label: 'Hôm nay' },
    { key: 'tuan', label: 'Tuần' },
    { key: 'thang', label: 'Tháng' },
  ]

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>💰 Thu nhập</Text>
      </View>

      <View style={styles.tabRow}>
        {tabs.map(t => (
          <TouchableOpacity key={t.key} onPress={() => setTab(t.key)}
            style={[styles.tab, tab === t.key && styles.tabActive]}>
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 40 }} />
      ) : !data ? null : (
        <>
          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{data.tongThuNhap.toLocaleString()}đ</Text>
              <Text style={styles.summaryLabel}>Tổng thu nhập</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={[styles.summaryValue, { color: '#16a34a' }]}>{data.soDon}</Text>
              <Text style={styles.summaryLabel}>Đơn hoàn thành</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={[styles.summaryValue, { color: '#ca8a04' }]}>{data.tbDon.toLocaleString()}đ</Text>
              <Text style={styles.summaryLabel}>TB/đơn</Text>
            </View>
          </View>

          {/* Biểu đồ ngày */}
          {Object.keys(data.daily).length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📈 Thu nhập theo ngày</Text>
              <View style={styles.chart}>
                {Object.entries(data.daily).slice(-7).map(([ngay, thu]: [string, any]) => (
                  <View key={ngay} style={styles.barCol}>
                    <Text style={styles.barValue}>{(thu / 1000).toFixed(0)}K</Text>
                    <View style={[styles.bar, { height: `${(thu / data.maxDaily) * 100}%` }]} />
                    <Text style={styles.barLabel}>{ngay.slice(5)}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Danh mục */}
          {Object.keys(data.categories).length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📋 Theo danh mục</Text>
              {Object.entries(data.categories).sort(([, a], [, b]) => (b as number) - (a as number)).map(([cat, thu]: [string, any]) => (
                <View key={cat} style={styles.catRow}>
                  <Text style={styles.catName}>{cat}</Text>
                  <View style={styles.catBarBg}>
                    <View style={[styles.catBar, { width: `${(thu / data.tongThuNhap) * 100}%` }]} />
                  </View>
                  <Text style={styles.catValue}>{thu.toLocaleString()}đ</Text>
                </View>
              ))}
            </View>
          )}
        </>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { backgroundColor: '#2563eb', padding: 24, paddingTop: 60 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: 'white' },
  tabRow: { flexDirection: 'row', backgroundColor: 'white', padding: 8, margin: 16, marginBottom: 0, borderRadius: 12 },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: '#2563eb' },
  tabText: { fontSize: 13, fontWeight: '500', color: '#6b7280' },
  tabTextActive: { color: 'white', fontWeight: '600' },
  summaryRow: { flexDirection: 'row', padding: 16, gap: 8 },
  summaryCard: { flex: 1, backgroundColor: 'white', borderRadius: 12, padding: 14, alignItems: 'center' },
  summaryValue: { fontSize: 18, fontWeight: 'bold', color: '#2563eb' },
  summaryLabel: { fontSize: 11, color: '#6b7280', marginTop: 4 },
  section: { margin: 16, marginTop: 0, backgroundColor: 'white', borderRadius: 12, padding: 16 },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', marginBottom: 12, color: '#374151' },
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 140 },
  barCol: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
  barValue: { fontSize: 9, color: '#6b7280', marginBottom: 2 },
  bar: { width: '100%', backgroundColor: '#3b82f6', borderRadius: 4, minHeight: 4, maxHeight: 100 },
  barLabel: { fontSize: 9, color: '#9ca3af', marginTop: 4 },
  catRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  catName: { width: 80, fontSize: 12, color: '#374151', textTransform: 'capitalize' },
  catBarBg: { flex: 1, height: 16, backgroundColor: '#f3f4f6', borderRadius: 8, overflow: 'hidden' },
  catBar: { height: '100%', backgroundColor: '#3b82f6', borderRadius: 8 },
  catValue: { width: 70, textAlign: 'right', fontSize: 11, color: '#6b7280' },
})