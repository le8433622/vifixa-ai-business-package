// Worker Wallet — balance, withdrawal request, transaction history
import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator, Alert, ScrollView, RefreshControl } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { LinearGradient } from 'expo-linear-gradient'

export default function WorkerWallet() {
  const router = useRouter()
  const [balance, setBalance] = useState(0)
  const [locked, setLocked] = useState(0)
  const [entries, setEntries] = useState<any[]>([])
  const [payouts, setPayouts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showWithdraw, setShowWithdraw] = useState(false)
  const [withdrawAmount, setWithdrawAmount] = useState(0)
  const [bankName, setBankName] = useState('')
  const [bankAccount, setBankAccount] = useState('')
  const [bankHolder, setBankHolder] = useState('')
  const [withdrawLoading, setWithdrawLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => { checkUser() }, [])

  async function checkUser() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    Promise.all([fetchWallet(session), fetchLedger(session), fetchPayouts(session)])
  }

  async function fetchWallet(session: any) {
    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/wallet-manager?action=balance`,
        { headers: { Authorization: `Bearer ${session.access_token}` } }
      )
      if (!response.ok) throw new Error('Failed to fetch wallet')
      const data = await response.json()
      setBalance(data.balance || 0)
      setLocked(data.locked_amount || 0)
    } catch (err) {
      console.error('fetchWallet error:', err)
    } finally {
      setLoading(false)
    }
  }

  async function fetchLedger(session: any) {
    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/wallet-manager?action=ledger&limit=50`,
        { headers: { Authorization: `Bearer ${session.access_token}` } }
      )
      if (response.ok) {
        const data = await response.json()
        setEntries(data.entries || [])
      }
    } catch (err) {
      console.error('fetchLedger error:', err)
    }
  }

  async function fetchPayouts(session: any) {
    try {
      const { data, error } = await supabase
        .from('payouts')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(20)
      if (error) throw error
      setPayouts(data || [])
    } catch (err) {
      console.error('fetchPayouts error:', err)
    }
  }

  async function handleWithdraw() {
    const available = balance - locked
    if (withdrawAmount < 10000) {
      Alert.alert('Lỗi', 'Số tiền tối thiểu là 10.000 VNĐ')
      return
    }
    if (withdrawAmount > available) {
      Alert.alert('Lỗi', 'Số dư không đủ')
      return
    }
    if (!bankName || !bankAccount || !bankHolder) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ thông tin ngân hàng')
      return
    }
    setWithdrawLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/wallet-manager`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: withdrawAmount,
            bank_account: { bank_name: bankName, account_number: bankAccount, holder: bankHolder },
          }),
        }
      )
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Rút tiền thất bại')

      Alert.alert('Thành công', 'Yêu cầu rút tiền đã được tạo, chờ admin duyệt')
      setShowWithdraw(false)
      setWithdrawAmount(0)
      checkUser()
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Rút tiền thất bại')
    } finally {
      setWithdrawLoading(false)
    }
  }

  async function onRefresh() {
    setRefreshing(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      await Promise.all([fetchWallet(session), fetchLedger(session), fetchPayouts(session)])
    }
    setRefreshing(false)
  }

  const fmt = (v: number) => v.toLocaleString('vi-VN') + '₫'
  const available = balance - locked

  const statusLabels: Record<string, string> = { pending: 'Chờ duyệt', completed: 'Hoàn thành', failed: 'Thất bại' }

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <LinearGradient colors={['#059669', '#047857']} style={styles.banner}>
        <Text style={styles.bannerTitle}>Ví của tôi</Text>
        <Text style={styles.balanceText}>{fmt(balance)}</Text>
        <Text style={styles.balanceSub}>Có thể rút: {fmt(available)}</Text>
        <Text style={styles.balanceSub}>Đang chờ xử lý: {fmt(locked)}</Text>
      </LinearGradient>

      <View style={styles.section}>
        <TouchableOpacity style={styles.withdrawBtn} onPress={() => setShowWithdraw(!showWithdraw)}>
          <Text style={styles.withdrawBtnText}>{showWithdraw ? 'Đóng' : 'Rút tiền'}</Text>
        </TouchableOpacity>
      </View>

      {showWithdraw && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Rút tiền về tài khoản ngân hàng</Text>
          <TextInput style={styles.input} value={String(withdrawAmount)} onChangeText={(t) => setWithdrawAmount(Number(t) || 0)} keyboardType="number-pad" placeholder="Số tiền rút" />
          <TextInput style={styles.input} value={bankName} onChangeText={setBankName} placeholder="Tên ngân hàng (VD: Vietcombank)" />
          <TextInput style={styles.input} value={bankAccount} onChangeText={setBankAccount} keyboardType="number-pad" placeholder="Số tài khoản" />
          <TextInput style={styles.input} value={bankHolder} onChangeText={setBankHolder} placeholder="Chủ tài khoản" />
          <TouchableOpacity style={[styles.confirmBtn, withdrawLoading && styles.disabled]} onPress={handleWithdraw} disabled={withdrawLoading || withdrawAmount < 10000 || withdrawAmount > available}>
            {withdrawLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmBtnText}>Rút {fmt(withdrawAmount)}</Text>}
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Lịch sử rút tiền</Text>
        {payouts.length === 0 ? (
          <Text style={styles.emptyText}>Chưa có yêu cầu rút tiền</Text>
        ) : (
          payouts.map((p: any) => (
            <View key={p.id} style={styles.entry}>
              <View style={{ flex: 1 }}>
                <Text style={styles.entryDesc}>{fmt(Number(p.amount))}</Text>
                <Text style={styles.entryDate}>{new Date(p.created_at).toLocaleDateString('vi-VN')}</Text>
              </View>
              <Text style={[styles.entryAmt, { color: p.status === 'completed' ? '#059669' : p.status === 'failed' ? '#dc2626' : '#f59e0b' }]}>
                {statusLabels[p.status] || p.status}
              </Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Lịch sử giao dịch</Text>
        {loading ? <ActivityIndicator size="large" color="#059669" /> : entries.length === 0 ? (
          <Text style={styles.emptyText}>Chưa có giao dịch nào</Text>
        ) : (
          entries.map((e: any, i: number) => (
            <View key={e.id || i} style={styles.entry}>
              <View style={{ flex: 1 }}>
                <Text style={styles.entryDesc}>{e.description || e.account}</Text>
                <Text style={styles.entryDate}>{new Date(e.created_at).toLocaleDateString('vi-VN')}</Text>
              </View>
              <Text style={[styles.entryAmt, e.direction === 'credit' ? styles.credit : styles.debit]}>
                {e.direction === 'credit' ? '+' : '-'}{fmt(Number(e.amount))}
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  banner: { padding: 24, paddingTop: 60 },
  bannerTitle: { color: '#a7f3d0', fontSize: 14, marginBottom: 8 },
  balanceText: { color: '#fff', fontSize: 36, fontWeight: '700' },
  balanceSub: { color: '#a7f3d0', fontSize: 14, marginTop: 4 },
  section: { padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#1f2937', marginBottom: 12 },
  withdrawBtn: { backgroundColor: '#059669', padding: 12, borderRadius: 8, alignItems: 'center' },
  withdrawBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  card: { margin: 16, backgroundColor: '#fff', borderRadius: 12, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 12 },
  confirmBtn: { backgroundColor: '#059669', padding: 14, borderRadius: 8, alignItems: 'center' },
  confirmBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  disabled: { opacity: 0.5 },
  emptyText: { textAlign: 'center', color: '#9ca3af', marginTop: 24 },
  entry: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 8, marginBottom: 8 },
  entryDesc: { fontSize: 14, color: '#1f2937' },
  entryDate: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  entryAmt: { fontSize: 15, fontWeight: '600' },
  credit: { color: '#059669' },
  debit: { color: '#dc2626' },
})
