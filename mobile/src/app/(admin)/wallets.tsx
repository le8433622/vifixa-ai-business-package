// Admin Wallets — view all wallets with balances + summary
import { useState, useEffect } from 'react'
import { View, Text, TextInput, StyleSheet, ActivityIndicator, ScrollView, RefreshControl } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'

export default function AdminWallets() {
  const router = useRouter()
  const [wallets, setWallets] = useState<any[]>([])
  const [summary, setSummary] = useState({ total: 0, totalBalance: 0, totalLocked: 0, pendingPayouts: 0, pendingPayoutAmount: 0 })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    try {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const [walletsResult, payoutResult] = await Promise.all([
        fetchWallets(session),
        fetchSummary(session),
      ])
      setWallets(walletsResult)
      setSummary(payoutResult)
    } catch (err) {
      console.error('fetchData error:', err)
    } finally {
      setLoading(false)
    }
  }

  async function fetchWallets(session: any) {
    let query = supabase
      .from('wallets')
      .select('*, profiles!inner(id, email, full_name, role)')
      .order('created_at', { ascending: false })

    if (search) {
      query = query.or(`profiles.email.ilike.%${search}%,profiles.full_name.ilike.%${search}%`)
    }

    const { data, error } = await query.limit(100)
    if (error) throw error
    return data || []
  }

  async function fetchSummary(session: any) {
    const { data: walletsAll } = await supabase
      .from('wallets')
      .select('balance, locked_amount')

    const { count: totalWallets } = await supabase
      .from('wallets')
      .select('*', { count: 'exact', head: true })

    const { data: pendingData } = await supabase
      .from('payouts')
      .select('amount')
      .eq('status', 'pending')

    const totalBalance = (walletsAll || []).reduce((s: number, w: any) => s + Number(w.balance), 0)
    const totalLocked = (walletsAll || []).reduce((s: number, w: any) => s + Number(w.locked_amount || 0), 0)
    const pendingPayoutAmount = (pendingData || []).reduce((s: number, p: any) => s + Number(p.amount), 0)

    return {
      total: totalWallets || 0,
      totalBalance,
      totalLocked,
      pendingPayouts: (pendingData || []).length,
      pendingPayoutAmount,
    }
  }

  async function onRefresh() {
    setRefreshing(true)
    await fetchData()
    setRefreshing(false)
  }

  const fmt = (v: number) => v.toLocaleString('vi-VN') + '₫'

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <Text style={styles.title}>Quản lý ví</Text>

      {!loading && (
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{summary.total}</Text>
            <Text style={styles.summaryLabel}>Tổng ví</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{fmt(summary.totalBalance)}</Text>
            <Text style={styles.summaryLabel}>Tổng dư</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{fmt(summary.totalLocked)}</Text>
            <Text style={styles.summaryLabel}>Đang lock</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{summary.pendingPayouts}</Text>
            <Text style={styles.summaryLabel}>Chờ rút</Text>
          </View>
        </View>
      )}

      <TextInput
        style={styles.search}
        value={search}
        onChangeText={setSearch}
        placeholder="Tìm kiếm theo email hoặc tên..."
        onSubmitEditing={fetchData}
      />

      {loading ? (
        <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 40 }} />
      ) : wallets.length === 0 ? (
        <Text style={styles.empty}>Không tìm thấy ví nào</Text>
      ) : (
        <View style={styles.list}>
          {wallets.map((w: any) => (
            <View key={w.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.userEmail}>{w.profiles?.email || w.user_id?.slice(0, 8)}</Text>
                <Text style={styles.userRole}>{w.profiles?.role || 'N/A'}</Text>
              </View>
              <View style={styles.cardRow}>
                <View><Text style={styles.label}>Số dư</Text><Text style={styles.value}>{fmt(Number(w.balance))}</Text></View>
                <View><Text style={styles.label}>Đang lock</Text><Text style={styles.value}>{fmt(Number(w.locked_amount || 0))}</Text></View>
                <View><Text style={styles.label}>Khả dụng</Text><Text style={styles.value}>{fmt(Number(w.balance) - Number(w.locked_amount || 0))}</Text></View>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 16 },
  title: { fontSize: 24, fontWeight: '700', color: '#1f2937', marginBottom: 16, marginTop: 50 },
  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  summaryCard: { backgroundColor: '#fff', borderRadius: 10, padding: 12, flex: 1, minWidth: '45%', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  summaryValue: { fontSize: 18, fontWeight: '700', color: '#1f2937' },
  summaryLabel: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  search: { backgroundColor: '#fff', borderRadius: 8, padding: 12, fontSize: 14, borderWidth: 1, borderColor: '#d1d5db', marginBottom: 16 },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 60, fontSize: 16 },
  list: { gap: 12 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  userEmail: { fontSize: 15, fontWeight: '600', color: '#1f2937' },
  userRole: { fontSize: 12, color: '#6b7280', backgroundColor: '#f3f4f6', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { fontSize: 12, color: '#9ca3af' },
  value: { fontSize: 15, fontWeight: '600', color: '#1f2937', marginTop: 2 },
})
