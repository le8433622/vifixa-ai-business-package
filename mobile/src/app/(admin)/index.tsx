import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function AdminDashboard() {
  const router = useRouter();
  const [mode, setMode] = useState<'auto' | 'manual'>('auto');
  const [stats, setStats] = useState({ users: 0, workers: 0, orders: 0, disputes: 0, revenue: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [u, w, o, d] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('workers').select('id', { count: 'exact', head: true }),
        supabase.from('orders').select('estimated_price,status'),
        supabase.from('complaints').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
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
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>🛡️ AI Analyst</Text>
        <View style={styles.modeRow}>
          <TouchableOpacity style={[styles.modeBtn, mode === 'auto' && styles.modeActive]} onPress={() => setMode('auto')}>
            <Text style={[styles.modeText, mode === 'auto' && styles.modeTextActive]}>🤖 Auto</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.modeBtn, mode === 'manual' && styles.modeActive]} onPress={() => setMode('manual')}>
            <Text style={[styles.modeText, mode === 'manual' && styles.modeTextActive]}>👆 Manual</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.statsGrid}>
        {[
          { label: 'Người dùng', value: stats.users, color: '#60a5fa', bg: '#1e3a5f' },
          { label: 'Thợ', value: stats.workers, color: '#34d399', bg: '#064e3b' },
          { label: 'Đơn hàng', value: stats.orders, color: '#fbbf24', bg: '#78350f' },
          { label: 'Doanh thu', value: `${(stats.revenue / 1000000).toFixed(1)}M`, color: '#a78bfa', bg: '#4c1d95' },
          { label: 'Khiếu nại', value: stats.disputes, color: '#f87171', bg: '#7f1d1d' },
        ].map(s => (
          <View key={s.label} style={[styles.statCard, { backgroundColor: s.bg }]}>
            <Text style={[styles.statNum, { color: s.color }]}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {stats.disputes > 0 && (
        <TouchableOpacity style={styles.alertBtn} onPress={() => router.push('/admin/orders')}>
          <Text style={styles.alertText}>🚨 {stats.disputes} khiếu nại cần xử lý</Text>
        </TouchableOpacity>
      )}

      {mode === 'manual' && (
        <View>
          <Text style={styles.sectionTitle}>📋 Menu</Text>
          <View style={styles.menuGrid}>
            {[
              { icon: '📊', name: 'Dashboard', href: '/admin' },
              { icon: '👥', name: 'Người dùng', href: '/admin/users' },
              { icon: '📋', name: 'Đơn hàng', href: '/admin/orders' },
              { icon: '🪪', name: 'KYC', href: '/admin/kyc' },
              { icon: '💳', name: 'Thanh toán', href: '/admin/payments' },
              { icon: '⚖️', name: 'Khiếu nại', href: '/admin/disputes' },
              { icon: '💰', name: 'Hoàn tiền', href: '/admin/refunds' },
              { icon: '🔒', name: 'Khóa TK', href: '/admin/locks' },
              { icon: '📈', name: 'Phân tích', href: '/admin/analytics' },
              { icon: '🔔', name: 'Thông báo', href: '/admin/notifications' },
              { icon: '🔌', name: 'Tích hợp', href: '/admin/integrations' },
              { icon: '⚙️', name: 'Cài đặt', href: '/admin/settings' },
            ].map(item => (
              <TouchableOpacity key={item.name} style={styles.menuItem} onPress={() => router.push(item.href as any)}>
                <Text style={styles.menuIcon}>{item.icon}</Text>
                <Text style={styles.menuName}>{item.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  content: { paddingBottom: 32 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' },
  hero: { backgroundColor: '#1e293b', padding: 24, paddingTop: 60, alignItems: 'center' },
  heroTitle: { fontSize: 24, fontWeight: 'bold', color: '#e2e8f0', marginBottom: 16 },
  modeRow: { flexDirection: 'row', backgroundColor: '#334155', borderRadius: 8 },
  modeBtn: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 8 },
  modeActive: { backgroundColor: '#6366f1' },
  modeText: { fontSize: 14, color: '#94a3b8' },
  modeTextActive: { color: 'white', fontWeight: 'bold' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 8 },
  statCard: { width: '30%', padding: 14, borderRadius: 16, alignItems: 'center' },
  statNum: { fontSize: 20, fontWeight: 'bold' },
  statLabel: { fontSize: 10, color: '#94a3b8', marginTop: 4 },
  alertBtn: { backgroundColor: '#7f1d1d', margin: 12, padding: 16, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#991b1b' },
  alertText: { color: '#fca5a5', fontSize: 14, fontWeight: 'bold' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#e2e8f0', marginHorizontal: 16, marginBottom: 12 },
  menuGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: 12, gap: 8 },
  menuItem: { width: '46%', backgroundColor: '#1e293b', padding: 20, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  menuIcon: { fontSize: 28, marginBottom: 4 },
  menuName: { fontSize: 14, fontWeight: '500', color: '#cbd5e1' },
});
