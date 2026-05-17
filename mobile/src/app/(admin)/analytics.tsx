import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function AdminAnalyticsScreen() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ users: 0, workers: 0, orders: 0, revenue: 0, disputes: 0 });

  useEffect(() => {
    (async () => {
      const [u, w, o, d] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('workers').select('id', { count: 'exact', head: true }),
        supabase.from('orders').select('estimated_price,status'),
        supabase.from('complaints').select('id', { count: 'exact', head: true }),
      ]);
      const orders = (o.data || []) as any[];
      setStats({
        users: u.count || 0, workers: w.count || 0, orders: orders.length,
        revenue: orders.filter((o: any) => o.status === 'completed').reduce((s: number, o: any) => s + (o.estimated_price || 0), 0),
        disputes: d.count || 0,
      });
      setLoading(false);
    })();
  }, []);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#818cf8" /></View>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>📊 Phân tích</Text>
      <View style={styles.grid}>
        {[
          { label: 'Người dùng', value: stats.users, color: '#60a5fa', bg: '#1e3a5f' },
          { label: 'Thợ', value: stats.workers, color: '#34d399', bg: '#064e3b' },
          { label: 'Đơn hàng', value: stats.orders, color: '#fbbf24', bg: '#78350f' },
          { label: 'Doanh thu', value: `${(stats.revenue / 1000000).toFixed(1)}M`, color: '#a78bfa', bg: '#4c1d95' },
        ].map(s => (
          <View key={s.label} style={[styles.card, { backgroundColor: s.bg }]}>
            <Text style={[styles.cardVal, { color: s.color }]}>{s.value}</Text>
            <Text style={styles.cardLabel}>{s.label}</Text>
          </View>
        ))}
      </View>
      <View style={styles.insightBox}>
        <Text style={styles.insightTitle}>📈 Thông tin thị trường</Text>
        <Text style={styles.insightText}>Tỉ lệ đơn hoàn thành: {stats.orders > 0 ? `${((stats.orders - stats.disputes) / stats.orders * 100).toFixed(0)}%` : 'N/A'}</Text>
        <Text style={styles.insightText}>Doanh thu TB/đơn: {stats.orders > 0 ? `${(stats.revenue / stats.orders).toLocaleString()}₫` : 'N/A'}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' }, content: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#e2e8f0', marginBottom: 16, marginTop: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  card: { width: '47%', padding: 20, borderRadius: 16, alignItems: 'center' },
  cardVal: { fontSize: 24, fontWeight: 'bold' },
  cardLabel: { fontSize: 12, color: '#94a3b8', marginTop: 4 },
  insightBox: { backgroundColor: '#1e293b', borderRadius: 16, padding: 16, marginTop: 16, borderWidth: 1, borderColor: '#334155' },
  insightTitle: { fontSize: 14, fontWeight: 'bold', color: '#e2e8f0', marginBottom: 8 },
  insightText: { fontSize: 13, color: '#94a3b8', marginBottom: 4 },
});
