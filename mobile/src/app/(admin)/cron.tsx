import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface CronLog {
  id: string; job_name: string; status: string;
  started_at: string; completed_at: string | null;
  duration_ms: number | null; result_summary: string | null;
  error_message: string | null;
}

export default function AdminCronDashboard() {
  const [logs, setLogs] = useState<CronLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('cron_job_log')
        .select('*').order('started_at', { ascending: false }).limit(50);
      if (data) setLogs(data as CronLog[]);
      setLoading(false);
    })();
  }, []);

  const filtered = filter === 'all' ? logs : logs.filter(l => l.job_name === filter);
  const jobNames = [...new Set(logs.map(l => l.job_name))];
  const lastRun = (name: string) => logs.find(l => l.job_name === name && l.status === 'succeeded');

  const statusConfig: Record<string, { icon: string; color: string; bg: string }> = {
    succeeded: { icon: '✅', color: '#34d399', bg: '#064e3b' },
    failed: { icon: '❌', color: '#f87171', bg: '#7f1d1d' },
    started: { icon: '🔄', color: '#fbbf24', bg: '#78350f' },
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#818cf8" /></View>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>⏰ Cron Jobs</Text>

      {/* Summary cards */}
      <View style={styles.summaryRow}>
        {jobNames.map(name => {
          const last = lastRun(name);
          return (
            <View key={name} style={styles.summaryCard}>
              <Text style={styles.summaryName}>{name}</Text>
              <Text style={styles.summaryDate}>
                {last ? new Date(last.started_at).toLocaleDateString('vi-VN') : 'Chưa chạy'}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Filter */}
      <View style={styles.filterRow}>
        <Text style={styles.filterLabel} onPress={() => setFilter('all')}>Tất cả</Text>
        {jobNames.map(name => (
          <Text key={name} style={[styles.filterChip, filter === name && styles.filterActive]}
            onPress={() => setFilter(name)}>{name}</Text>
        ))}
      </View>

      {/* Log list */}
      {filtered.length === 0 ? (
        <View style={styles.empty}><Text style={styles.emptyText}>Chưa có lịch sử chạy</Text></View>
      ) : filtered.map(log => {
        const cfg = statusConfig[log.status] || statusConfig.started;
        return (
          <View key={log.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={{ fontSize: 20 }}>{cfg.icon}</Text>
              <View style={styles.cardInfo}>
                <Text style={styles.cardName}>{log.job_name}</Text>
                <Text style={styles.cardDate}>{new Date(log.started_at).toLocaleString('vi-VN')}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
                <Text style={[styles.badgeText, { color: cfg.color }]}>{log.status}</Text>
              </View>
            </View>
            {log.result_summary && <Text style={styles.summary}>{log.result_summary}</Text>}
            {log.error_message && <Text style={styles.error}>Lỗi: {log.error_message}</Text>}
            {log.duration_ms != null && (
              <Text style={styles.duration}>
                Thời gian: {(log.duration_ms / 1000).toFixed(1)}s
              </Text>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  content: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#e2e8f0', marginBottom: 16, marginTop: 8 },
  summaryRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  summaryCard: { flex: 1, backgroundColor: '#1e293b', padding: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  summaryName: { fontSize: 11, color: '#94a3b8', marginBottom: 4 },
  summaryDate: { fontSize: 12, color: '#e2e8f0', fontWeight: '500' },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  filterLabel: { fontSize: 13, color: '#64748b', paddingVertical: 6, paddingHorizontal: 12, backgroundColor: '#1e293b', borderRadius: 16 },
  filterChip: { fontSize: 13, color: '#94a3b8', paddingVertical: 6, paddingHorizontal: 12, backgroundColor: '#1e293b', borderRadius: 16 },
  filterActive: { backgroundColor: '#6366f1', color: 'white', fontWeight: 'bold' },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#64748b' },
  card: { backgroundColor: '#1e293b', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#334155' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  cardInfo: { flex: 1, marginLeft: 12 },
  cardName: { fontSize: 15, fontWeight: '600', color: '#e2e8f0' },
  cardDate: { fontSize: 11, color: '#64748b', marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  summary: { fontSize: 13, color: '#cbd5e1', marginBottom: 4 },
  error: { fontSize: 13, color: '#f87171', marginBottom: 4 },
  duration: { fontSize: 11, color: '#64748b' },
});
