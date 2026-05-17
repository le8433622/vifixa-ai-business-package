import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, TextInput } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';

interface KYCWorker {
  id: string; full_name: string | null; phone: string | null;
  verification_status: string; is_verified: boolean;
  id_front_url: string | null; id_back_url: string | null; selfie_url: string | null;
  trust_score: number | null; kyc_submitted_at: string | null; kyc_notes: string | null;
}

export default function AdminKYCScreen() {
  const [tab, setTab] = useState<'pending' | 'verified' | 'rejected'>('pending');
  const [workers, setWorkers] = useState<KYCWorker[]>([]);
  const [stats, setStats] = useState({ pending: 0, verified: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => { load() }, [tab]);

  async function load() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data } = await supabase.from('workers')
      .select('id, full_name, phone, verification_status, is_verified, id_front_url, id_back_url, selfie_url, trust_score, kyc_submitted_at, kyc_notes')
      .eq('verification_status', tab).order('kyc_submitted_at', { ascending: false });
    if (data) setWorkers(data as KYCWorker[]);

    const [p, v, r] = await Promise.all([
      supabase.from('workers').select('id', { count: 'exact', head: true }).eq('verification_status', 'pending'),
      supabase.from('workers').select('id', { count: 'exact', head: true }).eq('verification_status', 'verified'),
      supabase.from('workers').select('id', { count: 'exact', head: true }).eq('verification_status', 'rejected'),
    ]);
    setStats({ pending: p.count || 0, verified: v.count || 0, rejected: r.count || 0 });
    setLoading(false);
  }

  async function handleReview(workerId: string, status: string) {
    setActionLoading(workerId);
    await supabase.from('workers').update({
      verification_status: status, is_verified: status === 'verified',
      kyc_reviewed_at: new Date().toISOString(), kyc_notes: adminNotes[workerId] || null,
    }).eq('id', workerId);
    if (status === 'verified') {
      await supabase.rpc('calculate_trust_score', { target_user_id: workerId });
    }
    setActionLoading(null);
    load();
  }

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#818cf8" /></View>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>🪪 KYC - Xác thực</Text>
      <View style={styles.tabRow}>
        {(['pending', 'verified', 'rejected'] as const).map(t => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'pending' ? 'Chờ duyệt' : t === 'verified' ? 'Đã duyệt' : 'Từ chối'} ({stats[t]})
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {workers.length === 0 ? (
        <View style={styles.empty}><Text style={styles.emptyText}>Không có hồ sơ nào</Text></View>
      ) : workers.map(w => (
        <View key={w.id} style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{(w.full_name || '?')[0]}</Text></View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardName}>{w.full_name || 'Chưa có tên'}</Text>
              <Text style={styles.cardPhone}>{w.phone || 'Chưa có SĐT'}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: w.verification_status === 'verified' ? '#065f46' : w.verification_status === 'rejected' ? '#7f1d1d' : '#78350f' }]}>
              <Text style={styles.badgeText}>{w.verification_status === 'pending' ? 'Chờ' : w.verification_status === 'verified' ? 'OK' : 'Từ chối'}</Text>
            </View>
          </View>

          {w.kyc_submitted_at && <Text style={styles.submitted}>Gửi: {new Date(w.kyc_submitted_at).toLocaleDateString('vi-VN')}</Text>}
          {w.trust_score != null && <Text style={styles.score}>Điểm tin cậy: {w.trust_score}</Text>}

          {w.id_front_url && <Text style={styles.docLink}>📷 CMND/CCCD mặt trước</Text>}
          {w.id_back_url && <Text style={styles.docLink}>📷 CMND/CCCD mặt sau</Text>}
          {w.selfie_url && <Text style={styles.docLink}>🤳 Ảnh chân dung</Text>}

          {tab === 'pending' && (
            <View>
              <TextInput style={styles.input} placeholder="Ghi chú admin..." placeholderTextColor="#666" value={adminNotes[w.id] || ''} onChangeText={t => setAdminNotes(prev => ({ ...prev, [w.id]: t }))} />
              <View style={styles.actionRow}>
                <TouchableOpacity style={[styles.btn, styles.approveBtn]} onPress={() => handleReview(w.id, 'verified')} disabled={actionLoading === w.id}>
                  <Text style={styles.btnText}>{actionLoading === w.id ? '...' : '✅ Duyệt'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btn, styles.rejectBtn]} onPress={() => handleReview(w.id, 'rejected')} disabled={actionLoading === w.id}>
                  <Text style={styles.btnText}>❌ Từ chối</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          {w.kyc_notes && <Text style={styles.notes}>Ghi chú: {w.kyc_notes}</Text>}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' }, content: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#e2e8f0', marginBottom: 16, marginTop: 8 },
  tabRow: { flexDirection: 'row', marginBottom: 16, gap: 8 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: '#1e293b', alignItems: 'center' },
  tabActive: { backgroundColor: '#6366f1' },
  tabText: { fontSize: 12, color: '#94a3b8', fontWeight: '500' },
  tabTextActive: { color: 'white', fontWeight: 'bold' },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#64748b', fontSize: 14 },
  card: { backgroundColor: '#1e293b', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#334155' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#334155', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { fontSize: 18, color: '#e2e8f0', fontWeight: 'bold' },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: '600', color: '#e2e8f0' },
  cardPhone: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 11, color: 'white', fontWeight: '600' },
  submitted: { fontSize: 12, color: '#64748b', marginBottom: 4 },
  score: { fontSize: 12, color: '#34d399', marginBottom: 4 },
  docLink: { fontSize: 12, color: '#60a5fa', marginBottom: 2 },
  input: { backgroundColor: '#0f172a', borderRadius: 10, padding: 12, color: '#e2e8f0', fontSize: 13, marginTop: 8, marginBottom: 8, borderWidth: 1, borderColor: '#334155' },
  actionRow: { flexDirection: 'row', gap: 8 },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  approveBtn: { backgroundColor: '#065f46' },
  rejectBtn: { backgroundColor: '#7f1d1d' },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 13 },
  notes: { fontSize: 12, color: '#fbbf24', marginTop: 6, fontStyle: 'italic' },
});
