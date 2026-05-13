// Admin Payouts — approve/reject withdrawal requests
import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView, RefreshControl } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'

type Payout = {
  id: string
  user_id: string
  amount: number
  fee: number
  status: string
  bank_account: any
  note: string | null
  created_at: string
  completed_at: string | null
  profiles: { email: string; full_name: string | null; role: string } | null
}

export default function AdminPayouts() {
  const router = useRouter()
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState<string>('pending')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const pageSize = 50

  useEffect(() => { fetchPayouts() }, [filter, page])

  async function fetchPayouts() {
    try {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      let query = supabase
        .from('payouts')
        .select('*, profiles!payouts_user_id_fkey(id, email, full_name, role)')
        .order('created_at', { ascending: false })

      if (filter) {
        query = query.eq('status', filter)
      }

      const from = (page - 1) * pageSize
      const to = page * pageSize - 1

      let countQuery = supabase
        .from('payouts')
        .select('*', { count: 'exact', head: true })
      if (filter) {
        countQuery = countQuery.eq('status', filter)
      }
      const { count, error: countError } = await countQuery
      if (countError) throw countError
      setTotalCount(count || 0)

      query = query.range(from, to)
      const { data, error } = await query
      if (error) throw error
      setPayouts(data || [])
    } catch (err) {
      console.error('fetchPayouts error:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleApprove(payoutId: string) {
    setActionLoading(payoutId)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/wallet-manager?action=approve&id=${payoutId}`,
        {
          method: 'PUT',
          headers: { Authorization: `Bearer ${session.access_token}` },
        }
      )
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Duyệt thất bại')
      Alert.alert('Thành công', 'Đã duyệt yêu cầu rút tiền')
      fetchPayouts()
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Duyệt thất bại')
    } finally {
      setActionLoading(null)
    }
  }

  async function handleReject(payoutId: string) {
    setActionLoading(payoutId)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/wallet-manager?action=reject&id=${payoutId}`,
        {
          method: 'PUT',
          headers: { Authorization: `Bearer ${session.access_token}` },
        }
      )
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Từ chối thất bại')
      Alert.alert('Thành công', 'Đã từ chối yêu cầu rút tiền')
      fetchPayouts()
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Từ chối thất bại')
    } finally {
      setActionLoading(null)
    }
  }

  async function onRefresh() {
    setRefreshing(true)
    await fetchPayouts()
    setRefreshing(false)
  }

  const fmt = (v: number) => v.toLocaleString('vi-VN') + '₫'
  const statusLabels: Record<string, string> = { pending: 'Chờ duyệt', completed: 'Hoàn thành', failed: 'Thất bại', cancelled: 'Đã hủy' }
  const statusColors: Record<string, string> = { pending: '#f59e0b', completed: '#059669', failed: '#dc2626', cancelled: '#6b7280' }
  const filters = ['pending', 'completed', 'failed', '']

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <Text style={styles.title}>Quản lý yêu cầu rút tiền</Text>

      <View style={styles.filterRow}>
        {filters.map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
            onPress={() => { setFilter(f); setPage(1) }}
          >
            <Text style={[styles.filterBtnText, filter === f && styles.filterBtnTextActive]}>
              {f ? statusLabels[f] || f : 'Tất cả'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 40 }} />
      ) : payouts.length === 0 ? (
        <Text style={styles.empty}>Không có yêu cầu nào</Text>
      ) : (
        <><View style={styles.list}>
          {payouts.map(p => (
            <View key={p.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.userEmail}>{p.profiles?.email || p.user_id?.slice(0, 8)}</Text>
                  {p.profiles?.full_name && <Text style={styles.userName}>{p.profiles.full_name}</Text>}
                  <Text style={styles.bankInfo}>
                    {p.bank_account?.bank_name || ''} • {p.bank_account?.account_number || ''}
                  </Text>
                </View>
                <Text style={[styles.status, { color: statusColors[p.status] || '#6b7280' }]}>
                  {statusLabels[p.status] || p.status}
                </Text>
              </View>

              <View style={styles.cardRow}>
                <View>
                  <Text style={styles.label}>Số tiền</Text>
                  <Text style={styles.amount}>{fmt(Number(p.amount))}</Text>
                </View>
                <View>
                  <Text style={styles.label}>Phí</Text>
                  <Text style={styles.value}>{fmt(Number(p.fee))}</Text>
                </View>
                <View>
                  <Text style={styles.label}>Ngày</Text>
                  <Text style={styles.value}>{new Date(p.created_at).toLocaleDateString('vi-VN')}</Text>
                </View>
              </View>

              {p.note && <Text style={styles.note}>Ghi chú: {p.note}</Text>}

              {p.status === 'pending' && (
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.approveBtn, actionLoading === p.id && styles.disabled]}
                    onPress={() => handleApprove(p.id)}
                    disabled={actionLoading === p.id}
                  >
                    {actionLoading === p.id ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.actionBtnText}>Duyệt</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.rejectBtn, actionLoading === p.id && styles.disabled]}
                    onPress={() => handleReject(p.id)}
                    disabled={actionLoading === p.id}
                  >
                    {actionLoading === p.id ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.actionBtnText}>Từ chối</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))}
        </View>
        {totalCount > 0 && (
          <View style={styles.pagination}>
            <TouchableOpacity
              style={[styles.pageBtn, page <= 1 && styles.pageBtnDisabled]}
              onPress={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              <Text style={[styles.pageBtnText, page <= 1 && styles.pageBtnTextDisabled]}>Trước</Text>
            </TouchableOpacity>
            <Text style={styles.pageInfo}>Trang {page}</Text>
            <TouchableOpacity
              style={[styles.pageBtn, page * pageSize >= totalCount && styles.pageBtnDisabled]}
              onPress={() => setPage(p => p + 1)}
              disabled={page * pageSize >= totalCount}
            >
              <Text style={[styles.pageBtnText, page * pageSize >= totalCount && styles.pageBtnTextDisabled]}>Sau</Text>
            </TouchableOpacity>
          </View>
        )}</>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 16 },
  title: { fontSize: 24, fontWeight: '700', color: '#1f2937', marginBottom: 16, marginTop: 50 },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#d1d5db' },
  filterBtnActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  filterBtnText: { fontSize: 13, color: '#374151' },
  filterBtnTextActive: { color: '#fff' },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 60, fontSize: 16 },
  list: { gap: 12 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  userEmail: { fontSize: 15, fontWeight: '600', color: '#1f2937' },
  userName: { fontSize: 13, color: '#6b7280', marginTop: 1 },
  bankInfo: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  status: { fontSize: 13, fontWeight: '600' },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  label: { fontSize: 12, color: '#9ca3af' },
  amount: { fontSize: 17, fontWeight: '700', color: '#1f2937', marginTop: 2 },
  value: { fontSize: 14, fontWeight: '500', color: '#1f2937', marginTop: 2 },
  note: { fontSize: 12, color: '#dc2626', marginTop: 8, fontStyle: 'italic' },
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  approveBtn: { flex: 1, backgroundColor: '#059669', padding: 10, borderRadius: 8, alignItems: 'center' },
  rejectBtn: { flex: 1, backgroundColor: '#dc2626', padding: 10, borderRadius: 8, alignItems: 'center' },
  actionBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  disabled: { opacity: 0.5 },
  pagination: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 16, marginTop: 16, marginBottom: 24 },
  pageBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: '#3b82f6' },
  pageBtnDisabled: { backgroundColor: '#d1d5db' },
  pageBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  pageBtnTextDisabled: { color: '#9ca3af' },
  pageInfo: { fontSize: 14, fontWeight: '600', color: '#1f2937' },
})
