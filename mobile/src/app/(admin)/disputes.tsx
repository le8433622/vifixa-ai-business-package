import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';

export default function AdminDisputes() {
  const router = useRouter();
  const [disputes, setDisputes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('complaints').select('*, orders:order_id(category)').order('created_at', { ascending: false });
      setDisputes(data || []);
      setLoading(false);
    })();
  }, []);

  const filtered = filter === 'all' ? disputes : disputes.filter((d: any) => d.status === filter);
  const pending = disputes.filter((d: any) => d.status === 'pending').length;

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#818cf8" /></View>;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>⚖️ Khiếu nại ({pending} chờ)</Text>
      <View style={styles.filterRow}>
        {['pending', 'resolved', 'all'].map(s => (
          <TouchableOpacity key={s} onPress={() => setFilter(s)} style={[styles.filter, filter === s && styles.filterActive]}>
            <Text style={[styles.filterText, filter === s && styles.filterTextActive]}>{s}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <FlatList data={filtered} keyExtractor={(d: any) => d.id}
        renderItem={({ item }: { item: any }) => (
          <View style={styles.card}>
            <View style={styles.cardRow}>
              <Text style={styles.cat}>{item.orders?.category || '—'}</Text>
              <Text style={[styles.status, { color: item.status === 'pending' ? '#fbbf24' : '#34d399' }]}>{item.status}</Text>
            </View>
            <Text style={styles.desc}>{item.complaint_type || item.description?.slice(0, 80)}</Text>
            <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString()}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Không có khiếu nại</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#e2e8f0', marginBottom: 16, marginTop: 10 },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  filter: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#1e293b' },
  filterActive: { backgroundColor: '#6366f1' },
  filterText: { fontSize: 12, color: '#94a3b8' },
  filterTextActive: { color: 'white', fontWeight: 'bold' },
  card: { backgroundColor: '#1e293b', padding: 14, borderRadius: 12, marginBottom: 8 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  cat: { color: '#e2e8f0', fontSize: 14, fontWeight: '600' },
  status: { fontSize: 12, fontWeight: 'bold' },
  desc: { color: '#94a3b8', fontSize: 12, marginBottom: 6 },
  date: { color: '#475569', fontSize: 10 },
  empty: { textAlign: 'center', color: '#64748b', padding: 40, fontSize: 14 },
});
