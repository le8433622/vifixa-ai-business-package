import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import WalletDashboard from '../../components/WalletDashboard';

export default function WorkerEarnings() {
  const router = useRouter();
  const [wallet, setWallet] = useState({ balance: 0, locked: 0 });

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['worker-earnings'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login'); return []; }
      const { data } = await supabase.from('orders').select('*')
        .eq('worker_id', session.user.id).order('created_at', { ascending: false });
      return data || [];
    },
  });

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase.from('wallets').select('balance,locked').eq('user_id', session.user.id).single().catch(() => ({ data: null }));
      if (data) setWallet(data as any);
    })();
  }, []);

  const completed = orders.filter((o: any) => o.status === 'completed');
  const todayEarned = completed.filter((o: any) => new Date(o.created_at).toDateString() === new Date().toDateString())
    .reduce((s: number, o: any) => s + (o.estimated_price || 0), 0);
  const weekEarned = completed.filter((o: any) => (Date.now() - new Date(o.created_at).getTime()) < 7 * 86400000)
    .reduce((s: number, o: any) => s + (o.estimated_price || 0), 0);
  const totalEarned = completed.reduce((s: number, o: any) => s + (o.estimated_price || 0), 0);

  if (isLoading) return <View style={styles.center}><ActivityIndicator size="large" color="#059669" /></View>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 4-Wallet Dashboard */}
      <WalletDashboard />

      <View style={styles.statsRow}>
        {[
          { label: 'Hôm nay', value: todayEarned },
          { label: 'Tuần này', value: weekEarned },
          { label: 'Tổng', value: totalEarned },
        ].map(s => (
          <View key={s.label} style={styles.statCard}>
            <Text style={styles.statNum}>{s.value.toLocaleString()}₫</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Giao dịch gần đây</Text>
      {completed.length === 0 ? (
        <Text style={styles.emptyText}>Chưa có giao dịch</Text>
      ) : completed.slice(0, 10).map((o: any) => (
        <View key={o.id} style={styles.txRow}>
          <Text style={styles.txIcon}>✅</Text>
          <View style={styles.txInfo}>
            <Text style={styles.txName}>{o.category}</Text>
            <Text style={styles.txDate}>{new Date(o.created_at).toLocaleDateString()}</Text>
          </View>
          <Text style={styles.txAmount}>+{(o.estimated_price || 0).toLocaleString()}₫</Text>
        </View>
      ))}
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
});
