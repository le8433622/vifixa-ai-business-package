import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const ALL_SKILLS = ['Máy lạnh', 'Điện', 'Nước', 'Camera', 'Tủ lạnh', 'Máy giặt', 'Bếp gas', 'Bình nóng lạnh'];
const ALL_AREAS = ['Q.1', 'Q.2', 'Q.3', 'Q.4', 'Q.5', 'Q.7', 'Bình Thạnh', 'Phú Nhuận', 'Tân Bình', 'Tân Phú', 'Gò Vấp', 'Thủ Đức'];

export default function WorkerProfile() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [areas, setAreas] = useState<string[]>([]);
  const [trustScore, setTrustScore] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push('/login'); return; }
    let wRes;
    try { wRes = await supabase.from('workers').select('*').eq('id', session.user.id).single(); } catch { wRes = { data: null }; }
    const pRes = await supabase.from('profiles').select('*').eq('id', session.user.id);
    const p = pRes.data?.[0];
    const w = wRes.data;
    if (p) { setName(p.full_name || ''); setPhone(p.phone || ''); }
    if (w) { setSkills(w.skills || []); setAreas(w.service_areas || []); setTrustScore(w.trust_score || 0); }
    setLoading(false);
  }

  async function save() {
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await supabase.from('profiles' as any).update({ full_name: name, phone } as any).eq('id', session.user.id);
    await supabase.from('workers').upsert({ id: session.user.id, skills, service_areas: areas } as any);
    setSaving(false);
    Alert.alert('✅', 'Đã lưu thông tin');
  }

  async function handleLogout() {
    Alert.alert('Đăng xuất', 'Bạn có chắc?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Đăng xuất', style: 'destructive', onPress: async () => { await supabase.auth.signOut(); router.push('/login'); }},
    ]);
  }

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#059669" /></View>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>👤 Hồ sơ</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Thông tin</Text>
        <Text style={styles.label}>Họ tên</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} />
        <Text style={styles.label}>Số điện thoại</Text>
        <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>🔧 Kỹ năng</Text>
        <View style={styles.chipRow}>
          {ALL_SKILLS.map(s => (
            <TouchableOpacity key={s} onPress={() => setSkills(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])}
              style={[styles.chip, skills.includes(s) && styles.chipActive]}>
              <Text style={[styles.chipText, skills.includes(s) && styles.chipTextActive]}>{skills.includes(s) ? '✓ ' : '+ '}{s}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>📍 Khu vực</Text>
        <View style={styles.chipRow}>
          {ALL_AREAS.map(a => (
            <TouchableOpacity key={a} onPress={() => setAreas(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a])}
              style={[styles.chip, areas.includes(a) && styles.chipAreaActive]}>
              <Text style={[styles.chipText, areas.includes(a) && styles.chipTextAreaActive]}>{areas.includes(a) ? '✓ ' : '+ '}{a}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>🛡️ Độ tin cậy: {trustScore}</Text>
        <View style={styles.trustBar}><View style={[styles.trustFill, { width: `${trustScore}%` }]} /></View>
      </View>

      <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving}>
        <Text style={styles.saveText}>{saving ? 'Đang lưu...' : '💾 Lưu thay đổi'}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>🚪 Đăng xuất</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, marginTop: 10 },
  card: { backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  label: { fontSize: 12, color: '#999', marginTop: 12, marginBottom: 4 },
  input: { fontSize: 14, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 10, color: '#374151' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#ddd', backgroundColor: '#f9f9f9' },
  chipActive: { backgroundColor: '#d1fae5', borderColor: '#059669' },
  chipText: { fontSize: 12, color: '#666' },
  chipTextActive: { color: '#059669', fontWeight: 'bold' },
  chipAreaActive: { backgroundColor: '#dbeafe', borderColor: '#2563eb' },
  chipTextAreaActive: { color: '#2563eb', fontWeight: 'bold' },
  trustBar: { height: 8, backgroundColor: '#e5e7eb', borderRadius: 4, overflow: 'hidden' },
  trustFill: { height: '100%', backgroundColor: '#059669', borderRadius: 4 },
  saveBtn: { backgroundColor: '#059669', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  saveText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  logoutBtn: { backgroundColor: 'white', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 12, borderWidth: 1, borderColor: '#fee2e2' },
  logoutText: { color: '#ef4444', fontWeight: 'bold' },
});
