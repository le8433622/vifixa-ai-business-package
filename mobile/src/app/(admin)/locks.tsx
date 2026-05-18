import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, TextInput, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface LockRecord {
  id: string; user_id: string; lock_level: 'warning' | 'temporary' | 'permanent';
  reason: string; locked_at: string; expires_at: string | null;
  unlocked_at: string | null; profiles: any;
}

export default function AdminLocksScreen() {
  const [tab, setTab] = useState<'active' | 'resolved'>('active');
  const [locks, setLocks] = useState<LockRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [lockUserId, setLockUserId] = useState('');
  const [lockLevel, setLockLevel] = useState<'warning' | 'temporary' | 'permanent'>('warning');
  const [lockReason, setLockReason] = useState('');

  useEffect(() => { load() }, [tab]);

  async function load() {
    const { data } = await supabase.from('account_locks')
      .select('*, profiles:user_id!inner(full_name, email, role)')
      .is('unlocked_at', tab === 'active' ? null : undefined)
      .not('unlocked_at', 'is', tab === 'active' ? undefined : null)
      .order('locked_at', { ascending: false });
    if (data) setLocks(data as unknown as LockRecord[]);
    setLoading(false);
  }

  async function handleLock() {
    if (!lockUserId || !lockReason) return;
    await supabase.from('account_locks').insert({
      user_id: lockUserId, lock_level: lockLevel, reason: lockReason,
      locked_by: (await supabase.auth.getSession()).data.session?.user.id,
    });
    await supabase.from('profiles').update({ is_locked: true, locked_at: new Date().toISOString(), lock_reason: lockReason })
      .eq('id', lockUserId);
    setShowModal(false);
    setLockUserId(''); setLockReason('');
    load();
  }

  async function unlock(lockId: string, userId: string) {
    await supabase.from('account_locks').update({
      unlocked_at: new Date().toISOString(),
      unlocked_by: (await supabase.auth.getSession()).data.session?.user.id,
    }).eq('id', lockId);
    await supabase.from('profiles').update({ is_locked: false, locked_at: null, lock_reason: null }).eq('id', userId);
    load();
  }

  const levelConfig = { warning: { icon: '⚠️', color: '#fbbf24', bg: '#78350f' }, temporary: { icon: '🔒', color: '#fb923c', bg: '#7c2d12' }, permanent: { icon: '🚫', color: '#f87171', bg: '#7f1d1d' } };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#818cf8" /></View>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>🔒 Khóa tài khoản</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)}><Text style={styles.addBtnText}>+ Khóa</Text></TouchableOpacity>
      </View>

      <View style={styles.tabRow}>
        {(['active', 'resolved'] as const).map(t => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t === 'active' ? '🔴 Đang khóa' : '✅ Đã mở'}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {locks.length === 0 ? (
        <View style={styles.empty}><Text style={styles.emptyText}>Không có bản ghi khóa nào</Text></View>
      ) : locks.map(l => {
        const lvl = levelConfig[l.lock_level];
        return (
          <View key={l.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={{ fontSize: 24 }}>{lvl.icon}</Text>
              <View style={styles.cardInfo}>
                <Text style={styles.cardName}>{l.profiles?.full_name || l.user_id.slice(0, 8)}</Text>
                <Text style={styles.cardEmail}>{l.profiles?.email || ''}</Text>
              </View>
              <View style={[styles.levelBadge, { backgroundColor: lvl.bg }]}>
                <Text style={[styles.levelText, { color: lvl.color }]}>{l.lock_level}</Text>
              </View>
            </View>
            <Text style={styles.reason}>Lý do: {l.reason}</Text>
            <Text style={styles.date}>Khóa lúc: {new Date(l.locked_at).toLocaleString('vi-VN')}</Text>
            {!l.unlocked_at && (
              <TouchableOpacity style={styles.unlockBtn} onPress={() => unlock(l.id, l.user_id)}>
                <Text style={styles.unlockBtnText}>🔓 Mở khóa</Text>
              </TouchableOpacity>
            )}
          </View>
        );
      })}

      {showModal && (
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Khóa tài khoản</Text>
            <TextInput style={styles.input} placeholder="User ID" placeholderTextColor="#666" value={lockUserId} onChangeText={setLockUserId} />
            <View style={styles.levelRow}>
              {(['warning', 'temporary', 'permanent'] as const).map(l => (
                <TouchableOpacity key={l} style={[styles.levelBtn, lockLevel === l && styles.levelActive]} onPress={() => setLockLevel(l)}>
                  <Text style={[styles.levelBtnText, lockLevel === l && styles.levelBtnActive]}>{l}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput style={[styles.input, styles.textArea]} placeholder="Lý do khóa..." placeholderTextColor="#666" value={lockReason} onChangeText={setLockReason} multiline />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}><Text style={styles.cancelBtnText}>Hủy</Text></TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleLock}><Text style={styles.confirmBtnText}>Xác nhận khóa</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' }, content: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#e2e8f0', marginTop: 8 },
  addBtn: { backgroundColor: '#6366f1', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  addBtnText: { color: 'white', fontWeight: 'bold', fontSize: 13 },
  tabRow: { flexDirection: 'row', marginBottom: 16, gap: 8 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: '#1e293b', alignItems: 'center' },
  tabActive: { backgroundColor: '#6366f1' },
  tabText: { fontSize: 12, color: '#94a3b8', fontWeight: '500' },
  tabTextActive: { color: 'white', fontWeight: 'bold' },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#64748b' },
  card: { backgroundColor: '#1e293b', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#334155' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  cardInfo: { flex: 1, marginLeft: 12 },
  cardName: { fontSize: 15, fontWeight: '600', color: '#e2e8f0' },
  cardEmail: { fontSize: 12, color: '#94a3b8' },
  levelBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  levelText: { fontSize: 11, fontWeight: '600' },
  reason: { fontSize: 13, color: '#cbd5e1', marginBottom: 4 },
  date: { fontSize: 11, color: '#64748b', marginBottom: 10 },
  unlockBtn: { backgroundColor: '#1e3a5f', paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  unlockBtnText: { color: '#60a5fa', fontWeight: 'bold', fontSize: 13 },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 24 },
  modal: { backgroundColor: '#1e293b', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#334155' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#e2e8f0', marginBottom: 16, textAlign: 'center' },
  input: { backgroundColor: '#0f172a', borderRadius: 10, padding: 12, color: '#e2e8f0', fontSize: 14, marginBottom: 12, borderWidth: 1, borderColor: '#334155' },
  textArea: { height: 80 },
  levelRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  levelBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: '#334155', alignItems: 'center' },
  levelActive: { backgroundColor: '#6366f1' },
  levelBtnText: { fontSize: 12, color: '#94a3b8' },
  levelBtnActive: { color: 'white', fontWeight: '600' },
  modalActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: '#475569', alignItems: 'center' },
  cancelBtnText: { color: '#94a3b8', fontWeight: '500' },
  confirmBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: '#7f1d1d', alignItems: 'center' },
  confirmBtnText: { color: 'white', fontWeight: 'bold' },
});
