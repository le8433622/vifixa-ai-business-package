import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import WalletDashboard from '../../components/WalletDashboard';

export default function WorkerEarnings() {
  const router = useRouter();
  const [wallet, setWallet] = useState({ balance: 0, locked: 0 });
  const [payouts, setPayouts] = useState<any[]>([]);
  const [stripeId, setStripeId] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  const [ledgerEntries, setLedgerEntries] = useState<any[]>([]);
  const [orderMap, setOrderMap] = useState<Map<string, any>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login'); return; }
      const { data: wallet } = await supabase
        .from('wallets')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('wallet_type', 'txn')
        .single();
      if (!wallet) { setIsLoading(false); return; }
      const { data: entries } = await supabase
        .from('ledger')
        .select('*')
        .eq('wallet_id', wallet.id)
        .eq('direction', 'credit')
        .in('account', ['escrow.held', 'escrow.released'])
        .order('created_at', { ascending: false });
      setLedgerEntries(entries || []);
      const orderIds = [...new Set((entries || []).map((e: any) => e.reference_id).filter(Boolean))];
      if (orderIds.length > 0) {
        const { data: orders } = await supabase
          .from('orders')
          .select('id, category')
          .in('id', orderIds);
        if (orders) setOrderMap(new Map(orders.map((o: any) => [o.id, o])));
      }
      setIsLoading(false);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      let wRes, sRes;
      try { wRes = await supabase.from('wallets').select('balance,locked').eq('user_id', session.user.id).single(); } catch { wRes = { data: null }; }
      const pRes = await supabase.from('payouts').select('*').eq('worker_id', session.user.id).order('created_at', { ascending: false }).limit(20);
      try { sRes = await supabase.from('workers').select('stripe_account_id, stripe_onboarding_complete').eq('id', session.user.id).single(); } catch { sRes = { data: null }; }
      if (wRes.data) setWallet(wRes.data as any);
      if (pRes.data) setPayouts(pRes.data);
      if (sRes.data?.stripe_account_id) {
        setStripeId(sRes.data.stripe_account_id);
      }
    })();
  }, []);

  async function handleConnectStripe() {
    setConnecting(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data } = await supabase.functions.invoke('stripe-connect', {
      body: { worker_id: session.user.id, email: session.user.email, country: 'VN' },
    });
    const d = data as any;
    if (d?.onboarding_url) Linking.openURL(d.onboarding_url);
    else if (d?.url) Linking.openURL(d.url);
    setConnecting(false);
  }

  const pendingEarned = ledgerEntries
    .filter((e: any) => e.account === 'escrow.held')
    .reduce((s: number, e: any) => s + e.amount, 0);
  const releasedEntries = ledgerEntries.filter((e: any) => e.account === 'escrow.released');
  const todayEarned = releasedEntries
    .filter((e: any) => new Date(e.created_at).toDateString() === new Date().toDateString())
    .reduce((s: number, e: any) => s + e.amount, 0);
  const weekEarned = releasedEntries
    .filter((e: any) => (Date.now() - new Date(e.created_at).getTime()) < 7 * 86400000)
    .reduce((s: number, e: any) => s + e.amount, 0);
  const totalEarned = releasedEntries.reduce((s: number, e: any) => s + e.amount, 0);

  if (isLoading) return <View style={styles.center}><ActivityIndicator size="large" color="#059669" /></View>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 4-Wallet Dashboard */}
      <WalletDashboard />

      <View style={styles.statsRow}>
        {[
          { label: 'Hôm nay', value: todayEarned },
          { label: 'Tuần này', value: weekEarned },
          { label: 'Đang chờ', value: pendingEarned, color: '#d97706' },
          { label: 'Tổng', value: totalEarned },
        ].map(s => (
          <View key={s.label} style={styles.statCard}>
            <Text style={[styles.statNum, s.color ? { color: s.color } : undefined]}>{s.value.toLocaleString()}₫</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Giao dịch gần đây</Text>
      {ledgerEntries.length === 0 ? (
        <Text style={styles.emptyText}>Chưa có giao dịch</Text>
      ) : (
        ledgerEntries.slice(0, 10).map((e: any) => {
          const order = e.reference_id ? orderMap.get(e.reference_id) : null;
          const isReleased = e.account === 'escrow.released';
          return (
          <View key={e.id} style={styles.txRow}>
            <Text style={styles.txIcon}>{isReleased ? '✅' : '⏳'}</Text>
            <View style={styles.txInfo}>
              <Text style={styles.txName}>{order?.category || e.description}</Text>
              <Text style={styles.txDate}>{new Date(e.created_at).toLocaleDateString('vi-VN')}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.txAmount}>+{e.amount.toLocaleString()}₫</Text>
              <Text style={[styles.statusBadge, { color: isReleased ? '#059669' : '#d97706', fontSize: 10 }]}>
                {isReleased ? 'Đã nhận' : 'Đang chờ'}
              </Text>
            </View>
          </View>
        )})
      )}

      {/* Stripe Connect */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🌐 Phương thức thanh toán</Text>
        <TouchableOpacity style={styles.stripeBtn} onPress={handleConnectStripe} disabled={connecting}>
          <Text style={styles.stripeBtnText}>{connecting ? 'Đang kết nối...' : stripeId ? '✅ Đã kết nối Stripe' : '🔗 Kết nối Stripe Express'}</Text>
        </TouchableOpacity>
        {stripeId && <Text style={styles.stripeId}>{stripeId.slice(0, 12)}...</Text>}
      </View>

      {/* Payout History */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📋 Lịch sử nhận tiền</Text>
        {payouts.length === 0 ? (
          <Text style={styles.emptyText}>Chưa có giao dịch nhận tiền</Text>
        ) : payouts.map((p: any) => (
          <View key={p.id} style={styles.txRow}>
            <View style={styles.txInfo}>
              <Text style={styles.txAmount}>{p.amount?.toLocaleString()}₫</Text>
              <Text style={styles.txDate}>{new Date(p.created_at).toLocaleDateString('vi-VN')}</Text>
            </View>
            <Text style={[styles.statusBadge, {
              color: p.status === 'completed' ? '#059669' : p.status === 'pending' ? '#d97706' : '#dc2626',
            }]}>{p.status}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  walletCard: { backgroundColor: '#059669', padding: 24, borderRadius: 20, marginBottom: 16 },
  walletLabel: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginBottom: 4 },
  walletBalance: { fontSize: 32, fontWeight: 'bold', color: 'white' },
  walletLocked: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 4 },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  statCard: { flex: 1, backgroundColor: 'white', padding: 12, borderRadius: 12, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  statNum: { fontSize: 14, fontWeight: 'bold', color: '#059669' },
  statLabel: { fontSize: 10, color: '#999', marginTop: 2 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  txRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 14, borderRadius: 12, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  txIcon: { fontSize: 20, marginRight: 12 },
  txInfo: { flex: 1 },
  txName: { fontSize: 14, fontWeight: '500' },
  txDate: { fontSize: 11, color: '#999', marginTop: 2 },
  txAmount: { fontSize: 14, fontWeight: 'bold', color: '#059669' },
  emptyText: { textAlign: 'center', color: '#999', padding: 40 },
  section: { backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  stripeBtn: { backgroundColor: '#4f46e5', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  stripeBtnText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  stripeId: { fontSize: 10, color: '#818cf8', marginTop: 4, textAlign: 'center' },
  statusBadge: { fontSize: 12, fontWeight: '600', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, overflow: 'hidden' },
});
