import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useState } from 'react';

export default function WorkerDashboard() {
  const router = useRouter();
  const [mode, setMode] = useState<'auto' | 'manual'>('auto');

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['worker-orders'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login'); return []; }
      const { data } = await supabase.from('orders').select('*')
        .or(`worker_id.eq.${session.user.id},status.eq.pending`)
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  const pendingJobs = orders.filter((o: any) => o.status === 'pending');
  const activeJob = orders.find((o: any) => o.status === 'in_progress' && o.worker_id);
  const myJobs = orders.filter((o: any) => o.status !== 'pending' && o.worker_id);
  const completedJobs = orders.filter((o: any) => o.status === 'completed' && o.worker_id);
  const todayEarned = completedJobs.filter((o: any) => new Date(o.created_at).toDateString() === new Date().toDateString())
    .reduce((s: number, o: any) => s + (o.estimated_price || 0), 0);
  const totalEarned = completedJobs.reduce((s: number, o: any) => s + (o.estimated_price || 0), 0);

  if (isLoading) return <View style={styles.center}><ActivityIndicator size="large" color="#059669" /></View>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* AI Co-pilot Hero */}
      <View style={styles.hero}>
        <Text style={styles.heroEmoji}>🔧</Text>
        <Text style={styles.heroTitle}>AI Co-pilot</Text>
        <Text style={styles.heroSubtitle}>Đối tác tin cậy của bạn</Text>
        
        <View style={styles.modeRow}>
          <TouchableOpacity style={[styles.modeBtn, mode === 'auto' && styles.modeActive]} onPress={() => setMode('auto')}>
            <Text style={[styles.modeText, mode === 'auto' && styles.modeTextActive]}>🤖 Auto</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.modeBtn, mode === 'manual' && styles.modeActive]} onPress={() => setMode('manual')}>
            <Text style={[styles.modeText, mode === 'manual' && styles.modeTextActive]}>👆 Manual</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.chatBtn} onPress={() => router.push('/(worker)/chat')}>
          <Text style={styles.chatBtnText}>💬 Chat với AI</Text>
        </TouchableOpacity>
      </View>

      {/* AUTO MODE: Smart widgets */}
      {mode === 'auto' && (
        <>
          {activeJob ? (
            <TouchableOpacity style={styles.activeCard} onPress={() => router.push(`/worker/jobs/${activeJob.id}`)}>
              <Text style={styles.activeTitle}>🔧 Đang làm: {activeJob.category}</Text>
              <Text style={styles.activeDesc}>{activeJob.description?.slice(0, 80)}</Text>
              <Text style={styles.activePrice}>{activeJob.estimated_price.toLocaleString()}₫</Text>
            </TouchableOpacity>
          ) : pendingJobs.length > 0 ? (
            <TouchableOpacity style={styles.widgetCard} onPress={() => router.push('/worker/jobs')}>
              <Text style={styles.widgetTitle}>📋 {pendingJobs.length} việc mới</Text>
              <Text style={styles.widgetDesc}>{pendingJobs[0].category} · {pendingJobs[0].estimated_price.toLocaleString()}₫</Text>
            </TouchableOpacity>
          ) : null}

          <View style={styles.statsRow}>
            <View style={styles.statCard}><Text style={styles.statNum}>{todayEarned.toLocaleString()}₫</Text><Text style={styles.statLabel}>Hôm nay</Text></View>
            <View style={styles.statCard}><Text style={styles.statNum}>{myJobs.length}</Text><Text style={styles.statLabel}>Việc của tôi</Text></View>
            <View style={styles.statCard}><Text style={styles.statNum}>{completedJobs.length}</Text><Text style={styles.statLabel}>Hoàn thành</Text></View>
          </View>
        </>
      )}

      {/* MANUAL MODE: Full menu */}
      {mode === 'manual' && (
        <View>
          <Text style={styles.sectionTitle}>📋 Menu</Text>
          <View style={styles.menuGrid}>
            {[
              { icon: '📋', name: 'Việc mới', count: pendingJobs.length, href: '/worker/jobs' },
              { icon: '🔧', name: 'Đang làm', count: activeJob ? 1 : 0, href: activeJob ? `/worker/jobs/${activeJob.id}` : '/worker/jobs' },
              { icon: '💰', name: 'Thu nhập', href: '/worker/earnings' },
              { icon: '📊', name: 'Lịch sử', href: '/worker/jobs' },
              { icon: '👤', name: 'Hồ sơ', href: '/worker/profile' },
            ].map(item => (
              <TouchableOpacity key={item.name} style={styles.menuItem} onPress={() => router.push(item.href as any)}>
                <Text style={styles.menuIcon}>{item.icon}</Text>
                <Text style={styles.menuName}>{item.name}</Text>
                {item.count ? <View style={styles.badge}><Text style={styles.badgeText}>{item.count}</Text></View> : null}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>{myJobs.length} việc · {completedJobs.length} hoàn thành · {totalEarned.toLocaleString()}₫ kiếm được</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { paddingBottom: 32 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  hero: { backgroundColor: '#059669', padding: 24, paddingTop: 60, alignItems: 'center' },
  heroEmoji: { fontSize: 48, marginBottom: 8 },
  heroTitle: { fontSize: 24, fontWeight: 'bold', color: 'white', marginBottom: 4 },
  heroSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginBottom: 16 },
  modeRow: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8, marginBottom: 16 },
  modeBtn: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 8 },
  modeActive: { backgroundColor: 'white' },
  modeText: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  modeTextActive: { color: '#059669', fontWeight: 'bold' },
  chatBtn: { backgroundColor: 'white', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, width: '100%', alignItems: 'center' },
  chatBtnText: { color: '#059669', fontSize: 16, fontWeight: 'bold' },
  activeCard: { backgroundColor: 'white', margin: 16, padding: 16, borderRadius: 16, borderWidth: 2, borderColor: '#059669', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  activeTitle: { fontSize: 16, fontWeight: 'bold', color: '#059669', marginBottom: 4 },
  activeDesc: { fontSize: 13, color: '#666', marginBottom: 8 },
  activePrice: { fontSize: 18, fontWeight: 'bold', color: '#059669' },
  widgetCard: { backgroundColor: 'white', margin: 16, marginBottom: 0, padding: 16, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  widgetTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  widgetDesc: { fontSize: 13, color: '#666' },
  statsRow: { flexDirection: 'row', margin: 16, gap: 8 },
  statCard: { flex: 1, backgroundColor: 'white', padding: 12, borderRadius: 12, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  statNum: { fontSize: 16, fontWeight: 'bold', color: '#059669' },
  statLabel: { fontSize: 10, color: '#999', marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginHorizontal: 16, marginBottom: 12 },
  menuGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: 12, gap: 8 },
  menuItem: { width: '30%', backgroundColor: 'white', padding: 16, borderRadius: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  menuIcon: { fontSize: 28, marginBottom: 4 },
  menuName: { fontSize: 12, fontWeight: '500' },
  badge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#ef4444', width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  footer: { padding: 20, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#e5e7eb', marginTop: 16 },
  footerText: { fontSize: 12, color: '#999' },
});
