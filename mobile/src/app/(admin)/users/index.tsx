import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function AdminUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<string>('all');

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      setUsers(data || []);
      setLoading(false);
    })();
  }, []);

  const filtered = tab === 'all' ? users : users.filter((u: any) => u.role === tab);
  const counts: Record<string, number> = { all: users.length };
  users.forEach((u: any) => { counts[u.role] = (counts[u.role] || 0) + 1; });

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#818cf8" /></View>;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>👥 Người dùng</Text>
      <View style={styles.tabRow}>
        {['all', 'customer', 'worker', 'admin'].map(t => (
          <TouchableOpacity key={t} onPress={() => setTab(t)} style={[styles.tab, tab === t && styles.tabActive]}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t} ({counts[t] || 0})</Text>
          </TouchableOpacity>
        ))}
      </View>
      <FlatList data={filtered} keyExtractor={(item: any) => item.id}
        renderItem={({ item }: { item: any }) => (
          <View style={styles.row}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{(item.full_name?.[0] || item.email?.[0] || '?').toUpperCase()}</Text></View>
            <View style={styles.info}>
              <Text style={styles.name}>{item.full_name || '—'}</Text>
              <Text style={styles.email}>{item.email}</Text>
            </View>
            <View style={[styles.roleBadge, { backgroundColor: item.role === 'admin' ? '#4c1d95' : item.role === 'worker' ? '#064e3b' : '#1e3a5f' }]}>
              <Text style={styles.roleText}>{item.role}</Text>
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
  title: { fontSize: 24, fontWeight: 'bold', color: '#e2e8f0', marginBottom: 16, marginTop: 10 },
  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  tab: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#1e293b' },
  tabActive: { backgroundColor: '#6366f1' },
  tabText: { fontSize: 12, color: '#94a3b8' },
  tabTextActive: { color: 'white', fontWeight: 'bold' },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', padding: 12, borderRadius: 12, marginBottom: 8 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#334155', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#94a3b8', fontWeight: 'bold', fontSize: 14 },
  info: { flex: 1, marginLeft: 12 },
  name: { color: '#e2e8f0', fontSize: 14, fontWeight: '500' },
  email: { color: '#64748b', fontSize: 12, marginTop: 2 },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  roleText: { color: '#cbd5e1', fontSize: 10, fontWeight: 'bold' },
});
