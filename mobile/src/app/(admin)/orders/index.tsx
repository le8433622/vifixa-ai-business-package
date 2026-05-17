import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function AdminOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
      setOrders(data || []);
      setLoading(false);
    })();
  }, []);

  const filtered = filter === 'all' ? orders : orders.filter((o: any) => o.status === filter);
  const stats = {
    total: orders.length,
    revenue: orders.filter((o: any) => o.status === 'completed').reduce((s: number, o: any) => s + (o.estimated_price || 0), 0),
    disputed: orders.filter((o: any) => o.status === 'disputed').length,
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#818cf8" /></View>;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📋 Đơn hàng</Text>
      <Text style={styles.stats}>Tổng: {stats.total} · DT: {(stats.revenue / 1000000).toFixed(1)}M · Khiếu nại: {stats.disputed}</Text>

      <View style={styles.filterRow}>
        {['all', 'pending', 'in_progress', 'completed', 'disputed'].map(s => (
          <TouchableOpacity key={s} onPress={() => setFilter(s)} style={[styles.filter, filter === s && styles.filterActive]}>
            <Text style={[styles.filterText, filter === s && styles.filterTextActive]}>{s}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList data={filtered} keyExtractor={(item: any) => item.id}
        renderItem={({ item }: { item: any }) => (
          <View style={styles.row}>
            <View style={styles.left}>
              <Text style={styles.cat}>{item.category}</Text>
              <Text style={styles.id}>{item.id.slice(0, 8)}</Text>
            </View>
            <View style={styles.right}>
              <Text style={styles.price}>{(item.estimated_price || 0).toLocaleString()}₫</Text>
              <Text style={[styles.badge, {
                color: item.status === 'completed' ? '#34d399' : item.status === 'in_progress' ? '#60a5fa' : item.status === 'disputed' ? '#f87171' : '#fbbf24'
              }]}>{item.status}</Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#e2e8f0', marginBottom: 4, marginTop: 10 },
  stats: { fontSize: 12, color: '#64748b', marginBottom: 16 },
  filterRow: { flexDirection: 'row', gap: 6, marginBottom: 16, flexWrap: 'wrap' },
  filter: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, backgroundColor: '#1e293b' },
  filterActive: { backgroundColor: '#6366f1' },
  filterText: { fontSize: 11, color: '#94a3b8' },
  filterTextActive: { color: 'white', fontWeight: 'bold' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1e293b', padding: 14, borderRadius: 12, marginBottom: 8 },
  left: { flex: 1 },
  cat: { color: '#e2e8f0', fontSize: 14, fontWeight: '500' },
  id: { color: '#475569', fontSize: 10, fontFamily: 'monospace', marginTop: 2 },
  right: { alignItems: 'flex-end' },
  price: { color: '#cbd5e1', fontSize: 14, fontWeight: 'bold' },
  badge: { fontSize: 10, fontWeight: 'bold', marginTop: 4 },
});
