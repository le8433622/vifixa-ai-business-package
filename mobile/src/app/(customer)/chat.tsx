import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import * as ImagePicker from 'expo-image-picker';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;

const QUICK_ACTIONS = [
  { id: 'ac', emoji: '❄️', label: 'Máy lạnh', query: 'Máy lạnh nhà tôi không mát' },
  { id: 'elec', emoji: '💡', label: 'Điện nước', query: 'Nhà tôi bị mất điện' },
  { id: 'plumb', emoji: '🚿', label: 'Rò rỉ nước', query: 'Vòi nước nhà tôi bị rò rỉ' },
  { id: 'cam', emoji: '📷', label: 'Camera', query: 'Tôi muốn lắp camera' },
];

export default function MobileChatScreen() {
  const router = useRouter();
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => { checkAuth(); }, []);

  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push('/login'); return; }
    setMessages([{
      id: 'welcome', role: 'assistant',
      content: 'Xin chào! 🏠 Tôi là AI Companion của bạn.\n\nHãy nói với tôi như người bạn:\n"Máy lạnh nhà mình không mát..."',
    }]);
  }

  async function sendMessage(text?: string) {
    const msg = text || input;
    if (!msg.trim() || loading) return;
    setInput('');

    setMessages(prev => [...prev, { id: `u-${Date.now()}`, role: 'user', content: msg }]);
    setLoading(true);
    const aiId = `ai-${Date.now()}`;
    setMessages(prev => [...prev, { id: aiId, role: 'assistant', content: '...' }]);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`${SUPABASE_URL}/functions/v1/companion/chat`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg,
          image_urls: imageUrls,
          session_id: sessionId,
          context: { user_id: session.user.id, persona: 'customer' },
        }),
      });

      setImageUrls([]);
      const data = await res.json();
      setSessionId(data.session_id);

      setMessages(prev => prev.map(m =>
        m.id === aiId ? { ...m, content: data.reply || '...', actions: data.actions } : m
      ));
    } catch {
      setMessages(prev => prev.map(m =>
        m.id === aiId ? { ...m, content: '⚠️ Lỗi kết nối' } : m
      ));
    } finally { setLoading(false); }
  }

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, quality: 0.8,
    });
    if (!result.canceled) {
      setImageUrls(prev => [...prev, result.assets[0].uri]);
    }
  };

  return (
    <View style={styles.container}>
      <FlatList ref={flatListRef} data={messages} keyExtractor={m => m.id}
        style={styles.messageList} contentContainerStyle={styles.messageContent}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item: msg }) => (
          <View style={[styles.bubble, msg.role === 'user' ? styles.userBubble : styles.aiBubble]}>
            {msg.role === 'assistant' && <Text style={styles.aiIcon}>🤖</Text>}
            <Text style={[styles.bubbleText, msg.role === 'user' && styles.userText]}>{msg.content}</Text>
          </View>
        )}
        ListFooterComponent={loading ? <ActivityIndicator style={{ padding: 20 }} color="#3b82f6" /> : null}
      />

      {imageUrls.length > 0 && (
        <View style={styles.imagePreview}>
          {imageUrls.map((uri, i) => (
            <TouchableOpacity key={i} onPress={() => setImageUrls(prev => prev.filter((_, j) => j !== i))}>
              <Image source={{ uri }} style={styles.thumb} />
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.inputBar}>
        <TouchableOpacity onPress={pickImage} style={styles.cameraBtn}>
          <Text style={styles.cameraIcon}>📷</Text>
        </TouchableOpacity>
        <TextInput value={input} onChangeText={setInput} placeholder="Nhập tin nhắn..."
          style={styles.input} multiline
          onSubmitEditing={() => sendMessage()} />
        <TouchableOpacity onPress={() => sendMessage()} disabled={loading || !input.trim()}
          style={[styles.sendBtn, (loading || !input.trim()) && styles.sendBtnDisabled]}>
          <Text style={styles.sendText}>Gửi</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  messageList: { flex: 1 },
  messageContent: { padding: 16, paddingBottom: 8 },
  bubble: { maxWidth: '85%', padding: 12, borderRadius: 16, marginBottom: 8 },
  userBubble: { backgroundColor: '#3b82f6', alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  aiBubble: { backgroundColor: 'white', alignSelf: 'flex-start', borderBottomLeftRadius: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  aiIcon: { fontSize: 20, marginBottom: 4 },
  bubbleText: { fontSize: 14, color: '#1f2937', lineHeight: 20 },
  userText: { color: 'white' },
  imagePreview: { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 8, gap: 8 },
  thumb: { width: 48, height: 48, borderRadius: 8, borderWidth: 1, borderColor: '#ddd' },
  inputBar: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#e5e7eb', gap: 8 },
  cameraBtn: { padding: 8 },
  cameraIcon: { fontSize: 22 },
  input: { flex: 1, backgroundColor: '#f5f5f5', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, maxHeight: 100 },
  sendBtn: { backgroundColor: '#3b82f6', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
  sendBtnDisabled: { opacity: 0.5 },
  sendText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
});
