import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;

const ADMIN_ACTIONS = [
  { emoji: '📊', label: 'Tổng quan', query: 'Xem tổng quan' },
  { emoji: '👥', label: 'Người dùng', query: 'Xem danh sách người dùng' },
  { emoji: '📋', label: 'Đơn hàng', query: 'Xem đơn hàng' },
  { emoji: '💳', label: 'Thanh toán', query: 'Xem giao dịch' },
  { emoji: '⚖️', label: 'Khiếu nại', query: 'Xem khiếu nại' },
];

export default function AdminCompanionChat({ onAction }: { onAction?: (action: any) => void }) {
  const router = useRouter();
  const [messages, setMessages] = useState<any[]>([{ id: 'welcome', role: 'assistant', content: 'Chào admin! 🛡️ Tôi là AI Analyst của bạn.\n\nTôi đang theo dõi doanh thu, users, và các bất thường.\n\nBạn muốn xem gì trước?' }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showQuick, setShowQuick] = useState(true);
  const [kpi, setKpi] = useState({ users: 0, orders: 0, disputes: 0 });
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    (async () => {
      const [u, o, d] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('orders').select('estimated_price,status'),
        supabase.from('complaints').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      ]);
      setKpi({ users: u.count || 0, orders: (o.data || []).length, disputes: d.count || 0 });
    })();
  }, []);

  const sendMessage = async (text?: string) => {
    const msg = text || input;
    if (!msg.trim() || loading) return;
    setInput(''); setShowQuick(false);
    setMessages(prev => [...prev, { id: `u-${Date.now()}`, role: 'user', content: msg }]);
    setLoading(true);
    const aiId = `ai-${Date.now()}`;
    setMessages(prev => [...prev, { id: aiId, role: 'assistant', content: '...' }]);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`${SUPABASE_URL}/functions/v1/companion/chat`, {
        method: 'POST', headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, context: { user_id: session.user.id, persona: 'admin' } }),
      });
      const data = await res.json();
      setMessages(prev => prev.map(m => m.id === aiId ? { ...m, content: data.reply || '...', actions: data.actions } : m));
    } catch { setMessages(prev => prev.map(m => m.id === aiId ? { ...m, content: '⚠️ Lỗi kết nối' } : m));
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* KPI Cards */}
      <View style={styles.kpiRow}>
        <KpiCard icon="👥" value={kpi.users} label="Người dùng" color="#60a5fa" />
        <KpiCard icon="📋" value={kpi.orders} label="Đơn hàng" color="#fbbf24" />
        <KpiCard icon="🚨" value={kpi.disputes} label="Khiếu nại" color="#f87171" />
      </View>

      <FlatList ref={flatListRef} data={messages} keyExtractor={m => m.id} style={styles.list}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item: msg }) => (
          <View style={[styles.bubble, msg.role === 'user' ? styles.userBubble : styles.aiBubble]}>
            {msg.role === 'assistant' && <Text style={styles.aiIcon}>🛡️</Text>}
            <Text style={[styles.text, msg.role === 'user' && styles.userText]}>{msg.content}</Text>
            {msg.actions?.map((a: any, i: number) => (
              <TouchableOpacity key={i} onPress={() => sendMessage(a.label)} style={styles.actionBtn}>
                <Text style={styles.actionText}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        ListFooterComponent={loading ? <ActivityIndicator style={{ padding: 20 }} color="#818cf8" /> : null}
      />
      {showQuick && (
        <View style={styles.quickRow}>
          {ADMIN_ACTIONS.map(q => (
            <TouchableOpacity key={q.label} onPress={() => sendMessage(q.query)} style={styles.quickChip}>
              <Text style={styles.quickText}>{q.emoji} {q.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      <View style={styles.inputBar}>
        <TextInput value={input} onChangeText={setInput} placeholder="Nhập lệnh..." style={styles.input}
          onSubmitEditing={() => sendMessage()} />
        <TouchableOpacity onPress={() => sendMessage()} disabled={loading || !input.trim()} style={[styles.sendBtn, (loading || !input.trim()) && { opacity: 0.5 }]}>
          <Text style={styles.sendText}>Gửi</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

function KpiCard({ icon, value, label, color }: { icon: string; value: any; label: string; color: string }) {
  return (
    <View style={[kpiStyles.card, { backgroundColor: color + '20' }]}>
      <Text style={kpiStyles.icon}>{icon}</Text>
      <Text style={[kpiStyles.value, { color }]}>{value}</Text>
      <Text style={kpiStyles.label}>{label}</Text>
    </View>
  );
}

const kpiStyles = StyleSheet.create({
  card: { flex: 1, padding: 10, borderRadius: 10, alignItems: 'center' },
  icon: { fontSize: 18 },
  value: { fontSize: 16, fontWeight: 'bold', marginTop: 2 },
  label: { fontSize: 9, color: '#94a3b8', marginTop: 2 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  list: { flex: 1, padding: 12 },
  kpiRow: { flexDirection: 'row', padding: 12, paddingBottom: 0, gap: 8 },
  bubble: { maxWidth: '88%', padding: 12, borderRadius: 16, marginBottom: 8 },
  userBubble: { backgroundColor: '#6366f1', alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  aiBubble: { backgroundColor: '#1e293b', alignSelf: 'flex-start', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#334155' },
  aiIcon: { fontSize: 18, marginBottom: 4 },
  text: { fontSize: 14, color: '#e2e8f0', lineHeight: 20 },
  userText: { color: 'white' },
  actionBtn: { backgroundColor: '#312e81', padding: 10, borderRadius: 8, marginTop: 6, alignItems: 'center' },
  actionText: { color: '#a5b4fc', fontSize: 13, fontWeight: '600' },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', padding: 8, gap: 6 },
  quickChip: { backgroundColor: '#1e293b', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#334155' },
  quickText: { fontSize: 12, color: '#cbd5e1' },
  inputBar: { flexDirection: 'row', padding: 12, backgroundColor: '#1e293b', borderTopWidth: 1, borderTopColor: '#334155', gap: 8 },
  input: { flex: 1, backgroundColor: '#0f172a', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: '#e2e8f0' },
  sendBtn: { backgroundColor: '#6366f1', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  sendText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
});
