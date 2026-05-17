import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface PaymentIntent {
  id: string; gateway: string; amount: number; status: string;
  order_id: string; created_at: string;
}

export default function AdminPaymentsScreen() {
  const [payments, setPayments] = useState<PaymentIntent[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('payment_intents').select('*').order('created_at', { ascending: false }).limit(50)
      .then(({ data }) => { if (data) setPayments(data as PaymentIntent[]); setLoading(false); });
  }, []);

  const stats = {
    total: payments.length,
    succeeded: payments.filter(p => p.status === 'succeeded').length,
    failed: payments.filter(p => p.status === 'failed').length,
    pending: payments.filter(p => p.status === 'pending').length,
    revenue: payments.filter(p => p.status === 'succeeded').reduce((s, p) => s + (p.amount || 0), 0),
  };

  const filtered = filter === 'all' ? payments : payments.filter(p => p.status === filter);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#818cf8" /></View>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>💳 Thanh toán</Text>

      <View style={styles.statsRow}>
        {[
          { label: 'Tổng GD', value: stats.total, color: '#60a5fa' },
          { label: 'Thành công', value: stats.succeeded, color: '#34d399' },
          { label: 'Thất bại', value: stats.failed, color: '#f87171' },
          { label: 'Chờ', value: stats.pending, color: '#fbbf24' },
          { label: 'Doanh thu', value: `${(stats.revenue / 1000000).toFixed(1)}M`, color: '#a78bfa' },
        ].map(s => (
          <View key={s.label} style={[styles.statCard, { backgroundColor: s.color + '20' }]}>
            <Text style={[styles.statVal, { color: s.color }]}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
        {['all', 'pending', 'succeeded', 'failed', 'refunded'].map(f => (
          <TouchableOpacity key={f} style={[styles.filterChip, filter === f && styles.filterActive]} onPress={() => setFilter(f)}>
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f === 'all' ? 'Tất cả' : f}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {filtered.length === 0 ? (
        <View style={styles.empty}><Text style={styles.emptyText}>Chưa có giao dịch</Text></View>
      ) : filtered.map(p => (
        <View key={p.id} style={styles.row}>
          <View style={styles.rowLeft}>
            <Text style={styles.rowId}>{p.id.slice(0, 8)}...</Text>
            <View style={[styles.gatewayBadge, { backgroundColor: p.gateway === 'vnpay' ? '#1e3a5f' : '#4c1d95' }]}>
              <Text style={styles.gatewayText}>{p.gateway?.toUpperCase() || 'N/A'}</Text>
            </View>
          </View>
          <View style={styles.rowRight}>
            <Text style={styles.rowAmount}>{p.amount?.toLocaleString()}₫</Text>
            <View style={[styles.statusBadge, {
              backgroundColor: p.status === 'succeeded' ? '#065f46' : p.status === 'failed' ? '#7f1d1d' : '#78350f'
            }]}>
              <Text style={styles.statusText}>{p.status}</Text>
            </View>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' }, content: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#e2e8f0', marginBottom: 16, marginTop: 8 },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  statCard: { width: '30%', padding: 12, borderRadius: 12, alignItems: 'center' },
  statVal: { fontSize: 18, fontWeight: 'bold' },
  statLabel: { fontSize: 10, color: '#94a3b8', marginTop: 4 },
  filterRow: { marginBottom: 12 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: '#1e293b', marginRight: 8 },
  filterActive: { backgroundColor: '#6366f1' },
  filterText: { fontSize: 12, color: '#94a3b8' },
  filterTextActive: { color: 'white', fontWeight: '600' },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#64748b' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1e293b', padding: 14, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#334155' },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowId: { fontSize: 12, color: '#64748b' },
  gatewayBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  gatewayText: { fontSize: 10, color: 'white', fontWeight: '600' },
  rowRight: { alignItems: 'flex-end' },
  rowAmount: { fontSize: 14, fontWeight: 'bold', color: '#e2e8f0' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginTop: 4 },
  statusText: { fontSize: 10, color: 'white', fontWeight: '500' },
});
