import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;

const JOB_ACTIONS = [
  { emoji: '📋', label: 'Việc mới', query: 'Cho tôi xem việc mới' },
  { emoji: '💰', label: 'Thu nhập', query: 'Thu nhập hôm nay của tôi' },
  { emoji: '📊', label: 'Lịch sử', query: 'Xem lịch sử việc làm' },
  { emoji: '🔧', label: 'Kỹ năng', query: 'Cập nhật kỹ năng' },
  { emoji: '🎓', label: 'Học', query: 'Gợi ý cải thiện tay nghề' },
];

export default function WorkerCompanionChat({ onAction }: { onAction?: (action: any) => void }) {
  const router = useRouter();
  const [messages, setMessages] = useState<any[]>([{ id: 'welcome', role: 'assistant', content: 'Chào bạn! 🔧 Tôi là AI Co-pilot của bạn.\n\nTôi có thể tìm job, phân tích thu nhập, hướng dẫn sửa chữa.\n\nHãy nói: "Có job nào gần đây không?"' }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showQuick, setShowQuick] = useState(true);
  const [stats, setStats] = useState({ pendingJobs: 0, todayEarnings: 0, totalJobs: 0 });
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase.from('orders').select('status,estimated_price').eq('worker_id', session.user.id);
      const orders = (data || []) as any[];
      setStats({
        pendingJobs: orders.filter((o: any) => o.status === 'pending').length,
        todayEarnings: orders.filter((o: any) => o.status === 'completed' && new Date(o.created_at).toDateString() === new Date().toDateString()).reduce((s: number, o: any) => s + (o.estimated_price || 0), 0),
        totalJobs: orders.filter((o: any) => o.status === 'completed').length,
      });
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
        body: JSON.stringify({ message: msg, context: { user_id: session.user.id, persona: 'worker' } }),
      });
      const data = await res.json();
      setMessages(prev => prev.map(m => m.id === aiId ? { ...m, content: data.reply || '...', actions: data.actions } : m));
    } catch { setMessages(prev => prev.map(m => m.id === aiId ? { ...m, content: '⚠️ Lỗi kết nối' } : m));
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Stats Panel */}
      <View style={styles.statsRow}>
        <StatCard icon="📋" value={stats.pendingJobs} label="Việc mới" color="#059669" />
        <StatCard icon="💰" value={`${(stats.todayEarnings / 1000).toFixed(0)}k`} label="Hôm nay" color="#d97706" />
        <StatCard icon="✔️" value={stats.totalJobs} label="Hoàn thành" color="#2563eb" />
      </View>

      <FlatList ref={flatListRef} data={messages} keyExtractor={m => m.id} style={styles.list}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item: msg }) => (
          <View style={[styles.bubble, msg.role === 'user' ? styles.userBubble : styles.aiBubble]}>
            {msg.role === 'assistant' && <Text style={styles.aiIcon}>🔧</Text>}
            <Text style={[styles.text, msg.role === 'user' && styles.userText]}>{msg.content}</Text>
            {msg.actions?.map((a: any, i: number) => (
              <TouchableOpacity key={i} onPress={() => sendMessage(a.label)} style={styles.actionBtn}>
                <Text style={styles.actionText}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        ListFooterComponent={loading ? <ActivityIndicator style={{ padding: 20 }} color="#059669" /> : null}
      />
      {showQuick && (
        <View style={styles.quickRow}>
          {JOB_ACTIONS.map(q => (
            <TouchableOpacity key={q.label} onPress={() => sendMessage(q.query)} style={styles.quickChip}>
              <Text style={styles.quickText}>{q.emoji} {q.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      <View style={styles.inputBar}>
        <TextInput value={input} onChangeText={setInput} placeholder="VD: Có job nào không?" style={styles.input}
          onSubmitEditing={() => sendMessage()} />
        <TouchableOpacity onPress={() => sendMessage()} disabled={loading || !input.trim()} style={[styles.sendBtn, (loading || !input.trim()) && { opacity: 0.5 }]}>
          <Text style={styles.sendText}>Gửi</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

function StatCard({ icon, value, label, color }: { icon: string; value: any; label: string; color: string }) {
  return (
    <View style={[statStyles.card, { borderLeftColor: color }]}>
      <Text style={statStyles.icon}>{icon}</Text>
      <Text style={[statStyles.value, { color }]}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  card: { flex: 1, backgroundColor: 'white', padding: 8, borderRadius: 8, borderLeftWidth: 3, alignItems: 'center' },
  icon: { fontSize: 16 },
  value: { fontSize: 14, fontWeight: 'bold', marginTop: 2 },
  label: { fontSize: 9, color: '#9ca3af', marginTop: 2 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0fdf4' },
  list: { flex: 1, padding: 12 },
  statsRow: { flexDirection: 'row', padding: 12, paddingBottom: 0, gap: 8 },
  bubble: { maxWidth: '88%', padding: 12, borderRadius: 16, marginBottom: 8 },
  userBubble: { backgroundColor: '#059669', alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  aiBubble: { backgroundColor: 'white', alignSelf: 'flex-start', borderBottomLeftRadius: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  aiIcon: { fontSize: 18, marginBottom: 4 },
  text: { fontSize: 14, color: '#1f2937', lineHeight: 20 },
  userText: { color: 'white' },
  actionBtn: { backgroundColor: '#d1fae5', padding: 10, borderRadius: 8, marginTop: 6, alignItems: 'center' },
  actionText: { color: '#059669', fontSize: 13, fontWeight: '600' },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', padding: 8, gap: 6 },
  quickChip: { backgroundColor: 'white', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#e5e7eb' },
  quickText: { fontSize: 12, color: '#374151' },
  inputBar: { flexDirection: 'row', padding: 12, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#e5e7eb', gap: 8 },
  input: { flex: 1, backgroundColor: '#f5f5f5', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14 },
  sendBtn: { backgroundColor: '#059669', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  sendText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
});
