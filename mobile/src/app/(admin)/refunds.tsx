import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface RefundRequest {
  id: string; order_id: string; amount: number; reason: string;
  status: string; created_at: string; admin_note: string | null;
}

export default function AdminRefundsScreen() {
  const [refunds, setRefunds] = useState<RefundRequest[]>([]);
  const [filter, setFilter] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => { load() }, [filter]);

  async function load() {
    const { data } = await supabase.from('refund_requests')
      .select('*').eq('status', filter).order('created_at', { ascending: false });
    if (data) setRefunds(data as RefundRequest[]);
    setLoading(false);
  }

  async function handleApprove(refund: RefundRequest) {
    setActionLoading(refund.id);
    await supabase.from('refund_requests').update({ status: 'approved' }).eq('id', refund.id);
    await supabase.from('orders').update({ status: 'refunded', payment_status: 'refunded' }).eq('id', refund.order_id);
    setActionLoading(null);
    load();
  }

  async function handleReject(refund: RefundRequest) {
    setActionLoading(refund.id);
    await supabase.from('refund_requests').update({ status: 'rejected', admin_note: 'Từ chối bởi admin' }).eq('id', refund.id);
    setActionLoading(null);
    load();
  }

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#818cf8" /></View>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>💰 Yêu cầu hoàn tiền</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
        {['pending', 'approved', 'processed', 'rejected'].map(f => (
          <TouchableOpacity key={f} style={[styles.filterChip, filter === f && styles.filterActive]} onPress={() => setFilter(f)}>
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {refunds.length === 0 ? (
        <View style={styles.empty}><Text style={styles.emptyText}>Không có yêu cầu</Text></View>
      ) : refunds.map(r => (
        <View key={r.id} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardId}>#{r.id.slice(0, 8)}</Text>
            <View style={[styles.statusBadge, {
              backgroundColor: r.status === 'pending' ? '#78350f' : r.status === 'approved' ? '#065f46' : r.status === 'rejected' ? '#7f1d1d' : '#1e3a5f'
            }]}>
              <Text style={styles.statusText}>{r.status}</Text>
            </View>
          </View>
          <Text style={styles.cardAmount}>{r.amount?.toLocaleString()}₫</Text>
          <Text style={styles.cardReason} numberOfLines={2}>{r.reason}</Text>
          <Text style={styles.cardDate}>{new Date(r.created_at).toLocaleDateString('vi-VN')}</Text>

          {filter === 'pending' && (
            <View style={styles.actionRow}>
              <TouchableOpacity style={[styles.btn, styles.approveBtn]} onPress={() => handleApprove(r)} disabled={actionLoading === r.id}>
                <Text style={styles.btnText}>{actionLoading === r.id ? '...' : '✅ Duyệt'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.rejectBtn]} onPress={() => handleReject(r)} disabled={actionLoading === r.id}>
                <Text style={styles.btnText}>❌ Từ chối</Text>
              </TouchableOpacity>
            </View>
          )}
          {r.admin_note && <Text style={styles.note}>Ghi chú: {r.admin_note}</Text>}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' }, content: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#e2e8f0', marginBottom: 16, marginTop: 8 },
  filterRow: { marginBottom: 12 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: '#1e293b', marginRight: 8 },
  filterActive: { backgroundColor: '#6366f1' },
  filterText: { fontSize: 12, color: '#94a3b8' },
  filterTextActive: { color: 'white', fontWeight: '600' },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#64748b' },
  card: { backgroundColor: '#1e293b', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#334155' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  cardId: { fontSize: 12, color: '#64748b' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 10, color: 'white', fontWeight: '600' },
  cardAmount: { fontSize: 18, fontWeight: 'bold', color: '#fb923c', marginBottom: 6 },
  cardReason: { fontSize: 13, color: '#94a3b8', marginBottom: 4 },
  cardDate: { fontSize: 11, color: '#64748b', marginBottom: 10 },
  actionRow: { flexDirection: 'row', gap: 8 },
  btn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  approveBtn: { backgroundColor: '#065f46' },
  rejectBtn: { backgroundColor: '#7f1d1d' },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 13 },
  note: { fontSize: 11, color: '#fbbf24', marginTop: 6, fontStyle: 'italic' },
});
