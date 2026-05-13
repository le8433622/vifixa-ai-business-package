// Admin Wallets — view all wallets, adjust balance
import { useState, useEffect } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView, RefreshControl, Modal } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'

export default function AdminWallets() {
  const router = useRouter()
  const [wallets, setWallets] = useState<any[]>([])
  const [summary, setSummary] = useState({ total: 0, totalBalance: 0, totalLocked: 0, pendingPayouts: 0, pendingPayoutAmount: 0 })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedWallet, setSelectedWallet] = useState<any>(null)
  const [adjustAmount, setAdjustAmount] = useState(0)
  const [adjustReason, setAdjustReason] = useState('')
  const [saving, setSaving] = useState(false)

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

  async function handleAdjust() {
    if (!selectedWallet || adjustAmount === 0 || !adjustReason) {
      Alert.alert('Lỗi', 'Vui lòng nhập số tiền và lý do')
      return
    }
    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      if (adjustAmount > 0) {
        const { data: result, error: rpcError } = await supabase
          .rpc('add_wallet_funds', {
            p_user_id: selectedWallet.user_id,
            p_amount: adjustAmount,
            p_reference_type: 'adjustment',
            p_description: `Admin điều chỉnh: ${adjustReason}`,
          })
        if (rpcError) throw rpcError
        if (!result.success) throw new Error(result.error)
      } else {
        const deductAmount = Math.abs(adjustAmount)
        const { data: wallet } = await supabase
          .from('wallets')
          .select('id, balance')
          .eq('user_id', selectedWallet.user_id)
          .single()

        if (!wallet) throw new Error('Wallet not found')
        if (Number(wallet.balance) < deductAmount) throw new Error('Số dư không đủ')

        await supabase
          .from('wallets')
          .update({ balance: Number(wallet.balance) - deductAmount })
          .eq('id', wallet.id)

        await supabase
          .from('ledger_entries')
          .insert({
            transaction_id: `adjust_${Date.now()}`,
            wallet_id: wallet.id,
            account: 'wallet.adjustment',
            direction: 'debit',
            amount: deductAmount,
            reference_type: 'fee',
            description: `Admin điều chỉnh: ${adjustReason}`,
          })
      }

      Alert.alert('Thành công', 'Đã điều chỉnh số dư')
      setSelectedWallet(null)
      setAdjustReason('')
      setAdjustAmount(0)
      fetchData()
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Điều chỉnh thất bại')
    } finally {
      setSaving(false)
    }
  }

  const fmt = (v: number) => v.toLocaleString('vi-VN') + '₫'
  const avail = (w: any) => (Number(w.balance) || 0) - (Number(w.locked_amount) || 0)

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
            <TouchableOpacity key={w.id} style={styles.card} onPress={() => { setSelectedWallet(w); setAdjustAmount(0); setAdjustReason('') }}>
              <View style={styles.cardHeader}>
                <Text style={styles.userEmail}>{w.profiles?.email || w.user_id?.slice(0, 8)}</Text>
                <Text style={styles.userRole}>{w.profiles?.role || 'N/A'}</Text>
              </View>
              <View style={styles.cardRow}>
                <View><Text style={styles.label}>Số dư</Text><Text style={styles.value}>{fmt(Number(w.balance))}</Text></View>
                <View><Text style={styles.label}>Đang lock</Text><Text style={styles.value}>{fmt(Number(w.locked_amount || 0))}</Text></View>
                <View><Text style={styles.label}>Khả dụng</Text><Text style={styles.value}>{fmt(avail(w))}</Text></View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <Modal visible={!!selectedWallet} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Chi tiết ví</Text>
            {selectedWallet && (
              <>
                <Text style={styles.modalUser}>{selectedWallet.profiles?.email}</Text>
                <View style={styles.balanceRow}>
                  <Text style={styles.balanceLabel}>Số dư: <Text style={styles.balanceValue}>{fmt(Number(selectedWallet.balance))}</Text></Text>
                  <Text style={styles.balanceLabel}>Khả dụng: <Text style={{ ...styles.balanceValue, color: '#059669' }}>{fmt(avail(selectedWallet))}</Text></Text>
                </View>

                <View style={styles.adjustSection}>
                  <Text style={styles.adjustTitle}>Điều chỉnh số dư</Text>
                  <TextInput
                    style={styles.input}
                    value={String(adjustAmount)}
                    onChangeText={(t) => setAdjustAmount(Number(t) || 0)}
                    keyboardType="number-pad"
                    placeholder="Số tiền (dương = cộng, âm = trừ)"
                  />
                  <TextInput
                    style={styles.input}
                    value={adjustReason}
                    onChangeText={setAdjustReason}
                    placeholder="Lý do điều chỉnh"
                  />
                  <TouchableOpacity
                    style={[styles.confirmBtn, saving && styles.disabled]}
                    onPress={handleAdjust}
                    disabled={saving || adjustAmount === 0 || !adjustReason}
                  >
                    {saving ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.confirmBtnText}>
                        {adjustAmount >= 0 ? '+' : ''}{fmt(Math.abs(adjustAmount))}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedWallet(null)}>
                  <Text style={styles.closeBtnText}>Đóng</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
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
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#1f2937', marginBottom: 8 },
  modalUser: { fontSize: 14, color: '#6b7280', marginBottom: 12 },
  balanceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  balanceLabel: { fontSize: 14, color: '#374151' },
  balanceValue: { fontSize: 16, fontWeight: '700', color: '#2563eb' },
  adjustSection: { borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 16, marginBottom: 16 },
  adjustTitle: { fontSize: 16, fontWeight: '600', color: '#1f2937', marginBottom: 12 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, fontSize: 14, marginBottom: 12, backgroundColor: '#fff' },
  confirmBtn: { backgroundColor: '#2563eb', padding: 14, borderRadius: 8, alignItems: 'center' },
  confirmBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  closeBtn: { padding: 12, alignItems: 'center', borderRadius: 8, borderWidth: 1, borderColor: '#d1d5db' },
  closeBtnText: { fontSize: 14, fontWeight: '500', color: '#6b7280' },
  disabled: { opacity: 0.5 },
})
