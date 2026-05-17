import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function AdminNotificationsScreen() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('in_app_notifications')
      .select('*').order('created_at', { ascending: false }).limit(50)
      .then(({ data }) => { if (data) setNotifications(data); setLoading(false); });
  }, []);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#818cf8" /></View>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>🔔 Thông báo</Text>
      <Text style={styles.subtitle}>Tất cả thông báo trong hệ thống</Text>

      {notifications.length === 0 ? (
        <View style={styles.empty}><Text style={styles.emptyText}>Chưa có thông báo</Text></View>
      ) : notifications.map(n => (
        <View key={n.id} style={[styles.card, !n.read && styles.unread]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardType}>{n.type || 'system'}</Text>
            <Text style={styles.cardDate}>{new Date(n.created_at).toLocaleDateString('vi-VN')}</Text>
          </View>
          <Text style={styles.cardTitle}>{n.title}</Text>
          <Text style={styles.cardBody}>{n.body}</Text>
          {n.user_id && <Text style={styles.cardUser}>User: {n.user_id.slice(0, 8)}...</Text>}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' }, content: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#e2e8f0', marginBottom: 4, marginTop: 8 },
  subtitle: { fontSize: 12, color: '#64748b', marginBottom: 16 },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#64748b' },
  card: { backgroundColor: '#1e293b', borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#334155' },
  unread: { borderColor: '#6366f1' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  cardType: { fontSize: 10, color: '#818cf8', fontWeight: '600', textTransform: 'uppercase' },
  cardDate: { fontSize: 10, color: '#64748b' },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#e2e8f0', marginBottom: 4 },
  cardBody: { fontSize: 12, color: '#94a3b8', marginBottom: 4 },
  cardUser: { fontSize: 10, color: '#475569' },
});
