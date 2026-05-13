// Customer Wallet — balance, top-up, transaction history
import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator, Alert, ScrollView, RefreshControl } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { LinearGradient } from 'expo-linear-gradient'

const QUICK_AMOUNTS = [50000, 100000, 200000, 500000, 1000000]

export default function CustomerWallet() {
  const router = useRouter()
  const [balance, setBalance] = useState(0)
  const [locked, setLocked] = useState(0)
  const [entries, setEntries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showTopup, setShowTopup] = useState(false)
  const [topupAmount, setTopupAmount] = useState(100000)
  const [topupLoading, setTopupLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => { checkUser() }, [])

  async function checkUser() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    fetchWallet(session)
    fetchLedger(session)
  }

  async function fetchWallet(session: any) {
    try {
      setLoading(true)
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

  async function handleTopup() {
    if (topupAmount < 10000) {
      Alert.alert('Lỗi', 'Số tiền tối thiểu là 10.000 VNĐ')
      return
    }
    setTopupLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/payment-process/create`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: topupAmount,
            type: 'topup',
            description: 'Nạp tiền vào ví',
            returnUrl: '', // App handles redirect differently
          }),
        }
      )

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Tạo yêu cầu nạp tiền thất bại')

      if (data.redirectUrl) {
        Alert.alert('Thành công', 'Đã chuyển hướng đến cổng thanh toán')
        // In a real app, open WebBrowser or redirect
      } else if (data.qrCode) {
        Alert.alert('Quét QR', 'Quét mã QR để thanh toán')
      } else {
        Alert.alert('Thành công', 'Yêu cầu nạp tiền đã được tạo')
        setShowTopup(false)
        checkUser()
      }
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Nạp tiền thất bại')
    } finally {
      setTopupLoading(false)
    }
  }

  async function onRefresh() {
    setRefreshing(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      await Promise.all([fetchWallet(session), fetchLedger(session)])
    }
    setRefreshing(false)
  }

  const fmt = (v: number) => v.toLocaleString('vi-VN') + '₫'

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <LinearGradient colors={['#2563eb', '#1d4ed8']} style={styles.banner}>
        <Text style={styles.bannerTitle}>Ví của tôi</Text>
        <Text style={styles.balanceText}>{fmt(balance)}</Text>
        <Text style={styles.balanceSub}>Số dư khả dụng: {fmt(balance - locked)}</Text>
        <Text style={styles.balanceSub}>Đang ký quỹ: {fmt(locked)}</Text>
      </LinearGradient>

      <View style={styles.section}>
        <TouchableOpacity style={styles.topupBtn} onPress={() => setShowTopup(!showTopup)}>
          <Text style={styles.topupBtnText}>{showTopup ? 'Đóng' : 'Nạp tiền'}</Text>
        </TouchableOpacity>
      </View>

      {showTopup && (
        <View style={styles.topupCard}>
          <Text style={styles.sectionTitle}>Nạp tiền vào ví</Text>
          <View style={styles.amountRow}>
            {QUICK_AMOUNTS.map(amt => (
              <TouchableOpacity
                key={amt}
                style={[styles.quickBtn, topupAmount === amt && styles.quickBtnActive]}
                onPress={() => setTopupAmount(amt)}
              >
                <Text style={[styles.quickBtnText, topupAmount === amt && styles.quickBtnTextActive]}>
                  {fmt(amt)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={styles.input}
            value={String(topupAmount)}
            onChangeText={(t) => setTopupAmount(Number(t) || 0)}
            keyboardType="number-pad"
            placeholder="Nhập số tiền"
          />
          <TouchableOpacity
            style={[styles.confirmBtn, topupLoading && styles.disabled]}
            onPress={handleTopup}
            disabled={topupLoading || topupAmount < 10000}
          >
            {topupLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.confirmBtnText}>Nạp {fmt(topupAmount)}</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Lịch sử giao dịch</Text>
        {loading ? (
          <ActivityIndicator size="large" color="#2563eb" />
        ) : entries.length === 0 ? (
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
  bannerTitle: { color: '#93c5fd', fontSize: 14, marginBottom: 8 },
  balanceText: { color: '#fff', fontSize: 36, fontWeight: '700' },
  balanceSub: { color: '#93c5fd', fontSize: 14, marginTop: 4 },
  section: { padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#1f2937', marginBottom: 12 },
  topupBtn: { backgroundColor: '#2563eb', padding: 12, borderRadius: 8, alignItems: 'center' },
  topupBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  topupCard: { margin: 16, backgroundColor: '#fff', borderRadius: 12, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  amountRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  quickBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#d1d5db' },
  quickBtnActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  quickBtnText: { fontSize: 13, color: '#374151' },
  quickBtnTextActive: { color: '#fff' },
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
