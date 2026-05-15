import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import WalletDashboard from '../../components/WalletDashboard';

export default function CustomerProfile() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [editing, setEditing] = useState(false);

  useEffect(() => { fetchProfile(); }, []);

  async function fetchProfile() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push('/login'); return; }
    setEmail(session.user.email || '');

    const { data: profiles } = await supabase.from('profiles').select('*').eq('id', session.user.id);
    const p = profiles?.[0];
    if (p) {
      setProfile(p);
      setName(p.full_name || '');
      setPhone(p.phone || '');
    }
    setLoading(false);
  }

  async function saveProfile() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await supabase.from('profiles' as any).update({ full_name: name, phone } as any).eq('id', session.user.id);
    Alert.alert('✅', 'Đã lưu thông tin');
    setEditing(false);
  }

  async function handleLogout() {
    Alert.alert('Đăng xuất', 'Bạn có chắc?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Đăng xuất', style: 'destructive', onPress: async () => {
        await supabase.auth.signOut();
        router.push('/login');
      }},
    ]);
  }

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#3b82f6" /></View>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>👤 Tài khoản</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Thông tin cá nhân</Text>
        <Text style={styles.label}>Email</Text>
        <Text style={styles.value}>{email}</Text>
        <Text style={styles.label}>Họ và tên</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} editable={editing} placeholder="Tên của bạn" />
        <Text style={styles.label}>Số điện thoại</Text>
        <TextInput style={styles.input} value={phone} onChangeText={setPhone} editable={editing} placeholder="Số điện thoại" keyboardType="phone-pad" />
        {editing ? (
          <View style={styles.row}>
            <TouchableOpacity style={styles.saveBtn} onPress={saveProfile}><Text style={styles.saveBtnText}>Lưu</Text></TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditing(false)}><Text style={styles.cancelBtnText}>Hủy</Text></TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.editBtn} onPress={() => setEditing(true)}><Text style={styles.editBtnText}>Chỉnh sửa</Text></TouchableOpacity>
        )}
      </View>

      {/* Wallet */}
      <WalletDashboard />

      <View style={styles.card}>
        <Text style={styles.cardTitle}>📊 Thống kê</Text>
        <View style={styles.statsRow}>
          <View style={styles.stat}><Text style={styles.statNum}>{profile?.total_orders || 0}</Text><Text style={styles.statLabel}>Đơn</Text></View>
          <View style={styles.stat}><Text style={styles.statNum}>{profile?.completed_orders || 0}</Text><Text style={styles.statLabel}>Hoàn thành</Text></View>
          <View style={styles.stat}><Text style={styles.statNum}>{profile?.avg_rating ? `${profile.avg_rating}/5` : '-'}</Text><Text style={styles.statLabel}>Đánh giá</Text></View>
        </View>
      </View>

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
  card: { backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  label: { fontSize: 12, color: '#999', marginTop: 12, marginBottom: 4 },
  value: { fontSize: 14, color: '#374151' },
  input: { fontSize: 14, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 10, color: '#374151' },
  row: { flexDirection: 'row', gap: 12, marginTop: 16 },
  saveBtn: { flex: 1, backgroundColor: '#3b82f6', padding: 12, borderRadius: 8, alignItems: 'center' },
  saveBtnText: { color: 'white', fontWeight: 'bold' },
  cancelBtn: { flex: 1, backgroundColor: '#f5f5f5', padding: 12, borderRadius: 8, alignItems: 'center' },
  cancelBtnText: { color: '#666' },
  editBtn: { backgroundColor: '#3b82f6', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 16 },
  editBtnText: { color: 'white', fontWeight: 'bold' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center', padding: 12 },
  statNum: { fontSize: 24, fontWeight: 'bold', color: '#3b82f6' },
  statLabel: { fontSize: 12, color: '#999', marginTop: 4 },
  logoutBtn: { backgroundColor: 'white', padding: 16, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#fee2e2' },
  logoutText: { color: '#ef4444', fontWeight: 'bold' },
});
