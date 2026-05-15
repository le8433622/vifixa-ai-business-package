import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;

const SERVICE_ACTIONS = [
  { emoji: '❄️', label: 'Máy lạnh', query: 'Máy lạnh nhà tôi không mát, giúp tôi kiểm tra' },
  { emoji: '💡', label: 'Điện', query: 'Nhà tôi bị mất điện, cần thợ gấp' },
  { emoji: '🚿', label: 'Nước', query: 'Vòi nước bị rò rỉ, giúp tôi sửa' },
  { emoji: '📷', label: 'Camera', query: 'Tôi muốn lắp camera an ninh' },
  { emoji: '💰', label: 'Báo giá', query: 'Báo giá sửa máy lạnh' },
  { emoji: '📋', label: 'Đơn hàng', query: 'Xem đơn hàng của tôi' },
];

export default function CustomerCompanionChat({ onAction }: { onAction?: (action: any) => void }) {
  const router = useRouter();
  const [messages, setMessages] = useState<any[]>([{ id: 'welcome', role: 'assistant', content: 'Xin chào! 🏠 Tôi là AI Companion của bạn.\n\nHãy nói với tôi: "Máy lạnh nhà mình không mát..."' }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showQuick, setShowQuick] = useState(true);
  const flatListRef = useRef<FlatList>(null);

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
        body: JSON.stringify({ message: msg, context: { user_id: session.user.id, persona: 'customer' } }),
      });
      const data = await res.json();
      setMessages(prev => prev.map(m => m.id === aiId ? { ...m, content: data.reply || '...', actions: data.actions } : m));
    } catch { setMessages(prev => prev.map(m => m.id === aiId ? { ...m, content: '⚠️ Lỗi kết nối' } : m));
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <FlatList ref={flatListRef} data={messages} keyExtractor={m => m.id} style={styles.list}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item: msg }) => (
          <View style={[styles.bubble, msg.role === 'user' ? styles.userBubble : styles.aiBubble]}>
            {msg.role === 'assistant' && <Text style={styles.aiIcon}>🏠</Text>}
            <Text style={[styles.text, msg.role === 'user' && styles.userText]}>{msg.content}</Text>
            {msg.actions?.map((a: any, i: number) => (
              <TouchableOpacity key={i} onPress={() => sendMessage(a.label)} style={styles.actionBtn}>
                <Text style={styles.actionText}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        ListFooterComponent={loading ? <ActivityIndicator style={{ padding: 20 }} color="#3b82f6" /> : null}
      />
      {showQuick && (
        <View style={styles.quickRow}>
          {SERVICE_ACTIONS.map(q => (
            <TouchableOpacity key={q.label} onPress={() => sendMessage(q.query)} style={styles.quickChip}>
              <Text style={styles.quickText}>{q.emoji} {q.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      <View style={styles.inputBar}>
        <TextInput value={input} onChangeText={setInput} placeholder="VD: Máy lạnh không mát..." style={styles.input}
          onSubmitEditing={() => sendMessage()} />
        <TouchableOpacity onPress={() => sendMessage()} disabled={loading || !input.trim()} style={[styles.sendBtn, (loading || !input.trim()) && { opacity: 0.5 }]}>
          <Text style={styles.sendText}>Gửi</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f9ff' },
  list: { flex: 1, padding: 12 },
  bubble: { maxWidth: '88%', padding: 12, borderRadius: 16, marginBottom: 8 },
  userBubble: { backgroundColor: '#3b82f6', alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  aiBubble: { backgroundColor: 'white', alignSelf: 'flex-start', borderBottomLeftRadius: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  aiIcon: { fontSize: 18, marginBottom: 4 },
  text: { fontSize: 14, color: '#1f2937', lineHeight: 20 },
  userText: { color: 'white' },
  actionBtn: { backgroundColor: '#dbeafe', padding: 10, borderRadius: 8, marginTop: 6, alignItems: 'center' },
  actionText: { color: '#2563eb', fontSize: 13, fontWeight: '600' },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', padding: 8, gap: 6 },
  quickChip: { backgroundColor: 'white', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#e5e7eb' },
  quickText: { fontSize: 12, color: '#374151' },
  inputBar: { flexDirection: 'row', padding: 12, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#e5e7eb', gap: 8 },
  input: { flex: 1, backgroundColor: '#f5f5f5', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14 },
  sendBtn: { backgroundColor: '#3b82f6', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  sendText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
});
