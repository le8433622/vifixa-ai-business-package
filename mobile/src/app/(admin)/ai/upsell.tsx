import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native'
import { supabase } from '@/lib/supabase'
import { useState, useEffect } from 'react'
import { useRouter } from 'expo-router'

export default function BanHangAI() {
  const router = useRouter()
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      supabase.from('ai_upsell_rules').select('*').order('priority').then(({ data }) => {
        setData(data || []); setLoading(false)
      })
    })
  }, [])

  const nhanKichHoat: Record<string, string> = { after_diagnosis: 'Sau chẩn đoán', after_quote: 'Sau báo giá', after_confirmation: 'Sau xác nhận', after_completion: 'Sau hoàn thành' }
  const nhanSanPham: Record<string, string> = { membership: 'Membership', warranty: 'Bảo hành', material_kit: 'Vật tư', maintenance_plan: 'Bảo trì' }

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>
  return (
    <View style={styles.container}>
      <View style={styles.header}><Text style={styles.headerTitle}>🛒 Bán hàng thông minh</Text></View>
      <FlatList data={data} keyExtractor={(item, idx) => `${item.id}-${idx}`} contentContainerStyle={styles.list}
        ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyText}>Chưa có rule upsell</Text></View>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.badge}>{nhanKichHoat[item.trigger_type] || item.trigger_type}</Text>
              <Text style={[styles.badge, styles.productBadge]}>{nhanSanPham[item.product_type] || item.product_type}</Text>
              {item.discount_percent > 0 && <Text style={[styles.badge, styles.discountBadge]}>-{item.discount_percent}%</Text>}
              <Text style={[styles.badge, item.is_active ? styles.activeBadge : styles.inactiveBadge]}>{item.is_active ? 'Bật' : 'Tắt'}</Text>
            </View>
            <Text style={styles.template}>{item.suggestion_template}</Text>
            <Text style={styles.priority}>Ưu tiên: {item.priority}</Text>
          </View>
        )}
      />
    </View>
  )
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' }, center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: '#2563eb', padding: 24, paddingTop: 60 }, headerTitle: { fontSize: 22, fontWeight: 'bold', color: 'white' },
  list: { padding: 16 }, empty: { padding: 40, alignItems: 'center' }, emptyText: { color: '#6b7280', fontSize: 14 },
  card: { backgroundColor: 'white', borderRadius: 12, padding: 14, marginBottom: 8 },
  row: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 8 },
  badge: { fontSize: 11, fontWeight: '600', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, backgroundColor: '#f3f4f6', color: '#6b7280' },
  productBadge: { backgroundColor: '#ede9fe', color: '#6d28d9' }, discountBadge: { backgroundColor: '#fee2e2', color: '#dc2626' },
  activeBadge: { backgroundColor: '#d1fae5', color: '#065f46' }, inactiveBadge: { backgroundColor: '#f3f4f6', color: '#9ca3af' },
  template: { fontSize: 13, color: '#374151', marginBottom: 4 }, priority: { fontSize: 11, color: '#9ca3af' },
})